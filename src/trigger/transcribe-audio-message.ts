import { logger, task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { messageMedia, messages } from "@/db/schema";
import { transcribeAudioFromUrl } from "@/lib/audio-transcription";

export const transcribeAudioMessageTask = task({
  id: "transcribe-audio-message",
  maxDuration: 300,
  queue: { concurrencyLimit: 2 },
  run: async (payload: { messageId: string }) => {
    const [message] = await db
      .select({
        audioTranscription: messages.audioTranscription,
        id: messages.id,
        messageType: messages.messageType,
      })
      .from(messages)
      .where(eq(messages.id, payload.messageId))
      .limit(1);

    if (!message || message.messageType !== "audio") {
      return { messageId: payload.messageId, status: "skipped" };
    }

    if (message.audioTranscription?.trim()) {
      return { messageId: payload.messageId, status: "already_transcribed" };
    }

    const [audio] = await db
      .select({ blobUrl: messageMedia.blobUrl })
      .from(messageMedia)
      .where(
        and(
          eq(messageMedia.messageId, payload.messageId),
          eq(messageMedia.mediaType, "audio"),
        ),
      )
      .limit(1);

    if (!audio?.blobUrl) {
      logger.warn("Audio media not found for transcription", {
        messageId: payload.messageId,
      });
      return { messageId: payload.messageId, status: "missing_audio" };
    }

    const audioTranscription = await transcribeAudioFromUrl(audio.blobUrl);

    await db
      .update(messages)
      .set({ audioTranscription, updatedAt: new Date() })
      .where(eq(messages.id, payload.messageId));

    return { messageId: payload.messageId, status: "transcribed" };
  },
});

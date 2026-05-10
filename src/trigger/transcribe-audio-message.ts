import { logger, task } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { messageMedia, messages } from "@/db/schema";
import { transcribeAudioFromUrl } from "@/lib/audio-transcription";

const MAX_TRANSCRIPTION_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const transcribeAudioMessageTask = task({
  id: "transcribe-audio-message",
  run: async (payload: { messageId: string }) => {
    const [message] = await db
      .select({
        id: messages.id,
        audioTranscription: messages.audioTranscription,
        audioTranscriptionStatus: messages.audioTranscriptionStatus,
      })
      .from(messages)
      .where(eq(messages.id, payload.messageId))
      .limit(1);

    if (!message) {
      return;
    }

    if (message.audioTranscription) {
      if (message.audioTranscriptionStatus !== "completed") {
        await db
          .update(messages)
          .set({
            audioTranscriptionError: null,
            audioTranscriptionStatus: "completed",
            updatedAt: new Date(),
          })
          .where(eq(messages.id, payload.messageId));
      }
      return;
    }

    const [audio] = await db
      .select({
        blobUrl: messageMedia.blobUrl,
        fileName: messageMedia.fileName,
        fileSize: messageMedia.fileSize,
        mimeType: messageMedia.mimeType,
      })
      .from(messageMedia)
      .where(
        and(
          eq(messageMedia.messageId, payload.messageId),
          eq(messageMedia.mediaType, "audio"),
        ),
      )
      .limit(1);

    if (!audio?.blobUrl) {
      await db
        .update(messages)
        .set({
          audioTranscriptionError: "Audio media not found",
          audioTranscriptionStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(messages.id, payload.messageId));
      return;
    }

    if ((audio.fileSize ?? 0) > MAX_TRANSCRIPTION_FILE_SIZE_BYTES) {
      await db
        .update(messages)
        .set({
          audioTranscriptionError: `Audio file exceeds limit (${audio.fileSize} bytes)`,
          audioTranscriptionStatus: "skipped",
          updatedAt: new Date(),
        })
        .where(eq(messages.id, payload.messageId));
      return;
    }

    await db
      .update(messages)
      .set({
        audioTranscriptionError: null,
        audioTranscriptionStatus: "pending",
        updatedAt: new Date(),
      })
      .where(eq(messages.id, payload.messageId));

    try {
      const transcription = await transcribeAudioFromUrl({
        audioUrl: audio.blobUrl,
        fileName: audio.fileName,
        mimeType: audio.mimeType,
      });

      await db
        .update(messages)
        .set({
          audioTranscription: transcription,
          audioTranscriptionError: null,
          audioTranscriptionStatus: "completed",
          updatedAt: new Date(),
        })
        .where(eq(messages.id, payload.messageId));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await db
        .update(messages)
        .set({
          audioTranscriptionError: errorMessage,
          audioTranscriptionStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(messages.id, payload.messageId));
      logger.error("Audio transcription failed", {
        error: errorMessage,
        messageId: payload.messageId,
      });
      throw error;
    }
  },
});

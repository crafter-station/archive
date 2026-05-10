import { createHash } from "node:crypto";
import { tasks } from "@trigger.dev/sdk/v3";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import {
  type Message,
  messageMedia,
  messageReactions,
  messages,
  webhookEvents,
} from "@/db/schema";
import { GROUP_CHAT_JID } from "@/lib/whatsapp-constants";
import {
  extractMediaMessages,
  formatMediaLabel,
  getMediaCaption,
  getMediaSummary,
  uploadWhatsAppMedia,
} from "@/lib/whatsapp-media";
import {
  getChatJid,
  upsertParticipantFromMessage,
} from "@/lib/whatsapp-participants";
import {
  isRecord,
  type ReactionInfo,
  type ReplyInfo,
  type WebhookPayload,
  type WhatsAppMessage,
} from "@/lib/whatsapp-types";

export async function processWhatsAppWebhook(
  payload: WebhookPayload,
  rawBody = JSON.stringify(payload),
) {
  const eventHash = createHash("sha256").update(rawBody).digest("hex");
  const [event] = await db
    .insert(webhookEvents)
    .values({
      eventHash,
      eventId: payload.event,
      rawPayload: payload,
    })
    .onConflictDoNothing({ target: webhookEvents.eventHash })
    .returning();

  if (!event) {
    const [existingEvent] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventHash, eventHash))
      .limit(1);

    if (existingEvent?.status === "processed") {
      return;
    }
  }

  try {
    const incomingMessages = getIncomingMessages(payload);

    if (!isGroupWebhook(payload, incomingMessages)) {
      await markWebhookEventProcessed(eventHash);
      return;
    }

    for (const message of incomingMessages) {
      await processIncomingMessage(message);
    }

    await markWebhookEventProcessed(eventHash);
  } catch (error) {
    await db
      .update(webhookEvents)
      .set({
        error: error instanceof Error ? error.message : "Unknown error",
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(webhookEvents.eventHash, eventHash));

    throw error;
  }
}

function isGroupWebhook(
  payload: WebhookPayload,
  incomingMessages: WhatsAppMessage[],
) {
  return getWebhookChatJids(payload, incomingMessages).includes(GROUP_CHAT_JID);
}

function getWebhookChatJids(
  payload: WebhookPayload,
  incomingMessages: WhatsAppMessage[],
) {
  return [
    payload.data?.groupId,
    payload.data?.remoteJid,
    ...incomingMessages.map((message) => getChatJid(message)),
  ].filter((jid): jid is string => Boolean(jid));
}

async function processIncomingMessage(message: WhatsAppMessage) {
  if (getChatJid(message) !== GROUP_CHAT_JID) {
    return;
  }

  const reaction = getReaction(message.message);

  if (reaction) {
    await upsertReaction(message, reaction);
    return;
  }

  await upsertMessage(message);
}

async function markWebhookEventProcessed(eventHash: string) {
  await db
    .update(webhookEvents)
    .set({
      error: null,
      processedAt: new Date(),
      status: "processed",
      updatedAt: new Date(),
    })
    .where(eq(webhookEvents.eventHash, eventHash));
}

async function upsertMessage(message: WhatsAppMessage) {
  const whatsappMessageId = getWhatsAppMessageId(message);
  const participant = await upsertParticipantFromMessage(message);
  const chatJid = getChatJid(message);
  const media = extractMediaMessages(message.message);
  const reply = getReply(message.message);
  const replyToMessageId = reply
    ? await getMessageIdByWhatsAppId(reply.messageId)
    : null;
  const body =
    message.messageBody ??
    getPlainText(message.message) ??
    getMediaSummary(media) ??
    getMessageSummary(message.message);
  const caption = getMediaCaption(media);
  const [storedMessage] = await db
    .insert(messages)
    .values({
      body,
      caption,
      chatJid,
      messageType: getMessageType(message.message, media.length),
      quotedText: reply?.quotedText,
      rawPayload: message,
      receivedAt: new Date(),
      replyToMessageId,
      replyToParticipantJid: reply?.participantJid,
      replyToWhatsappMessageId: reply?.messageId,
      senderParticipantId: participant.id,
      sentAt: message.messageTimestamp
        ? new Date(message.messageTimestamp * 1000)
        : null,
      whatsappMessageId,
    })
    .onConflictDoUpdate({
      target: messages.whatsappMessageId,
      set: {
        body,
        caption,
        chatJid,
        messageType: getMessageType(message.message, media.length),
        quotedText: reply?.quotedText,
        rawPayload: message,
        replyToMessageId,
        replyToParticipantJid: reply?.participantJid,
        replyToWhatsappMessageId: reply?.messageId,
        senderParticipantId: participant.id,
        sentAt: message.messageTimestamp
          ? new Date(message.messageTimestamp * 1000)
          : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  await uploadMissingMedia(storedMessage, chatJid, media);
  await enqueueAudioTranscription(storedMessage.id, storedMessage.messageType);
  await resolveRepliesToMessage(storedMessage);
  await resolveReactionsToMessage(storedMessage);
}

async function enqueueAudioTranscription(
  messageId: string,
  messageType: Message["messageType"],
) {
  if (messageType !== "audio") {
    return;
  }

  const [queuedMessage] = await db
    .update(messages)
    .set({
      audioTranscriptionError: null,
      audioTranscriptionStatus: "pending",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messages.id, messageId),
        isNull(messages.audioTranscription),
        eq(messages.audioTranscriptionStatus, "not_required"),
      ),
    )
    .returning({ id: messages.id });

  if (!queuedMessage) {
    return;
  }

  try {
    await tasks.trigger(
      "transcribe-audio-message",
      { messageId },
      {
        idempotencyKey: `audio-transcription:${messageId}`,
      },
    );
  } catch (error) {
    await db
      .update(messages)
      .set({
        audioTranscriptionError:
          error instanceof Error ? error.message : String(error),
        audioTranscriptionStatus: "not_required",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.id, messageId),
          isNull(messages.audioTranscription),
          eq(messages.audioTranscriptionStatus, "pending"),
        ),
      );

    throw error;
  }
}

async function upsertReaction(
  message: WhatsAppMessage,
  reaction: ReactionInfo,
) {
  const participant = await upsertParticipantFromMessage(message);
  const targetMessageId = await getMessageIdByWhatsAppId(reaction.messageId);

  await db
    .insert(messageReactions)
    .values({
      emoji: reaction.emoji,
      messageId: targetMessageId,
      participantId: participant.id,
      rawPayload: message,
      reactedAt: message.messageTimestamp
        ? new Date(message.messageTimestamp * 1000)
        : null,
      targetWhatsappMessageId: reaction.messageId,
    })
    .onConflictDoUpdate({
      target: [
        messageReactions.targetWhatsappMessageId,
        messageReactions.participantId,
      ],
      set: {
        emoji: reaction.emoji,
        messageId: targetMessageId,
        rawPayload: message,
        reactedAt: message.messageTimestamp
          ? new Date(message.messageTimestamp * 1000)
          : null,
        updatedAt: new Date(),
      },
    });
}

async function uploadMissingMedia(
  storedMessage: Message,
  chatJid: string,
  media: ReturnType<typeof extractMediaMessages>,
) {
  if (media.length === 0) {
    return;
  }

  const existingMedia = await db
    .select({ id: messageMedia.id })
    .from(messageMedia)
    .where(eq(messageMedia.messageId, storedMessage.id))
    .limit(1);

  if (existingMedia.length > 0) {
    return;
  }

  for (const [index, mediaMessage] of media.entries()) {
    const uploaded = await uploadWhatsAppMedia({
      chatJid,
      media: mediaMessage,
      sortOrder: index,
      whatsappMessageId: storedMessage.whatsappMessageId,
    });

    await db.insert(messageMedia).values({
      blobPath: uploaded.blobPath,
      blobUrl: uploaded.blobUrl,
      fileName: uploaded.fileName,
      fileSize: uploaded.fileSize,
      height: mediaMessage.info.height,
      mediaType: mediaMessage.type,
      messageId: storedMessage.id,
      mimeType: mediaMessage.info.mimetype,
      rawMediaPayload: mediaMessage.info,
      sha256: getMediaSha256(mediaMessage.info.fileSha256),
      sortOrder: index,
      width: mediaMessage.info.width,
      durationSeconds: mediaMessage.info.seconds,
    });
  }
}

async function resolveRepliesToMessage(storedMessage: Message) {
  await db
    .update(messages)
    .set({
      replyToMessageId: storedMessage.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messages.replyToWhatsappMessageId, storedMessage.whatsappMessageId),
        isNull(messages.replyToMessageId),
      ),
    );
}

async function resolveReactionsToMessage(storedMessage: Message) {
  await db
    .update(messageReactions)
    .set({
      messageId: storedMessage.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(
          messageReactions.targetWhatsappMessageId,
          storedMessage.whatsappMessageId,
        ),
        isNull(messageReactions.messageId),
      ),
    );
}

async function getMessageIdByWhatsAppId(whatsappMessageId: string) {
  const [message] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.whatsappMessageId, whatsappMessageId))
    .limit(1);

  return message?.id ?? null;
}

function getIncomingMessages(payload: WebhookPayload) {
  const incoming = payload.data?.messages;

  if (!incoming) {
    return [];
  }

  return Array.isArray(incoming) ? incoming : [incoming];
}

function getReaction(
  message?: Record<string, unknown>,
): ReactionInfo | undefined {
  if (!message || !isRecord(message.reactionMessage)) {
    return;
  }

  const reaction = message.reactionMessage;

  if (!isRecord(reaction.key)) {
    return;
  }

  const targetMessageId =
    typeof reaction.key.id === "string" ? reaction.key.id : undefined;

  if (!targetMessageId) {
    return;
  }

  const text = typeof reaction.text === "string" ? reaction.text : null;

  return {
    emoji: text && text.length > 0 ? text : null,
    messageId: targetMessageId,
    participantJid:
      typeof reaction.key.participant === "string"
        ? reaction.key.participant
        : "unknown",
  };
}

function getReply(message?: Record<string, unknown>): ReplyInfo | undefined {
  const contextInfo = getContextInfo(message);

  if (!contextInfo || typeof contextInfo.stanzaId !== "string") {
    return;
  }

  return {
    messageId: contextInfo.stanzaId,
    participantJid:
      typeof contextInfo.participant === "string"
        ? contextInfo.participant
        : "unknown",
    quotedText: getQuotedText(contextInfo.quotedMessage),
  };
}

function getContextInfo(message?: Record<string, unknown>) {
  if (!message) {
    return;
  }

  for (const value of Object.values(message)) {
    if (!isRecord(value) || !isRecord(value.contextInfo)) {
      continue;
    }

    return value.contextInfo;
  }
}

function getQuotedText(quotedMessage: unknown) {
  if (!isRecord(quotedMessage)) {
    return;
  }

  if (typeof quotedMessage.conversation === "string") {
    return quotedMessage.conversation;
  }

  if (
    isRecord(quotedMessage.extendedTextMessage) &&
    typeof quotedMessage.extendedTextMessage.text === "string"
  ) {
    return quotedMessage.extendedTextMessage.text;
  }

  const media = extractMediaMessages(quotedMessage);

  if (media.length > 0) {
    const [firstMedia] = media;

    return `${formatMediaLabel(firstMedia)}${firstMedia.info.caption ? `: ${firstMedia.info.caption}` : ""}`;
  }

  return getMessageSummary(quotedMessage);
}

function getMessageType(
  message: Record<string, unknown> | undefined,
  mediaCount: number,
) {
  if (!message) {
    return "unknown";
  }

  if (mediaCount > 1) {
    return "album";
  }

  if (mediaCount === 1) {
    const [media] = extractMediaMessages(message);
    return media?.type ?? "media";
  }

  if (typeof message.conversation === "string") {
    return "text";
  }

  if (isRecord(message.extendedTextMessage)) {
    return "text";
  }

  if (isRecord(message.albumMessage)) {
    return "album";
  }

  return "unknown";
}

function getPlainText(message?: Record<string, unknown>) {
  if (!message) {
    return;
  }

  if (typeof message.conversation === "string") {
    return message.conversation;
  }

  if (
    isRecord(message.extendedTextMessage) &&
    typeof message.extendedTextMessage.text === "string"
  ) {
    return message.extendedTextMessage.text;
  }
}

function getMessageSummary(message?: Record<string, unknown>) {
  if (!message) {
    return;
  }

  if (isRecord(message.albumMessage)) {
    return `Album: ${message.albumMessage.expectedImageCount ?? 0} images, ${message.albumMessage.expectedVideoCount ?? 0} videos expected`;
  }

  const keys = Object.keys(message).filter(
    (key) =>
      key !== "messageContextInfo" && key !== "senderKeyDistributionMessage",
  );

  return keys.length > 0 ? `Message type: ${keys.join(", ")}` : undefined;
}

function getWhatsAppMessageId(message: WhatsAppMessage) {
  const id = message.key?.id ?? message.id;

  if (id) {
    return id;
  }

  return createHash("sha256").update(JSON.stringify(message)).digest("hex");
}

function getMediaSha256(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return null;
}

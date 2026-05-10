import type { getMessagesForAgentContext } from "@/lib/log-agent-queries";
import { formatLocalDateTime } from "@/lib/log-windows";

type AgentMessage = Awaited<
  ReturnType<typeof getMessagesForAgentContext>
>[number];

function imageMedia(message: AgentMessage) {
  return message.media.filter((media) => media.mediaType === "image");
}

function messageText(message: AgentMessage) {
  if (message.messageType !== "text" && message.caption) {
    return message.caption;
  }

  return message.body ?? message.caption ?? "";
}

export function serializeMessagesForLogAgent(
  messages: AgentMessage[],
  timezone: string,
) {
  const serializedMessages = messages
    .map((message) => ({
      id: message.id,
      whatsappMessageId: message.whatsappMessageId,
      participantId: message.senderParticipantId,
      sender: message.sender.displayName ?? message.sender.jid,
      sentAt: message.sentAt
        ? formatLocalDateTime(message.sentAt, timezone)
        : null,
      receivedAt: formatLocalDateTime(message.receivedAt, timezone),
      caption: message.caption ?? null,
      text: messageText(message),
    }))
    .filter((message) => message.text.trim().length > 0);

  const serializedMessageImages = messages.flatMap((message) =>
    imageMedia(message).map((media) => ({
      messageId: message.id,
      whatsappMessageId: message.whatsappMessageId,
      participantId: message.senderParticipantId,
      blobPath: media.blobPath,
      blobUrl: media.blobUrl,
      fileName: media.fileName ?? null,
      height: media.height ?? null,
      mimeType: media.mimeType ?? null,
      sortOrder: media.sortOrder,
      width: media.width ?? null,
      caption: message.caption ?? null,
      sentAt: message.sentAt
        ? formatLocalDateTime(message.sentAt, timezone)
        : null,
      receivedAt: formatLocalDateTime(message.receivedAt, timezone),
    })),
  );

  return {
    messages: serializedMessages,
    messageImages: serializedMessageImages,
  };
}

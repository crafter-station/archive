import { db } from "@/db/client";
import { GROUP_CHAT_JID } from "@/lib/whatsapp-constants";

export { GROUP_CHAT_JID };

export async function getGroupChatMessages() {
  return db.query.messages.findMany({
    orderBy: (message, { asc }) => [
      asc(message.sentAt),
      asc(message.receivedAt),
      asc(message.createdAt),
    ],
    where: (message, { and, eq, isNull }) =>
      and(
        eq(message.chatJid, GROUP_CHAT_JID),
        isNull(message.replyToMessageId),
        isNull(message.replyToWhatsappMessageId),
      ),
    with: {
      media: {
        orderBy: (media, { asc }) => [asc(media.sortOrder)],
      },
      reactions: {
        with: {
          participant: true,
        },
      },
      replyToMessage: {
        with: {
          sender: true,
        },
      },
      replies: {
        columns: {
          id: true,
        },
      },
      sender: true,
    },
  });
}

export async function getMessageThread(messageId: string | undefined) {
  if (!messageId) {
    return null;
  }

  const message = await db.query.messages.findFirst({
    where: (message, { and, eq }) =>
      and(eq(message.id, messageId), eq(message.chatJid, GROUP_CHAT_JID)),
    with: {
      media: {
        orderBy: (media, { asc }) => [asc(media.sortOrder)],
      },
      reactions: {
        with: {
          participant: true,
        },
      },
      replies: {
        columns: {
          id: true,
        },
      },
      replyToMessage: {
        with: {
          sender: true,
        },
      },
      sender: true,
    },
  });

  if (!message) {
    return null;
  }

  const replies = await db.query.messages.findMany({
    orderBy: (message, { asc }) => [
      asc(message.sentAt),
      asc(message.receivedAt),
      asc(message.createdAt),
    ],
    where: (reply, { and, eq, or }) =>
      and(
        eq(reply.chatJid, GROUP_CHAT_JID),
        or(
          eq(reply.replyToMessageId, message.id),
          eq(reply.replyToWhatsappMessageId, message.whatsappMessageId),
        ),
      ),
    with: {
      media: {
        orderBy: (media, { asc }) => [asc(media.sortOrder)],
      },
      reactions: {
        with: {
          participant: true,
        },
      },
      replies: {
        columns: {
          id: true,
        },
      },
      replyToMessage: {
        with: {
          sender: true,
        },
      },
      sender: true,
    },
  });

  return { message, replies };
}

export type ChatMessage = Awaited<
  ReturnType<typeof getGroupChatMessages>
>[number];
export type MessageThread = NonNullable<
  Awaited<ReturnType<typeof getMessageThread>>
>;

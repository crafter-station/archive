import type { ChatMessage } from "@/lib/chat-queries";
import { MessageBubble } from "./message-bubble";

type MessageListProps = {
  activeThreadId?: string;
  messages: ChatMessage[];
};

export function MessageList({ activeThreadId, messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-80 flex-1 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No messages have been stored yet. Send a WhatsApp webhook to populate
        this chat archive.
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-8">
      {messages.map((message, index) => (
        <MessageBubble
          isActiveThread={activeThreadId === message.id}
          key={message.id}
          message={message}
          previousMessage={messages[index - 1]}
        />
      ))}
    </div>
  );
}

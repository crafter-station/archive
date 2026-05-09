import {
  type ChatMessage,
  GROUP_CHAT_JID,
  type MessageThread,
} from "@/lib/chat-queries";
import { cn } from "@/lib/utils";
import { MessageList } from "./message-list";
import { ThreadPanel } from "./thread-panel";

type ChatShellProps = {
  messages: ChatMessage[];
  thread: MessageThread | null;
};

export function ChatShell({ messages, thread }: ChatShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <section className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-border border-b bg-background/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              WhatsApp Group Archive
            </p>
            <h1 className="truncate text-xl font-semibold tracking-tight">
              {GROUP_CHAT_JID}
            </h1>
          </div>
        </header>
        <div
          className={cn(
            "mx-auto grid w-full flex-1 gap-6 px-4 md:px-8",
            thread
              ? "max-w-7xl lg:grid-cols-[minmax(0,1fr)_25rem]"
              : "max-w-5xl",
          )}
        >
          <div className="min-w-0 overflow-y-auto">
            <MessageList
              activeThreadId={thread?.message.id}
              messages={messages}
            />
          </div>
          <ThreadPanel thread={thread} />
        </div>
      </section>
    </main>
  );
}

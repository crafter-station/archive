import Link from "next/link";

import type { MessageThread } from "@/lib/chat-queries";
import { MessageBubble } from "./message-bubble";

type ThreadPanelProps = {
  thread: MessageThread | null;
};

export function ThreadPanel({ thread }: ThreadPanelProps) {
  if (!thread) {
    return null;
  }

  return (
    <aside className="sticky top-24 flex max-h-[calc(100vh-7rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-border border-b px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Thread
          </p>
          <h2 className="truncate font-semibold">Replies</h2>
        </div>
        <Link
          className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          href="/"
        >
          Close
        </Link>
      </header>
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Original message
          </p>
          <MessageBubble message={thread.message} showThreadLink={false} />
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col gap-1">
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {thread.replies.length}{" "}
            {thread.replies.length === 1 ? "reply" : "replies"}
          </p>
          {thread.replies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No replies stored for this message yet.
            </div>
          ) : null}
          {thread.replies.map((reply, index) => (
            <MessageBubble
              key={reply.id}
              message={reply}
              previousMessage={thread.replies[index - 1]}
              showReplyPreview={false}
              showThreadLink={false}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

import Link from "next/link";

import type { ChatMessage } from "@/lib/chat-queries";
import { cn } from "@/lib/utils";
import { getParticipantLabel } from "@/lib/whatsapp-participants";
import { MessageMedia } from "./message-media";
import { ParticipantAvatar, participantAccent } from "./participant-avatar";
import { ReactionRow } from "./reaction-row";
import { ReplyPreview } from "./reply-preview";

type MessageBubbleProps = {
  isActiveThread?: boolean;
  message: ChatMessage;
  previousMessage?: ChatMessage;
  showReplyPreview?: boolean;
  showThreadLink?: boolean;
};

export function MessageBubble({
  isActiveThread,
  message,
  previousMessage,
  showReplyPreview = true,
  showThreadLink = true,
}: MessageBubbleProps) {
  const participantName = getParticipantLabel(message.sender);
  const startsGroup = previousMessage?.sender.id !== message.sender.id;
  const replyCount = message.replies?.length ?? 0;
  const body = getDisplayBody(message);
  const caption =
    message.caption && message.caption !== message.body
      ? message.caption
      : null;
  const hasMedia = message.media.length > 0;
  const isStickerOnly =
    hasMedia &&
    message.media.every((item) => item.mediaType === "sticker") &&
    !body &&
    !caption &&
    (!showReplyPreview || !message.replyToMessage) &&
    !message.quotedText;

  return (
    <article
      className={cn(
        "flex gap-3",
        startsGroup ? "pt-5" : "pt-1",
        !startsGroup && "pl-12",
      )}
    >
      {startsGroup ? (
        <ParticipantAvatar jid={message.sender.jid} name={participantName} />
      ) : null}
      <div className="flex min-w-0 max-w-3xl flex-1 flex-col gap-1.5">
        {startsGroup ? (
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: participantAccent(message.sender.jid) }}
            >
              {participantName}
            </span>
            <time className="text-xs text-muted-foreground">
              {formatMessageTime(message.sentAt ?? message.receivedAt)}
            </time>
          </div>
        ) : null}
        <div
          className={cn(
            "w-fit max-w-full rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
            hasMedia ? "p-1" : "px-3 py-2",
            isStickerOnly &&
              "border-transparent bg-transparent p-0 shadow-none",
            isActiveThread && "border-primary ring-2 ring-primary/15",
          )}
        >
          <div className="flex flex-col gap-2">
            {showReplyPreview ? <ReplyPreview message={message} /> : null}
            <MessageMedia media={message.media} />
            {body ? (
              <p className="whitespace-pre-wrap break-words px-2 text-sm leading-6 first:px-0">
                {body}
              </p>
            ) : null}
            {caption ? (
              <p className="whitespace-pre-wrap break-words px-2 text-sm leading-6 text-muted-foreground first:px-0">
                {caption}
              </p>
            ) : null}
            {!body && !caption && message.media.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {message.messageType}
              </p>
            ) : null}
            <time
              className={cn(
                "self-end px-1 text-[11px] leading-none text-muted-foreground",
                isStickerOnly &&
                  "rounded-full bg-background/85 px-2 py-1 shadow-sm",
              )}
            >
              {formatShortTime(message.sentAt ?? message.receivedAt)}
            </time>
          </div>
        </div>
        {showThreadLink && replyCount > 0 ? (
          <Link
            className="w-fit rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            href={`/?thread=${message.id}`}
          >
            View thread ({replyCount})
          </Link>
        ) : null}
        <ReactionRow reactions={message.reactions} />
      </div>
    </article>
  );
}

function getDisplayBody(message: ChatMessage) {
  if (message.media.length > 0 && isGeneratedMediaSummary(message.body)) {
    return null;
  }

  return message.body;
}

function isGeneratedMediaSummary(value: string | null) {
  return value?.startsWith("Message type:") || value?.startsWith("Album:");
}

function formatMessageTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatShortTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

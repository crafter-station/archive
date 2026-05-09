import type { ChatMessage } from "@/lib/chat-queries";
import { cn } from "@/lib/utils";
import { getParticipantLabel } from "@/lib/whatsapp-participants";

type ReplyPreviewProps = {
  message: ChatMessage;
  className?: string;
};

export function ReplyPreview({ className, message }: ReplyPreviewProps) {
  const reply = message.replyToMessage;
  const label = reply
    ? getParticipantLabel(reply.sender)
    : message.replyToParticipantJid;
  const content = reply
    ? (reply.body ?? reply.caption ?? reply.messageType)
    : message.quotedText;

  if (!label && !content) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border-l-2 border-primary/40 bg-background/70 px-3 py-2 text-xs",
        className,
      )}
    >
      {label ? (
        <div className="font-medium text-foreground">{label}</div>
      ) : null}
      {content ? (
        <div className="line-clamp-2 text-muted-foreground">{content}</div>
      ) : null}
    </div>
  );
}

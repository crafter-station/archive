import Image from "next/image";

import { cn } from "@/lib/utils";

type ParticipantAvatarProps = {
  jid: string;
  name: string;
  className?: string;
};

export function ParticipantAvatar({
  className,
  jid,
  name,
}: ParticipantAvatarProps) {
  return (
    <div
      className={cn(
        "relative size-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted shadow-sm",
        className,
      )}
      title={name}
    >
      <Image
        alt={name}
        className="object-cover"
        fill
        sizes="2.25rem"
        src={`https://avatar.vercel.sh/${encodeURIComponent(jid)}`}
        unoptimized
      />
    </div>
  );
}

export function participantAccent(jid: string) {
  return `hsl(${hashToHue(jid)} 72% 44%)`;
}

function hashToHue(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 360;
  }

  return hash;
}

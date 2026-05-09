import Link from "next/link";

import { formatLocalDateTime } from "@/lib/log-windows";

type EntityCardProps = {
  description: string;
  footer?: string;
  link?: string;
  messageId?: string;
  participant?: string | null;
  time?: Date | null;
  timezone?: string;
  title: string;
};

export function EntityCard({
  description,
  footer,
  link,
  messageId,
  participant,
  time,
  timezone = "America/Bogota",
  title,
}: EntityCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-2">
        <h2 className="font-medium text-base">{title}</h2>
        <p className="text-muted-foreground text-sm leading-6">{description}</p>
        {link ? (
          <a
            className="block break-all text-sm text-primary underline-offset-4 hover:underline"
            href={link}
            rel="noreferrer"
            target="_blank"
          >
            {link}
          </a>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {time ? <span>{formatLocalDateTime(time, timezone)}</span> : null}
        {participant ? <span>Shared by {participant}</span> : null}
        {messageId ? (
          <Link href={`/?thread=${messageId}`}>Source message</Link>
        ) : null}
        {footer ? <span>{footer}</span> : null}
      </div>
    </article>
  );
}

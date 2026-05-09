import { formatLocalDateTime } from "@/lib/log-windows";

type LogCardProps = {
  finalResponse: string | null;
  status: string;
  timezone: string;
  windowEndUtc: Date;
  windowStartUtc: Date;
};

export function LogCard({
  finalResponse,
  status,
  timezone,
  windowEndUtc,
  windowStartUtc,
}: LogCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {formatLocalDateTime(windowStartUtc, timezone)} -{" "}
          {formatLocalDateTime(windowEndUtc, timezone)}
        </span>
        <span className="uppercase tracking-[0.16em]">{status}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">
        {finalResponse ?? "This log has not completed yet."}
      </p>
    </article>
  );
}

import Link from "next/link";

import type { DayTab } from "@/components/logs/day-tabs";
import {
  DEFAULT_LOG_TIMEZONE,
  formatLocalDate,
  getWeekDays,
  shiftLocalDate,
} from "@/lib/log-windows";
import { cn } from "@/lib/utils";

export function WeekCalendar({
  activeTab,
  date,
}: {
  activeTab: DayTab;
  date: string;
}) {
  const days = getWeekDays(date).toReversed();
  const today = formatLocalDate(new Date(), DEFAULT_LOG_TIMEZONE);
  const previousWeek = shiftLocalDate(date, -7);
  const nextWeek = shiftLocalDate(date, 7);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        <Link
          className="hover:text-foreground"
          href={`/${previousWeek}?tab=${activeTab}`}
        >
          Previous
        </Link>
        <Link
          className="hover:text-foreground"
          href={`/${today}?tab=${activeTab}`}
        >
          Today
        </Link>
        <Link
          className="hover:text-foreground"
          href={`/${nextWeek}?tab=${activeTab}`}
        >
          Next
        </Link>
      </div>
      <div className="grid grid-cols-7 border border-border">
        {days.map((day) => (
          <Link
            className={cn(
              "min-w-0 border-border border-r px-2 py-3 text-center text-xs last:border-r-0 hover:bg-muted md:text-sm",
              day.slug === date &&
                "bg-primary text-primary-foreground hover:bg-primary",
            )}
            href={`/${day.slug}?tab=${activeTab}`}
            key={day.slug}
          >
            <span className="block truncate">{day.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

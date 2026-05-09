import Link from "next/link";

import { cn } from "@/lib/utils";

export const dayTabs = ["logs", "ships", "resources", "events"] as const;
export type DayTab = (typeof dayTabs)[number];

export function getDayTab(value: string | string[] | undefined): DayTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return dayTabs.includes(tab as DayTab) ? (tab as DayTab) : "logs";
}

export function DayTabs({
  activeTab,
  date,
}: {
  activeTab: DayTab;
  date: string;
}) {
  return (
    <nav className="grid grid-cols-2 border border-border md:inline-grid md:grid-cols-4">
      {dayTabs.map((tab) => (
        <Link
          className={cn(
            "px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.16em] transition-colors",
            activeTab === tab
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          href={`/${date}?tab=${tab}`}
          key={tab}
        >
          {tab}
        </Link>
      ))}
    </nav>
  );
}

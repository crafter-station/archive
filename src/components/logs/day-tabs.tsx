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
    <nav
      aria-label="Daily archive sections"
      className="grid w-full grid-cols-2 bg-muted p-[3px] md:grid-cols-4"
    >
      {dayTabs.map((tab) => (
        <Link
          aria-current={activeTab === tab ? "page" : undefined}
          className={cn(
            "flex h-10 items-center justify-center border border-transparent px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground",
            activeTab === tab &&
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
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

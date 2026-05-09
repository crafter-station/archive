import Link from "next/link";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <Tabs className="w-full" value={activeTab}>
      <TabsList className="grid h-auto w-full grid-cols-2 p-0 md:grid-cols-4">
        {dayTabs.map((tab) => (
          <TabsTrigger
            className="h-10 border-border/70 bg-muted/70 px-4 py-2 uppercase tracking-[0.16em] text-muted-foreground hover:bg-muted hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:shadow-none"
            key={tab}
            nativeButton={false}
            render={<Link href={`/${date}?tab=${tab}`} />}
            value={tab}
          >
            {tab}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

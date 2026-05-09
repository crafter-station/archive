import { notFound } from "next/navigation";

import { DayTabs, getDayTab } from "@/components/logs/day-tabs";
import { EntityCard } from "@/components/logs/entity-card";
import { LogCard } from "@/components/logs/log-card";
import { WeekCalendar } from "@/components/logs/week-calendar";
import { getDayDashboard } from "@/lib/log-agent-queries";
import { DEFAULT_LOG_TIMEZONE, isDateSlug } from "@/lib/log-windows";

export const revalidate = 60;

type DayPageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-2xl border border-border border-dashed bg-muted/30 p-8 text-center text-muted-foreground text-sm">
      No {label} for this date.
    </div>
  );
}

export default async function DayPage({ params, searchParams }: DayPageProps) {
  const [{ date }, query] = await Promise.all([params, searchParams]);

  if (!isDateSlug(date)) {
    notFound();
  }

  const activeTab = getDayTab(query.tab);
  const dashboard = await getDayDashboard(date, DEFAULT_LOG_TIMEZONE);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-border border-b bg-background/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
                Community log
              </p>
              <h1 className="font-medium text-2xl">{date}</h1>
            </div>
            <p className="text-muted-foreground text-xs">
              Times shown in {DEFAULT_LOG_TIMEZONE}
            </p>
          </div>
          <WeekCalendar activeTab={activeTab} date={date} />
          <DayTabs activeTab={activeTab} date={date} />
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6 md:px-8">
        {activeTab === "logs" ? (
          dashboard.logs.length > 0 ? (
            dashboard.logs.map((log) => <LogCard key={log.id} {...log} />)
          ) : (
            <EmptyState label="logs" />
          )
        ) : null}

        {activeTab === "ships" ? (
          dashboard.ships.length > 0 ? (
            dashboard.ships.map((ship) => (
              <EntityCard
                description={ship.description}
                key={ship.id}
                link={ship.link}
                messageId={ship.sourceMessageId}
                participant={
                  ship.sourceParticipant.displayName ??
                  ship.sourceParticipant.jid
                }
                title={ship.title}
              />
            ))
          ) : (
            <EmptyState label="ships" />
          )
        ) : null}

        {activeTab === "resources" ? (
          dashboard.resources.length > 0 ? (
            dashboard.resources.map((resource) => (
              <EntityCard
                description={resource.description}
                key={resource.id}
                link={resource.link}
                messageId={resource.sourceMessageId}
                participant={
                  resource.sourceParticipant.displayName ??
                  resource.sourceParticipant.jid
                }
                title={resource.title}
              />
            ))
          ) : (
            <EmptyState label="resources" />
          )
        ) : null}

        {activeTab === "events" ? (
          dashboard.events.length > 0 ? (
            dashboard.events.map((event) => (
              <EntityCard
                description={event.description}
                footer={event.interpretation ?? undefined}
                key={event.id}
                messageId={event.sourceMessageId}
                participant={
                  event.sourceParticipant.displayName ??
                  event.sourceParticipant.jid
                }
                time={event.startsAtUtc}
                timezone={event.timezone}
                title={event.title}
              />
            ))
          ) : (
            <EmptyState label="events" />
          )
        ) : null}
      </section>
    </main>
  );
}

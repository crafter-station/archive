import { and, asc, desc, eq, exists, gte, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import {
  events,
  logs,
  memories,
  messages,
  resources,
  ships,
} from "@/db/schema";
import { getLocalDateRangeUtc } from "@/lib/log-windows";
import { GROUP_CHAT_JID } from "@/lib/whatsapp-constants";

export const LOG_AGENT_PROMPT_VERSION = "2026-05-09.v1";

export async function createOrReuseRunningLog({
  contextStartUtc,
  previousLogId,
  timezone,
  triggerRunId,
  windowEndUtc,
  windowStartUtc,
}: {
  contextStartUtc: Date;
  previousLogId: string | null;
  timezone: string;
  triggerRunId?: string;
  windowEndUtc: Date;
  windowStartUtc: Date;
}) {
  const [created] = await db
    .insert(logs)
    .values({
      contextStartUtc,
      previousLogId,
      promptVersion: LOG_AGENT_PROMPT_VERSION,
      status: "running",
      timezone,
      triggerRunId,
      windowEndUtc,
      windowStartUtc,
    })
    .onConflictDoUpdate({
      target: [logs.windowStartUtc, logs.windowEndUtc],
      set: {
        contextStartUtc,
        error: null,
        previousLogId,
        status: "running",
        triggerRunId,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create or reuse log row");
  }

  return created;
}

export async function getCompletedLog(
  windowStartUtc: Date,
  windowEndUtc: Date,
) {
  return db.query.logs.findFirst({
    where: (log, { and, eq }) =>
      and(
        eq(log.windowStartUtc, windowStartUtc),
        eq(log.windowEndUtc, windowEndUtc),
        eq(log.status, "completed"),
      ),
  });
}

export async function getPreviousLog(windowStartUtc: Date, windowEndUtc: Date) {
  return db.query.logs.findFirst({
    where: (log, { and, eq }) =>
      and(
        eq(log.windowStartUtc, windowStartUtc),
        eq(log.windowEndUtc, windowEndUtc),
      ),
  });
}

export async function completeLog({
  finalResponse,
  logId,
  model,
}: {
  finalResponse: string;
  logId: string;
  model: string;
}) {
  await db
    .update(logs)
    .set({
      error: null,
      finalResponse,
      model,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(eq(logs.id, logId));
}

export async function failLog(logId: string, error: unknown) {
  await db
    .update(logs)
    .set({
      error: error instanceof Error ? error.message : String(error),
      status: "failed",
      updatedAt: new Date(),
    })
    .where(eq(logs.id, logId));
}

export async function getMessagesForAgentContext(
  contextStartUtc: Date,
  windowEndUtc: Date,
) {
  return db.query.messages.findMany({
    orderBy: (message, { asc }) => [
      asc(message.sentAt),
      asc(message.receivedAt),
      asc(message.createdAt),
    ],
    where: (message, { and, eq, gte, lt }) =>
      and(
        eq(message.chatJid, GROUP_CHAT_JID),
        gte(message.receivedAt, contextStartUtc),
        lt(message.receivedAt, windowEndUtc),
      ),
    with: {
      sender: true,
    },
  });
}

export async function listActiveMemories() {
  return db.query.memories.findMany({
    orderBy: (memory, { desc }) => [desc(memory.updatedAt)],
    where: (memory, { isNull }) => isNull(memory.deletedAt),
  });
}

export async function listShips() {
  return db.query.ships.findMany({
    orderBy: (ship, { desc }) => [desc(ship.updatedAt)],
    limit: 100,
    with: { sourceParticipant: true, sourceMessage: true },
  });
}

export async function listResources() {
  return db.query.resources.findMany({
    orderBy: (resource, { desc }) => [desc(resource.updatedAt)],
    limit: 100,
    with: { sourceParticipant: true, sourceMessage: true },
  });
}

export async function listEvents() {
  return db.query.events.findMany({
    orderBy: (event, { desc }) => [desc(event.updatedAt)],
    limit: 100,
    with: { sourceParticipant: true, sourceMessage: true },
  });
}

export async function upsertMemory(input: {
  category?: string | null;
  content: string;
  importance?: number | null;
  key: string;
  logId: string;
  sourceMessageId?: string | null;
  sourceParticipantId?: string | null;
}) {
  const [memory] = await db
    .insert(memories)
    .values({
      category: input.category,
      content: input.content,
      importance: input.importance,
      key: input.key,
      sourceLogId: input.logId,
      sourceMessageId: input.sourceMessageId,
      sourceParticipantId: input.sourceParticipantId,
    })
    .onConflictDoUpdate({
      target: memories.key,
      set: {
        category: input.category,
        content: input.content,
        deletedAt: null,
        importance: input.importance,
        sourceLogId: input.logId,
        sourceMessageId: input.sourceMessageId,
        sourceParticipantId: input.sourceParticipantId,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!memory) {
    throw new Error("Failed to upsert memory");
  }

  return memory;
}

export async function updateMemory(input: {
  category?: string | null;
  content?: string;
  id: string;
  importance?: number | null;
}) {
  const [memory] = await db
    .update(memories)
    .set({
      category: input.category,
      content: input.content,
      importance: input.importance,
      updatedAt: new Date(),
    })
    .where(eq(memories.id, input.id))
    .returning();

  if (!memory) {
    throw new Error("Memory not found");
  }

  return memory;
}

export async function removeMemory(id: string) {
  const [memory] = await db
    .update(memories)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(memories.id, id))
    .returning();

  if (!memory) {
    throw new Error("Memory not found");
  }

  return memory;
}

export async function upsertShip(input: {
  description: string;
  link: string;
  logId: string;
  sourceMessageId: string;
  sourceParticipantId: string;
  title: string;
}) {
  const [ship] = await db
    .insert(ships)
    .values({
      description: input.description,
      link: input.link,
      sourceLogId: input.logId,
      sourceMessageId: input.sourceMessageId,
      sourceParticipantId: input.sourceParticipantId,
      title: input.title,
    })
    .onConflictDoUpdate({
      target: ships.link,
      set: {
        description: input.description,
        sourceLogId: input.logId,
        sourceMessageId: input.sourceMessageId,
        sourceParticipantId: input.sourceParticipantId,
        title: input.title,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!ship) {
    throw new Error("Failed to upsert ship");
  }

  return ship;
}

export async function updateShip(input: {
  description?: string;
  id: string;
  link?: string;
  title?: string;
}) {
  const [ship] = await db
    .update(ships)
    .set({
      description: input.description,
      link: input.link,
      title: input.title,
      updatedAt: new Date(),
    })
    .where(eq(ships.id, input.id))
    .returning();

  if (!ship) {
    throw new Error("Ship not found");
  }

  return ship;
}

export async function upsertResource(input: {
  description: string;
  link: string;
  logId: string;
  sourceMessageId: string;
  sourceParticipantId: string;
  title: string;
}) {
  const [resource] = await db
    .insert(resources)
    .values({
      description: input.description,
      link: input.link,
      sourceLogId: input.logId,
      sourceMessageId: input.sourceMessageId,
      sourceParticipantId: input.sourceParticipantId,
      title: input.title,
    })
    .onConflictDoUpdate({
      target: resources.link,
      set: {
        description: input.description,
        sourceLogId: input.logId,
        sourceMessageId: input.sourceMessageId,
        sourceParticipantId: input.sourceParticipantId,
        title: input.title,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!resource) {
    throw new Error("Failed to upsert resource");
  }

  return resource;
}

export async function updateResource(input: {
  description?: string;
  id: string;
  link?: string;
  title?: string;
}) {
  const [resource] = await db
    .update(resources)
    .set({
      description: input.description,
      link: input.link,
      title: input.title,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, input.id))
    .returning();

  if (!resource) {
    throw new Error("Resource not found");
  }

  return resource;
}

export async function createEvent(input: {
  description: string;
  interpretation?: string | null;
  localDate?: string | null;
  localTime?: string | null;
  logId: string;
  sourceMessageId: string;
  sourceParticipantId: string;
  startsAtUtc?: Date | null;
  timezone: string;
  title: string;
}) {
  const [event] = await db
    .insert(events)
    .values({
      description: input.description,
      interpretation: input.interpretation,
      localDate: input.localDate,
      localTime: input.localTime,
      sourceLogId: input.logId,
      sourceMessageId: input.sourceMessageId,
      sourceParticipantId: input.sourceParticipantId,
      startsAtUtc: input.startsAtUtc,
      timezone: input.timezone,
      title: input.title,
    })
    .returning();

  if (!event) {
    throw new Error("Failed to create event");
  }

  return event;
}

export async function updateEvent(input: {
  description?: string;
  id: string;
  interpretation?: string | null;
  localDate?: string | null;
  localTime?: string | null;
  startsAtUtc?: Date | null;
  timezone?: string;
  title?: string;
}) {
  const [event] = await db
    .update(events)
    .set({
      description: input.description,
      interpretation: input.interpretation,
      localDate: input.localDate,
      localTime: input.localTime,
      startsAtUtc: input.startsAtUtc,
      timezone: input.timezone,
      title: input.title,
      updatedAt: new Date(),
    })
    .where(eq(events.id, input.id))
    .returning();

  if (!event) {
    throw new Error("Event not found");
  }

  return event;
}

export async function getDayDashboard(date: string, timezone: string) {
  const { endUtc, startUtc } = getLocalDateRangeUtc(date, timezone);

  const [dayLogs, dayShips, dayResources, dayEvents] = await Promise.all([
    db.query.logs.findMany({
      orderBy: [asc(logs.windowStartUtc)],
      where: and(
        lt(logs.windowStartUtc, endUtc),
        gte(logs.windowEndUtc, startUtc),
      ),
    }),
    db.query.ships.findMany({
      orderBy: [desc(ships.createdAt)],
      where: exists(
        db
          .select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.id, ships.sourceMessageId),
              gte(messages.receivedAt, startUtc),
              lt(messages.receivedAt, endUtc),
            ),
          ),
      ),
      with: { sourceParticipant: true, sourceMessage: true },
    }),
    db.query.resources.findMany({
      orderBy: [desc(resources.createdAt)],
      where: exists(
        db
          .select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.id, resources.sourceMessageId),
              gte(messages.receivedAt, startUtc),
              lt(messages.receivedAt, endUtc),
            ),
          ),
      ),
      with: { sourceParticipant: true, sourceMessage: true },
    }),
    db.query.events.findMany({
      orderBy: [asc(events.startsAtUtc), desc(events.createdAt)],
      where: or(
        eq(events.localDate, date),
        and(gte(events.startsAtUtc, startUtc), lt(events.startsAtUtc, endUtc)),
      ),
      with: { sourceParticipant: true, sourceMessage: true },
    }),
  ]);

  return {
    events: dayEvents,
    logs: dayLogs,
    resources: dayResources,
    ships: dayShips,
  };
}

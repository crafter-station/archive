import { tool } from "ai";
import { z } from "zod";

import {
  createEvent,
  listActiveMemories,
  listEvents,
  listResources,
  listShips,
  removeMemory,
  updateEvent,
  updateMemory,
  updateResource,
  updateShip,
  upsertMemory,
  upsertResource,
  upsertShip,
} from "@/lib/log-agent-queries";
import { DEFAULT_LOG_TIMEZONE } from "@/lib/log-windows";

const optionalNullableString = z.string().min(1).nullable().optional();
const sourceSchema = z.object({
  sourceMessageId: z.string().uuid(),
  sourceParticipantId: z.string().uuid(),
});

function dateOrNull(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

export function createLogAgentTools(logId: string) {
  return {
    listMemories: tool({
      description:
        "List active memories already known about the community chat.",
      inputSchema: z.object({}),
      execute: async () => listActiveMemories(),
    }),
    createMemory: tool({
      description:
        "Create or restore a durable memory. Use a stable, lowercase key so retries and future updates target the same memory.",
      inputSchema: sourceSchema
        .extend({
          category: optionalNullableString,
          content: z.string().min(1),
          importance: z.number().int().min(1).max(5).nullable().optional(),
          key: z.string().min(1),
        })
        .partial({ sourceMessageId: true, sourceParticipantId: true }),
      execute: async (input) => upsertMemory({ ...input, logId }),
    }),
    updateMemory: tool({
      description: "Update an existing memory by id.",
      inputSchema: z.object({
        category: optionalNullableString,
        content: z.string().min(1).optional(),
        id: z.string().uuid(),
        importance: z.number().int().min(1).max(5).nullable().optional(),
      }),
      execute: async (input) => updateMemory(input),
    }),
    removeMemory: tool({
      description:
        "Soft-delete an existing memory by id when it is no longer true or useful.",
      inputSchema: z.object({ id: z.string().uuid() }),
      execute: async ({ id }) => removeMemory(id),
    }),
    listShips: tool({
      description: "List recent ships to avoid creating duplicates.",
      inputSchema: z.object({}),
      execute: async () => listShips(),
    }),
    createShip: tool({
      description:
        "Create or update a ship: a live internet artifact crafted by a community member.",
      inputSchema: sourceSchema.extend({
        description: z.string().min(1),
        link: z.string().url(),
        title: z.string().min(1),
      }),
      execute: async (input) => upsertShip({ ...input, logId }),
    }),
    updateShip: tool({
      description: "Update an existing ship by id.",
      inputSchema: z.object({
        description: z.string().min(1).optional(),
        id: z.string().uuid(),
        link: z.string().url().optional(),
        title: z.string().min(1).optional(),
      }),
      execute: async (input) => updateShip(input),
    }),
    listResources: tool({
      description: "List recent resources to avoid creating duplicates.",
      inputSchema: z.object({}),
      execute: async () => listResources(),
    }),
    createResource: tool({
      description:
        "Create or update a helpful resource link shared by the community.",
      inputSchema: sourceSchema.extend({
        description: z.string().min(1),
        link: z.string().url(),
        title: z.string().min(1),
      }),
      execute: async (input) => upsertResource({ ...input, logId }),
    }),
    updateResource: tool({
      description: "Update an existing resource by id.",
      inputSchema: z.object({
        description: z.string().min(1).optional(),
        id: z.string().uuid(),
        link: z.string().url().optional(),
        title: z.string().min(1).optional(),
      }),
      execute: async (input) => updateResource(input),
    }),
    listEvents: tool({
      description: "List recent events to avoid creating duplicates.",
      inputSchema: z.object({}),
      execute: async () => listEvents(),
    }),
    createEvent: tool({
      description:
        "Create an event. Interpret ambiguous LATAM times in America/Bogota unless another timezone is explicit.",
      inputSchema: sourceSchema.extend({
        description: z.string().min(1),
        interpretation: optionalNullableString,
        localDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        localTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable()
          .optional(),
        startsAtUtc: z.string().datetime().nullable().optional(),
        timezone: z.string().min(1).default(DEFAULT_LOG_TIMEZONE),
        title: z.string().min(1),
      }),
      execute: async (input) =>
        createEvent({
          ...input,
          logId,
          startsAtUtc: dateOrNull(input.startsAtUtc),
        }),
    }),
    updateEvent: tool({
      description: "Update an existing event by id.",
      inputSchema: z.object({
        description: z.string().min(1).optional(),
        id: z.string().uuid(),
        interpretation: optionalNullableString,
        localDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        localTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable()
          .optional(),
        startsAtUtc: z.string().datetime().nullable().optional(),
        timezone: z.string().min(1).optional(),
        title: z.string().min(1).optional(),
      }),
      execute: async (input) =>
        updateEvent({ ...input, startsAtUtc: dateOrNull(input.startsAtUtc) }),
    }),
  };
}

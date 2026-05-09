import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jid: text("jid").notNull(),
    displayName: text("display_name"),
    phoneNumber: text("phone_number"),
    ...timestamps,
  },
  (table) => [uniqueIndex("participants_jid_unique").on(table.jid)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    whatsappMessageId: text("whatsapp_message_id").notNull(),
    chatJid: text("chat_jid").notNull(),
    senderParticipantId: uuid("sender_participant_id")
      .notNull()
      .references(() => participants.id),
    messageType: text("message_type").notNull(),
    body: text("body"),
    caption: text("caption"),
    audioTranscription: text("audio_transcription"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    replyToMessageId: uuid("reply_to_message_id").references(
      (): AnyPgColumn => messages.id,
    ),
    replyToWhatsappMessageId: text("reply_to_whatsapp_message_id"),
    replyToParticipantJid: text("reply_to_participant_jid"),
    quotedText: text("quoted_text"),
    rawPayload: jsonb("raw_payload").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("messages_whatsapp_message_id_unique").on(
      table.whatsappMessageId,
    ),
    index("messages_chat_sent_at_idx").on(table.chatJid, table.sentAt),
    index("messages_sender_participant_id_idx").on(table.senderParticipantId),
    index("messages_reply_to_message_id_idx").on(table.replyToMessageId),
    index("messages_reply_to_whatsapp_message_id_idx").on(
      table.replyToWhatsappMessageId,
    ),
  ],
);

export const messageMedia = pgTable(
  "message_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    mediaType: text("media_type").notNull(),
    mimeType: text("mime_type"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    sha256: text("sha256"),
    blobUrl: text("blob_url").notNull(),
    blobPath: text("blob_path").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    sortOrder: integer("sort_order").notNull().default(0),
    rawMediaPayload: jsonb("raw_media_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("message_media_message_id_idx").on(table.messageId),
    index("message_media_media_type_idx").on(table.mediaType),
    uniqueIndex("message_media_message_sort_order_unique").on(
      table.messageId,
      table.sortOrder,
    ),
  ],
);

export const messageReactions = pgTable(
  "message_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "cascade",
    }),
    targetWhatsappMessageId: text("target_whatsapp_message_id").notNull(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id),
    emoji: text("emoji"),
    reactedAt: timestamp("reacted_at", { withTimezone: true }),
    rawPayload: jsonb("raw_payload").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("message_reactions_target_participant_unique").on(
      table.targetWhatsappMessageId,
      table.participantId,
    ),
    index("message_reactions_message_id_idx").on(table.messageId),
    index("message_reactions_participant_id_idx").on(table.participantId),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: text("event_id"),
    eventHash: text("event_hash").notNull(),
    source: text("source").notNull().default("whatsapp"),
    status: text("status").notNull().default("received"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    rawPayload: jsonb("raw_payload").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("webhook_events_event_hash_unique").on(table.eventHash),
    index("webhook_events_status_created_at_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const logs = pgTable(
  "logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    windowStartUtc: timestamp("window_start_utc", {
      withTimezone: true,
    }).notNull(),
    windowEndUtc: timestamp("window_end_utc", { withTimezone: true }).notNull(),
    contextStartUtc: timestamp("context_start_utc", {
      withTimezone: true,
    }).notNull(),
    timezone: text("timezone").notNull().default("America/Bogota"),
    previousLogId: uuid("previous_log_id").references(
      (): AnyPgColumn => logs.id,
    ),
    finalResponse: text("final_response"),
    status: text("status").notNull().default("running"),
    model: text("model"),
    promptVersion: text("prompt_version").notNull(),
    triggerRunId: text("trigger_run_id"),
    error: text("error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("logs_window_unique").on(
      table.windowStartUtc,
      table.windowEndUtc,
    ),
    index("logs_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    content: text("content").notNull(),
    category: text("category"),
    importance: integer("importance"),
    sourceLogId: uuid("source_log_id").references(() => logs.id),
    sourceMessageId: uuid("source_message_id").references(() => messages.id),
    sourceParticipantId: uuid("source_participant_id").references(
      () => participants.id,
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("memories_key_unique").on(table.key),
    index("memories_deleted_at_idx").on(table.deletedAt),
  ],
);

export const ships = pgTable(
  "ships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    link: text("link").notNull(),
    sourceMessageId: uuid("source_message_id")
      .notNull()
      .references(() => messages.id),
    sourceParticipantId: uuid("source_participant_id")
      .notNull()
      .references(() => participants.id),
    sourceLogId: uuid("source_log_id").references(() => logs.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("ships_link_unique").on(table.link),
    index("ships_source_message_id_idx").on(table.sourceMessageId),
    index("ships_source_participant_id_idx").on(table.sourceParticipantId),
  ],
);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    link: text("link").notNull(),
    sourceMessageId: uuid("source_message_id")
      .notNull()
      .references(() => messages.id),
    sourceParticipantId: uuid("source_participant_id")
      .notNull()
      .references(() => participants.id),
    sourceLogId: uuid("source_log_id").references(() => logs.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("resources_link_unique").on(table.link),
    index("resources_source_message_id_idx").on(table.sourceMessageId),
    index("resources_source_participant_id_idx").on(table.sourceParticipantId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    startsAtUtc: timestamp("starts_at_utc", { withTimezone: true }),
    timezone: text("timezone").notNull().default("America/Bogota"),
    localDate: text("local_date"),
    localTime: text("local_time"),
    interpretation: text("interpretation"),
    sourceMessageId: uuid("source_message_id")
      .notNull()
      .references(() => messages.id),
    sourceParticipantId: uuid("source_participant_id")
      .notNull()
      .references(() => participants.id),
    sourceLogId: uuid("source_log_id").references(() => logs.id),
    ...timestamps,
  },
  (table) => [
    index("events_local_date_idx").on(table.localDate),
    index("events_starts_at_utc_idx").on(table.startsAtUtc),
    index("events_source_message_id_idx").on(table.sourceMessageId),
    index("events_source_participant_id_idx").on(table.sourceParticipantId),
  ],
);

export const participantsRelations = relations(participants, ({ many }) => ({
  messages: many(messages),
  reactions: many(messageReactions),
  memories: many(memories),
  ships: many(ships),
  resources: many(resources),
  events: many(events),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(participants, {
    fields: [messages.senderParticipantId],
    references: [participants.id],
  }),
  replyToMessage: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id],
    relationName: "messageReplies",
  }),
  replies: many(messages, { relationName: "messageReplies" }),
  media: many(messageMedia),
  reactions: many(messageReactions),
}));

export const messageMediaRelations = relations(messageMedia, ({ one }) => ({
  message: one(messages, {
    fields: [messageMedia.messageId],
    references: [messages.id],
  }),
}));

export const messageReactionsRelations = relations(
  messageReactions,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageReactions.messageId],
      references: [messages.id],
    }),
    participant: one(participants, {
      fields: [messageReactions.participantId],
      references: [participants.id],
    }),
  }),
);

export const logsRelations = relations(logs, ({ one, many }) => ({
  previousLog: one(logs, {
    fields: [logs.previousLogId],
    references: [logs.id],
    relationName: "previousLog",
  }),
  nextLogs: many(logs, { relationName: "previousLog" }),
  memories: many(memories),
  ships: many(ships),
  resources: many(resources),
  events: many(events),
}));

export const memoriesRelations = relations(memories, ({ one }) => ({
  sourceLog: one(logs, {
    fields: [memories.sourceLogId],
    references: [logs.id],
  }),
  sourceMessage: one(messages, {
    fields: [memories.sourceMessageId],
    references: [messages.id],
  }),
  sourceParticipant: one(participants, {
    fields: [memories.sourceParticipantId],
    references: [participants.id],
  }),
}));

export const shipsRelations = relations(ships, ({ one }) => ({
  sourceLog: one(logs, {
    fields: [ships.sourceLogId],
    references: [logs.id],
  }),
  sourceMessage: one(messages, {
    fields: [ships.sourceMessageId],
    references: [messages.id],
  }),
  sourceParticipant: one(participants, {
    fields: [ships.sourceParticipantId],
    references: [participants.id],
  }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  sourceLog: one(logs, {
    fields: [resources.sourceLogId],
    references: [logs.id],
  }),
  sourceMessage: one(messages, {
    fields: [resources.sourceMessageId],
    references: [messages.id],
  }),
  sourceParticipant: one(participants, {
    fields: [resources.sourceParticipantId],
    references: [participants.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  sourceLog: one(logs, {
    fields: [events.sourceLogId],
    references: [logs.id],
  }),
  sourceMessage: one(messages, {
    fields: [events.sourceMessageId],
    references: [messages.id],
  }),
  sourceParticipant: one(participants, {
    fields: [events.sourceParticipantId],
    references: [participants.id],
  }),
}));

export type Participant = typeof participants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageMedia = typeof messageMedia.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type Memory = typeof memories.$inferSelect;
export type Ship = typeof ships.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Event = typeof events.$inferSelect;

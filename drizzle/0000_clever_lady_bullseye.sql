CREATE TABLE "message_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"mime_type" text,
	"file_name" text,
	"file_size" integer,
	"sha256" text,
	"blob_url" text NOT NULL,
	"blob_path" text NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"raw_media_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid,
	"target_whatsapp_message_id" text NOT NULL,
	"participant_id" uuid NOT NULL,
	"emoji" text,
	"reacted_at" timestamp with time zone,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_message_id" text NOT NULL,
	"chat_jid" text NOT NULL,
	"sender_participant_id" uuid NOT NULL,
	"message_type" text NOT NULL,
	"body" text,
	"caption" text,
	"sent_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reply_to_message_id" uuid,
	"reply_to_whatsapp_message_id" text,
	"reply_to_participant_jid" text,
	"quoted_text" text,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jid" text NOT NULL,
	"display_name" text,
	"phone_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text,
	"event_hash" text NOT NULL,
	"source" text DEFAULT 'whatsapp' NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_media" ADD CONSTRAINT "message_media_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_participant_id_participants_id_fk" FOREIGN KEY ("sender_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_message_id_messages_id_fk" FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_media_message_id_idx" ON "message_media" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_media_media_type_idx" ON "message_media" USING btree ("media_type");--> statement-breakpoint
CREATE UNIQUE INDEX "message_media_message_sort_order_unique" ON "message_media" USING btree ("message_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "message_reactions_target_participant_unique" ON "message_reactions" USING btree ("target_whatsapp_message_id","participant_id");--> statement-breakpoint
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_reactions_participant_id_idx" ON "message_reactions" USING btree ("participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_whatsapp_message_id_unique" ON "messages" USING btree ("whatsapp_message_id");--> statement-breakpoint
CREATE INDEX "messages_chat_sent_at_idx" ON "messages" USING btree ("chat_jid","sent_at");--> statement-breakpoint
CREATE INDEX "messages_sender_participant_id_idx" ON "messages" USING btree ("sender_participant_id");--> statement-breakpoint
CREATE INDEX "messages_reply_to_message_id_idx" ON "messages" USING btree ("reply_to_message_id");--> statement-breakpoint
CREATE INDEX "messages_reply_to_whatsapp_message_id_idx" ON "messages" USING btree ("reply_to_whatsapp_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_jid_unique" ON "participants" USING btree ("jid");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_event_hash_unique" ON "webhook_events" USING btree ("event_hash");--> statement-breakpoint
CREATE INDEX "webhook_events_status_created_at_idx" ON "webhook_events" USING btree ("status","created_at");
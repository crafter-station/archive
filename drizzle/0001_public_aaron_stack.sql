CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"starts_at_utc" timestamp with time zone,
	"timezone" text DEFAULT 'America/Bogota' NOT NULL,
	"local_date" text,
	"local_time" text,
	"interpretation" text,
	"source_message_id" uuid NOT NULL,
	"source_participant_id" uuid NOT NULL,
	"source_log_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"window_start_utc" timestamp with time zone NOT NULL,
	"window_end_utc" timestamp with time zone NOT NULL,
	"context_start_utc" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'America/Bogota' NOT NULL,
	"previous_log_id" uuid,
	"final_response" text,
	"status" text DEFAULT 'running' NOT NULL,
	"model" text,
	"prompt_version" text NOT NULL,
	"trigger_run_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"importance" integer,
	"source_log_id" uuid,
	"source_message_id" uuid,
	"source_participant_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"link" text NOT NULL,
	"source_message_id" uuid NOT NULL,
	"source_participant_id" uuid NOT NULL,
	"source_log_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"link" text NOT NULL,
	"source_message_id" uuid NOT NULL,
	"source_participant_id" uuid NOT NULL,
	"source_log_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_source_participant_id_participants_id_fk" FOREIGN KEY ("source_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_source_log_id_logs_id_fk" FOREIGN KEY ("source_log_id") REFERENCES "public"."logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logs" ADD CONSTRAINT "logs_previous_log_id_logs_id_fk" FOREIGN KEY ("previous_log_id") REFERENCES "public"."logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_log_id_logs_id_fk" FOREIGN KEY ("source_log_id") REFERENCES "public"."logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_participant_id_participants_id_fk" FOREIGN KEY ("source_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_source_participant_id_participants_id_fk" FOREIGN KEY ("source_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_source_log_id_logs_id_fk" FOREIGN KEY ("source_log_id") REFERENCES "public"."logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ships" ADD CONSTRAINT "ships_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ships" ADD CONSTRAINT "ships_source_participant_id_participants_id_fk" FOREIGN KEY ("source_participant_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ships" ADD CONSTRAINT "ships_source_log_id_logs_id_fk" FOREIGN KEY ("source_log_id") REFERENCES "public"."logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_local_date_idx" ON "events" USING btree ("local_date");--> statement-breakpoint
CREATE INDEX "events_starts_at_utc_idx" ON "events" USING btree ("starts_at_utc");--> statement-breakpoint
CREATE INDEX "events_source_message_id_idx" ON "events" USING btree ("source_message_id");--> statement-breakpoint
CREATE INDEX "events_source_participant_id_idx" ON "events" USING btree ("source_participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "logs_window_unique" ON "logs" USING btree ("window_start_utc","window_end_utc");--> statement-breakpoint
CREATE INDEX "logs_status_created_at_idx" ON "logs" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memories_key_unique" ON "memories" USING btree ("key");--> statement-breakpoint
CREATE INDEX "memories_deleted_at_idx" ON "memories" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_link_unique" ON "resources" USING btree ("link");--> statement-breakpoint
CREATE INDEX "resources_source_message_id_idx" ON "resources" USING btree ("source_message_id");--> statement-breakpoint
CREATE INDEX "resources_source_participant_id_idx" ON "resources" USING btree ("source_participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ships_link_unique" ON "ships" USING btree ("link");--> statement-breakpoint
CREATE INDEX "ships_source_message_id_idx" ON "ships" USING btree ("source_message_id");--> statement-breakpoint
CREATE INDEX "ships_source_participant_id_idx" ON "ships" USING btree ("source_participant_id");

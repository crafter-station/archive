ALTER TABLE "messages" ADD COLUMN "audio_transcription_status" text DEFAULT 'not_required' NOT NULL;
ALTER TABLE "messages" ADD COLUMN "audio_transcription_error" text;

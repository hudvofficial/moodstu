-- Migration: Create Google Sync Queue Table
CREATE TABLE IF NOT EXISTS "public"."google_sync_queue" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "schedule_id" uuid,
    "google_event_id" text,
    "action" text NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    "payload" jsonb,
    "status" text DEFAULT 'pending'::text NOT NULL, -- 'pending', 'failed'
    "attempts" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY ("id")
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS "idx_google_sync_queue_status" ON "public"."google_sync_queue" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_google_sync_queue_schedule_id" ON "public"."google_sync_queue" USING btree ("schedule_id");

-- Enable RLS
ALTER TABLE "public"."google_sync_queue" ENABLE ROW LEVEL SECURITY;

-- Allow service role to access
CREATE POLICY "Enable ALL for service-role" ON "public"."google_sync_queue"
AS PERMISSIVE FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

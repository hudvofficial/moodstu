-- Contract event Google Calendar sync metadata
-- No backfill: existing contract events remain not_required until edited manually.

ALTER TABLE public.contract_events
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS google_sync_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS google_sync_error text,
  ADD COLUMN IF NOT EXISTS google_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_to_google boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contract_events_google_sync_status_check'
  ) THEN
    ALTER TABLE public.contract_events
      ADD CONSTRAINT contract_events_google_sync_status_check
      CHECK (
        google_sync_status IN (
          'not_required',
          'pending',
          'synced',
          'failed',
          'deleted',
          'not_connected'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contract_events_google_event_id
  ON public.contract_events (google_event_id)
  WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contract_events_google_sync_contract
  ON public.contract_events (contract_id, google_sync_status)
  WHERE deleted_at IS NULL;

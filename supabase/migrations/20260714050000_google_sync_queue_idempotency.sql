ALTER TABLE public.google_sync_queue
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS google_sync_queue_idempotency_key_unique
  ON public.google_sync_queue(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

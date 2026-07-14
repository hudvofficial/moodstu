-- Realtime hardening: business rows must never be published directly.
-- Clients receive only a table/op signal and refetch through authorized server APIs.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'contracts',
    'payments',
    'contract_checklists',
    'contract_notes',
    'contract_events',
    'work_tasks',
    'payment_plans',
    'dress_reservations',
    'printing_orders',
    'crm_leads',
    'customers',
    'schedules',
    'approval_requests',
    'receipts',
    'google_sync_queue'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS emit_realtime_signal ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER emit_realtime_signal AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.emit_realtime_signal()',
      t
    );
  END LOOP;
END $$;

-- Keep the signal channel authenticated-only and ensure it is the published surface.
REVOKE ALL ON public.realtime_signals FROM anon, authenticated;
GRANT SELECT ON public.realtime_signals TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'realtime_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_signals;
  END IF;
END $$;

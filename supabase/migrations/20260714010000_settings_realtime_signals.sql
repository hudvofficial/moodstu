-- Settings realtime via signal-only publication.
-- Source rows remain private; clients receive only { table_name, op } and refetch
-- through authenticated server paths.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'notification_preferences',
    'system_settings',
    'credit_cards'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS emit_realtime_signal ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER emit_realtime_signal AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.emit_realtime_signal()',
      t
    );
  END LOOP;
END $$;

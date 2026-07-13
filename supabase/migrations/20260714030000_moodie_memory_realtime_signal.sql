-- Signal-only realtime refresh for user-scoped Moodie memories.
-- The source table remains outside the realtime publication; clients only see
-- that the table changed and refetch through authenticated server actions.

DO $$
BEGIN
  IF to_regclass('public.moodie_memories') IS NOT NULL
     AND to_regprocedure('public.emit_realtime_signal()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS emit_realtime_signal ON public.moodie_memories;
    CREATE TRIGGER emit_realtime_signal
      AFTER INSERT OR UPDATE OR DELETE ON public.moodie_memories
      FOR EACH STATEMENT EXECUTE FUNCTION public.emit_realtime_signal();
  END IF;
END $$;

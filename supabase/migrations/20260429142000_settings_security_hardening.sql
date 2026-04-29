-- Settings hardening: secrets must only be read through service-role server code.

ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers manage system_settings" ON public.system_settings;

REVOKE ALL ON TABLE public.system_settings FROM PUBLIC;
REVOKE ALL ON TABLE public.system_settings FROM anon;
REVOKE ALL ON TABLE public.system_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.system_settings TO service_role;

DO $$
DECLARE
  duplicate_auth_user_ids integer;
BEGIN
  IF to_regclass('public.employees') IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO duplicate_auth_user_ids
  FROM (
    SELECT auth_user_id
    FROM public.employees
    WHERE auth_user_id IS NOT NULL
    GROUP BY auth_user_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_auth_user_ids = 0 THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_auth_user_id_unique
      ON public.employees(auth_user_id)
      WHERE auth_user_id IS NOT NULL;
  ELSE
    RAISE NOTICE
      'Skipped idx_employees_auth_user_id_unique: % duplicate auth_user_id value(s) exist.',
      duplicate_auth_user_ids;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_debts_active_card_id
  ON public.debts(card_id)
  WHERE deleted_at IS NULL
    AND card_id IS NOT NULL;

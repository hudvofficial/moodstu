-- Contracts audit gallery RLS hardening:
-- public gallery writes must go through server actions with signed access proof.

BEGIN;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('galleries', 'gallery_images')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;

ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images FORCE ROW LEVEL SECURITY;

CREATE POLICY galleries_service_role_all
  ON public.galleries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY gallery_images_service_role_all
  ON public.gallery_images
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

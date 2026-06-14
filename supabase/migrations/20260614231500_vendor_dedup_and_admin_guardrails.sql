-- Vendor duplicate guardrails
-- 1) Merge active duplicate vendors by normalized phone.
-- 2) Add a partial unique index to prevent future duplicate active vendor phone numbers.
-- Name-only duplicates are intentionally not hard-blocked because different freelancers can share the same name.

DO $$
DECLARE
  dup_group RECORD;
  keep_id UUID;
  merge_id UUID;
BEGIN
  FOR dup_group IN (
    SELECT
      regexp_replace(phone, '[^0-9]', '', 'g') AS normalized_phone,
      array_agg(id ORDER BY created_at ASC, id ASC) AS ids
    FROM public.vendors
    WHERE deleted_at IS NULL
      AND status = 'active'
      AND phone IS NOT NULL
      AND regexp_replace(phone, '[^0-9]', '', 'g') <> ''
    GROUP BY regexp_replace(phone, '[^0-9]', '', 'g')
    HAVING count(*) > 1
  ) LOOP
    keep_id := dup_group.ids[1];

    FOR i IN 2 .. array_length(dup_group.ids, 1) LOOP
      merge_id := dup_group.ids[i];

      UPDATE public.work_tasks
      SET vendor_id = keep_id,
          updated_at = now()
      WHERE vendor_id = merge_id;

      UPDATE public.vendor_payments
      SET vendor_id = keep_id
      WHERE vendor_id = merge_id;

      UPDATE public.vendors
      SET deleted_at = now(),
          status = 'inactive',
          updated_at = now()
      WHERE id = merge_id;
    END LOOP;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS vendors_active_normalized_phone_uidx
ON public.vendors ((regexp_replace(phone, '[^0-9]', '', 'g')))
WHERE deleted_at IS NULL
  AND status = 'active'
  AND phone IS NOT NULL
  AND regexp_replace(phone, '[^0-9]', '', 'g') <> '';

CREATE INDEX IF NOT EXISTS vendors_active_name_idx
ON public.vendors (lower(trim(full_name)))
WHERE deleted_at IS NULL
  AND status = 'active';

-- Contracts audit fix max:
-- - public gallery password hashing and signed-access invalidation support
-- - search/performance indexes for contracts/customer/gallery hot paths
-- - future contract date-order guardrail

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS password_updated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS access_version integer NOT NULL DEFAULT 1;

UPDATE public.galleries
SET password = NULL
WHERE password IS NOT NULL
  AND btrim(password) = '';

UPDATE public.galleries
SET password_hash = extensions.crypt(password, extensions.gen_salt('bf')),
    password_updated_at = COALESCE(password_updated_at, updated_at, now()),
    access_version = COALESCE(access_version, 1) + 1,
    updated_at = now()
WHERE password IS NOT NULL
  AND password_hash IS NULL;

UPDATE public.galleries
SET password = NULL
WHERE password IS NOT NULL
  AND password_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_gallery_password(
  p_gallery_id uuid,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_password text := NULLIF(btrim(COALESCE(p_password, '')), '');
  v_has_password boolean;
  v_access_version integer;
BEGIN
  IF p_gallery_id IS NULL THEN
    RAISE EXCEPTION 'Gallery id is required';
  END IF;

  UPDATE public.galleries
  SET password = NULL,
      password_hash = CASE
        WHEN v_password IS NULL THEN NULL
        ELSE extensions.crypt(v_password, extensions.gen_salt('bf'))
      END,
      password_updated_at = CASE
        WHEN v_password IS NULL THEN NULL
        ELSE now()
      END,
      access_version = COALESCE(access_version, 1) + 1,
      updated_at = now()
  WHERE id = p_gallery_id
  RETURNING password_hash IS NOT NULL, access_version
  INTO v_has_password, v_access_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gallery not found';
  END IF;

  RETURN jsonb_build_object(
    'has_password', v_has_password,
    'access_version', v_access_version
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_gallery_password(
  p_gallery_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  IF p_gallery_id IS NULL OR NULLIF(btrim(COALESCE(p_password, '')), '') IS NULL THEN
    RETURN false;
  END IF;

  SELECT password_hash
  INTO v_hash
  FROM public.galleries
  WHERE id = p_gallery_id
    AND status = 'shared';

  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_hash = extensions.crypt(p_password, v_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.set_gallery_password(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_gallery_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_gallery_password(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_gallery_password(uuid, text) TO service_role;

CREATE INDEX IF NOT EXISTS idx_galleries_shared_access_url
  ON public.galleries(access_url)
  WHERE status = 'shared';

CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_sort
  ON public.gallery_images(gallery_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_gallery_images_gallery_selected
  ON public.gallery_images(gallery_id, is_selected, sort_order);

CREATE INDEX IF NOT EXISTS idx_contracts_customer_id
  ON public.contracts(customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_status_contract_date
  ON public.contracts(status, contract_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_payment_status_contract_date
  ON public.contracts(payment_status, contract_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_contract_payment_date
  ON public.payments(contract_id, payment_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_tasks_contract_status_deadline
  ON public.work_tasks(contract_id, status, deadline);

CREATE INDEX IF NOT EXISTS idx_contract_checklists_contract_completed
  ON public.contract_checklists(contract_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_contract_events_contract_sort
  ON public.contract_events(contract_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_customer_code_trgm
  ON public.customers USING gin(customer_code gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm
  ON public.customers USING gin(phone gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_bride_name_trgm
  ON public.customers USING gin(bride_name gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_groom_name_trgm
  ON public.customers USING gin(groom_name gin_trgm_ops)
  WHERE deleted_at IS NULL;

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_date_order_check;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_date_order_check
  CHECK (
    (contract_date IS NULL OR work_date IS NULL OR work_date >= contract_date)
    AND (work_date IS NULL OR delivery_date IS NULL OR delivery_date >= work_date)
    AND (contract_date IS NULL OR delivery_date IS NULL OR delivery_date >= contract_date)
  ) NOT VALID;

COMMIT;

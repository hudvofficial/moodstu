-- Restore missing contracts business logic:
-- - event_templates + event/checklist backfill
-- - nullable contract_events.event_date for unknown ceremony dates
-- - dress status sync from reservations
-- - payment plan amount guard

BEGIN;

ALTER TABLE public.contract_events
  ALTER COLUMN event_date DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.event_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type public.service_type_enum NOT NULL,
  event_type public.event_type_enum NOT NULL,
  event_name text NOT NULL,
  default_days_offset integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_templates_service_sort
  ON public.event_templates(service_type, sort_order);

CREATE INDEX IF NOT EXISTS idx_event_templates_service_active
  ON public.event_templates(service_type, is_active, sort_order);

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read event_templates" ON public.event_templates;
CREATE POLICY "Authenticated users can read event_templates"
  ON public.event_templates FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.event_templates
  (service_type, event_type, event_name, default_days_offset, sort_order)
VALUES
  ('studio', 'ngay_chup', 'Chup Studio', 0, 1),
  ('studio', 'hau_ky', 'Hau ky', 3, 2),
  ('studio', 'giao_san_pham', 'In + giao album', 15, 3),

  ('ngay_cuoi', 'ngay_to_chuc', 'Ngay cuoi', 0, 1),
  ('ngay_cuoi', 'hau_ky', 'Hau ky', 5, 2),
  ('ngay_cuoi', 'giao_san_pham', 'Tra file', 10, 3),

  ('combo', 'ngay_chup', 'Chup Studio', 0, 1),
  ('combo', 'hau_ky', 'Hau ky Studio', 7, 2),
  ('combo', 'ngay_to_chuc', 'An hoi', 14, 3),
  ('combo', 'ngay_to_chuc', 'Ngay cuoi', 15, 4),
  ('combo', 'hau_ky', 'Hau ky su kien', 21, 5),
  ('combo', 'giao_san_pham', 'In + giao album', 45, 6),

  ('baby', 'ngay_chup', 'Chup Baby', 0, 1),
  ('baby', 'hau_ky', 'Hau ky', 3, 2),
  ('baby', 'giao_san_pham', 'Tra file / album', 7, 3),

  ('gia_dinh', 'ngay_chup', 'Chup Gia dinh', 0, 1),
  ('gia_dinh', 'hau_ky', 'Hau ky', 3, 2),
  ('gia_dinh', 'giao_san_pham', 'Tra file / album', 7, 3),

  ('sinh_nhat', 'ngay_chup', 'Chup Sinh nhat', 0, 1),
  ('sinh_nhat', 'hau_ky', 'Hau ky', 3, 2),
  ('sinh_nhat', 'giao_san_pham', 'Tra file', 7, 3),

  ('bau', 'ngay_chup', 'Chup Bau', 0, 1),
  ('bau', 'hau_ky', 'Hau ky', 3, 2),
  ('bau', 'giao_san_pham', 'Tra file / album', 7, 3),

  ('concept', 'ngay_chup', 'Chup Concept', 0, 1),
  ('concept', 'hau_ky', 'Hau ky', 3, 2),
  ('concept', 'giao_san_pham', 'Tra file', 7, 3),

  ('couple', 'ngay_chup', 'Chup Couple', 0, 1),
  ('couple', 'hau_ky', 'Hau ky', 3, 2),
  ('couple', 'giao_san_pham', 'Tra file', 7, 3),

  ('ky_yeu', 'ngay_chup', 'Chup Ky yeu', 0, 1),
  ('ky_yeu', 'hau_ky', 'Hau ky + thiet ke', 5, 2),
  ('ky_yeu', 'giao_san_pham', 'In + giao album', 20, 3),

  ('media', 'ngay_chup', 'Quay / chup Media', 0, 1),
  ('media', 'hau_ky', 'Dung / hau ky', 5, 2),
  ('media', 'giao_san_pham', 'Ban giao san pham', 14, 3),

  ('khac', 'ngay_chup', 'Thuc hien', 0, 1),
  ('khac', 'hau_ky', 'Hau ky', 3, 2),
  ('khac', 'giao_san_pham', 'Tra file', 7, 3)
ON CONFLICT (service_type, sort_order) DO UPDATE
SET event_type = EXCLUDED.event_type,
    event_name = EXCLUDED.event_name,
    default_days_offset = EXCLUDED.default_days_offset,
    is_active = true,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.refresh_dress_status(p_dress_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF p_dress_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.dresses
  SET status = CASE
        WHEN EXISTS (
          SELECT 1
          FROM public.dress_reservations
          WHERE dress_id = p_dress_id
            AND status IN ('in_use', 'rented')
        ) THEN 'rented'
        WHEN EXISTS (
          SELECT 1
          FROM public.dress_reservations
          WHERE dress_id = p_dress_id
            AND status IN ('reserved', 'in_use', 'rented')
        ) THEN 'reserved'
        ELSE 'available'
      END,
      updated_at = now()
  WHERE id = p_dress_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_dress_status_from_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_dress_status(OLD.dress_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_dress_status(NEW.dress_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_dress_status_from_reservation ON public.dress_reservations;
CREATE TRIGGER trg_refresh_dress_status_from_reservation
AFTER INSERT OR UPDATE OR DELETE ON public.dress_reservations
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_dress_status_from_reservation();

CREATE OR REPLACE FUNCTION public.process_contract_payment_v2(
  p_contract_id uuid,
  p_amount numeric,
  p_payment_method public.payment_method_enum,
  p_payment_date date,
  p_payment_stage text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_plan_id uuid DEFAULT NULL,
  p_update_total boolean DEFAULT false,
  p_created_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_plan public.payment_plans%ROWTYPE;
  v_payment_id uuid;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_rows integer;
BEGIN
  IF p_created_by IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  IF p_contract_id IS NULL THEN
    RAISE EXCEPTION 'Contract id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.finance_monthly_closes
    WHERE period = to_char(p_payment_date, 'YYYY-MM')
      AND status = 'locked'
  ) THEN
    RAISE EXCEPTION 'Ky nay da chot so, khong the thay doi du lieu.';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong';
  END IF;

  IF v_contract.status = 'da_huy' THEN
    RAISE EXCEPTION 'Hop dong da huy, khong the thu tien';
  END IF;

  IF p_payment_plan_id IS NOT NULL THEN
    SELECT *
    INTO v_plan
    FROM public.payment_plans
    WHERE id = p_payment_plan_id
      AND contract_id = p_contract_id
    FOR UPDATE;

    IF NOT FOUND OR COALESCE(v_plan.status, 'pending') IN ('paid', 'cancelled') THEN
      RAISE EXCEPTION 'Dot thanh toan khong hop le hoac da dong';
    END IF;

    IF p_amount < COALESCE(v_plan.amount, 0) THEN
      RAISE EXCEPTION 'So tien thu khong du de tat toan dot thanh toan da chon';
    END IF;
  END IF;

  v_total := COALESCE(v_contract.total_amount, 0)
    + CASE WHEN COALESCE(p_update_total, false) THEN p_amount ELSE 0 END;
  v_paid := COALESCE(v_contract.paid_amount, 0) + p_amount;
  v_remaining := GREATEST(0, v_total - v_paid);
  v_payment_status := CASE
    WHEN v_paid <= 0 THEN 'chua_thanh_toan'
    WHEN v_remaining <= 0 THEN 'da_thanh_toan'
    WHEN v_paid < (v_total * 0.5) THEN 'da_coc'
    ELSE 'thanh_toan_mot_phan'
  END;

  INSERT INTO public.payments (
    contract_id,
    customer_id,
    amount,
    payment_method,
    payment_date,
    payment_stage,
    category_id,
    notes,
    created_by
  )
  VALUES (
    p_contract_id,
    v_contract.customer_id,
    p_amount,
    p_payment_method,
    p_payment_date,
    p_payment_stage,
    p_category_id,
    p_notes,
    p_created_by
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.contracts
  SET total_amount = v_total,
      paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = v_payment_status,
      updated_by = p_created_by,
      updated_at = now()
  WHERE id = p_contract_id;

  IF p_payment_plan_id IS NOT NULL THEN
    UPDATE public.payment_plans
    SET status = 'paid',
        receipt_id = v_payment_id
    WHERE id = p_payment_plan_id
      AND contract_id = p_contract_id
      AND COALESCE(status, 'pending') <> 'cancelled';

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      RAISE EXCEPTION 'Dot thanh toan khong hop le hoac da bi huy';
    END IF;
  END IF;

  RETURN json_build_object(
    'payment_id', v_payment_id,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status,
    'total_amount', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_contract_cascade(
  p_contract_id uuid,
  p_reason text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_dress_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: actor_id is required';
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts
  WHERE id = p_contract_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay hop dong';
  END IF;

  IF v_contract.status = 'da_huy' THEN
    RETURN;
  END IF;

  UPDATE public.contracts
  SET status = 'da_huy',
      cancel_reason = NULLIF(p_reason, ''),
      cancelled_at = now(),
      cancelled_by = p_user_id,
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_contract_id;

  UPDATE public.work_tasks
  SET status = 'da_huy',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') <> 'hoan_thanh';

  UPDATE public.printing_orders
  SET status = 'da_huy',
      updated_by = p_user_id,
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND deleted_at IS NULL
    AND COALESCE(status, '') NOT IN ('hoan_thanh', 'da_huy');

  UPDATE public.dress_reservations
  SET status = 'cancelled',
      updated_at = now()
  WHERE contract_id = p_contract_id
    AND COALESCE(status, '') IN ('reserved', 'in_use', 'rented');

  FOR v_dress_id IN
    SELECT DISTINCT dress_id
    FROM public.dress_reservations
    WHERE contract_id = p_contract_id
  LOOP
    PERFORM public.refresh_dress_status(v_dress_id);
  END LOOP;

  UPDATE public.payment_plans
  SET status = 'cancelled'
  WHERE contract_id = p_contract_id
    AND COALESCE(status, 'pending') NOT IN ('paid', 'cancelled');
END;
$$;

WITH missing_contracts AS (
  SELECT c.id, c.service_type, c.work_date
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND c.status <> 'da_huy'
    AND NOT EXISTS (
      SELECT 1
      FROM public.contract_events ce
      WHERE ce.contract_id = c.id
        AND ce.deleted_at IS NULL
    )
)
INSERT INTO public.contract_events (
  contract_id,
  event_type,
  title,
  event_date,
  deadline,
  status,
  sort_order,
  is_manual_date
)
SELECT
  c.id,
  t.event_type,
  t.event_name,
  CASE
    WHEN c.work_date IS NULL THEN NULL
    WHEN t.event_type = 'ngay_chup' THEN c.work_date::date + COALESCE(t.default_days_offset, 0)
    WHEN t.event_type = 'ngay_to_chuc' AND c.service_type = 'ngay_cuoi' THEN c.work_date::date + COALESCE(t.default_days_offset, 0)
    ELSE NULL
  END,
  CASE
    WHEN c.work_date IS NULL THEN NULL
    WHEN t.event_type IN ('hau_ky', 'giao_san_pham')
      AND NOT (c.service_type = 'combo' AND COALESCE(t.sort_order, 0) >= 5)
      THEN c.work_date::date + COALESCE(t.default_days_offset, 0)
    ELSE NULL
  END,
  'chua_lam',
  t.sort_order,
  false
FROM missing_contracts c
JOIN public.event_templates t
  ON t.service_type = c.service_type
 AND t.is_active = true
ORDER BY c.id, t.sort_order;

WITH missing_checklists AS (
  SELECT c.id, c.service_type
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND c.status <> 'da_huy'
    AND NOT EXISTS (
      SELECT 1
      FROM public.contract_checklists cc
      WHERE cc.contract_id = c.id
    )
)
INSERT INTO public.contract_checklists (
  contract_id,
  event_stage,
  category,
  item_name,
  is_completed
)
SELECT
  c.id,
  ct.event_stage,
  ct.category,
  ct.item_name,
  false
FROM missing_checklists c
JOIN public.checklist_templates ct
  ON ct.service_type = c.service_type::text
 AND ct.is_active = true
ORDER BY c.id, ct.sort_order;

DO $$
DECLARE
  v_dress_id uuid;
BEGIN
  FOR v_dress_id IN SELECT id FROM public.dresses LOOP
    PERFORM public.refresh_dress_status(v_dress_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_dress_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_refresh_dress_status_from_reservation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_contract_cascade(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_dress_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_refresh_dress_status_from_reservation() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_contract_cascade(uuid, text, uuid) TO service_role;

COMMIT;

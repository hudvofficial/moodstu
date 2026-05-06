-- Contract payment receipt + finance consistency hardening.
-- Keeps contract collections in public.payments and exposes them as receipt
-- documents through read models/RPCs so finance screens do not double-count.

CREATE OR REPLACE FUNCTION public.contract_payment_receipt_code(
  p_payment_id uuid,
  p_payment_date date
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'PT-' || to_char(COALESCE(p_payment_date, CURRENT_DATE), 'YYYYMM') || '-'
    || upper(left(replace(p_payment_id::text, '-', ''), 8));
$$;

UPDATE public.payments
SET receipt_code = public.contract_payment_receipt_code(id, payment_date)
WHERE contract_id IS NOT NULL
  AND deleted_at IS NULL
  AND (receipt_code IS NULL OR btrim(receipt_code) = '');

UPDATE public.payments
SET approved_by = COALESCE(created_by, approved_by)
WHERE contract_id IS NOT NULL
  AND deleted_at IS NULL
  AND approved_by IS NULL
  AND created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_contract_receipts_active_date
  ON public.payments(payment_date DESC, created_at DESC)
  WHERE deleted_at IS NULL AND contract_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_contract_receipts_code
  ON public.payments(receipt_code)
  WHERE deleted_at IS NULL AND contract_id IS NOT NULL AND receipt_code IS NOT NULL;

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
  v_receipt_code text;
  v_current_remaining numeric;
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

  IF p_payment_date IS NULL THEN
    RAISE EXCEPTION 'Payment date is required';
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

  v_current_remaining := GREATEST(
    0,
    COALESCE(v_contract.remaining_amount, COALESCE(v_contract.total_amount, 0) - COALESCE(v_contract.paid_amount, 0))
  );

  IF COALESCE(p_update_total, false) THEN
    IF v_current_remaining > 0 THEN
      RAISE EXCEPTION 'Chi tao phat sinh tang hop dong khi cong no hien tai da tat toan.';
    END IF;
  ELSIF p_amount > v_current_remaining THEN
    RAISE EXCEPTION 'So tien thu vuot qua so tien con lai cua hop dong.';
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

  v_payment_id := gen_random_uuid();
  v_receipt_code := public.contract_payment_receipt_code(v_payment_id, p_payment_date);
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
    id,
    contract_id,
    customer_id,
    amount,
    payment_method,
    payment_date,
    payment_stage,
    category_id,
    notes,
    receipt_code,
    created_by,
    approved_by
  )
  VALUES (
    v_payment_id,
    p_contract_id,
    v_contract.customer_id,
    p_amount,
    p_payment_method,
    p_payment_date,
    p_payment_stage,
    p_category_id,
    p_notes,
    v_receipt_code,
    p_created_by,
    p_created_by
  );

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
    'receipt_code', v_receipt_code,
    'new_paid', v_paid,
    'new_remaining', v_remaining,
    'payment_status', v_payment_status,
    'total_amount', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_receipt_documents(
  p_month int DEFAULT NULL,
  p_year int DEFAULT NULL,
  p_receipt_type text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 12,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id text,
  source_table text,
  source_id uuid,
  receipt_date date,
  receipt_type text,
  payment_type text,
  contract_id uuid,
  contract_code text,
  customer_name text,
  receipt_amount numeric,
  total_amount numeric,
  remaining_amount numeric,
  category_id uuid,
  category_name text,
  status text,
  notes text,
  receipt_code text,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  WITH unified AS (
    SELECT
      ('payment:' || p.id::text)::text AS id,
      'payments'::text AS source_table,
      p.id AS source_id,
      p.payment_date::date AS receipt_date,
      CASE
        WHEN lower(COALESCE(p.payment_stage, '')) LIKE '%coc%'
          OR lower(COALESCE(p.payment_stage, '')) IN ('deposit', 'contract_deposit')
          THEN 'contract_deposit'
        ELSE 'contract_payment'
      END AS receipt_type,
      p.payment_method::text AS payment_type,
      p.contract_id,
      c.contract_code,
      cu.full_name AS customer_name,
      COALESCE(p.amount, 0) AS receipt_amount,
      COALESCE(c.total_amount, 0) AS total_amount,
      COALESCE(c.remaining_amount, 0) AS remaining_amount,
      p.category_id,
      tc.name AS category_name,
      CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'confirmed' END AS status,
      p.notes,
      COALESCE(p.receipt_code, public.contract_payment_receipt_code(p.id, p.payment_date)) AS receipt_code,
      p.created_at,
      p.updated_at
    FROM public.payments p
    JOIN public.contracts c ON c.id = p.contract_id
    LEFT JOIN public.customers cu ON cu.id = COALESCE(p.customer_id, c.customer_id)
    LEFT JOIN public.transaction_categories tc ON tc.id = p.category_id
    WHERE p.deleted_at IS NULL
      AND p.contract_id IS NOT NULL
      AND c.deleted_at IS NULL

    UNION ALL

    SELECT
      r.id::text AS id,
      'receipts'::text AS source_table,
      r.id AS source_id,
      r.receipt_date::date AS receipt_date,
      r.receipt_type::text AS receipt_type,
      r.payment_type::text AS payment_type,
      r.contract_id,
      r.contract_code,
      r.customer_name,
      COALESCE(r.receipt_amount, 0) AS receipt_amount,
      COALESCE(r.total_amount, 0) AS total_amount,
      COALESCE(r.remaining_amount, 0) AS remaining_amount,
      r.category_id,
      r.category_name,
      COALESCE(r.status, 'confirmed') AS status,
      r.notes,
      NULL::text AS receipt_code,
      r.created_at,
      r.updated_at
    FROM public.receipts r
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
  ),
  filtered AS (
    SELECT *
    FROM unified u
    WHERE (p_month IS NULL OR EXTRACT(MONTH FROM u.receipt_date)::int = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM u.receipt_date)::int = p_year)
      AND (p_receipt_type IS NULL OR p_receipt_type = '' OR p_receipt_type = 'all' OR u.receipt_type = p_receipt_type)
      AND (
        p_search IS NULL
        OR btrim(p_search) = ''
        OR lower(COALESCE(u.receipt_code, '') || ' ' || COALESCE(u.contract_code, '') || ' ' || COALESCE(u.customer_name, '') || ' ' || COALESCE(u.category_name, '') || ' ' || COALESCE(u.notes, ''))
          LIKE '%' || lower(btrim(p_search)) || '%'
      )
  )
  SELECT
    f.*,
    COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.receipt_date DESC, f.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 12), 5000))
  OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

CREATE OR REPLACE FUNCTION public.finance_receipt_document_stats(
  p_month int DEFAULT NULL,
  p_year int DEFAULT NULL
)
RETURNS TABLE (
  total_receipts bigint,
  total_amount numeric,
  completed_count bigint,
  pending_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  WITH docs AS (
    SELECT
      CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'confirmed' END AS status,
      COALESCE(p.amount, 0) AS receipt_amount,
      p.payment_date::date AS receipt_date
    FROM public.payments p
    JOIN public.contracts c ON c.id = p.contract_id
    WHERE p.deleted_at IS NULL
      AND p.contract_id IS NOT NULL
      AND c.deleted_at IS NULL

    UNION ALL

    SELECT
      COALESCE(r.status, 'confirmed') AS status,
      COALESCE(r.receipt_amount, 0) AS receipt_amount,
      r.receipt_date::date AS receipt_date
    FROM public.receipts r
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL
  ),
  filtered AS (
    SELECT *
    FROM docs d
    WHERE (p_month IS NULL OR EXTRACT(MONTH FROM d.receipt_date)::int = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM d.receipt_date)::int = p_year)
  )
  SELECT
    COUNT(*)::bigint AS total_receipts,
    COALESCE(SUM(receipt_amount), 0)::numeric AS total_amount,
    COUNT(*) FILTER (WHERE lower(COALESCE(status, '')) IN ('completed', 'confirmed', 'approved', 'hoan_thanh'))::bigint AS completed_count,
    COUNT(*) FILTER (
      WHERE lower(COALESCE(status, 'pending')) NOT IN ('completed', 'confirmed', 'approved', 'hoan_thanh', 'cancelled', 'da_huy')
    )::bigint AS pending_count
  FROM filtered;
$$;

CREATE OR REPLACE FUNCTION public.finance_receipt_stats(
  p_month int DEFAULT NULL,
  p_year int DEFAULT NULL
)
RETURNS TABLE (
  total_receipts bigint,
  total_amount numeric,
  completed_count bigint,
  pending_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT *
  FROM public.finance_receipt_document_stats(p_month, p_year);
$$;

CREATE OR REPLACE FUNCTION public.contract_payment_health_checks()
RETURNS TABLE (
  check_name text,
  issue_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    'overpaid_contracts'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND (
      COALESCE(paid_amount, 0) > COALESCE(total_amount, 0) + 0.01
      OR COALESCE(remaining_amount, 0) < 0
    )

  UNION ALL

  SELECT
    'contract_payments_missing_receipt_code'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments
  WHERE deleted_at IS NULL
    AND contract_id IS NOT NULL
    AND (receipt_code IS NULL OR btrim(receipt_code) = '')

  UNION ALL

  SELECT
    'contract_payments_pending_after_debt_update'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payments
  WHERE deleted_at IS NULL
    AND contract_id IS NOT NULL
    AND approved_by IS NULL

  UNION ALL

  SELECT
    'paid_payment_plans_without_payment_link'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.payment_plans
  WHERE COALESCE(status, '') = 'paid'
    AND receipt_id IS NULL

  UNION ALL

  SELECT
    'contract_payment_sum_mismatch'::text AS check_name,
    COUNT(*)::bigint AS issue_count
  FROM public.contracts c
  LEFT JOIN (
    SELECT contract_id, SUM(amount) AS paid_sum
    FROM public.payments
    WHERE deleted_at IS NULL
      AND contract_id IS NOT NULL
    GROUP BY contract_id
  ) p ON p.contract_id = c.id
  WHERE c.deleted_at IS NULL
    AND ABS(COALESCE(c.paid_amount, 0) - COALESCE(p.paid_sum, 0)) > 0.01;
$$;

REVOKE ALL ON FUNCTION public.contract_payment_receipt_code(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_receipt_documents(int, int, text, text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_receipt_document_stats(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_receipt_stats(int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contract_payment_health_checks() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.contract_payment_receipt_code(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_contract_payment_v2(uuid, numeric, public.payment_method_enum, date, text, uuid, text, uuid, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_receipt_documents(int, int, text, text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_receipt_document_stats(int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_receipt_stats(int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.contract_payment_health_checks() TO service_role;

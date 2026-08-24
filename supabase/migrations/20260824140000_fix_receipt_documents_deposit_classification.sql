-- T-20260824-receipts-trace-fixes
-- Bug: finance_receipt_documents() classified payments.payment_stage as
-- 'contract_deposit' via `lower(payment_stage) LIKE '%coc%'`. payment_stage is
-- always written as a Vietnamese label with diacritics (payment_stage_display_label_v2,
-- called from process_contract_payment_v2) — e.g. 'Cọc'. lower('Cọc') = 'cọc',
-- whose middle character (ọ) never matches the ASCII pattern '%coc%'. Every real
-- deposit payment (17 rows / 21.8M VND at time of fix, and every new one going
-- forward) was silently misclassified as 'contract_payment'.
--
-- Fix: reuse payment_stage_key_v2() — the same canonical stage-normalizer that
-- process_contract_payment_v2() itself uses when WRITING payment_stage. It already
-- strips Vietnamese diacritics correctly via translate(). Reusing it (instead of
-- hand-rolling another LIKE pattern) keeps read/write classification in sync.
--
-- No OUT-parameter change, so CREATE OR REPLACE is safe (no DROP FUNCTION needed).

CREATE OR REPLACE FUNCTION public.finance_receipt_documents(p_month integer DEFAULT NULL::integer, p_year integer DEFAULT NULL::integer, p_receipt_type text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 12, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, source_table text, source_id uuid, receipt_date date, receipt_type text, payment_type text, contract_id uuid, contract_code text, customer_name text, receipt_amount numeric, total_amount numeric, remaining_amount numeric, category_id uuid, category_name text, status text, notes text, receipt_code text, created_at timestamp with time zone, updated_at timestamp with time zone, total_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH unified AS (
    SELECT
      ('payment:' || p.id::text)::text AS id,
      'payments'::text AS source_table,
      p.id AS source_id,
      p.payment_date::date AS receipt_date,
      CASE
        WHEN COALESCE(p.is_contract_adjustment, false) THEN 'contract_adjustment'
        WHEN public.payment_stage_key_v2(p.payment_stage) = 'deposit'
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
$function$;

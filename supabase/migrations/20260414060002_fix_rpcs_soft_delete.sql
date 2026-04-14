-- Phase 01 Step 3: Fix soft-delete filtering in dashboard RPCs
-- Adds `AND deleted_at IS NULL` to all receipts subqueries/CTEs/UNION blocks
-- Uses CREATE OR REPLACE with SAME signatures → idempotent, zero downtime

-- ═══════════════════════════════════════════════════════════════════════════
-- 3a. finance_dashboard_metrics — fix 2 receipts subqueries
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.finance_dashboard_metrics(
  p_month INT,
  p_year INT
) RETURNS TABLE (
  total_inflow NUMERIC,
  total_outflow NUMERIC,
  profit NUMERIC,
  month_change_percent NUMERIC,
  contracts_new BIGINT,
  contracts_done BIGINT,
  total_debt NUMERIC
) AS $$
DECLARE
  v_start DATE := make_date(p_year, p_month, 1);
  v_end DATE := (make_date(p_year, p_month, 1) + INTERVAL '1 month')::DATE;
  v_prev_start DATE := (make_date(p_year, p_month, 1) - INTERVAL '1 month')::DATE;
  v_current_inflow NUMERIC := 0;
  v_previous_inflow NUMERIC := 0;
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments
      WHERE deleted_at IS NULL AND payment_date >= v_start AND payment_date < v_end), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM public.receipts
      WHERE contract_id IS NULL AND deleted_at IS NULL AND receipt_date >= v_start AND receipt_date < v_end), 0)
  INTO v_current_inflow;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments
      WHERE deleted_at IS NULL AND payment_date >= v_prev_start AND payment_date < v_start), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM public.receipts
      WHERE contract_id IS NULL AND deleted_at IS NULL AND receipt_date >= v_prev_start AND receipt_date < v_start), 0)
  INTO v_previous_inflow;

  RETURN QUERY
  SELECT
    v_current_inflow AS total_inflow,
    COALESCE((SELECT SUM(amount) FROM public.expenses
      WHERE deleted_at IS NULL AND expense_date >= v_start AND expense_date < v_end), 0) AS total_outflow,
    v_current_inflow
      - COALESCE((SELECT SUM(amount) FROM public.expenses
        WHERE deleted_at IS NULL AND expense_date >= v_start AND expense_date < v_end), 0) AS profit,
    CASE
      WHEN v_previous_inflow = 0 AND v_current_inflow > 0 THEN 100
      WHEN v_previous_inflow = 0 THEN 0
      ELSE ROUND(((v_current_inflow - v_previous_inflow) / v_previous_inflow) * 100, 1)
    END AS month_change_percent,
    (SELECT COUNT(*) FROM public.contracts
      WHERE deleted_at IS NULL AND contract_date >= v_start AND contract_date < v_end) AS contracts_new,
    (SELECT COUNT(*) FROM public.contracts
      WHERE deleted_at IS NULL AND status = 'hoan_thanh'
      AND updated_at >= v_start AND updated_at < v_end) AS contracts_done,
    COALESCE((SELECT SUM(remaining_amount) FROM public.contracts
      WHERE deleted_at IS NULL AND remaining_amount > 0), 0) AS total_debt;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3b. finance_revenue_by_month — fix receipts_by_month CTE
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.finance_revenue_by_month(
  p_year INT
) RETURNS TABLE (
  raw_month INT,
  month_label TEXT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT generate_series(make_date(p_year, 1, 1), make_date(p_year, 12, 1), INTERVAL '1 month')::DATE AS month_start
  ),
  payments_by_month AS (
    SELECT date_trunc('month', payment_date)::DATE AS month_start, SUM(amount) AS amount
    FROM public.payments
    WHERE deleted_at IS NULL AND payment_date >= make_date(p_year, 1, 1)
      AND payment_date < make_date(p_year + 1, 1, 1)
    GROUP BY 1
  ),
  receipts_by_month AS (
    SELECT date_trunc('month', receipt_date)::DATE AS month_start, SUM(receipt_amount) AS amount
    FROM public.receipts
    WHERE contract_id IS NULL AND deleted_at IS NULL
      AND receipt_date >= make_date(p_year, 1, 1)
      AND receipt_date < make_date(p_year + 1, 1, 1)
    GROUP BY 1
  )
  SELECT
    EXTRACT(MONTH FROM m.month_start)::INT AS raw_month,
    CONCAT('Tháng ', EXTRACT(MONTH FROM m.month_start)::INT) AS month_label,
    COALESCE(p.amount, 0) + COALESCE(r.amount, 0) AS revenue
  FROM months m
  LEFT JOIN payments_by_month p ON p.month_start = m.month_start
  LEFT JOIN receipts_by_month r ON r.month_start = m.month_start
  ORDER BY m.month_start;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3c. finance_ledger — fix receipts UNION ALL block
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.finance_ledger(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_month INT DEFAULT NULL,
  p_year INT DEFAULT NULL,
  p_type TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  source_table TEXT,
  direction TEXT,
  transaction_date DATE,
  amount NUMERIC,
  code TEXT,
  customer_name TEXT,
  category_name TEXT,
  payment_method TEXT,
  description TEXT,
  status TEXT,
  total_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH entries AS (
    SELECT
      p.id,
      'payments'::TEXT AS source_table,
      'in'::TEXT AS direction,
      p.payment_date AS transaction_date,
      p.amount,
      COALESCE(p.receipt_code, c.contract_code, CONCAT('PAY-', LEFT(p.id::TEXT, 8))) AS code,
      cu.full_name AS customer_name,
      tc.name AS category_name,
      p.payment_method::TEXT AS payment_method,
      COALESCE(p.notes, p.payment_stage, c.contract_code) AS description,
      CASE WHEN p.approved_by IS NULL THEN 'pending' ELSE 'approved' END AS status,
      p.created_at
    FROM public.payments p
    LEFT JOIN public.contracts c ON c.id = p.contract_id
    LEFT JOIN public.customers cu ON cu.id = COALESCE(p.customer_id, c.customer_id)
    LEFT JOIN public.transaction_categories tc ON tc.id = p.category_id
    WHERE p.deleted_at IS NULL

    UNION ALL

    SELECT
      r.id,
      'receipts'::TEXT AS source_table,
      'in'::TEXT AS direction,
      r.receipt_date AS transaction_date,
      r.receipt_amount AS amount,
      COALESCE(r.contract_code, CONCAT('REC-', LEFT(r.id::TEXT, 8))) AS code,
      r.customer_name,
      COALESCE(r.category_name, tc.name) AS category_name,
      r.payment_type AS payment_method,
      r.notes AS description,
      COALESCE(r.status, 'confirmed') AS status,
      r.created_at
    FROM public.receipts r
    LEFT JOIN public.transaction_categories tc ON tc.id = r.category_id
    WHERE r.deleted_at IS NULL
      AND r.contract_id IS NULL

    UNION ALL

    SELECT
      e.id,
      'expenses'::TEXT AS source_table,
      'out'::TEXT AS direction,
      e.expense_date AS transaction_date,
      e.amount,
      COALESCE(c.contract_code, CONCAT('EXP-', LEFT(e.id::TEXT, 8))) AS code,
      COALESCE(e.recipient, cu.full_name) AS customer_name,
      tc.name AS category_name,
      e.payment_method::TEXT AS payment_method,
      e.description,
      CASE WHEN e.approved_by IS NULL THEN 'pending' ELSE 'approved' END AS status,
      e.created_at
    FROM public.expenses e
    LEFT JOIN public.contracts c ON c.id = e.contract_id
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
    WHERE e.deleted_at IS NULL
  ),
  filtered AS (
    SELECT e.*
    FROM entries e
    WHERE (p_month IS NULL OR EXTRACT(MONTH FROM e.transaction_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM e.transaction_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR e.direction = p_type)
  ),
  counted AS (
    SELECT f.*, COUNT(*) OVER()::INT AS total_count
    FROM filtered f
    ORDER BY f.transaction_date DESC, f.created_at DESC NULLS LAST, f.id DESC
    LIMIT p_page_size
    OFFSET GREATEST(p_page - 1, 0) * p_page_size
  )
  SELECT
    c.id,
    c.source_table,
    c.direction,
    c.transaction_date,
    c.amount,
    c.code,
    COALESCE(c.customer_name, '-') AS customer_name,
    COALESCE(c.category_name, '-') AS category_name,
    c.payment_method,
    COALESCE(c.description, '') AS description,
    c.status,
    c.total_count
  FROM counted c;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════
-- Re-apply grants (CREATE OR REPLACE preserves them, but be explicit)
-- ═══════════════════════════════════════════════════════════════════════════
REVOKE ALL ON FUNCTION public.finance_dashboard_metrics(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_revenue_by_month(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_ledger(INT, INT, INT, INT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.finance_dashboard_metrics(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_revenue_by_month(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_ledger(INT, INT, INT, INT, TEXT) TO service_role;

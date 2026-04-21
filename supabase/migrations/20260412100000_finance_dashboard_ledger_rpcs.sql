-- Finance dashboard + ledger read-only RPCs
-- Phase 03a: server-side aggregation, joins, and pagination.

CREATE INDEX IF NOT EXISTS idx_contracts_contract_date_active
  ON public.contracts(contract_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_work_date_active
  ON public.contracts(work_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_status_active
  ON public.contracts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_remaining_active
  ON public.contracts(remaining_amount) WHERE deleted_at IS NULL;
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
      WHERE contract_id IS NULL AND receipt_date >= v_start AND receipt_date < v_end), 0)
  INTO v_current_inflow;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments
      WHERE deleted_at IS NULL AND payment_date >= v_prev_start AND payment_date < v_start), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM public.receipts
      WHERE contract_id IS NULL AND receipt_date >= v_prev_start AND receipt_date < v_start), 0)
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
    WHERE contract_id IS NULL AND receipt_date >= make_date(p_year, 1, 1)
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
CREATE OR REPLACE FUNCTION public.finance_service_distribution(
  p_month INT,
  p_year INT
) RETURNS TABLE (
  name TEXT,
  value INT,
  revenue NUMERIC
) AS $$
DECLARE
  v_start DATE := make_date(p_year, p_month, 1);
  v_end DATE := (make_date(p_year, p_month, 1) + INTERVAL '1 month')::DATE;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(s.service_type, c.service_type::TEXT, 'Khác') AS name,
    COUNT(DISTINCT c.id)::INT AS value,
    SUM(COALESCE(ci.total_amount, c.total_amount, 0)) AS revenue
  FROM public.contracts c
  LEFT JOIN public.contract_items ci
    ON ci.contract_id = c.id AND ci.deleted_at IS NULL
  LEFT JOIN public.services s
    ON s.id = ci.service_id AND s.deleted_at IS NULL
  WHERE c.deleted_at IS NULL
    AND c.contract_date >= v_start
    AND c.contract_date < v_end
  GROUP BY 1
  ORDER BY 2 DESC, 3 DESC;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;
CREATE OR REPLACE FUNCTION public.finance_contract_profit_report(
  p_status TEXT DEFAULT 'all',
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 10
) RETURNS TABLE (
  id UUID,
  contract_code TEXT,
  customer_name TEXT,
  contract_date DATE,
  status TEXT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  task_cost NUMERIC,
  print_cost NUMERIC,
  expense_cost NUMERIC,
  total_cost NUMERIC,
  profit NUMERIC,
  profit_margin NUMERIC,
  total_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT
      c.id,
      c.contract_code,
      cu.full_name AS customer_name,
      c.contract_date,
      c.status,
      c.total_amount,
      COALESCE(c.paid_amount, 0) AS paid_amount,
      COALESCE(c.remaining_amount, 0) AS remaining_amount
    FROM public.contracts c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR p_status = 'all' OR c.status = p_status)
      AND (p_from IS NULL OR c.contract_date >= p_from)
      AND (p_to IS NULL OR c.contract_date <= p_to)
  ),
  task_totals AS (
    SELECT wt.contract_id, SUM(COALESCE(wt.cost, 0)) AS amount
    FROM public.work_tasks wt
    GROUP BY wt.contract_id
  ),
  print_totals AS (
    SELECT po.contract_id, SUM(COALESCE(po.total_amount, 0)) AS amount
    FROM public.printing_orders po
    WHERE po.deleted_at IS NULL
    GROUP BY po.contract_id
  ),
  expense_totals AS (
    SELECT ex.contract_id, SUM(COALESCE(ex.amount, 0)) AS amount
    FROM public.expenses ex
    WHERE ex.deleted_at IS NULL
      AND ex.contract_id IS NOT NULL
      AND (ex.description IS NULL OR ex.description NOT LIKE '[Auto-Print]%')
    GROUP BY ex.contract_id
  ),
  enriched AS (
    SELECT
      f.*,
      COALESCE(t.amount, 0) AS task_cost,
      COALESCE(p.amount, 0) AS print_cost,
      COALESCE(e.amount, 0) AS expense_cost,
      COUNT(*) OVER()::INT AS total_count
    FROM filtered f
    LEFT JOIN task_totals t ON t.contract_id = f.id
    LEFT JOIN print_totals p ON p.contract_id = f.id
    LEFT JOIN expense_totals e ON e.contract_id = f.id
    ORDER BY f.contract_date DESC, f.contract_code DESC
    LIMIT p_page_size
    OFFSET GREATEST(p_page - 1, 0) * p_page_size
  )
  SELECT
    e.id,
    e.contract_code::TEXT,
    COALESCE(e.customer_name, 'Khách vãng lai')::TEXT AS customer_name,
    e.contract_date,
    e.status::TEXT,
    e.total_amount,
    e.paid_amount,
    e.remaining_amount,
    e.task_cost,
    e.print_cost,
    e.expense_cost,
    e.task_cost + e.print_cost + e.expense_cost AS total_cost,
    e.total_amount - (e.task_cost + e.print_cost + e.expense_cost) AS profit,
    CASE
      WHEN e.total_amount = 0 THEN 0::NUMERIC
      ELSE ROUND(((e.total_amount - (e.task_cost + e.print_cost + e.expense_cost)) / e.total_amount) * 100, 1)::NUMERIC
    END AS profit_margin,
    e.total_count
  FROM enriched e;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;
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
REVOKE ALL ON FUNCTION public.finance_dashboard_metrics(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_revenue_by_month(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_service_distribution(INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_ledger(INT, INT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_dashboard_metrics(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_revenue_by_month(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_service_distribution(INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_ledger(INT, INT, INT, INT, TEXT) TO service_role;

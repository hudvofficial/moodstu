-- Phase 1: Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_status_date_desc ON public.contracts(status, contract_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_tasks_contract_id ON public.work_tasks(contract_id);
CREATE INDEX IF NOT EXISTS idx_printing_orders_contract_id ON public.printing_orders(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_items_contract_id ON public.contract_items(contract_id);
CREATE INDEX IF NOT EXISTS idx_expenses_contract_id ON public.expenses(contract_id);

-- Phase 2: Refactor `finance_contract_profit_report`
DROP FUNCTION IF EXISTS public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT);

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
  package_revenue NUMERIC,
  addon_revenue NUMERIC,
  discount NUMERIC,
  task_cost NUMERIC,
  print_cost NUMERIC,
  expense_cost NUMERIC,
  total_cost NUMERIC,
  profit NUMERIC,
  profit_margin NUMERIC,
  total_count INT
) AS $$
DECLARE
  v_total_count INT;
BEGIN
  -- 1. Tính tổng số lượng hợp đồng thỏa mãn điều kiện
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND (p_status IS NULL OR p_status = 'all' OR c.status = p_status)
    AND (p_from IS NULL OR c.contract_date >= p_from)
    AND (p_to IS NULL OR c.contract_date <= p_to);

  -- 2. Trả về chi tiết kết hợp LATERAL JOIN
  RETURN QUERY
  WITH paginated AS (
    SELECT
      c.id,
      c.contract_code,
      cu.full_name AS customer_name,
      c.contract_date,
      c.status,
      c.total_amount,
      COALESCE(c.paid_amount, 0) AS paid_amount,
      COALESCE(c.remaining_amount, 0) AS remaining_amount,
      COALESCE(c.discount_amount, 0) AS discount
    FROM public.contracts c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR p_status = 'all' OR c.status = p_status)
      AND (p_from IS NULL OR c.contract_date >= p_from)
      AND (p_to IS NULL OR c.contract_date <= p_to)
    ORDER BY c.contract_date DESC, c.contract_code DESC
    LIMIT p_page_size
    OFFSET GREATEST(p_page - 1, 0) * p_page_size
  )
  SELECT
    p.id,
    p.contract_code::TEXT,
    COALESCE(p.customer_name, 'Khach vang lai')::TEXT AS customer_name,
    p.contract_date,
    p.status::TEXT,
    p.total_amount,
    p.paid_amount,
    p.remaining_amount,
    COALESCE(items.package_revenue, 0)::NUMERIC AS package_revenue,
    COALESCE(items.addon_revenue, 0)::NUMERIC AS addon_revenue,
    p.discount,
    COALESCE(tasks.amount, 0)::NUMERIC AS task_cost,
    COALESCE(prints.amount, 0)::NUMERIC AS print_cost,
    COALESCE(expenses.amount, 0)::NUMERIC AS expense_cost,
    (COALESCE(tasks.amount, 0) + COALESCE(prints.amount, 0) + COALESCE(expenses.amount, 0))::NUMERIC AS total_cost,
    (p.total_amount - (COALESCE(tasks.amount, 0) + COALESCE(prints.amount, 0) + COALESCE(expenses.amount, 0)))::NUMERIC AS profit,
    CASE
      WHEN p.total_amount = 0 THEN 0::NUMERIC
      ELSE ROUND(((p.total_amount - (COALESCE(tasks.amount, 0) + COALESCE(prints.amount, 0) + COALESCE(expenses.amount, 0))) / p.total_amount) * 100, 1)::NUMERIC
    END AS profit_margin,
    v_total_count AS total_count
  FROM paginated p
  LEFT JOIN LATERAL (
    SELECT
      SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN COALESCE(ci.total_amount, 0) ELSE 0 END) AS addon_revenue,
      SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN 0 ELSE COALESCE(ci.total_amount, 0) END) AS package_revenue
    FROM public.contract_items ci
    WHERE ci.contract_id = p.id AND ci.deleted_at IS NULL
  ) items ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(wt.cost, 0)) AS amount
    FROM public.work_tasks wt
    WHERE wt.contract_id = p.id
  ) tasks ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(po.total_amount, 0)) AS amount
    FROM public.printing_orders po
    WHERE po.contract_id = p.id AND po.deleted_at IS NULL
  ) prints ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(ex.amount, 0)) AS amount
    FROM public.expenses ex
    WHERE ex.contract_id = p.id AND ex.deleted_at IS NULL
      AND (ex.description IS NULL OR ex.description NOT LIKE '[Auto-Print]%')
  ) expenses ON TRUE;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Phase 3: Refactor `finance_ledger`
DROP FUNCTION IF EXISTS public.finance_ledger(INT, INT, INT, INT, TEXT);

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
DECLARE
  v_total_count INT := 0;
BEGIN
  -- 1. Tính tổng số lượng
  WITH counts AS (
    SELECT COUNT(*) AS cnt
    FROM public.payments p
    WHERE p.deleted_at IS NULL
      AND (p_month IS NULL OR EXTRACT(MONTH FROM p.payment_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM p.payment_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.receipts r
    WHERE r.deleted_at IS NULL AND r.contract_id IS NULL
      AND (p_month IS NULL OR EXTRACT(MONTH FROM r.receipt_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM r.receipt_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.expenses e
    WHERE e.deleted_at IS NULL
      AND (p_month IS NULL OR EXTRACT(MONTH FROM e.expense_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM e.expense_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'out')
  )
  SELECT SUM(cnt) INTO v_total_count FROM counts;

  -- 2. Truy vấn chi tiết
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
      AND (p_month IS NULL OR EXTRACT(MONTH FROM p.payment_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM p.payment_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')

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
      AND (p_month IS NULL OR EXTRACT(MONTH FROM r.receipt_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM r.receipt_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')

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
      AND (p_month IS NULL OR EXTRACT(MONTH FROM e.expense_date)::INT = p_month)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM e.expense_date)::INT = p_year)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'out')
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
    v_total_count AS total_count
  FROM entries c
  ORDER BY c.transaction_date DESC, c.created_at DESC NULLS LAST, c.id DESC
  LIMIT p_page_size
  OFFSET GREATEST(p_page - 1, 0) * p_page_size;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Also update `finance_ledger_range` which had the same issue
DROP FUNCTION IF EXISTS public.finance_ledger_range(INT, INT, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.finance_ledger_range(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL,
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
DECLARE
  v_total_count INT := 0;
BEGIN
  -- 1. Tính tổng số lượng
  WITH counts AS (
    SELECT COUNT(*) AS cnt
    FROM public.payments p
    WHERE p.deleted_at IS NULL
      AND (p_from_date IS NULL OR p.payment_date >= p_from_date)
      AND (p_to_date IS NULL OR p.payment_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.receipts r
    WHERE r.deleted_at IS NULL AND r.contract_id IS NULL
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')
    UNION ALL
    SELECT COUNT(*) AS cnt
    FROM public.expenses e
    WHERE e.deleted_at IS NULL
      AND (p_from_date IS NULL OR e.expense_date >= p_from_date)
      AND (p_to_date IS NULL OR e.expense_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'out')
  )
  SELECT SUM(cnt) INTO v_total_count FROM counts;

  -- 2. Truy vấn chi tiết
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
      AND (p_from_date IS NULL OR p.payment_date >= p_from_date)
      AND (p_to_date IS NULL OR p.payment_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')

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
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'in')

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
      AND (p_from_date IS NULL OR e.expense_date >= p_from_date)
      AND (p_to_date IS NULL OR e.expense_date <= p_to_date)
      AND (p_type IS NULL OR p_type = 'all' OR p_type = 'out')
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
    v_total_count AS total_count
  FROM entries c
  ORDER BY c.transaction_date DESC, c.created_at DESC NULLS LAST, c.id DESC
  LIMIT p_page_size
  OFFSET GREATEST(p_page - 1, 0) * p_page_size;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

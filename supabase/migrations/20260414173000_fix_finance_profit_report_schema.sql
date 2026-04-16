-- Fix finance profit report RPC after contract schema drift.
-- Current schema uses contracts.discount_amount and contract_items.is_addon.

DROP FUNCTION IF EXISTS public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT);

CREATE OR REPLACE FUNCTION public.finance_contract_profit_report(
  p_status TEXT DEFAULT 'all',
  p_from DATE DEFAULT NULL,
  p_to DATE DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
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
      COALESCE(c.discount_amount, 0) AS discount,
      COALESCE(c.paid_amount, 0) AS paid_amount,
      COALESCE(c.remaining_amount, 0) AS remaining_amount
    FROM public.contracts c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR p_status = 'all' OR c.status = p_status)
      AND (p_from IS NULL OR c.contract_date >= p_from)
      AND (p_to IS NULL OR c.contract_date <= p_to)
  ),
  item_totals AS (
    SELECT
      ci.contract_id,
      SUM(
        CASE
          WHEN NOT COALESCE(ci.is_addon, false) THEN COALESCE(ci.total_amount, 0)
          ELSE 0
        END
      ) AS package_revenue,
      SUM(
        CASE
          WHEN COALESCE(ci.is_addon, false) THEN COALESCE(ci.total_amount, 0)
          ELSE 0
        END
      ) AS addon_revenue
    FROM public.contract_items ci
    WHERE ci.deleted_at IS NULL
    GROUP BY ci.contract_id
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
      COALESCE(i.package_revenue, 0) AS package_revenue,
      COALESCE(i.addon_revenue, 0) AS addon_revenue,
      COALESCE(t.amount, 0) AS task_cost,
      COALESCE(p.amount, 0) AS print_cost,
      COALESCE(e.amount, 0) AS expense_cost,
      COUNT(*) OVER()::INT AS total_count
    FROM filtered f
    LEFT JOIN item_totals i ON i.contract_id = f.id
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
    COALESCE(e.customer_name, 'Khach vang lai')::TEXT AS customer_name,
    e.contract_date,
    e.status::TEXT,
    e.total_amount,
    e.paid_amount,
    e.remaining_amount,
    e.package_revenue,
    e.addon_revenue,
    e.discount,
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

REVOKE ALL ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) TO service_role;

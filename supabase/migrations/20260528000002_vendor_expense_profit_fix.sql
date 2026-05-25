-- =====================================================
-- Migration: Fix Profit Report Double-Counting
-- Date: 2026-05-28
-- Description: Exclude vendor tasks from task_cost to prevent double-counting
-- Issue: Vendor costs appear in both work_tasks.cost AND expenses.amount
-- Solution: Only count employee tasks in task_cost, vendor tasks in expense_cost
-- Related: 20260528000001_vendor_expense_tracking.sql
-- =====================================================

-- =====================================================
-- Fix finance_contract_profit_report
-- =====================================================

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
    -- ✅ FIX: Exclude vendor tasks to prevent double-counting
    -- Vendor task costs are now tracked in expenses table
    -- Only count employee/internal task costs here
    SELECT SUM(COALESCE(wt.cost, 0)) AS amount
    FROM public.work_tasks wt
    WHERE wt.contract_id = p.id
      AND wt.vendor_id IS NULL  -- ✅ NEW: Exclude vendor tasks
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

-- =====================================================
-- Documentation
-- =====================================================

COMMENT ON FUNCTION public.finance_contract_profit_report(TEXT, DATE, DATE, INT, INT) IS 'Contract profit report with vendor expense tracking. Excludes vendor tasks from task_cost (tracked in expense_cost instead) to prevent double-counting.';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Changes:
-- ✅ Vendor tasks excluded from task_cost aggregation
-- ✅ task_cost now only includes employee/internal tasks
-- ✅ expense_cost includes vendor expenses (from work_task_id)
-- ✅ No double-counting of vendor costs
--
-- Impact:
-- - task_cost column will decrease (vendor costs removed)
-- - expense_cost column will increase (vendor expenses added)
-- - total_cost stays the same (no net change)
-- - profit calculations now correct
--
-- Verification:
-- SELECT id, contract_code, task_cost, expense_cost, total_cost, profit
-- FROM finance_contract_profit_report('all', NULL, NULL, 1, 10)
-- WHERE id = '<contract_with_vendor_tasks>';
-- =====================================================

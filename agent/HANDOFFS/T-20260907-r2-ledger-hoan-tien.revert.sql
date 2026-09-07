-- REVERT #12 (R2) — thân hàm SỐNG dump từ prod 2026-09-07 TRƯỚC khi áp T-20260907-r2-ledger-hoan-tien

-- Chạy file này (ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs <file>) để quay về đúng bản trước.

BEGIN;

CREATE OR REPLACE FUNCTION public.contract_financials(p_contract_ids uuid[])
 RETURNS TABLE(contract_id uuid, revenue numeric, task_cost numeric, print_cost numeric, cogs numeric, direct_cost numeric, total_cost numeric, profit numeric, profit_margin numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH parts AS (
    SELECT c.id AS contract_id,
      COALESCE(c.total_amount, 0)::numeric AS revenue,
      COALESCE((SELECT SUM(wt.cost) FROM public.work_tasks wt WHERE wt.contract_id = c.id AND wt.status <> 'da_huy' AND COALESCE(wt.cost,0) > 0), 0)::numeric AS task_cost,
      COALESCE((SELECT SUM(po.total_amount) FROM public.printing_orders po WHERE po.contract_id = c.id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy')), 0)::numeric AS print_cost,
      COALESCE((SELECT SUM(t.total_cost) FROM public.inventory_transactions t WHERE t.contract_id = c.id AND t.transaction_type = 'stock_out' AND t.source_type IN ('contract_fulfillment','contract_addon_sale') AND COALESCE(t.is_rollback, false) = false), 0)::numeric AS cogs,
      COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.contract_id = c.id AND e.deleted_at IS NULL AND e.payee_type = 'other'), 0)::numeric AS direct_cost
    FROM public.contracts c WHERE c.id = ANY(p_contract_ids)
  )
  SELECT p.contract_id, p.revenue, p.task_cost, p.print_cost, p.cogs, p.direct_cost,
    (p.task_cost + p.print_cost + p.cogs + p.direct_cost)::numeric AS total_cost,
    (p.revenue - (p.task_cost + p.print_cost + p.cogs + p.direct_cost))::numeric AS profit,
    CASE WHEN p.revenue = 0 THEN 0::numeric
         ELSE ROUND(((p.revenue - (p.task_cost + p.print_cost + p.cogs + p.direct_cost)) / p.revenue) * 100, 1)::numeric END AS profit_margin
  FROM parts p;
$function$;


CREATE OR REPLACE FUNCTION public.finance_period_ledger(p_start date, p_end date)
 RETURNS TABLE(cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_salary numeric, cash_out_fixed numeric, revenue_contract numeric, revenue_retail numeric, signed_revenue numeric, signed_contracts bigint, contracts_shot bigint, contracts_completed bigint, cost_task numeric, cost_print numeric, cost_cogs_contract numeric, cost_cogs_retail numeric, cost_direct numeric, cost_overhead numeric, cost_fixed numeric, cost_salary_base numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cash_in AS (
    SELECT
      COALESCE((SELECT SUM(p.amount) FROM public.payments p
                WHERE p.deleted_at IS NULL AND p.payment_date BETWEEN p_start AND p_end), 0)::numeric AS contract_amt,
      COALESCE((SELECT SUM(r.receipt_amount) FROM public.receipts r
                WHERE r.deleted_at IS NULL AND r.contract_id IS NULL AND r.receipt_date BETWEEN p_start AND p_end), 0)::numeric AS retail_amt
  ),
  exp AS (
    SELECT
      COALESCE(SUM(e.amount), 0)::numeric AS all_out,
      COALESCE(SUM(e.amount) FILTER (WHERE al.expense_id IS NOT NULL), 0)::numeric AS settlement,
      COALESCE(SUM(e.amount) FILTER (WHERE e.payee_type = 'employee'), 0)::numeric AS salary_paid,
      COALESCE(SUM(e.amount) FILTER (WHERE e.payee_type = 'other' AND e.contract_id IS NOT NULL), 0)::numeric AS direct,
      COALESCE(SUM(e.amount) FILTER (WHERE e.payee_type = 'other' AND e.contract_id IS NULL
                                       AND COALESCE(e.description, '') NOT LIKE '[Auto-Fixed]%'), 0)::numeric AS overhead,
      COALESCE(SUM(e.amount) FILTER (WHERE e.payee_type = 'other' AND e.contract_id IS NULL
                                       AND COALESCE(e.description, '') LIKE '[Auto-Fixed]%'), 0)::numeric AS fixed
    FROM public.expenses e
    LEFT JOIN LATERAL (SELECT a.expense_id FROM public.expense_allocations a WHERE a.expense_id = e.id LIMIT 1) al ON TRUE
    WHERE e.deleted_at IS NULL AND e.expense_date BETWEEN p_start AND p_end
  ),
  contracts_shot AS (
    SELECT COALESCE(SUM(c.total_amount), 0)::numeric AS amt, COUNT(*)::bigint AS n,
           COUNT(*) FILTER (WHERE c.status = 'hoan_thanh')::bigint AS done
    FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy'
      AND COALESCE(public.vn_date(c.work_date), c.contract_date) BETWEEN p_start AND p_end
  ),
  signed AS (
    SELECT COALESCE(SUM(c.total_amount), 0)::numeric AS amt, COUNT(*)::bigint AS n
    FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.contract_date BETWEEN p_start AND p_end
  ),
  tasks AS (
    -- cùng luật contract_financials(): mọi task không huỷ có cost (kể cả dang_lam) → Σ tháng = Σ hợp đồng
    SELECT COALESCE(SUM(wt.cost), 0)::numeric AS amt
    FROM public.work_tasks wt
    LEFT JOIN public.contract_events ev ON ev.id = wt.event_id
    WHERE wt.status <> 'da_huy' AND COALESCE(wt.cost, 0) > 0
      AND COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)) BETWEEN p_start AND p_end
  ),
  prints AS (
    SELECT COALESCE(SUM(po.total_amount), 0)::numeric AS amt
    FROM public.printing_orders po
    WHERE po.deleted_at IS NULL AND COALESCE(po.status, '') NOT IN ('huy_don', 'da_huy')
      AND COALESCE(po.order_date, public.vn_date(po.created_at)) BETWEEN p_start AND p_end
  ),
  cogs AS (
    SELECT
      COALESCE(SUM(t.total_cost) FILTER (WHERE t.source_type IN ('contract_fulfillment', 'contract_addon_sale')), 0)::numeric AS contract_amt,
      COALESCE(SUM(t.total_cost) FILTER (WHERE t.source_type = 'retail_sale'), 0)::numeric AS retail_amt
    FROM public.inventory_transactions t
    LEFT JOIN public.receipts r ON r.id = t.receipt_id
    WHERE t.transaction_type = 'stock_out' AND COALESCE(t.is_rollback, false) = false
      AND t.source_type IN ('retail_sale', 'contract_fulfillment', 'contract_addon_sale')
      AND COALESCE(r.receipt_date, public.vn_date(t.created_at)) BETWEEN p_start AND p_end
  ),
  month_ratios AS (
    -- lương cứng prorate theo số ngày của tháng nằm trong kỳ (kỳ = tháng tròn → ratio 1)
    SELECT EXTRACT(year FROM gs)::int AS year, EXTRACT(month FROM gs)::int AS month,
           ((LEAST(p_end, (gs + interval '1 month - 1 day')::date) - GREATEST(p_start, gs::date) + 1)::numeric
             / ((gs + interval '1 month - 1 day')::date - gs::date + 1)::numeric) AS ratio
    FROM generate_series(date_trunc('month', p_start)::date, date_trunc('month', p_end)::date, interval '1 month') gs
  ),
  salary AS (
    -- ADR-016 M5: lương cứng = employee_salaries.total_salary (lương cơ bản + thưởng − phạt; product_salary = 0 từ M3).
    -- Cột monthly_salary không code nào ghi (M2 dùng nhầm → luôn 0). Sheet là accrual, không phải tiền.
    SELECT COALESCE(SUM(COALESCE(s.total_salary, 0) * mr.ratio), 0)::numeric AS amt
    FROM month_ratios mr
    LEFT JOIN public.employee_salaries s ON s.year = mr.year AND s.month = mr.month
  )
  SELECT
    cash_in.contract_amt, cash_in.retail_amt,
    exp.all_out, exp.settlement, exp.salary_paid, exp.fixed,
    contracts_shot.amt, cash_in.retail_amt, signed.amt, signed.n,
    contracts_shot.n, contracts_shot.done,
    tasks.amt, prints.amt, cogs.contract_amt, cogs.retail_amt,
    exp.direct, exp.overhead, exp.fixed, salary.amt
  FROM cash_in, exp, contracts_shot, signed, tasks, prints, cogs, salary;
$function$;


COMMIT;
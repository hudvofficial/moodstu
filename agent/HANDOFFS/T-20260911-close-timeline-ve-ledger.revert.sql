-- =====================================================================
-- REVERT #23 — T-20260911-close-timeline-ve-ledger
-- Quay lui: tra finance_period_ledger + finance_cashflow_timeline ve THAN DANG SONG
-- (dump tu prod 2026-09-11 14:46 UTC, TRUOC khi ap migration #23)
-- va go 2 doi tuong moi do #23 tao.
--
-- Chay: ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs <duong-dan-file-nay>
-- (runner tu boc BEGIN/COMMIT — file nay KHONG duoc chua BEGIN/COMMIT)
-- =====================================================================

-- 1) Go 2 ham moi cua #23 (khong ton tai truoc buoc nay)
DROP FUNCTION IF EXISTS public.finance_cashflow_timeline_legacy(date, date);
DROP FUNCTION IF EXISTS public.finance_cash_entries(date, date);

-- 2) Than ham SONG truoc #23 — nguyen van tu pg_get_functiondef()
-- ---------- finance_period_ledger (ACL song: postgres=X/postgres,service_role=X/postgres) ----------
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
      -- R2 (#12, 2026-09-07): phiếu HOÀN TIỀN (danh mục contract_refund/refund/hoan_tien) là trả lại tiền khách —
      -- vẫn là tiền ra (all_out) nhưng KHÔNG phải chi phí; HĐ da_huy đã bị loại khỏi doanh thu nên không được đối ứng vào cost.
      COALESCE(SUM(e.amount) FILTER (WHERE e.payee_type = 'other' AND e.contract_id IS NOT NULL
                                       AND COALESCE(tc.category_code, '') NOT IN ('contract_refund', 'refund', 'hoan_tien')), 0)::numeric AS direct,
      COALESCE(SUM(e.amount) FILTER (WHERE e.payee_type = 'other' AND e.contract_id IS NULL
                                       AND COALESCE(e.description, '') NOT LIKE '[Auto-Fixed]%'), 0)::numeric AS overhead,
      COALESCE(SUM(e.amount) FILTER (WHERE e.payee_type = 'other' AND e.contract_id IS NULL
                                       AND COALESCE(e.description, '') LIKE '[Auto-Fixed]%'), 0)::numeric AS fixed
    FROM public.expenses e
    LEFT JOIN LATERAL (SELECT a.expense_id FROM public.expense_allocations a WHERE a.expense_id = e.id LIMIT 1) al ON TRUE
    LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
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

-- ---------- finance_cashflow_timeline (ACL song: postgres=X/postgres,service_role=X/postgres) ----------
CREATE OR REPLACE FUNCTION public.finance_cashflow_timeline(p_start_date date, p_end_date date)
 RETURNS TABLE(date date, inflow numeric, outflow numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  ),
  entries AS (
    SELECT p.payment_date::date AS entry_date, COALESCE(p.amount, 0)::numeric AS inflow, 0::numeric AS outflow
    FROM public.payments p CROSS JOIN params pr
    WHERE p.deleted_at IS NULL AND p.payment_date BETWEEN pr.start_date AND pr.end_date
    UNION ALL
    SELECT r.receipt_date::date, COALESCE(r.receipt_amount, 0)::numeric, 0::numeric
    FROM public.receipts r CROSS JOIN params pr
    WHERE r.deleted_at IS NULL AND r.contract_id IS NULL AND r.receipt_date BETWEEN pr.start_date AND pr.end_date
    UNION ALL
    SELECT e.expense_date::date, 0::numeric, COALESCE(e.amount, 0)::numeric
    FROM public.expenses e CROSS JOIN params pr
    WHERE e.deleted_at IS NULL AND e.expense_date BETWEEN pr.start_date AND pr.end_date
  )
  SELECT e.entry_date AS date, COALESCE(SUM(e.inflow), 0)::numeric, COALESCE(SUM(e.outflow), 0)::numeric
  FROM entries e
  WHERE COALESCE(e.inflow, 0) <> 0 OR COALESCE(e.outflow, 0) <> 0
  GROUP BY e.entry_date
  ORDER BY e.entry_date;
$function$;

-- 3) ACL — giu nguyen nhu truoc #23: chi postgres + service_role
REVOKE ALL ON FUNCTION public.finance_period_ledger(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_period_ledger(date, date) TO service_role;
REVOKE ALL ON FUNCTION public.finance_cashflow_timeline(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_cashflow_timeline(date, date) TO service_role;

-- 4) Bao PostgREST nap lai so do
NOTIFY pgrst, 'reload schema';

-- 5) Kiem sau khi quay lui (mong doi: 2 dong false/false, 0 ham moi)
DO $revert_check$
DECLARE v_led bool; v_tl bool; v_new int;
BEGIN
  SELECT pg_get_functiondef(p.oid) ILIKE '%finance_cash_entries%' INTO v_led
    FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='finance_period_ledger';
  SELECT pg_get_functiondef(p.oid) ILIKE '%finance_cash_entries%' INTO v_tl
    FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname='finance_cashflow_timeline';
  SELECT count(*) INTO v_new FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
    AND p.proname IN ('finance_cash_entries','finance_cashflow_timeline_legacy');
  IF v_led OR v_tl OR v_new > 0 THEN
    RAISE EXCEPTION 'REVERT #23 CHUA SACH: ledger=% timeline=% ham_moi=%', v_led, v_tl, v_new;
  END IF;
  RAISE NOTICE 'REVERT #23 OK: 2 than ham ve ban truoc, 0 ham moi con lai';
END $revert_check$;

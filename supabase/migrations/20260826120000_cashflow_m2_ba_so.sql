-- ============================================================================
-- ADR-016 M2 — "Ba số, một bộ sổ": Két · Lãi/lỗ · Công nợ
-- T-20260826-cashflow-m2-ba-so (spec: agent/HANDOFFS/T-20260826-cashflow-m2-ba-so.spec.md)
--
-- 1 helper ngày VN + 1 hàm sổ kỳ (finance_period_ledger) dùng chung cho:
--   finance_month_summary (3 khối dashboard), finance_pnl_by_month (chart 12 tháng),
--   finance_reports_snapshot (/reports, Moodie), finance_cashflow_timeline (biểu đồ tiền).
-- Luật ngày (ADR-016 §2 / spec §1.1): doanh thu theo ngày CHỤP (work_date, fallback contract_date),
--   task theo ngày sự kiện, đơn in theo order_date, COGS theo ngày phiếu xuất, tiền theo ngày phiếu.
-- Két = chỉ payments + receipts lẻ − expenses (mọi payee). fixed_costs/monthly_salaries KHÔNG phải tiền.
-- Thêm: payee_payment_history, void_payee_payment_atomic, vendor_cost_report;
--   printing_lab_overview bỏ đọc view lab_payments; DROP finance_dashboard_metrics + finance_revenue_by_month.
-- Chạy: node scripts/migrate-direct.mjs 20260826120000_cashflow_m2_ba_so.sql (script tự BEGIN/COMMIT)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper: ngày theo giờ Việt Nam (work_date/event_date/deadline/created_at là timestamptz)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vn_date(p timestamptz)
RETURNS date
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT (p AT TIME ZONE 'Asia/Ho_Chi_Minh')::date $$;

-- ---------------------------------------------------------------------------
-- 1. Sổ kỳ — MỘT nguồn cho mọi báo cáo theo khoảng ngày [p_start, p_end] (inclusive)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finance_period_ledger(date, date);
CREATE FUNCTION public.finance_period_ledger(p_start date, p_end date)
RETURNS TABLE(
  cash_in_contract numeric, cash_in_retail numeric,
  cash_out numeric, cash_out_settlement numeric, cash_out_salary numeric, cash_out_fixed numeric,
  revenue_contract numeric, revenue_retail numeric, signed_revenue numeric, signed_contracts bigint,
  contracts_shot bigint, contracts_completed bigint,
  cost_task numeric, cost_print numeric, cost_cogs_contract numeric, cost_cogs_retail numeric,
  cost_direct numeric, cost_overhead numeric, cost_fixed numeric, cost_salary_base numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    -- lương cứng = employee_salaries.monthly_salary (KHÔNG base_salary/total_salary: dòng test 100.000.000 T6, product_salary đã nằm trong task) — M5 dọn
    SELECT COALESCE(SUM(COALESCE(s.monthly_salary, 0) * mr.ratio), 0)::numeric AS amt
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
$$;

-- ---------------------------------------------------------------------------
-- 2. Ba khối dashboard cho 1 tháng
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finance_month_summary(integer, integer);
CREATE FUNCTION public.finance_month_summary(p_month integer, p_year integer)
RETURNS TABLE(
  cash_in numeric, cash_in_contract numeric, cash_in_retail numeric,
  cash_out numeric, cash_out_settlement numeric, cash_out_other numeric, cash_net numeric, cash_net_prev numeric,
  revenue numeric, revenue_contract numeric, revenue_retail numeric,
  cost_total numeric, cost_task numeric, cost_print numeric, cost_cogs numeric, cost_direct numeric, cost_overhead numeric, cost_salary_base numeric,
  profit numeric, profit_prev numeric, profit_margin numeric,
  contracts_shot bigint, contracts_missing_work_date bigint,
  receivable numeric, payable numeric, payable_lab numeric, payable_vendor numeric, payable_supplier numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH b AS (
    SELECT make_date(p_year, p_month, 1) AS s, (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date AS e
  ),
  cur AS (SELECT l.* FROM b, LATERAL public.finance_period_ledger(b.s, b.e) l),
  prev AS (SELECT l.* FROM b, LATERAL public.finance_period_ledger((b.s - interval '1 month')::date, (b.s - interval '1 day')::date) l),
  pay AS (
    SELECT COALESCE(SUM(s.remaining), 0)::numeric AS total,
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'lab'), 0)::numeric AS lab,
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'vendor'), 0)::numeric AS vendor,
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'supplier'), 0)::numeric AS supplier
    FROM public.finance_payable_summary() s
  ),
  recv AS (
    SELECT COALESCE(SUM(c.remaining_amount), 0)::numeric AS amt
    FROM public.contracts c WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.remaining_amount > 0
  ),
  miss AS (
    SELECT COUNT(*)::bigint AS n FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status NOT IN ('da_huy', 'hoan_thanh') AND c.work_date IS NULL
  ),
  calc AS (
    SELECT
      cur.cash_in_contract + cur.cash_in_retail AS cash_in,
      prev.cash_in_contract + prev.cash_in_retail - prev.cash_out AS cash_net_prev,
      cur.revenue_contract + cur.revenue_retail AS revenue,
      cur.cost_task + cur.cost_print + cur.cost_cogs_contract + cur.cost_cogs_retail + cur.cost_direct + cur.cost_overhead + cur.cost_fixed + cur.cost_salary_base AS cost_total,
      (prev.revenue_contract + prev.revenue_retail)
        - (prev.cost_task + prev.cost_print + prev.cost_cogs_contract + prev.cost_cogs_retail + prev.cost_direct + prev.cost_overhead + prev.cost_fixed + prev.cost_salary_base) AS profit_prev
    FROM cur, prev
  )
  SELECT
    calc.cash_in, cur.cash_in_contract, cur.cash_in_retail,
    cur.cash_out, cur.cash_out_settlement, (cur.cash_out - cur.cash_out_settlement)::numeric, (calc.cash_in - cur.cash_out)::numeric, calc.cash_net_prev::numeric,
    calc.revenue::numeric, cur.revenue_contract, cur.revenue_retail,
    calc.cost_total::numeric, cur.cost_task, cur.cost_print, (cur.cost_cogs_contract + cur.cost_cogs_retail)::numeric, cur.cost_direct,
    (cur.cost_overhead + cur.cost_fixed)::numeric, cur.cost_salary_base,
    (calc.revenue - calc.cost_total)::numeric, calc.profit_prev::numeric,
    CASE WHEN calc.revenue = 0 THEN 0::numeric ELSE ROUND((calc.revenue - calc.cost_total) / calc.revenue * 100, 1)::numeric END,
    cur.contracts_shot, miss.n,
    recv.amt, pay.total, pay.lab, pay.vendor, pay.supplier
  FROM cur, prev, calc, pay, recv, miss;
$$;

-- ---------------------------------------------------------------------------
-- 3. 12 tháng của một năm (chart) — thay finance_revenue_by_month (tiền thu bị gọi là "doanh thu")
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finance_pnl_by_month(integer);
CREATE FUNCTION public.finance_pnl_by_month(p_year integer)
RETURNS TABLE(raw_month integer, month_label text, revenue numeric, cost numeric, profit numeric, cash_in numeric, cash_out numeric, signed_revenue numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXTRACT(month FROM m)::int,
    'Tháng ' || EXTRACT(month FROM m)::int,
    (l.revenue_contract + l.revenue_retail)::numeric,
    (l.cost_task + l.cost_print + l.cost_cogs_contract + l.cost_cogs_retail + l.cost_direct + l.cost_overhead + l.cost_fixed + l.cost_salary_base)::numeric,
    ((l.revenue_contract + l.revenue_retail)
      - (l.cost_task + l.cost_print + l.cost_cogs_contract + l.cost_cogs_retail + l.cost_direct + l.cost_overhead + l.cost_fixed + l.cost_salary_base))::numeric,
    (l.cash_in_contract + l.cash_in_retail)::numeric,
    l.cash_out,
    l.signed_revenue
  FROM generate_series(make_date(p_year, 1, 1), make_date(p_year, 12, 1), interval '1 month') m,
       LATERAL public.finance_period_ledger(m::date, (m + interval '1 month - 1 day')::date) l
  ORDER BY 1;
$$;

-- ---------------------------------------------------------------------------
-- 4. /reports snapshot — giữ nguyên mọi key JSON, đổi nguồn sang sổ kỳ + luật ngày
--    (trước: HĐ theo contract_date, task_cost gom mọi task của HĐ kể cả da_huy, operating_cost = mọi phiếu chi
--     không HĐ → sau M1 phiếu chi trả lab/thợ bị đếm là chi phí lần 2)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_reports_snapshot(p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH params AS (
    SELECT
      LEAST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS start_date,
      GREATEST(COALESCE(p_start_date, p_end_date, current_date), COALESCE(p_end_date, p_start_date, current_date)) AS end_date
  ),
  l AS (SELECT lg.* FROM params p, LATERAL public.finance_period_ledger(p.start_date, p.end_date) lg),
  contracts_scope AS (
    SELECT c.id, c.status, COALESCE(c.total_amount, 0) AS total_amount, COALESCE(c.discount_amount, 0) AS discount_amount,
           COALESCE(NULLIF(c.service_type::text, ''), 'Khac') AS service_type
    FROM public.contracts c CROSS JOIN params p
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy'
      AND COALESCE(public.vn_date(c.work_date), c.contract_date) BETWEEN p.start_date AND p.end_date
  ),
  contract_summary AS (
    SELECT COUNT(*)::numeric AS total_contracts,
           COUNT(*) FILTER (WHERE status IN ('hoan_thanh', 'completed'))::numeric AS completed_contracts,
           COALESCE(SUM(total_amount), 0) AS contract_revenue,
           COALESCE(SUM(discount_amount), 0) AS total_discount
    FROM contracts_scope
  ),
  addon_summary AS (
    SELECT COALESCE(SUM(COALESCE(ci.total_amount, 0)), 0) AS addon_revenue, COUNT(ci.id)::numeric AS addon_count
    FROM contracts_scope c JOIN public.contract_items ci ON ci.contract_id = c.id
    WHERE ci.is_addon IS TRUE AND ci.deleted_at IS NULL
  ),
  service_rows AS (
    SELECT service_type AS name, COUNT(*)::numeric AS value, COALESCE(SUM(total_amount), 0) AS revenue
    FROM contracts_scope GROUP BY service_type
  ),
  service_json AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'value', value, 'revenue', revenue) ORDER BY revenue DESC, value DESC), '[]'::jsonb) AS items
    FROM service_rows
  ),
  miss AS (
    SELECT COUNT(*)::numeric AS n FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status NOT IN ('da_huy', 'hoan_thanh') AND c.work_date IS NULL
  ),
  totals AS (
    SELECT
      l.cash_in_contract AS payment_revenue,
      l.cash_in_retail AS standalone_receipt_revenue,
      l.cash_in_contract + l.cash_in_retail AS cash_inflow,
      cs.contract_revenue + l.revenue_retail AS report_revenue,
      cs.total_contracts, cs.completed_contracts, cs.contract_revenue, cs.total_discount,
      ads.addon_revenue, ads.addon_count,
      GREATEST(0, cs.contract_revenue - ads.addon_revenue) AS package_revenue,
      l.cost_cogs_contract + l.cost_cogs_retail AS inventory_cost,
      l.cost_task + l.cost_print + l.cost_direct + l.cost_cogs_contract + l.cost_cogs_retail AS direct_cost,
      l.cost_overhead AS operating_cost,
      l.cash_out AS operating_outflow,
      l.cost_salary_base AS salary_cost,
      l.cost_fixed AS fixed_cost,
      l.cash_out_salary AS salary_paid,
      l.cash_out_fixed AS fixed_paid,
      l.signed_revenue, l.signed_contracts
    FROM l CROSS JOIN contract_summary cs CROSS JOIN addon_summary ads
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'totalRevenue', t.report_revenue,
      'totalCost', t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost,
      'directCost', t.direct_cost,
      'inventoryCost', t.inventory_cost,
      'operatingCost', t.operating_cost,
      'salaryCost', t.salary_cost,
      'fixedCost', t.fixed_cost,
      'netProfit', t.report_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost),
      'profitMargin', CASE WHEN t.report_revenue > 0 THEN ROUND(((t.report_revenue - (t.direct_cost + t.operating_cost + t.salary_cost + t.fixed_cost)) / t.report_revenue) * 1000) / 10 ELSE 0 END,
      'totalContracts', t.total_contracts,
      'completedContracts', t.completed_contracts,
      'avgContractValue', CASE WHEN t.total_contracts > 0 THEN t.contract_revenue / t.total_contracts ELSE 0 END,
      'totalDiscount', t.total_discount,
      'packageRevenue', t.package_revenue,
      'addonRevenue', t.addon_revenue,
      'addonCount', t.addon_count,
      'addonPercentage', CASE WHEN t.contract_revenue > 0 THEN ROUND((t.addon_revenue / t.contract_revenue) * 1000) / 10 ELSE 0 END,
      'signedRevenue', t.signed_revenue,
      'signedContracts', t.signed_contracts,
      'contractsMissingWorkDate', m.n
    ),
    'serviceDistribution', sj.items,
    'revenueBreakdown', jsonb_build_array(
      jsonb_build_object('label', 'Doanh thu hop dong', 'amount', t.contract_revenue, 'percentage', CASE WHEN t.report_revenue > 0 THEN ROUND((t.contract_revenue / t.report_revenue) * 1000) / 10 ELSE 0 END),
      jsonb_build_object('label', 'Thu khac', 'amount', t.standalone_receipt_revenue, 'percentage', CASE WHEN t.report_revenue > 0 THEN ROUND((t.standalone_receipt_revenue / t.report_revenue) * 1000) / 10 ELSE 0 END)
    ),
    'cashflowSummary', jsonb_build_object(
      'totalInflow', t.cash_inflow,
      'totalOutflow', t.operating_outflow,
      'salaryCost', t.salary_paid,
      'fixedCost', t.fixed_paid,
      'operatingNet', t.cash_inflow - t.operating_outflow,
      'netAfterOverhead', t.cash_inflow - t.operating_outflow
    )
  )
  FROM totals t CROSS JOIN service_json sj CROSS JOIN miss m;
$$;

-- ---------------------------------------------------------------------------
-- 5. Timeline tiền — chỉ 3 nguồn tiền thật (bỏ dòng lương/cố định tổng hợp: không phải tiền)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_cashflow_timeline(p_start_date date, p_end_date date)
RETURNS TABLE(date date, inflow numeric, outflow numeric)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- ---------------------------------------------------------------------------
-- 6. Lịch sử phiếu chi theo đối tác (kèm phân bổ có nhãn — cùng biểu thức nhãn với payable_items)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.payee_payment_history(text, uuid);
CREATE FUNCTION public.payee_payment_history(p_payee_type text, p_payee_id uuid)
RETURNS TABLE(expense_id uuid, expense_date date, amount numeric, payment_method text, note text, created_at timestamptz, created_by uuid, allocations jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id, e.expense_date, e.amount, e.payment_method::text, e.description, e.created_at, e.created_by,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'target_type', a.target_type, 'target_id', a.target_id, 'amount', a.amount,
        'label', CASE a.target_type
          WHEN 'printing_order' THEN (SELECT po.order_code::text FROM public.printing_orders po WHERE po.id = a.target_id)
          WHEN 'work_task' THEN (SELECT wt.work_type::text || COALESCE(' ' || c.contract_code, '') FROM public.work_tasks wt LEFT JOIN public.contracts c ON c.id = wt.contract_id WHERE wt.id = a.target_id)
          WHEN 'inventory_transaction' THEN (SELECT 'Nhập ' || i.name || ' ×' || t.quantity FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id WHERE t.id = a.target_id)
          WHEN 'employee_salary' THEN (SELECT 'Lương ' || s.month || '/' || s.year FROM public.employee_salaries s WHERE s.id = a.target_id)
        END
      ) ORDER BY a.created_at)
      FROM public.expense_allocations a WHERE a.expense_id = e.id
    ), '[]'::jsonb)
  FROM public.expenses e
  WHERE e.deleted_at IS NULL AND e.payee_type = p_payee_type AND e.payee_id = p_payee_id
  ORDER BY e.expense_date DESC, e.created_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- 7. Huỷ phiếu chi trả đối tác (xoá mềm + dẫn xuất lại payment_status đơn in)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.void_payee_payment_atomic(uuid, uuid);
CREATE FUNCTION public.void_payee_payment_atomic(p_expense_id uuid, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exp record;
BEGIN
  SELECT id, payee_type, payee_id, amount, expense_date, deleted_at
  INTO v_exp
  FROM public.expenses WHERE id = p_expense_id FOR UPDATE;

  IF v_exp.id IS NULL THEN RAISE EXCEPTION 'Khong tim thay phieu chi'; END IF;
  IF v_exp.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Phieu chi da bi huy truoc do'; END IF;
  IF v_exp.payee_type NOT IN ('lab', 'vendor', 'supplier') THEN RAISE EXCEPTION 'Chi huy duoc phieu chi tra doi tac (lab / tho ngoai / NCC)'; END IF;
  IF public.is_period_locked(v_exp.expense_date) THEN RAISE EXCEPTION 'Ky ke toan da khoa'; END IF;

  UPDATE public.expenses SET deleted_at = now(), updated_at = now() WHERE id = p_expense_id;

  PERFORM public.recompute_printing_payment_status(a.target_id)
  FROM public.expense_allocations a WHERE a.expense_id = p_expense_id AND a.target_type = 'printing_order';

  RETURN jsonb_build_object('expense_id', v_exp.id, 'payee_type', v_exp.payee_type, 'payee_id', v_exp.payee_id, 'amount', v_exp.amount, 'voided_by', p_actor_id);
END $$;

-- ---------------------------------------------------------------------------
-- 8. Báo cáo chi phí thợ ngoài theo tháng — theo ngày SỰ KIỆN (app cũ lọc theo deadline)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.vendor_cost_report(integer, integer);
CREATE FUNCTION public.vendor_cost_report(p_month integer, p_year integer)
RETURNS TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, job_count bigint, total_cost numeric, contracts text[])
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH b AS (
    SELECT make_date(p_year, p_month, 1) AS s, (make_date(p_year, p_month, 1) + interval '1 month - 1 day')::date AS e
  ),
  t AS (
    SELECT wt.vendor_id, COALESCE(wt.cost, 0)::numeric AS cost, c.contract_code::text AS contract_code
    FROM public.work_tasks wt
    LEFT JOIN public.contract_events ev ON ev.id = wt.event_id
    LEFT JOIN public.contracts c ON c.id = wt.contract_id
    CROSS JOIN b
    WHERE wt.vendor_id IS NOT NULL AND wt.status = 'hoan_thanh'
      AND COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)) BETWEEN b.s AND b.e
  )
  SELECT v.id, v.full_name::text, v.phone::text, v.service_type::text,
         COUNT(*)::bigint, COALESCE(SUM(t.cost), 0)::numeric,
         ARRAY(SELECT DISTINCT x.contract_code FROM t x WHERE x.vendor_id = v.id AND x.contract_code IS NOT NULL ORDER BY 1)
  FROM t JOIN public.vendors v ON v.id = t.vendor_id
  GROUP BY v.id, v.full_name, v.phone, v.service_type
  ORDER BY 6 DESC, 2;
$$;

-- ---------------------------------------------------------------------------
-- 9. printing_lab_overview: bỏ đọc view lab_payments (hàm DB cuối cùng còn đọc view) — chữ ký giữ nguyên
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.printing_lab_overview()
RETURNS TABLE(id uuid, lab_name text, contact_person text, phone text, address text, status text, created_at timestamptz, service_count bigint, service_preview text[], outstanding_debt numeric, unpaid_orders bigint, last_payment_at timestamptz)
LANGUAGE sql SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH debt AS (
    SELECT * FROM public.finance_lab_debt_summary()
  ),
  services AS (
    SELECT lab_id, COUNT(*)::bigint AS service_count,
      ARRAY(SELECT ls_inner.item_name::text FROM public.lab_services ls_inner WHERE ls_inner.lab_id = ls.lab_id ORDER BY ls_inner.item_name LIMIT 3) AS service_preview
    FROM public.lab_services ls GROUP BY lab_id
  ),
  payments AS (
    SELECT e.payee_id AS lab_id, MAX(e.expense_date)::timestamptz AS last_payment_at
    FROM public.expenses e WHERE e.payee_type = 'lab' AND e.deleted_at IS NULL
    GROUP BY e.payee_id
  )
  SELECT l.id, l.lab_name::text, l.contact_person::text, l.phone::text, l.address::text, l.status::text, l.created_at::timestamptz,
    COALESCE(s.service_count, 0)::bigint, COALESCE(s.service_preview, ARRAY[]::text[]),
    COALESCE(d.remaining, 0)::numeric, COALESCE(d.order_count, 0)::bigint, p.last_payment_at
  FROM public.labs l
  LEFT JOIN debt d ON d.lab_id = l.id
  LEFT JOIN services s ON s.lab_id = l.id
  LEFT JOIN payments p ON p.lab_id = l.id
  WHERE l.deleted_at IS NULL
  ORDER BY l.lab_name;
$$;

-- ---------------------------------------------------------------------------
-- 10. Bỏ hai hàm cũ (két trộn với "lợi nhuận"; tiền thu gọi là "doanh thu") — không còn hai sự thật
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finance_dashboard_metrics(integer, integer);
DROP FUNCTION IF EXISTS public.finance_revenue_by_month(integer);

-- ---------------------------------------------------------------------------
-- 11. Quyền: chỉ server action (service_role)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.finance_period_ledger(date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_month_summary(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_pnl_by_month(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_reports_snapshot(date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_cashflow_timeline(date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payee_payment_history(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_payee_payment_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vendor_cost_report(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.printing_lab_overview() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_period_ledger(date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_month_summary(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_pnl_by_month(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_reports_snapshot(date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_cashflow_timeline(date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.payee_payment_history(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_payee_payment_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.vendor_cost_report(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.printing_lab_overview() TO service_role;

-- ---------------------------------------------------------------------------
-- 12. Đối soát (in ra khi áp — so với spec §0)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record; v_views int; v_fn int;
BEGIN
  FOR r IN SELECT m AS mo, s.* FROM (VALUES (5), (8)) x(m), LATERAL public.finance_month_summary(x.m, 2026) s LOOP
    RAISE NOTICE 'M2 T%/2026: cash_in=% cash_out=% (settlement %) net=% | revenue=% cost=% (task % print % cogs % direct % overhead % salary %) profit=% margin=% | recv=% payable=% (lab % vendor % supplier %) | shot=% missing_work_date=%',
      r.mo, r.cash_in, r.cash_out, r.cash_out_settlement, r.cash_net, r.revenue, r.cost_total, r.cost_task, r.cost_print, r.cost_cogs, r.cost_direct, r.cost_overhead, r.cost_salary_base,
      r.profit, r.profit_margin, r.receivable, r.payable, r.payable_lab, r.payable_vendor, r.payable_supplier, r.contracts_shot, r.contracts_missing_work_date;
  END LOOP;
  SELECT COUNT(*) INTO v_fn FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prokind = 'f'
     AND (pg_get_functiondef(p.oid) ILIKE '%public.lab_payments%' OR pg_get_functiondef(p.oid) ILIKE '%public.vendor_payments%'
          OR pg_get_functiondef(p.oid) ILIKE '%lab_payment_allocations%' OR pg_get_functiondef(p.oid) ILIKE '%vendor_payment_allocations%')
     AND p.proname NOT LIKE 'update_vendor_payments%';
  RAISE NOTICE 'M2: ham DB con doc view cu = % (mong doi 0)', v_fn;
  SELECT COUNT(*) INTO v_views FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind = 'v' AND c.relname IN ('lab_payments','vendor_payments','lab_payment_allocations','vendor_payment_allocations');
  RAISE NOTICE 'M2: view tuong thich con lai = % (drop o M2b)', v_views;
END $$;

-- ============================================================================
-- ADR-016 M3 — Đóng kín đường tiền (T-20260826-tien-ekip-va-can-thu)
--  (A) Ekip nội bộ đi đúng đường thợ ngoài: phải trả theo task (work_tasks.assigned_to, hoan_thanh, cost>0),
--      trả = phiếu chi payee_type='employee' + expense_allocations(work_task). Sheet lương tháng chỉ lương cứng.
--  (B) "Cần thu" theo mốc giao: finance_debt_stats / get_receivable_aging đọc contracts (bảng debts rỗng),
--      đến hạn = giao_san_pham hoàn thành mà còn nợ; chưa giao = chờ giao. finance_month_summary thêm 3 cột.
--  (C) Xoá dòng test employee_salaries base_salary 100.000.000 (T6/2026).
-- Chạy: node scripts/migrate-direct.mjs 20260826180000_tien_ekip_va_can_thu.sql (script tự BEGIN/COMMIT)
-- ============================================================================

-- Pre-check dữ liệu (lệch → DỪNG cả transaction)
DO $$
DECLARE v_test int; v_cat int;
BEGIN
  SELECT COUNT(*) INTO v_test FROM public.employee_salaries WHERE base_salary = 100000000 AND COALESCE(paid_amount,0) = 0;
  IF v_test <> 1 THEN RAISE EXCEPTION 'M3 DUNG: dong test employee_salaries 100.000.000 = % (mong doi 1)', v_test; END IF;
  SELECT COUNT(*) INTO v_cat FROM public.transaction_categories WHERE type = 'chi' AND name = 'Chi lương nhân viên';
  IF v_cat = 0 THEN
    INSERT INTO public.transaction_categories (category_code, name, type, is_default) VALUES ('CHI-001', 'Chi lương nhân viên', 'chi', true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. payable_remaining: work_task nhận cả ekip (assigned_to) — vendor task không bao giờ tính cho ekip
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payable_remaining(p_target_type text, p_target_id uuid, p_payee_id uuid)
RETURNS numeric
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT committed - allocated FROM (
    SELECT
      CASE p_target_type
        WHEN 'printing_order' THEN (SELECT po.total_amount FROM public.printing_orders po WHERE po.id = p_target_id AND po.lab_id = p_payee_id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy'))
        WHEN 'work_task' THEN (SELECT wt.cost FROM public.work_tasks wt WHERE wt.id = p_target_id AND wt.status = 'hoan_thanh' AND wt.cost > 0
                                 AND (wt.vendor_id = p_payee_id OR (wt.vendor_id IS NULL AND wt.assigned_to = p_payee_id)))
        WHEN 'inventory_transaction' THEN (SELECT t.total_cost FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id WHERE t.id = p_target_id AND i.supplier_id = p_payee_id AND t.transaction_type = 'stock_in')
        WHEN 'employee_salary' THEN (SELECT s.net_salary FROM public.employee_salaries s WHERE s.id = p_target_id AND s.employee_id = p_payee_id)
      END AS committed,
      (SELECT COALESCE(SUM(a.amount),0) FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
        WHERE a.target_type = p_target_type AND a.target_id = p_target_id AND e.deleted_at IS NULL) AS allocated
  ) x WHERE committed IS NOT NULL;
$$;

-- ---------------------------------------------------------------------------
-- 2. payable_items: nhánh employee = task ekip hoàn thành (không còn employee_salaries — sheet lương = lương cứng, M5)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payable_items(p_payee_type text, p_payee_id uuid)
RETURNS TABLE(target_type text, target_id uuid, item_date date, label text, committed numeric, allocated numeric, remaining numeric)
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  WITH items AS (
    SELECT 'printing_order'::text AS target_type, po.id AS target_id, po.order_date AS item_date, po.order_code::text AS label, COALESCE(po.total_amount,0)::numeric AS committed
    FROM public.printing_orders po
    WHERE p_payee_type = 'lab' AND po.lab_id = p_payee_id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy')
    UNION ALL
    SELECT 'work_task', wt.id, COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)),
           wt.work_type::text || COALESCE(' ' || c.contract_code, ''), COALESCE(wt.cost,0)::numeric
    FROM public.work_tasks wt LEFT JOIN public.contract_events ev ON ev.id = wt.event_id LEFT JOIN public.contracts c ON c.id = wt.contract_id
    WHERE p_payee_type = 'vendor' AND wt.vendor_id = p_payee_id AND wt.status = 'hoan_thanh' AND wt.cost > 0
    UNION ALL
    SELECT 'work_task', wt.id, COALESCE(public.vn_date(ev.event_date), public.vn_date(wt.deadline), public.vn_date(wt.created_at)),
           wt.work_type::text || COALESCE(' ' || c.contract_code, ''), COALESCE(wt.cost,0)::numeric
    FROM public.work_tasks wt LEFT JOIN public.contract_events ev ON ev.id = wt.event_id LEFT JOIN public.contracts c ON c.id = wt.contract_id
    WHERE p_payee_type = 'employee' AND wt.assigned_to = p_payee_id AND wt.vendor_id IS NULL AND wt.status = 'hoan_thanh' AND wt.cost > 0
    UNION ALL
    SELECT 'inventory_transaction', t.id, public.vn_date(t.created_at), 'Nhập ' || i.name || ' ×' || t.quantity, COALESCE(t.total_cost,0)::numeric
    FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id
    WHERE p_payee_type = 'supplier' AND i.supplier_id = p_payee_id AND t.transaction_type = 'stock_in'
  ), alloc AS (
    SELECT a.target_type, a.target_id, SUM(a.amount) AS allocated
    FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id WHERE e.deleted_at IS NULL
    GROUP BY a.target_type, a.target_id
  )
  SELECT i.target_type, i.target_id, i.item_date, i.label, i.committed, COALESCE(al.allocated,0)::numeric, GREATEST(i.committed - COALESCE(al.allocated,0), 0)::numeric
  FROM items i LEFT JOIN alloc al ON al.target_type = i.target_type AND al.target_id = i.target_id
  ORDER BY i.item_date, i.target_id;
$$;

-- ---------------------------------------------------------------------------
-- 3. finance_payable_summary: thêm ekip (employees active)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_payable_summary()
RETURNS TABLE(payee_type text, payee_id uuid, payee_name text, item_count bigint, total_committed numeric, total_paid numeric, remaining numeric, last_item_date date, last_payment_date date)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH payees AS (
    SELECT 'lab'::text AS payee_type, id AS payee_id, lab_name::text AS payee_name FROM public.labs WHERE deleted_at IS NULL
    UNION ALL SELECT 'vendor', id, full_name FROM public.vendors WHERE deleted_at IS NULL AND status = 'active' AND vendor_type = 'tho_ngoai'
    UNION ALL SELECT 'supplier', id, full_name FROM public.vendors WHERE deleted_at IS NULL AND vendor_type = 'nha_cung_cap'
    UNION ALL SELECT 'employee', id, full_name::text FROM public.employees WHERE deleted_at IS NULL AND status = 'active'
  )
  SELECT p.payee_type, p.payee_id, p.payee_name,
         COUNT(i.target_id) FILTER (WHERE i.remaining > 0)::bigint,
         COALESCE(SUM(i.committed),0)::numeric, COALESCE(SUM(i.allocated),0)::numeric, COALESCE(SUM(i.remaining),0)::numeric,
         MAX(i.item_date) FILTER (WHERE i.remaining > 0),
         (SELECT MAX(e.expense_date) FROM public.expenses e WHERE e.payee_type = p.payee_type AND e.payee_id = p.payee_id AND e.deleted_at IS NULL)
  FROM payees p LEFT JOIN LATERAL public.payable_items(p.payee_type, p.payee_id) i ON TRUE
  GROUP BY p.payee_type, p.payee_id, p.payee_name
  HAVING COALESCE(SUM(i.remaining),0) > 0
  ORDER BY 7 DESC;
$$;

-- ---------------------------------------------------------------------------
-- 4. record_payee_payment_atomic: thêm nhánh employee (giữ nguyên phần còn lại)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payee_payment_atomic(p_payee_type text, p_payee_id uuid, p_amount numeric, p_payment_method text, p_payment_date date, p_note text, p_allocations jsonb, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expense_id uuid; v_category_id uuid; v_recipient text; v_target_type text;
  v_allocations jsonb := COALESCE(p_allocations, '[]'::jsonb); v_alloc jsonb;
  v_target_id uuid; v_amount numeric; v_alloc_total numeric := 0; v_remaining_payment numeric; v_remaining numeric;
  v_date date := COALESCE(p_payment_date, CURRENT_DATE); v_method public.payment_method_enum; r record;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'So tien thanh toan phai lon hon 0'; END IF;
  IF public.is_period_locked(v_date) THEN RAISE EXCEPTION 'Ky ke toan da khoa'; END IF;
  -- supabase-js có nơi gửi JSON.stringify(array) → jsonb kiểu string: tự parse
  IF jsonb_typeof(v_allocations) = 'string' THEN v_allocations := (v_allocations #>> '{}')::jsonb; END IF;
  v_method := (CASE WHEN p_payment_method IN ('tien_mat','cash') THEN 'tien_mat' ELSE 'chuyen_khoan' END)::public.payment_method_enum;

  IF p_payee_type = 'lab' THEN
    SELECT lab_name INTO v_recipient FROM public.labs WHERE id = p_payee_id AND deleted_at IS NULL;
    v_category_id := public.resolve_printing_expense_category_id(); v_target_type := 'printing_order';
  ELSIF p_payee_type = 'vendor' THEN
    SELECT full_name INTO v_recipient FROM public.vendors WHERE id = p_payee_id AND deleted_at IS NULL AND status = 'active' AND vendor_type = 'tho_ngoai';
    v_category_id := public.resolve_vendor_expense_category_id(); v_target_type := 'work_task';
  ELSIF p_payee_type = 'supplier' THEN
    SELECT full_name INTO v_recipient FROM public.vendors WHERE id = p_payee_id AND deleted_at IS NULL AND vendor_type = 'nha_cung_cap';
    SELECT id INTO v_category_id FROM public.transaction_categories WHERE type = 'chi' AND category_code = 'vat_tu' LIMIT 1; v_target_type := 'inventory_transaction';
  ELSIF p_payee_type = 'employee' THEN
    -- Ekip nội bộ: công theo hợp đồng trả theo từng task (cùng đường thợ ngoài)
    SELECT full_name INTO v_recipient FROM public.employees WHERE id = p_payee_id AND deleted_at IS NULL AND status = 'active';
    SELECT id INTO v_category_id FROM public.transaction_categories WHERE type = 'chi' AND name = 'Chi lương nhân viên' LIMIT 1; v_target_type := 'work_task';
  ELSE
    RAISE EXCEPTION 'payee_type % chua ho tro', p_payee_type;
  END IF;
  IF v_recipient IS NULL THEN RAISE EXCEPTION 'Doi tac khong hop le'; END IF;

  INSERT INTO public.expenses (expense_date, payment_method, category_id, amount, description, recipient, payee_type, payee_id, approved_by, created_by, created_at, updated_at)
  VALUES (v_date, v_method, v_category_id, p_amount, COALESCE(NULLIF(BTRIM(COALESCE(p_note,'')),''), 'Thanh toán ' || v_recipient), v_recipient, p_payee_type, p_payee_id, p_actor_id, p_actor_id, now(), now())
  RETURNING id INTO v_expense_id;

  IF jsonb_typeof(v_allocations) = 'array' AND jsonb_array_length(v_allocations) > 0 THEN
    FOR v_alloc IN SELECT value FROM jsonb_array_elements(v_allocations) LOOP
      v_target_id := NULLIF(v_alloc->>'target_id','')::uuid;
      v_amount := COALESCE(NULLIF(v_alloc->>'amount','')::numeric, 0);
      v_remaining := public.payable_remaining(v_target_type, v_target_id, p_payee_id);
      IF v_remaining IS NULL THEN RAISE EXCEPTION 'Khoan phai tra khong hop le'; END IF;
      IF v_amount <= 0 OR v_amount > v_remaining + 0.01 THEN RAISE EXCEPTION 'So tien phan bo khong hop le (con %)', v_remaining; END IF;
      INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_by) VALUES (v_expense_id, v_target_type, v_target_id, v_amount, p_actor_id);
      v_alloc_total := v_alloc_total + v_amount;
    END LOOP;
  ELSE
    v_remaining_payment := p_amount;
    FOR r IN SELECT * FROM public.payable_items(p_payee_type, p_payee_id) LOOP
      EXIT WHEN v_remaining_payment <= 0.01;
      IF r.remaining > 0 THEN
        v_amount := LEAST(r.remaining, v_remaining_payment);
        INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_by) VALUES (v_expense_id, v_target_type, r.target_id, v_amount, p_actor_id);
        v_alloc_total := v_alloc_total + v_amount;
        v_remaining_payment := v_remaining_payment - v_amount;
      END IF;
    END LOOP;
    IF v_remaining_payment > 0.01 THEN RAISE EXCEPTION 'So tien thanh toan lon hon cong no con lai'; END IF;
  END IF;
  IF abs(v_alloc_total - p_amount) > 0.01 THEN RAISE EXCEPTION 'Tong phan bo khong khop so tien thanh toan'; END IF;

  IF v_target_type = 'printing_order' THEN
    PERFORM public.recompute_printing_payment_status(a.target_id) FROM public.expense_allocations a WHERE a.expense_id = v_expense_id;
  END IF;
  RETURN jsonb_build_object('expense_id', v_expense_id, 'allocated_amount', v_alloc_total);
END $$;

-- ---------------------------------------------------------------------------
-- 5. void_payee_payment_atomic: cho phép employee
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_payee_payment_atomic(p_expense_id uuid, p_actor_id uuid)
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
  IF v_exp.payee_type NOT IN ('lab', 'vendor', 'supplier', 'employee') THEN RAISE EXCEPTION 'Chi huy duoc phieu chi tra doi tac (lab / tho ngoai / NCC / ekip)'; END IF;
  IF public.is_period_locked(v_exp.expense_date) THEN RAISE EXCEPTION 'Ky ke toan da khoa'; END IF;

  UPDATE public.expenses SET deleted_at = now(), updated_at = now() WHERE id = p_expense_id;

  PERFORM public.recompute_printing_payment_status(a.target_id)
  FROM public.expense_allocations a WHERE a.expense_id = p_expense_id AND a.target_type = 'printing_order';

  RETURN jsonb_build_object('expense_id', v_exp.id, 'payee_type', v_exp.payee_type, 'payee_id', v_exp.payee_id, 'amount', v_exp.amount, 'voided_by', p_actor_id);
END $$;

-- ---------------------------------------------------------------------------
-- 6. finance_month_summary: + payable_employee, receivable_due (đã giao chưa thu), receivable_waiting (chờ giao)
--    (đổi RETURNS → phải DROP rồi CREATE)
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
  receivable numeric, receivable_due numeric, receivable_waiting numeric,
  payable numeric, payable_lab numeric, payable_vendor numeric, payable_supplier numeric, payable_employee numeric
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
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'supplier'), 0)::numeric AS supplier,
           COALESCE(SUM(s.remaining) FILTER (WHERE s.payee_type = 'employee'), 0)::numeric AS employee
    FROM public.finance_payable_summary() s
  ),
  recv AS (
    SELECT COALESCE(SUM(c.remaining_amount), 0)::numeric AS amt,
           COALESCE(SUM(c.remaining_amount) FILTER (WHERE dl.delivered IS NOT NULL), 0)::numeric AS due
    FROM public.contracts c
    LEFT JOIN LATERAL (SELECT 1 AS delivered FROM public.contract_events ce WHERE ce.contract_id = c.id AND ce.event_type = 'giao_san_pham' AND ce.status = 'hoan_thanh' LIMIT 1) dl ON TRUE
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.remaining_amount > 0
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
    recv.amt, recv.due, (recv.amt - recv.due)::numeric,
    pay.total, pay.lab, pay.vendor, pay.supplier, pay.employee
  FROM cur, prev, calc, pay, recv, miss;
$$;

-- ---------------------------------------------------------------------------
-- 7. finance_debt_stats: phải thu = hợp đồng (+ debts thủ công), phải trả = finance_payable_summary (+ debts);
--    quá hạn = đã giao sản phẩm mà còn nợ, tuổi nợ đếm từ ngày giao; chưa giao = chưa đến hạn
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_debt_stats()
RETURNS TABLE(receivable numeric, payable numeric, overdue numeric, net_debt numeric, aging jsonb)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH manual AS (
    SELECT
      CASE WHEN d.type = 'receivable' OR LOWER(COALESCE(d.type, '')) LIKE '%thu%' THEN 'receivable' ELSE 'payable' END AS dir,
      GREATEST(0, COALESCE(d.remaining, d.amount - COALESCE(d.paid_amount, 0), 0)) AS remaining,
      CASE WHEN d.due_date IS NOT NULL AND d.due_date < current_date THEN current_date - d.due_date ELSE 0 END AS overdue_days
    FROM public.debts d
    WHERE d.deleted_at IS NULL AND COALESCE(d.status, 'open') NOT IN ('closed', 'da_thanh_toan')
  ),
  contract_recv AS (
    SELECT c.remaining_amount AS remaining,
           (SELECT MAX(public.vn_date(ce.event_date)) FROM public.contract_events ce
             WHERE ce.contract_id = c.id AND ce.event_type = 'giao_san_pham' AND ce.status = 'hoan_thanh') AS delivered_at
    FROM public.contracts c
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.remaining_amount > 0
  ),
  recv AS (
    SELECT remaining, CASE WHEN delivered_at IS NULL THEN 0 ELSE GREATEST(1, current_date - delivered_at) END AS overdue_days FROM contract_recv
    UNION ALL
    SELECT remaining, overdue_days FROM manual WHERE dir = 'receivable' AND remaining > 0
  ),
  pay AS (
    SELECT COALESCE(SUM(x.remaining), 0)::numeric AS payable FROM (
      SELECT s.remaining FROM public.finance_payable_summary() s
      UNION ALL SELECT m.remaining FROM manual m WHERE m.dir = 'payable' AND m.remaining > 0
    ) x
  ),
  totals AS (
    SELECT
      COALESCE(SUM(remaining), 0)::numeric AS receivable,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days > 0), 0)::numeric AS overdue,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days = 0), 0)::numeric AS not_due,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days BETWEEN 1 AND 30), 0)::numeric AS days_1_30,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days BETWEEN 31 AND 60), 0)::numeric AS days_31_60,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days BETWEEN 61 AND 90), 0)::numeric AS days_61_90,
      COALESCE(SUM(remaining) FILTER (WHERE overdue_days > 90), 0)::numeric AS over_90
    FROM recv
  )
  SELECT t.receivable, p.payable, t.overdue, (t.receivable - p.payable)::numeric,
    jsonb_build_object('not_due', t.not_due, 'days_1_30', t.days_1_30, 'days_31_60', t.days_31_60, 'days_61_90', t.days_61_90, 'over_90', t.over_90)
  FROM totals t CROSS JOIN pay p;
$$;

-- ---------------------------------------------------------------------------
-- 8. get_receivable_aging: tuổi nợ từ ngày giao; thêm khoá not_delivered (giữ 4 khoá cũ cho chart)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_receivable_aging()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH raw AS (
    SELECT c.remaining_amount,
           (SELECT MAX(public.vn_date(ce.event_date)) FROM public.contract_events ce
             WHERE ce.contract_id = c.id AND ce.event_type = 'giao_san_pham' AND ce.status = 'hoan_thanh') AS delivered_at
    FROM public.contracts c
    WHERE c.remaining_amount > 0 AND c.deleted_at IS NULL AND c.status <> 'da_huy'
  ),
  bucketed AS (
    SELECT remaining_amount,
      CASE
        WHEN delivered_at IS NULL THEN 'not_delivered'
        WHEN current_date - delivered_at <= 30 THEN '0_30'
        WHEN current_date - delivered_at <= 60 THEN '31_60'
        WHEN current_date - delivered_at <= 90 THEN '61_90'
        ELSE '90_plus'
      END AS bucket
    FROM raw
  )
  SELECT json_build_object(
    'not_delivered', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = 'not_delivered'), 0), 'count', COUNT(*) FILTER (WHERE bucket = 'not_delivered')),
    '0_30', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '0_30'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '0_30')),
    '31_60', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '31_60'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '31_60')),
    '61_90', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '61_90'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '61_90')),
    '90_plus', json_build_object('total', COALESCE(SUM(remaining_amount) FILTER (WHERE bucket = '90_plus'), 0), 'count', COUNT(*) FILTER (WHERE bucket = '90_plus'))
  )::jsonb
  INTO v_result
  FROM bucketed;

  RETURN COALESCE(v_result, '{"not_delivered":{"total":0,"count":0},"0_30":{"total":0,"count":0},"31_60":{"total":0,"count":0},"61_90":{"total":0,"count":0},"90_plus":{"total":0,"count":0}}'::jsonb)::json;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. finance_pending_collections: danh sách Cần thu — HĐ đã giao lên đầu, rồi ngày chụp cũ nhất
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finance_pending_collections(integer);
CREATE FUNCTION public.finance_pending_collections(p_limit integer DEFAULT 5)
RETURNS TABLE(id uuid, contract_code text, customer_id uuid, customer_name text, customer_phone text, status text,
              total_amount numeric, paid_amount numeric, remaining_amount numeric, contract_date date, work_date timestamptz, delivered_at date)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH rows AS (
    SELECT c.id, c.contract_code::text AS contract_code, cu.id AS customer_id, cu.full_name::text AS customer_name, cu.phone::text AS customer_phone, c.status::text AS status,
           COALESCE(c.total_amount,0)::numeric AS total_amount, COALESCE(c.paid_amount,0)::numeric AS paid_amount, COALESCE(c.remaining_amount,0)::numeric AS remaining_amount,
           c.contract_date, c.work_date,
           (SELECT MAX(public.vn_date(ce.event_date)) FROM public.contract_events ce
             WHERE ce.contract_id = c.id AND ce.event_type = 'giao_san_pham' AND ce.status = 'hoan_thanh') AS delivered_at
    FROM public.contracts c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL AND c.status <> 'da_huy' AND c.remaining_amount > 0
  )
  SELECT r.id, r.contract_code, r.customer_id, r.customer_name, r.customer_phone, r.status,
         r.total_amount, r.paid_amount, r.remaining_amount, r.contract_date, r.work_date, r.delivered_at
  FROM rows r
  ORDER BY (r.delivered_at IS NULL), r.delivered_at ASC, public.vn_date(r.work_date) ASC NULLS LAST, r.contract_date ASC
  LIMIT GREATEST(1, COALESCE(p_limit, 5));
$$;

-- ---------------------------------------------------------------------------
-- 10. Dữ liệu: xoá dòng test sheet lương 100.000.000 (T6/2026) + tính lại tổng BL-2026-06
-- ---------------------------------------------------------------------------
DELETE FROM public.employee_salaries WHERE base_salary = 100000000 AND COALESCE(paid_amount,0) = 0;
UPDATE public.monthly_salaries ms SET
  total_employees = agg.n, base_salary_total = agg.base, product_salary_total = agg.product,
  bonus_total = agg.bonus, penalty_total = agg.penalty, advance_total = agg.advance, total_salary = agg.total, updated_at = now()
FROM (
  SELECT s.monthly_salary_id, COUNT(*) AS n, COALESCE(SUM(s.base_salary),0) AS base, COALESCE(SUM(s.product_salary),0) AS product,
         COALESCE(SUM(s.bonus),0) AS bonus, COALESCE(SUM(s.penalty),0) AS penalty, COALESCE(SUM(s.advance_payment),0) AS advance, COALESCE(SUM(s.total_salary),0) AS total
  FROM public.employee_salaries s GROUP BY s.monthly_salary_id
) agg
WHERE ms.id = agg.monthly_salary_id AND ms.salary_code = 'BL-2026-06';

-- ---------------------------------------------------------------------------
-- 11. Quyền
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.finance_month_summary(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_pending_collections(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_debt_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_receivable_aging() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_payee_payment_atomic(text, uuid, numeric, text, date, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_payee_payment_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_payable_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payable_items(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payable_remaining(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_month_summary(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_pending_collections(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_debt_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_receivable_aging() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_payee_payment_atomic(text, uuid, numeric, text, date, text, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_payee_payment_atomic(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_payable_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.payable_items(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.payable_remaining(text, uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 12. Đối soát
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record; d record;
BEGIN
  SELECT * INTO r FROM public.finance_month_summary(EXTRACT(month FROM current_date)::int, EXTRACT(year FROM current_date)::int);
  RAISE NOTICE 'M3 thang hien tai: receivable=% (due % / waiting %) payable=% (lab % vendor % supplier % employee %)',
    r.receivable, r.receivable_due, r.receivable_waiting, r.payable, r.payable_lab, r.payable_vendor, r.payable_supplier, r.payable_employee;
  SELECT * INTO d FROM public.finance_debt_stats();
  RAISE NOTICE 'M3 debt_stats: receivable=% payable=% overdue=% aging=%', d.receivable, d.payable, d.overdue, d.aging;
  RAISE NOTICE 'M3 employee_salaries con lai: %, monthly BL-2026-06 total_salary: %',
    (SELECT COUNT(*) FROM public.employee_salaries), (SELECT total_salary FROM public.monthly_salaries WHERE salary_code = 'BL-2026-06');
END $$;

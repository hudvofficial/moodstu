-- T-20260827-luong-cung-m5 / ADR-016 phụ lục M5 — Lương cứng vào đúng sổ, trả lương một đường, không đếm trùng.
-- Không đổi bảng, không xoá dữ liệu. 7 hàm CREATE OR REPLACE + 1 hàm mới. Phần cuối (3 hàm legacy) sinh từ
-- pg_get_functiondef bản đang chạy trên DB với đúng các dòng đổi (script kiểm mỗi replace khớp 1 lần).

-- ---------------------------------------------------------------------------
-- 1. finance_period_ledger: lương cứng = employee_salaries.total_salary (cột monthly_salary không ai ghi)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finance_period_ledger(p_start date, p_end date)
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
$$;

-- ---------------------------------------------------------------------------
-- 2. sync_employee_salary_paid: paid/remaining của dòng lương DẪN XUẤT từ phân bổ phiếu chi (không xoá mềm)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_employee_salary_paid(p_salary_id uuid)
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $$
  UPDATE public.employee_salaries s
  SET paid_amount = x.alloc,
      remaining_amount = GREATEST(COALESCE(s.net_salary, 0) - x.alloc, 0),
      updated_at = now()
  FROM (
    SELECT COALESCE(SUM(a.amount), 0)::numeric AS alloc
    FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
    WHERE a.target_type = 'employee_salary' AND a.target_id = p_salary_id AND e.deleted_at IS NULL
  ) x
  WHERE s.id = p_salary_id;
$$;

-- ---------------------------------------------------------------------------
-- 3. payable_items: nhánh employee = task ekip hoàn thành + dòng lương tháng (net > 0)
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
    -- ADR-016 M5: lương cứng tháng (sheet) — phải trả = net_salary − đã phân bổ
    SELECT 'employee_salary', s.id, make_date(s.year, s.month, 1), 'Lương ' || s.month || '/' || s.year, COALESCE(s.net_salary,0)::numeric
    FROM public.employee_salaries s
    WHERE p_payee_type = 'employee' AND s.employee_id = p_payee_id AND COALESCE(s.net_salary,0) > 0
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
-- 4. record_payee_payment_atomic: employee phân bổ được vào task HOẶC dòng lương; FIFO theo target_type của từng khoản
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payee_payment_atomic(p_payee_type text, p_payee_id uuid, p_amount numeric, p_payment_method text, p_payment_date date, p_note text, p_allocations jsonb, p_actor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expense_id uuid; v_category_id uuid; v_recipient text; v_target_type text; v_alloc_type text;
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
    -- Ekip nội bộ: công theo hợp đồng trả theo từng task; lương cứng trả theo dòng lương tháng (ADR-016 M5)
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
      -- employee: target là dòng lương (employee_salaries.id) → 'employee_salary', còn lại là task
      v_alloc_type := CASE
        WHEN p_payee_type = 'employee' AND EXISTS (SELECT 1 FROM public.employee_salaries s WHERE s.id = v_target_id AND s.employee_id = p_payee_id) THEN 'employee_salary'
        ELSE v_target_type END;
      v_remaining := public.payable_remaining(v_alloc_type, v_target_id, p_payee_id);
      IF v_remaining IS NULL THEN RAISE EXCEPTION 'Khoan phai tra khong hop le'; END IF;
      IF v_amount <= 0 OR v_amount > v_remaining + 0.01 THEN RAISE EXCEPTION 'So tien phan bo khong hop le (con %)', v_remaining; END IF;
      INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_by) VALUES (v_expense_id, v_alloc_type, v_target_id, v_amount, p_actor_id);
      v_alloc_total := v_alloc_total + v_amount;
    END LOOP;
  ELSE
    v_remaining_payment := p_amount;
    FOR r IN SELECT * FROM public.payable_items(p_payee_type, p_payee_id) LOOP
      EXIT WHEN v_remaining_payment <= 0.01;
      IF r.remaining > 0 THEN
        v_amount := LEAST(r.remaining, v_remaining_payment);
        INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_by) VALUES (v_expense_id, r.target_type, r.target_id, v_amount, p_actor_id);
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
  PERFORM public.sync_employee_salary_paid(a.target_id)
  FROM public.expense_allocations a WHERE a.expense_id = v_expense_id AND a.target_type = 'employee_salary';
  RETURN jsonb_build_object('expense_id', v_expense_id, 'allocated_amount', v_alloc_total);
END $$;

-- ---------------------------------------------------------------------------
-- 5. void_payee_payment_atomic: nợ lương quay lại khi huỷ phiếu chi
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
  PERFORM public.sync_employee_salary_paid(a.target_id)
  FROM public.expense_allocations a WHERE a.expense_id = p_expense_id AND a.target_type = 'employee_salary';

  RETURN jsonb_build_object('expense_id', v_exp.id, 'payee_type', v_exp.payee_type, 'payee_id', v_exp.payee_id, 'amount', v_exp.amount, 'voided_by', p_actor_id);
END $$;

-- ---------------------------------------------------------------------------
-- 6. Ba hàm legacy: KHÔNG cộng sheet lương lên tiền (expenses đã chứa phiếu chi lương). Sinh từ bản đang chạy — xem bên dưới.
-- ---------------------------------------------------------------------------
-- 6a. get_finance_intelligence (bản DB + bỏ 2 dòng cộng v_salary_component vào v_current_exp/v_lifetime_exp)
CREATE OR REPLACE FUNCTION public.get_finance_intelligence()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now date := current_date;
  v_first_day date := date_trunc('month', v_now)::date;
  v_last_day date := (date_trunc('month', v_now) + interval '1 month - 1 day')::date;
  v_prev_first date := date_trunc('month', v_now - interval '1 month')::date;
  v_prev_last date := (date_trunc('month', v_now - interval '1 month') + interval '1 month - 1 day')::date;
  v_current_rev numeric := 0;
  v_current_exp numeric := 0;
  v_prev_rev numeric := 0;
  v_prev_exp numeric := 0;
  v_lifetime_rev numeric := 0;
  v_lifetime_exp numeric := 0;
  v_receivables numeric := 0;
  v_payables numeric := 0;
  v_current_cash numeric := 0;
  v_fixed_cost numeric := 0;
  v_salary_component numeric := 0;
  v_burn_rate numeric := 0;
  v_profit_margin numeric := 0;
  v_profit_score int := 0;
  v_profit_label text := '';
  v_target numeric := 0;
  v_be_percent numeric := 0;
  v_be_score int := 0;
  v_be_label text := '';
  v_runway_months numeric := 99;
  v_runway_score int := 0;
  v_runway_label text := '';
  v_rec_ratio numeric := 0;
  v_rec_score int := 0;
  v_rec_label text := '';
  v_cash_score int := 0;
  v_cash_label text := '';
  v_total_score int := 0;
  v_health_status text := '';
  v_health_message text := '';
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL AND payment_date BETWEEN v_first_day AND v_last_day), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date BETWEEN v_first_day AND v_last_day), 0)
  INTO v_current_rev;

  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL AND payment_date BETWEEN v_prev_first AND v_prev_last), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date BETWEEN v_prev_first AND v_prev_last), 0)
  INTO v_prev_rev;

  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL), 0)
  INTO v_lifetime_rev;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_exp
  FROM expenses
  WHERE deleted_at IS NULL
    AND expense_date BETWEEN v_first_day AND v_last_day;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_prev_exp
  FROM expenses
  WHERE deleted_at IS NULL
    AND expense_date BETWEEN v_prev_first AND v_prev_last;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_lifetime_exp
  FROM expenses
  WHERE deleted_at IS NULL;

  SELECT COALESCE(SUM(remaining), 0)
  INTO v_receivables
  FROM debts
  WHERE type = 'receivable'
    AND COALESCE(status, 'open') NOT IN ('closed', 'da_thanh_toan')
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(remaining), 0)
  INTO v_payables
  FROM debts
  WHERE type = 'payable'
    AND COALESCE(status, 'open') NOT IN ('closed', 'da_thanh_toan')
    AND deleted_at IS NULL;

  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO v_fixed_cost
  FROM fixed_costs
  WHERE deleted_at IS NULL
    AND (start_date IS NULL OR start_date <= v_last_day)
    AND (end_date IS NULL OR end_date >= v_first_day);

  SELECT COALESCE(SUM(total_salary), 0)
  INTO v_salary_component
  FROM monthly_salaries
  WHERE month = extract(month from v_now)
    AND year = extract(year from v_now);

  v_burn_rate := v_fixed_cost + v_salary_component;
  IF v_burn_rate = 0 THEN
    SELECT COALESCE(SUM(amount) / 3, 0)
    INTO v_burn_rate
    FROM expenses
    WHERE deleted_at IS NULL
      AND expense_date BETWEEN (v_first_day - interval '3 months')::date AND v_last_day;
  END IF;

  -- ADR-016 M5: KHONG cong sheet luong len chi that (expenses da chua phieu chi luong payee_type='employee'); burn rate van = co dinh + sheet
  v_current_cash := v_lifetime_rev - v_lifetime_exp;

  IF v_current_rev > 0 THEN
    v_profit_margin := (v_current_rev - v_current_exp) / v_current_rev;
  END IF;

  IF v_profit_margin >= 0.3 THEN
    v_profit_score := 20; v_profit_label := 'Bien loi nhuan cao';
  ELSIF v_profit_margin >= 0.15 THEN
    v_profit_score := 16; v_profit_label := 'Co lai tot';
  ELSIF v_profit_margin > 0 THEN
    v_profit_score := 12; v_profit_label := 'Lai mong';
  ELSIF v_current_rev > 0 THEN
    v_profit_score := 5; v_profit_label := 'Hoa von / Lo';
  ELSE
    v_profit_score := 0; v_profit_label := 'Chua co doanh thu';
  END IF;

  v_target := GREATEST(v_burn_rate, v_current_exp);
  IF v_target > 0 THEN
    v_be_percent := ROUND((v_current_rev / v_target) * 100);
  END IF;

  IF v_be_percent >= 100 THEN
    v_be_score := 25; v_be_label := 'Vuot muc tieu';
  ELSIF v_be_percent >= 50 THEN
    v_be_score := 15; v_be_label := 'Tien trien tot';
  ELSE
    v_be_score := 5; v_be_label := 'Can day manh';
  END IF;

  IF v_burn_rate > 0 THEN
    v_runway_months := ROUND((v_current_cash / v_burn_rate) * 10.0) / 10.0;
  END IF;

  IF v_runway_months > 6 THEN
    v_runway_score := 25; v_runway_label := 'An toan';
  ELSIF v_runway_months > 3 THEN
    v_runway_score := 20; v_runway_label := 'Tot';
  ELSIF v_runway_months > 1 THEN
    v_runway_score := 10; v_runway_label := 'Can chu y';
  ELSE
    v_runway_score := 0; v_runway_label := 'Nguy hiem';
  END IF;

  IF v_current_rev > 0 THEN
    v_rec_ratio := v_receivables / v_current_rev;
  END IF;

  IF v_payables = 0 AND v_receivables = 0 THEN
    v_rec_score := 15; v_rec_label := 'Lanh manh';
  ELSIF v_receivables > v_payables AND v_rec_ratio < 2 THEN
    v_rec_score := 15; v_rec_label := 'Lanh manh';
  ELSIF v_receivables > v_payables THEN
    v_rec_score := 10; v_rec_label := 'Phai thu cao';
  ELSE
    v_rec_score := 5; v_rec_label := 'No phai tra cao';
  END IF;

  IF (v_current_rev - v_current_exp) > 0 THEN
    v_cash_score := 15; v_cash_label := 'Duong';
  ELSIF v_current_exp = 0 THEN
    v_cash_score := 10; v_cash_label := 'Chua phat sinh';
  ELSE
    v_cash_score := 0; v_cash_label := 'Am';
  END IF;

  v_total_score := LEAST(100, GREATEST(0, v_profit_score + v_be_score + v_runway_score + v_rec_score + v_cash_score));

  IF v_total_score < 30 THEN
    v_health_status := 'CRITICAL'; v_health_message := 'Cua hang dang gap rui ro dong tien lon.';
  ELSIF v_total_score < 60 THEN
    v_health_status := 'WARNING'; v_health_message := 'Can chu y toi uu chi phi va thu hoi cong no.';
  ELSIF v_total_score > 85 THEN
    v_health_status := 'EXCELLENT'; v_health_message := 'Tinh hinh tai chinh dang o muc rat an tam.';
  ELSE
    v_health_status := 'STABLE'; v_health_message := 'Suc khoe tai chinh on dinh.';
  END IF;

  RETURN json_build_object(
    'health_score', v_total_score,
    'health_status', v_health_status,
    'health_message', v_health_message,
    'breakdown', json_build_object(
      'profitability', json_build_object('score', v_profit_score, 'label', v_profit_label),
      'breakeven', json_build_object('score', v_be_score, 'label', v_be_label),
      'runway', json_build_object('score', v_runway_score, 'label', v_runway_label),
      'receivables', json_build_object('score', v_rec_score, 'label', v_rec_label),
      'cashflow', json_build_object('score', v_cash_score, 'label', v_cash_label)
    ),
    'cashflow', json_build_object(
      'currentCash', v_current_cash,
      'burnRate', v_burn_rate,
      'runwayMonths', v_runway_months,
      'projectedBalance', v_current_cash + v_receivables - v_payables,
      'lowCashWarning', v_current_cash < (v_burn_rate * 1.5)
    ),
    'breakeven', json_build_object(
      'target', v_target,
      'current', v_current_rev,
      'percent', v_be_percent,
      'remainingAmount', GREATEST(0, v_target - v_current_rev)
    ),
    'stats', json_build_object(
      'monthlyRevenue', v_current_rev,
      'monthlyExpense', v_current_exp,
      'monthlyProfit', v_current_rev - v_current_exp,
      'receivables', v_receivables,
      'payables', v_payables,
      'prevRevenue', v_prev_rev,
      'prevExpense', v_prev_exp
    )
  );
END;
$function$
;

-- 6b. get_finance_advanced_intelligence (bản DB + bỏ cộng Σ monthly_salaries vào v_monthly_expense)
CREATE OR REPLACE FUNCTION public.get_finance_advanced_intelligence(p_month integer, p_year integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_start date;
  v_end date;
  v_prev_start date;
  v_monthly_revenue numeric := 0;
  v_monthly_expense numeric := 0;
  v_monthly_profit numeric := 0;
  v_contracts_month integer := 0;
  v_contract_value_month numeric := 0;
  v_contracts_all integer := 0;
  v_contract_value_all numeric := 0;
  v_total_customers integer := 0;
  v_contract_customer_count integer := 0;
  v_repeat_customer_count integer := 0;
  v_avg_contract_value numeric := 0;
  v_repeat_rate numeric := 0;
  v_avg_purchases numeric := 0;
  v_estimated_clv numeric := 0;
  v_total_leads integer := 0;
  v_won_leads integer := 0;
  v_conversion_rate numeric := 0;
  v_marketing_spend numeric := 0;
  v_inventory_turnover numeric := 0;
  v_total_dresses integer := 0;
  v_total_rentals integer := 0;
  v_scenarios jsonb := '[]'::jsonb;
  v_revenue_breakdown jsonb := '[]'::jsonb;
  v_dress_roi jsonb := '[]'::jsonb;
  v_inventory_costs jsonb := '[]'::jsonb;
BEGIN
  IF p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month: %', p_month;
  END IF;

  IF p_year IS NULL OR p_year < 2000 THEN
    RAISE EXCEPTION 'Invalid year: %', p_year;
  END IF;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month')::date;
  v_prev_start := (v_start - interval '1 month')::date;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.payments
      WHERE deleted_at IS NULL AND payment_date >= v_start AND payment_date < v_end), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM public.receipts
      WHERE deleted_at IS NULL AND contract_id IS NULL AND receipt_date >= v_start AND receipt_date < v_end), 0)
  INTO v_monthly_revenue;

  SELECT
    COALESCE((SELECT SUM(amount) FROM public.expenses
      WHERE deleted_at IS NULL AND expense_date >= v_start AND expense_date < v_end), 0)
    -- ADR-016 M5: khong cong sheet luong (expenses da chua phieu chi luong)
  INTO v_monthly_expense;

  v_monthly_profit := v_monthly_revenue - v_monthly_expense;

  SELECT COUNT(*)::integer, COALESCE(SUM(total_amount), 0)
  INTO v_contracts_month, v_contract_value_month
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND status IS DISTINCT FROM 'da_huy'
    AND contract_date >= v_start
    AND contract_date < v_end;

  SELECT COUNT(*)::integer, COALESCE(SUM(total_amount), 0)
  INTO v_contracts_all, v_contract_value_all
  FROM public.contracts
  WHERE deleted_at IS NULL
    AND status IS DISTINCT FROM 'da_huy';

  SELECT COUNT(*)::integer
  INTO v_total_customers
  FROM public.customers
  WHERE deleted_at IS NULL;

  WITH customer_contracts AS (
    SELECT customer_id, COUNT(*)::integer AS contract_count
    FROM public.contracts
    WHERE deleted_at IS NULL
      AND status IS DISTINCT FROM 'da_huy'
    GROUP BY customer_id
  )
  SELECT
    COALESCE(COUNT(*)::integer, 0),
    COALESCE((COUNT(*) FILTER (WHERE contract_count > 1))::integer, 0),
    COALESCE(AVG(contract_count), 0)
  INTO v_contract_customer_count, v_repeat_customer_count, v_avg_purchases
  FROM customer_contracts;

  v_avg_contract_value := CASE
    WHEN v_contracts_all > 0 THEN ROUND(v_contract_value_all / v_contracts_all, 0)
    ELSE 0
  END;

  v_repeat_rate := CASE
    WHEN v_contract_customer_count > 0 THEN ROUND((v_repeat_customer_count::numeric / v_contract_customer_count) * 100, 1)
    ELSE 0
  END;

  v_estimated_clv := ROUND(v_avg_contract_value * GREATEST(v_avg_purchases, 1) * (1 + (v_repeat_rate / 100)), 0);

  SELECT
    COUNT(*)::integer,
    (COUNT(*) FILTER (WHERE status = 'da_chot'))::integer
  INTO v_total_leads, v_won_leads
  FROM public.crm_leads
  WHERE deleted_at IS NULL;

  v_conversion_rate := CASE
    WHEN v_total_leads > 0 THEN ROUND((v_won_leads::numeric / v_total_leads) * 100, 1)
    ELSE 0
  END;

  SELECT COALESCE(SUM(e.amount), 0)
  INTO v_marketing_spend
  FROM public.expenses e
  LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id
  WHERE e.deleted_at IS NULL
    AND e.expense_date >= v_start
    AND e.expense_date < v_end
    AND (
      lower(COALESCE(tc.name, '')) LIKE '%marketing%'
      OR lower(COALESCE(tc.category_code, '')) LIKE '%marketing%'
      OR lower(COALESCE(e.description, '')) LIKE '%marketing%'
      OR lower(COALESCE(e.description, '')) LIKE '%ads%'
      OR lower(COALESCE(e.description, '')) LIKE '%quang cao%'
      OR lower(COALESCE(e.description, '')) LIKE '%quảng cáo%'
    );

  SELECT ROUND(
    COALESCE((
      SELECT SUM(quantity)
      FROM public.inventory_transactions
      WHERE transaction_type = 'stock_out'
        AND created_at >= v_start
        AND created_at < v_end
    ), 0)::numeric
    / GREATEST((SELECT COUNT(*) FROM public.inventory_items WHERE deleted_at IS NULL), 1),
    1
  )
  INTO v_inventory_turnover;

  SELECT COUNT(*)::integer
  INTO v_total_dresses
  FROM public.dresses
  WHERE deleted_at IS NULL;

  SELECT COUNT(*)::integer
  INTO v_total_rentals
  FROM public.dress_rentals
  WHERE COALESCE(status, '') <> 'cancelled';

  v_scenarios := jsonb_build_array(
    jsonb_build_object(
      'label', 'Thận trọng',
      'type', 'conservative',
      'nextMonthRevenue', ROUND(v_monthly_revenue * 0.85, 0),
      'nextMonthProfit', ROUND((v_monthly_revenue * 0.85) - (v_monthly_expense * 0.95), 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 0.85 * 3, 0),
      'threeMonthProfit', ROUND(((v_monthly_revenue * 0.85) - (v_monthly_expense * 0.95)) * 3, 0),
      'description', 'Giả định doanh thu giảm 15% và biên lợi nhuận bị nén.'
    ),
    jsonb_build_object(
      'label', 'Cơ sở',
      'type', 'base',
      'nextMonthRevenue', ROUND(v_monthly_revenue, 0),
      'nextMonthProfit', ROUND(v_monthly_profit, 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 3, 0),
      'threeMonthProfit', ROUND(v_monthly_profit * 3, 0),
      'description', 'Giữ nhịp hiện tại theo dữ liệu thu chi production.'
    ),
    jsonb_build_object(
      'label', 'Tăng trưởng',
      'type', 'aggressive',
      'nextMonthRevenue', ROUND(v_monthly_revenue * 1.20, 0),
      'nextMonthProfit', ROUND((v_monthly_revenue * 1.20) - (v_monthly_expense * 1.05), 0),
      'threeMonthRevenue', ROUND(v_monthly_revenue * 1.20 * 3, 0),
      'threeMonthProfit', ROUND(((v_monthly_revenue * 1.20) - (v_monthly_expense * 1.05)) * 3, 0),
      'description', 'Giả định doanh thu tăng 20% và kiểm soát chi phí tốt hơn.'
    )
  );

  WITH service_totals AS (
    SELECT
      COALESCE(NULLIF(c.service_type::text, ''), 'Khác') AS service_type,
      COUNT(*)::integer AS contract_count,
      COALESCE(SUM(c.total_amount), 0) AS service_total
    FROM public.contracts c
    WHERE c.deleted_at IS NULL
      AND c.status IS DISTINCT FROM 'da_huy'
      AND c.contract_date >= v_start
      AND c.contract_date < v_end
    GROUP BY COALESCE(NULLIF(c.service_type::text, ''), 'Khác')
  ),
  ranked_services AS (
    SELECT
      service_type,
      contract_count,
      service_total,
      SUM(service_total) OVER () AS all_service_total
    FROM service_totals
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'service_type', service_type,
        'total', service_total,
        'count', contract_count,
        'percentage', CASE WHEN all_service_total > 0 THEN ROUND((service_total / all_service_total) * 100, 1) ELSE 0 END
      )
      ORDER BY service_total DESC
    ),
    '[]'::jsonb
  )
  INTO v_revenue_breakdown
  FROM ranked_services;

  WITH dress_totals AS (
    SELECT
      d.id,
      d.name,
      d.item_code,
      COALESCE(d.purchase_price, 0) AS purchase_price,
      (COUNT(dr.id) FILTER (WHERE COALESCE(dr.status, '') <> 'cancelled'))::integer AS rental_count,
      COALESCE(SUM(COALESCE(dr.rental_price, 0)) FILTER (WHERE COALESCE(dr.status, '') <> 'cancelled'), 0) AS rental_revenue
    FROM public.dresses d
    LEFT JOIN public.dress_rentals dr ON dr.item_id = d.id
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.name, d.item_code, d.purchase_price
  ),
  ranked_dresses AS (
    SELECT *
    FROM dress_totals
    WHERE rental_count > 0 OR purchase_price > 0
    ORDER BY rental_revenue DESC, rental_count DESC, name ASC
    LIMIT 5
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'code', item_code,
        'purchasePrice', purchase_price,
        'totalRentals', rental_count,
        'totalRevenue', rental_revenue,
        'roi', CASE
          WHEN purchase_price > 0 THEN ROUND(((rental_revenue - purchase_price) / purchase_price) * 100, 1)
          WHEN rental_revenue > 0 THEN 100
          ELSE 0
        END
      )
      ORDER BY rental_revenue DESC, rental_count DESC, name ASC
    ),
    '[]'::jsonb
  )
  INTO v_dress_roi
  FROM ranked_dresses;

  WITH this_month AS (
    SELECT
      COALESCE(NULLIF(ii.category, ''), 'Khác') AS category,
      COALESCE(SUM(COALESCE(it.total_cost, it.quantity * COALESCE(it.unit_cost, ii.average_unit_price, ii.purchase_price, 0))), 0) AS amount
    FROM public.inventory_transactions it
    JOIN public.inventory_items ii ON ii.id = it.item_id AND ii.deleted_at IS NULL
    WHERE it.transaction_type = 'stock_out'
      AND it.created_at >= v_start
      AND it.created_at < v_end
    GROUP BY COALESCE(NULLIF(ii.category, ''), 'Khác')
  ),
  prev_month AS (
    SELECT
      COALESCE(NULLIF(ii.category, ''), 'Khác') AS category,
      COALESCE(SUM(COALESCE(it.total_cost, it.quantity * COALESCE(it.unit_cost, ii.average_unit_price, ii.purchase_price, 0))), 0) AS amount
    FROM public.inventory_transactions it
    JOIN public.inventory_items ii ON ii.id = it.item_id AND ii.deleted_at IS NULL
    WHERE it.transaction_type = 'stock_out'
      AND it.created_at >= v_prev_start
      AND it.created_at < v_start
    GROUP BY COALESCE(NULLIF(ii.category, ''), 'Khác')
  ),
  categories AS (
    SELECT category FROM this_month
    UNION
    SELECT category FROM prev_month
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'category', c.category,
        'thisMonth', COALESCE(tm.amount, 0),
        'lastMonth', COALESCE(pm.amount, 0),
        'change', CASE
          WHEN COALESCE(pm.amount, 0) > 0 THEN ROUND(((COALESCE(tm.amount, 0) - pm.amount) / pm.amount) * 100, 1)
          WHEN COALESCE(tm.amount, 0) > 0 THEN 100
          ELSE 0
        END
      )
      ORDER BY COALESCE(tm.amount, 0) DESC, c.category ASC
    ),
    '[]'::jsonb
  )
  INTO v_inventory_costs
  FROM categories c
  LEFT JOIN this_month tm ON tm.category = c.category
  LEFT JOIN prev_month pm ON pm.category = c.category;

  RETURN jsonb_build_object(
    'scenarios', v_scenarios,
    'customerMetrics', jsonb_build_object(
      'totalCustomers', v_total_customers,
      'avgContractValue', v_avg_contract_value,
      'repeatCustomerRate', v_repeat_rate,
      'estimatedCLV', v_estimated_clv,
      'conversionRate', v_conversion_rate,
      'totalLeads', v_total_leads,
      'wonLeads', v_won_leads
    ),
    'revenueBreakdown', v_revenue_breakdown,
    'dressROI', v_dress_roi,
    'inventoryCosts', v_inventory_costs,
    'advancedKPIs', jsonb_build_object(
      'conversionRate', v_conversion_rate,
      'avgOrderValue', CASE WHEN v_contracts_month > 0 THEN ROUND(v_contract_value_month / v_contracts_month, 0) ELSE 0 END,
      'inventoryTurnover', COALESCE(v_inventory_turnover, 0),
      'cac', CASE WHEN v_contracts_month > 0 THEN ROUND(v_marketing_spend / v_contracts_month, 0) ELSE 0 END,
      'totalLeads', v_total_leads,
      'totalContracts', v_contracts_month,
      'totalDresses', v_total_dresses,
      'totalRentals', v_total_rentals
    )
  );
END;
$function$
;

-- 6c. get_cashflow_forecast (bản DB + v_salary_unpaid cho dòng ra ngày 5; monthlyBurnRate giữ sheet)
CREATE OR REPLACE FUNCTION public.get_cashflow_forecast(p_days integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := current_date;
  v_current_cash numeric := 0;
  v_lifetime_rev numeric := 0;
  v_lifetime_exp numeric := 0;
  v_fixed_cost numeric := 0;
  v_salary_component numeric := 0;
  v_salary_unpaid numeric := 0;
  v_forecast jsonb := '[]'::jsonb;
  v_running_bal numeric := 0;
  v_total_inflow numeric := 0;
  v_total_outflow numeric := 0;
  v_lowest_cash numeric := 0;
  v_critical_date date := NULL;
  v_curr_date date;
  v_contract_sum numeric;
  v_day_inflow numeric;
  v_day_outflow numeric;
  v_events jsonb;
BEGIN
  SELECT
    COALESCE((SELECT SUM(amount) FROM payments WHERE deleted_at IS NULL), 0)
    +
    COALESCE((SELECT SUM(receipt_amount) FROM receipts WHERE deleted_at IS NULL AND contract_id IS NULL), 0)
  INTO v_lifetime_rev;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_lifetime_exp
  FROM expenses
  WHERE deleted_at IS NULL;

  v_current_cash := v_lifetime_rev - v_lifetime_exp;
  v_running_bal := v_current_cash;
  v_lowest_cash := v_current_cash;

  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO v_fixed_cost
  FROM fixed_costs
  WHERE deleted_at IS NULL
    AND (start_date IS NULL OR start_date <= (v_today + p_days))
    AND (end_date IS NULL OR end_date >= v_today);

  SELECT COALESCE(SUM(total_salary), 0)
  INTO v_salary_component
  FROM monthly_salaries
  WHERE month = extract(month from v_today)
    AND year = extract(year from v_today);

  -- ADR-016 M5: dong ra du kien = phan luong THANG NAY CHUA TRA (da tra nam trong expenses)
  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO v_salary_unpaid
  FROM employee_salaries
  WHERE month = extract(month from v_today)
    AND year = extract(year from v_today);

  FOR i IN 0..(p_days - 1) LOOP
    v_curr_date := v_today + i;
    v_day_inflow := 0;
    v_day_outflow := 0;
    v_events := '[]'::jsonb;

    SELECT COALESCE(SUM(c.remaining_amount), 0)
    INTO v_contract_sum
    FROM contracts c
    WHERE c.work_date::date = v_curr_date
      AND c.remaining_amount > 0
      AND c.deleted_at IS NULL;

    IF v_contract_sum > 0 THEN
      v_day_inflow := v_day_inflow + v_contract_sum;
      v_events := v_events || jsonb_build_object('title', 'Du thu hop dong', 'amount', v_contract_sum, 'type', 'IN');
    END IF;

    IF extract(day from v_curr_date) = 1 AND v_fixed_cost > 0 THEN
      v_day_outflow := v_day_outflow + v_fixed_cost;
      v_events := v_events || jsonb_build_object('title', 'Chi phi co dinh', 'amount', v_fixed_cost, 'type', 'OUT');
    END IF;

    IF extract(day from v_curr_date) = 5 AND v_salary_unpaid > 0 THEN
      v_day_outflow := v_day_outflow + v_salary_unpaid;
      v_events := v_events || jsonb_build_object('title', 'Bang luong du kien', 'amount', v_salary_unpaid, 'type', 'OUT');
    END IF;

    v_running_bal := v_running_bal + v_day_inflow - v_day_outflow;
    v_total_inflow := v_total_inflow + v_day_inflow;
    v_total_outflow := v_total_outflow + v_day_outflow;

    IF v_running_bal < v_lowest_cash THEN
      v_lowest_cash := v_running_bal;
      v_critical_date := v_curr_date;
    END IF;

    v_forecast := v_forecast || jsonb_build_object(
      'date', to_char(v_curr_date, 'YYYY-MM-DD'),
      'projectedIncome', v_day_inflow,
      'projectedExpense', v_day_outflow,
      'balance', v_running_bal,
      'events', v_events
    );
  END LOOP;

  RETURN json_build_object(
    'currentBalance', v_current_cash,
    'monthlyBurnRate', v_fixed_cost + v_salary_component,
    'forecast30Days', v_forecast,
    'summary', json_build_object(
      'projectedInflow', v_total_inflow,
      'projectedOutflow', v_total_outflow,
      'netChange', v_total_inflow - v_total_outflow,
      'criticalDate', to_char(v_critical_date, 'YYYY-MM-DD')
    )
  );
END;
$function$
;

-- ---------------------------------------------------------------------------
-- 7. Đối soát: cost_salary_base tháng 8 hiện = 0 (2 dòng sheet đều 0) → sau đổi vẫn 0
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_base numeric;
BEGIN
  SELECT cost_salary_base INTO v_base FROM public.finance_month_summary(8, 2026);
  RAISE NOTICE 'cost_salary_base(8/2026) = %', v_base;
END $$;

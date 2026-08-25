-- T-20260825-cashflow-m1-so-tien-ra — ADR-016 "Ba sổ, một hợp đồng", M1: Sổ tiền ra.
-- Phiếu chi (expenses) = tiền THẬT rời két. Cam kết đọc từ bản ghi gốc (work_tasks.cost,
-- printing_orders.total_amount, inventory_transactions). Phân bổ phiếu chi vào bản ghi gốc
-- qua expense_allocations. Bỏ trích trước lab/thợ ngoài. 4 bảng thanh toán cũ → _legacy +
-- VIEW tương thích. Một hàm lợi nhuận contract_financials(). Chạy trong 1 transaction
-- (scripts/migrate-direct.mjs); mọi DO-block kiểm sai số sẽ RAISE → rollback toàn bộ.

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. PRE-CHECK — số đo 25/08/2026, lệch thì DỪNG
-- ═══════════════════════════════════════════════════════════════════════════
DO $chk$
DECLARE v_lab int; v_lab_sum numeric; v_vp int; v_vp_sum numeric; v_accrual int; v_stock_in int;
BEGIN
  SELECT count(*), coalesce(sum(amount),0) INTO v_lab, v_lab_sum FROM public.lab_payments;
  SELECT count(*), coalesce(sum(amount),0) INTO v_vp, v_vp_sum FROM public.vendor_payments WHERE deleted_at IS NULL;
  SELECT count(*) INTO v_accrual FROM public.expenses WHERE deleted_at IS NULL AND (printing_order_id IS NOT NULL OR work_task_id IS NOT NULL);
  SELECT count(*) INTO v_stock_in FROM public.inventory_transactions WHERE transaction_type = 'stock_in';
  IF v_lab <> 26 OR v_lab_sum <> 7936400 THEN RAISE EXCEPTION 'PRE-CHECK lab_payments: % dong, % (ky vong 26, 7936400)', v_lab, v_lab_sum; END IF;
  IF v_vp <> 5 OR v_vp_sum <> 11850000 THEN RAISE EXCEPTION 'PRE-CHECK vendor_payments: % dong, % (ky vong 5, 11850000)', v_vp, v_vp_sum; END IF;
  IF v_accrual <> 43 THEN RAISE EXCEPTION 'PRE-CHECK accrual expenses: % (ky vong 43)', v_accrual; END IF;
  IF v_stock_in <> 4 THEN RAISE EXCEPTION 'PRE-CHECK stock_in: % (ky vong 4)', v_stock_in; END IF;
END $chk$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS vendor_type text NOT NULL DEFAULT 'tho_ngoai';
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_vendor_type_check;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_vendor_type_check CHECK (vendor_type IN ('tho_ngoai','nha_cung_cap'));

ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.vendors(id);

INSERT INTO public.transaction_categories (category_code, name, type, is_default)
SELECT 'vat_tu', 'Chi phí vật tư', 'chi', false
WHERE NOT EXISTS (SELECT 1 FROM public.transaction_categories WHERE type = 'chi' AND category_code = 'vat_tu');

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payee_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS payee_id uuid,
  ADD COLUMN IF NOT EXISTS legacy_source text,
  ADD COLUMN IF NOT EXISTS legacy_source_id uuid;
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payee_type_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_payee_type_check CHECK (payee_type IN ('lab','vendor','supplier','employee','other'));
CREATE INDEX IF NOT EXISTS idx_expenses_payee ON public.expenses(payee_type, payee_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.expense_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('printing_order','work_task','inventory_transaction','employee_salary')),
  target_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_target ON public.expense_allocations(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense ON public.expense_allocations(expense_id);
ALTER TABLE public.expense_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.expense_allocations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.expense_allocations TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. DI TRÚ DỮ LIỆU
-- ═══════════════════════════════════════════════════════════════════════════
-- (a) Nhà cung cấp phôi: 3 cách viết → 1 đối tác
WITH sup AS (
  INSERT INTO public.vendors (full_name, service_type, status, vendor_type)
  VALUES ('Xưởng thiệp cưới HD', 'nha_cung_cap', 'active', 'nha_cung_cap')
  RETURNING id
)
UPDATE public.inventory_items i SET supplier_id = sup.id FROM sup
WHERE i.supplier IN ('In ấn HD', 'HD', 'Xưởng thiệp cưới HD');

-- (b) 26 lab_payments → phiếu chi payee=lab (bảng cũ không có ngày trả → created_at::date)
INSERT INTO public.expenses (expense_date, payment_method, category_id, amount, description, recipient, payee_type, payee_id,
                             approved_by, created_by, created_at, updated_at, legacy_source, legacy_source_id)
SELECT lp.created_at::date,
       (CASE WHEN lp.payment_method IN ('cash','tien_mat') THEN 'tien_mat' ELSE 'chuyen_khoan' END)::public.payment_method_enum,
       public.resolve_printing_expense_category_id(), lp.amount,
       'Trả lab ' || l.lab_name || COALESCE(' — ' || NULLIF(lp.note,''), ''), l.lab_name, 'lab', lp.lab_id,
       lp.created_by, lp.created_by, lp.created_at, lp.created_at, 'lab_payments', lp.id
FROM public.lab_payments lp JOIN public.labs l ON l.id = lp.lab_id;

INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_at, created_by)
SELECT e.id, 'printing_order', a.printing_order_id, a.amount, a.created_at, a.created_by
FROM public.lab_payment_allocations a
JOIN public.expenses e ON e.legacy_source = 'lab_payments' AND e.legacy_source_id = a.payment_id;

-- (c) 5 vendor_payments → phiếu chi payee=vendor (có payment_date thật)
INSERT INTO public.expenses (expense_date, payment_method, category_id, amount, description, recipient, payee_type, payee_id,
                             approved_by, created_by, created_at, updated_at, legacy_source, legacy_source_id)
SELECT vp.payment_date,
       (CASE WHEN vp.payment_method = 'tien_mat' THEN 'tien_mat' ELSE 'chuyen_khoan' END)::public.payment_method_enum,
       public.resolve_vendor_expense_category_id(), vp.amount,
       'Trả thợ ngoài ' || v.full_name || COALESCE(' — ' || NULLIF(vp.note,''), ''), v.full_name, 'vendor', vp.vendor_id,
       vp.created_by, vp.created_by, vp.created_at, vp.created_at, 'vendor_payments', vp.id
FROM public.vendor_payments vp JOIN public.vendors v ON v.id = vp.vendor_id
WHERE vp.deleted_at IS NULL;

INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_at, created_by)
SELECT e.id, 'work_task', a.work_task_id, a.amount, a.created_at, a.created_by
FROM public.vendor_payment_allocations a
JOIN public.expenses e ON e.legacy_source = 'vendor_payments' AND e.legacy_source_id = a.payment_id;

-- (d) 4 lô phôi đã nhập — user xác nhận ĐÃ TRẢ → phiếu chi payee=supplier, ngày = ngày nhập
INSERT INTO public.expenses (expense_date, payment_method, category_id, amount, description, recipient, payee_type, payee_id,
                             approved_by, created_by, created_at, updated_at, legacy_source, legacy_source_id)
SELECT t.created_at::date, 'chuyen_khoan'::public.payment_method_enum,
       (SELECT id FROM public.transaction_categories WHERE type = 'chi' AND category_code = 'vat_tu' LIMIT 1),
       t.total_cost, 'Nhập phôi ' || i.name || ' ×' || t.quantity || ' @' || t.unit_cost::bigint,
       v.full_name, 'supplier', i.supplier_id,
       t.created_by, t.created_by, t.created_at, t.created_at, 'inventory_transactions', t.id
FROM public.inventory_transactions t
JOIN public.inventory_items i ON i.id = t.item_id
JOIN public.vendors v ON v.id = i.supplier_id
WHERE t.transaction_type = 'stock_in';

INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_at, created_by)
SELECT e.id, 'inventory_transaction', e.legacy_source_id, e.amount, e.created_at, e.created_by
FROM public.expenses e WHERE e.legacy_source = 'inventory_transactions';

-- (e) 43 phiếu chi trích trước → xoá mềm (giữ audit)
UPDATE public.expenses
SET deleted_at = now(), updated_at = now(),
    description = description || ' [ADR-016: trích trước, thay bằng phiếu chi thật]'
WHERE deleted_at IS NULL AND (printing_order_id IS NOT NULL OR work_task_id IS NOT NULL);

DO $chk$
BEGIN
  IF (SELECT count(*) FROM public.expenses WHERE legacy_source = 'lab_payments') <> 26 THEN RAISE EXCEPTION 'DI TRU lab_payments: so dong sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expenses WHERE legacy_source = 'lab_payments') <> 7936400 THEN RAISE EXCEPTION 'DI TRU lab: tong sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expense_allocations WHERE target_type = 'printing_order')
     <> (SELECT coalesce(sum(amount),0) FROM public.lab_payment_allocations) THEN RAISE EXCEPTION 'DI TRU lab alloc: tong sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expenses WHERE legacy_source = 'vendor_payments') <> 11850000 THEN RAISE EXCEPTION 'DI TRU vendor: tong sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expense_allocations WHERE target_type = 'work_task')
     <> (SELECT coalesce(sum(a.amount),0) FROM public.vendor_payment_allocations a JOIN public.vendor_payments vp ON vp.id = a.payment_id WHERE vp.deleted_at IS NULL) THEN RAISE EXCEPTION 'DI TRU vendor alloc: tong sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expenses WHERE legacy_source = 'inventory_transactions') <> 2880000 THEN RAISE EXCEPTION 'DI TRU supplier: tong sai'; END IF;
  IF (SELECT count(*) FROM public.expenses WHERE deleted_at IS NOT NULL AND description LIKE '%[ADR-016%') <> 43 THEN RAISE EXCEPTION 'DI TRU accrual soft-delete: so dong sai'; END IF;
END $chk$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. BẢNG CŨ → _legacy + VIEW TƯƠNG THÍCH (app đọc lịch sử không cần đổi)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.lab_payments RENAME TO lab_payments_legacy;
ALTER TABLE public.lab_payment_allocations RENAME TO lab_payment_allocations_legacy;
ALTER TABLE public.vendor_payments RENAME TO vendor_payments_legacy;
ALTER TABLE public.vendor_payment_allocations RENAME TO vendor_payment_allocations_legacy;

CREATE VIEW public.lab_payments AS
  SELECT e.id, e.payee_id AS lab_id, e.amount,
         CASE WHEN e.payment_method = 'tien_mat' THEN 'cash' ELSE 'transfer' END AS payment_method,
         e.description AS note, e.created_by, e.created_at, e.expense_date
  FROM public.expenses e WHERE e.payee_type = 'lab' AND e.deleted_at IS NULL;

CREATE VIEW public.lab_payment_allocations AS
  SELECT a.id, a.expense_id AS payment_id, a.target_id AS printing_order_id, a.amount, a.created_at, a.created_by
  FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
  WHERE a.target_type = 'printing_order' AND e.deleted_at IS NULL;

CREATE VIEW public.vendor_payments AS
  SELECT e.id, e.payee_id AS vendor_id, e.amount, e.payment_method::text AS payment_method, e.expense_date AS payment_date,
         e.description AS note, e.created_at, e.updated_at, e.created_by, e.deleted_at
  FROM public.expenses e WHERE e.payee_type = 'vendor';

CREATE VIEW public.vendor_payment_allocations AS
  SELECT a.id, a.expense_id AS payment_id, a.target_id AS work_task_id, a.amount, a.created_at, a.created_by
  FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
  WHERE a.target_type = 'work_task' AND e.deleted_at IS NULL;

REVOKE ALL ON public.lab_payments, public.lab_payment_allocations, public.vendor_payments, public.vendor_payment_allocations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lab_payments, public.lab_payment_allocations, public.vendor_payments, public.vendor_payment_allocations TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. BỎ TRÍCH TRƯỚC
-- ═══════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS work_task_vendor_expense_sync ON public.work_tasks;
DROP FUNCTION IF EXISTS public.trg_sync_vendor_expense();
DROP FUNCTION IF EXISTS public.upsert_vendor_expense(uuid, uuid);
DROP FUNCTION IF EXISTS public.upsert_printing_expense(uuid, uuid);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. HÀM CÔNG NỢ / PHIẾU CHI
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.payable_remaining(p_target_type text, p_target_id uuid, p_payee_id uuid)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $fn$
  SELECT committed - allocated FROM (
    SELECT
      CASE p_target_type
        WHEN 'printing_order' THEN (SELECT po.total_amount FROM public.printing_orders po WHERE po.id = p_target_id AND po.lab_id = p_payee_id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy'))
        WHEN 'work_task' THEN (SELECT wt.cost FROM public.work_tasks wt WHERE wt.id = p_target_id AND wt.vendor_id = p_payee_id AND wt.status = 'hoan_thanh' AND wt.cost > 0)
        WHEN 'inventory_transaction' THEN (SELECT t.total_cost FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id WHERE t.id = p_target_id AND i.supplier_id = p_payee_id AND t.transaction_type = 'stock_in')
        WHEN 'employee_salary' THEN (SELECT s.net_salary FROM public.employee_salaries s WHERE s.id = p_target_id AND s.employee_id = p_payee_id)
      END AS committed,
      (SELECT COALESCE(SUM(a.amount),0) FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
        WHERE a.target_type = p_target_type AND a.target_id = p_target_id AND e.deleted_at IS NULL) AS allocated
  ) x WHERE committed IS NOT NULL;
$fn$;

CREATE OR REPLACE FUNCTION public.payable_items(p_payee_type text, p_payee_id uuid)
RETURNS TABLE(target_type text, target_id uuid, item_date date, label text, committed numeric, allocated numeric, remaining numeric)
LANGUAGE sql STABLE SET search_path = public AS $fn$
  WITH items AS (
    SELECT 'printing_order'::text AS target_type, po.id AS target_id, po.order_date AS item_date, po.order_code::text AS label, COALESCE(po.total_amount,0)::numeric AS committed
    FROM public.printing_orders po
    WHERE p_payee_type = 'lab' AND po.lab_id = p_payee_id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy')
    UNION ALL
    SELECT 'work_task', wt.id, COALESCE(ev.event_date::date, wt.deadline, wt.created_at::date), wt.work_type::text || COALESCE(' ' || c.contract_code, ''), COALESCE(wt.cost,0)::numeric
    FROM public.work_tasks wt LEFT JOIN public.contract_events ev ON ev.id = wt.event_id LEFT JOIN public.contracts c ON c.id = wt.contract_id
    WHERE p_payee_type = 'vendor' AND wt.vendor_id = p_payee_id AND wt.status = 'hoan_thanh' AND wt.cost > 0
    UNION ALL
    SELECT 'inventory_transaction', t.id, t.created_at::date, 'Nhập ' || i.name || ' ×' || t.quantity, COALESCE(t.total_cost,0)::numeric
    FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id
    WHERE p_payee_type = 'supplier' AND i.supplier_id = p_payee_id AND t.transaction_type = 'stock_in'
    UNION ALL
    SELECT 'employee_salary', s.id, make_date(s.year, s.month, 1), 'Lương ' || s.month || '/' || s.year, COALESCE(s.net_salary,0)::numeric
    FROM public.employee_salaries s WHERE p_payee_type = 'employee' AND s.employee_id = p_payee_id
  ), alloc AS (
    SELECT a.target_type, a.target_id, SUM(a.amount) AS allocated
    FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id WHERE e.deleted_at IS NULL
    GROUP BY a.target_type, a.target_id
  )
  SELECT i.target_type, i.target_id, i.item_date, i.label, i.committed, COALESCE(al.allocated,0)::numeric, GREATEST(i.committed - COALESCE(al.allocated,0), 0)::numeric
  FROM items i LEFT JOIN alloc al ON al.target_type = i.target_type AND al.target_id = i.target_id
  ORDER BY i.item_date, i.target_id;
$fn$;

CREATE OR REPLACE FUNCTION public.recompute_printing_payment_status(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  UPDATE public.printing_orders po
  SET payment_status = CASE
        WHEN COALESCE(po.total_amount,0) - COALESCE((
          SELECT SUM(a.amount) FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
          WHERE a.target_type = 'printing_order' AND a.target_id = po.id AND e.deleted_at IS NULL), 0) <= 0.01
        THEN 'da_thanh_toan' ELSE 'chua_thanh_toan' END,
      updated_at = now()
  WHERE po.id = p_order_id AND po.deleted_at IS NULL;
END $fn$;

CREATE OR REPLACE FUNCTION public.record_payee_payment_atomic(
  p_payee_type text, p_payee_id uuid, p_amount numeric, p_payment_method text,
  p_payment_date date, p_note text, p_allocations jsonb, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
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
END $fn$;

-- Wrapper giữ chữ ký cũ (app không đổi). Chữ ký cũ phải DROP để không tạo overload.
DROP FUNCTION IF EXISTS public.record_lab_payment_atomic(uuid, numeric, text, text, jsonb, uuid);
CREATE FUNCTION public.record_lab_payment_atomic(p_lab_id uuid, p_amount numeric, p_payment_method text, p_note text, p_allocations jsonb, p_actor_id uuid, p_payment_date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v jsonb; v_alloc jsonb := COALESCE(p_allocations, '[]'::jsonb); v_mapped jsonb;
BEGIN
  IF jsonb_typeof(v_alloc) = 'string' THEN v_alloc := (v_alloc #>> '{}')::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('target_id', x->>'printing_order_id', 'amount', x->>'amount')), '[]'::jsonb)
  INTO v_mapped FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_alloc) = 'array' THEN v_alloc ELSE '[]'::jsonb END) x;
  v := public.record_payee_payment_atomic('lab', p_lab_id, p_amount, p_payment_method, p_payment_date, p_note, v_mapped, p_actor_id);
  RETURN v || jsonb_build_object('payment_id', v->>'expense_id');
END $fn$;

DROP FUNCTION IF EXISTS public.record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid);
CREATE FUNCTION public.record_vendor_payment_atomic(p_vendor_id uuid, p_amount numeric, p_payment_method text, p_payment_date date, p_note text, p_allocations jsonb, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v jsonb; v_alloc jsonb := COALESCE(p_allocations, '[]'::jsonb); v_mapped jsonb;
BEGIN
  IF jsonb_typeof(v_alloc) = 'string' THEN v_alloc := (v_alloc #>> '{}')::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('target_id', x->>'work_task_id', 'amount', x->>'amount')), '[]'::jsonb)
  INTO v_mapped FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_alloc) = 'array' THEN v_alloc ELSE '[]'::jsonb END) x;
  v := public.record_payee_payment_atomic('vendor', p_vendor_id, p_amount, p_payment_method, p_payment_date, p_note, v_mapped, p_actor_id);
  RETURN v || jsonb_build_object('payment_id', v->>'expense_id', 'unallocated_amount', 0);
END $fn$;

CREATE OR REPLACE FUNCTION public.finance_payable_summary()
RETURNS TABLE(payee_type text, payee_id uuid, payee_name text, item_count bigint, total_committed numeric, total_paid numeric, remaining numeric, last_item_date date, last_payment_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH payees AS (
    SELECT 'lab'::text AS payee_type, id AS payee_id, lab_name::text AS payee_name FROM public.labs WHERE deleted_at IS NULL
    UNION ALL SELECT 'vendor', id, full_name FROM public.vendors WHERE deleted_at IS NULL AND status = 'active' AND vendor_type = 'tho_ngoai'
    UNION ALL SELECT 'supplier', id, full_name FROM public.vendors WHERE deleted_at IS NULL AND vendor_type = 'nha_cung_cap'
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
$fn$;

-- Wrapper giữ nguyên RETURNS cũ cho 2 màn công nợ + KPI /printing
CREATE OR REPLACE FUNCTION public.finance_lab_debt_summary()
RETURNS TABLE(lab_id uuid, lab_name text, order_count bigint, total_orders numeric, total_paid numeric, remaining numeric, last_order_date timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT s.payee_id, s.payee_name, s.item_count, s.total_committed, s.total_paid, s.remaining, s.last_item_date::timestamptz
  FROM public.finance_payable_summary() s WHERE s.payee_type = 'lab' ORDER BY s.remaining DESC;
$fn$;

CREATE OR REPLACE FUNCTION public.finance_vendor_debt_summary()
RETURNS TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, task_count bigint, total_cost numeric, total_paid numeric, remaining numeric, last_task_date date, last_payment_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT s.payee_id, s.payee_name, v.phone::text, v.service_type::text, s.item_count, s.total_committed, s.total_paid, s.remaining, s.last_item_date, s.last_payment_date
  FROM public.finance_payable_summary() s JOIN public.vendors v ON v.id = s.payee_id
  WHERE s.payee_type = 'vendor' ORDER BY s.remaining DESC, s.last_item_date ASC;
$fn$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. MỘT HÀM LỢI NHUẬN HỢP ĐỒNG (ADR-016 §3)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.contract_financials(p_contract_ids uuid[])
RETURNS TABLE(contract_id uuid, revenue numeric, task_cost numeric, print_cost numeric, cogs numeric, direct_cost numeric, total_cost numeric, profit numeric, profit_margin numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
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
$fn$;

CREATE OR REPLACE FUNCTION public.finance_contract_profit_report(p_status text DEFAULT 'all', p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_page integer DEFAULT 1, p_page_size integer DEFAULT 10)
RETURNS TABLE(id uuid, contract_code text, customer_name text, contract_date date, status text, total_amount numeric, paid_amount numeric, remaining_amount numeric, package_revenue numeric, addon_revenue numeric, discount numeric, task_cost numeric, print_cost numeric, expense_cost numeric, total_cost numeric, profit numeric, profit_margin numeric, total_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_total_count INT;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM public.contracts c
  WHERE c.deleted_at IS NULL
    AND (p_status IS NULL OR p_status = 'all' OR c.status::text = p_status)
    AND (p_from IS NULL OR c.contract_date >= p_from)
    AND (p_to IS NULL OR c.contract_date <= p_to);

  RETURN QUERY
  WITH paginated AS (
    SELECT c.id, c.contract_code, cu.full_name AS customer_name, c.contract_date, c.status, c.total_amount,
           COALESCE(c.paid_amount, 0) AS paid_amount, COALESCE(c.remaining_amount, 0) AS remaining_amount, COALESCE(c.discount_amount, 0) AS discount
    FROM public.contracts c LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR p_status = 'all' OR c.status::text = p_status)
      AND (p_from IS NULL OR c.contract_date >= p_from)
      AND (p_to IS NULL OR c.contract_date <= p_to)
    ORDER BY c.contract_date DESC, c.contract_code DESC
    LIMIT p_page_size OFFSET GREATEST(p_page - 1, 0) * p_page_size
  ),
  fin AS (SELECT * FROM public.contract_financials(ARRAY(SELECT pg.id FROM paginated pg)))
  SELECT p.id, p.contract_code::TEXT, COALESCE(p.customer_name, 'Khach vang lai')::TEXT, p.contract_date, p.status::TEXT,
         p.total_amount, p.paid_amount, p.remaining_amount,
         COALESCE(items.package_revenue, 0)::NUMERIC, COALESCE(items.addon_revenue, 0)::NUMERIC, p.discount,
         COALESCE(f.task_cost, 0)::NUMERIC, COALESCE(f.print_cost, 0)::NUMERIC, (COALESCE(f.direct_cost, 0) + COALESCE(f.cogs, 0))::NUMERIC,
         COALESCE(f.total_cost, 0)::NUMERIC, COALESCE(f.profit, p.total_amount)::NUMERIC, COALESCE(f.profit_margin, 0)::NUMERIC,
         v_total_count
  FROM paginated p
  LEFT JOIN LATERAL (
    SELECT SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN COALESCE(ci.total_amount, 0) ELSE 0 END) AS addon_revenue,
           SUM(CASE WHEN COALESCE(ci.is_addon, FALSE) THEN 0 ELSE COALESCE(ci.total_amount, 0) END) AS package_revenue
    FROM public.contract_items ci WHERE ci.contract_id = p.id AND ci.deleted_at IS NULL
  ) items ON TRUE
  LEFT JOIN fin f ON f.contract_id = p.id;
END $fn$;

-- get_contract_list_v2: giữ nguyên toàn bộ, chỉ thay 3 LATERAL task_cost/print_cost/expense_cost bằng contract_financials
CREATE OR REPLACE FUNCTION public.get_contract_list_v2(p_status text DEFAULT 'all'::text, p_search text DEFAULT ''::text, p_service_type text DEFAULT 'all'::text, p_sort text DEFAULT 'newest'::text, p_time_filter text DEFAULT 'all'::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_page integer DEFAULT 1, p_page_size integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_offset integer := (GREATEST(COALESCE(p_page, 1), 1) - 1) * LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_search text := NULLIF(BTRIM(COALESCE(p_search, '')), '');
BEGIN
  RETURN (
    WITH filtered AS (
      SELECT c.*
      FROM public.contracts c
      LEFT JOIN public.customers cust ON cust.id = c.customer_id
      WHERE c.deleted_at IS NULL
        AND (
          (COALESCE(p_status, 'all') = 'all' AND c.status <> 'da_huy')
          OR (COALESCE(p_status, 'all') <> 'all' AND c.status::text = p_status)
        )
        AND (
          COALESCE(p_service_type, 'all') = 'all'
          OR c.service_type::text = p_service_type
        )
        AND (
          v_search IS NULL
          OR c.contract_code ILIKE '%' || v_search || '%'
          OR cust.full_name ILIKE '%' || v_search || '%'
          OR cust.customer_code ILIKE '%' || v_search || '%'
          OR cust.phone ILIKE '%' || v_search || '%'
          OR cust.bride_name ILIKE '%' || v_search || '%'
          OR cust.groom_name ILIKE '%' || v_search || '%'
        )
        AND (
          COALESCE(p_time_filter, 'all') = 'all'
          OR (
            p_time_filter = 'this_month'
            AND c.contract_date >= date_trunc('month', CURRENT_DATE)::date
            AND c.contract_date < (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
          )
          OR (
            p_time_filter = 'last_month'
            AND c.contract_date >= (date_trunc('month', CURRENT_DATE) - interval '1 month')::date
            AND c.contract_date < date_trunc('month', CURRENT_DATE)::date
          )
          OR (
            p_time_filter = 'this_year'
            AND c.contract_date >= date_trunc('year', CURRENT_DATE)::date
            AND c.contract_date < (date_trunc('year', CURRENT_DATE) + interval '1 year')::date
          )
        )
        AND (p_start_date IS NULL OR c.contract_date >= p_start_date)
        AND (p_end_date IS NULL OR c.contract_date <= p_end_date)
    ),
    counted AS (
      SELECT COUNT(*)::integer AS total
      FROM filtered
    ),
    paged AS (
      SELECT f.*
      FROM filtered f
      ORDER BY
        CASE WHEN p_sort = 'oldest' THEN f.created_at END ASC NULLS LAST,
        CASE WHEN p_sort = 'amount_desc' THEN f.total_amount END DESC NULLS LAST,
        CASE WHEN p_sort = 'amount_asc' THEN f.total_amount END ASC NULLS LAST,
        f.created_at DESC NULLS LAST
      LIMIT v_page_size
      OFFSET v_offset
    ),
    rows AS (
      SELECT
        c.created_at,
        c.total_amount,
        jsonb_build_object(
          'id', c.id,
          'contract_code', c.contract_code,
          'customer_id', c.customer_id,
          'service_type', c.service_type,
          'transaction_type', c.transaction_type,
          'contract_date', c.contract_date,
          'work_date', c.work_date,
          'delivery_date', c.delivery_date,
          'total_amount', c.total_amount,
          'discount_amount', c.discount_amount,
          'paid_amount', c.paid_amount,
          'remaining_amount', c.remaining_amount,
          'status', c.status,
          'payment_status', c.payment_status,
          'description', c.description,
          'updated_at', c.updated_at,
          'created_at', c.created_at,
          'total_cost', COALESCE(cf.total_cost, 0),
          'profit', COALESCE(cf.profit, c.total_amount),
          'profit_margin', COALESCE(cf.profit_margin, 0),
          'customers', CASE
            WHEN cust.id IS NULL THEN NULL
            ELSE jsonb_build_object(
              'id', cust.id,
              'customer_code', cust.customer_code,
              'full_name', cust.full_name,
              'phone', cust.phone,
              'address', cust.address,
              'bride_name', cust.bride_name,
              'groom_name', cust.groom_name
            )
          END,
          'work_tasks', COALESCE(tasks.items, '[]'::jsonb),
          'contract_checklists', COALESCE(checklists.items, '[]'::jsonb),
          'contract_notes', COALESCE(notes.items, '[]'::jsonb),
          'contract_events', COALESCE(events.items, '[]'::jsonb),
          'next_event_date', events.next_event_date
        ) AS item
      FROM paged c
      LEFT JOIN public.customers cust ON cust.id = c.customer_id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', wt.id,
            'contract_id', wt.contract_id,
            'work_type', wt.work_type,
            'status', wt.status,
            'deadline', wt.deadline
          )
          ORDER BY wt.deadline ASC NULLS LAST, wt.created_at ASC NULLS LAST
        ) AS items
        FROM public.work_tasks wt
        WHERE wt.contract_id = c.id
      ) tasks ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', cc.id,
            'contract_id', cc.contract_id,
            'event_stage', cc.event_stage,
            'category', cc.category,
            'item_name', cc.item_name,
            'is_completed', cc.is_completed,
            'created_at', cc.created_at,
            'updated_at', cc.updated_at
          )
          ORDER BY cc.created_at ASC NULLS LAST
        ) AS items
        FROM public.contract_checklists cc
        WHERE cc.contract_id = c.id
      ) checklists ON TRUE
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', n.id,
            'content', n.content,
            'created_by', n.created_by,
            'created_at', n.created_at
          )
          ORDER BY n.created_at DESC
        ) AS items
        FROM (
          SELECT id, content, created_by, created_at
          FROM public.contract_notes
          WHERE contract_id = c.id
          ORDER BY created_at DESC
          LIMIT 10
        ) n
      ) notes ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          jsonb_agg(
            jsonb_build_object(
              'id', ce.id,
              'event_type', ce.event_type,
              'title', ce.title,
              'event_date', ce.event_date,
              'end_date', ce.end_date,
              'location', ce.location,
              'status', ce.status,
              'sort_order', ce.sort_order
            )
            ORDER BY ce.event_date ASC NULLS LAST
          ) AS items,
          MIN(ce.event_date) FILTER (WHERE ce.event_date >= CURRENT_DATE) AS next_event_date
        FROM public.contract_events ce
        WHERE ce.contract_id = c.id
          AND ce.deleted_at IS NULL
          AND ce.event_type IN ('ngay_chup', 'ngay_to_chuc')
      ) events ON TRUE
      LEFT JOIN LATERAL (
        SELECT f.total_cost, f.profit, f.profit_margin
        FROM public.contract_financials(ARRAY[c.id]) f
      ) cf ON TRUE
    )
    SELECT jsonb_build_object(
      'contracts',
      COALESCE(
        jsonb_agg(
          rows.item
          ORDER BY
            CASE WHEN p_sort = 'oldest' THEN rows.created_at END ASC NULLS LAST,
            CASE WHEN p_sort = 'amount_desc' THEN rows.total_amount END DESC NULLS LAST,
            CASE WHEN p_sort = 'amount_asc' THEN rows.total_amount END ASC NULLS LAST,
            rows.created_at DESC NULLS LAST
        ) FILTER (WHERE rows.item IS NOT NULL),
        '[]'::jsonb
      ),
      'total', counted.total,
      'page', v_page,
      'pageSize', v_page_size
    )
    FROM counted
    LEFT JOIN rows ON TRUE
    GROUP BY counted.total
  );
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RPC ĐƠN IN — bỏ phiếu chi trích trước
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_printing_order_atomic(p_order jsonb, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_contract_id uuid := NULLIF(p_order->>'contractId', '')::uuid;
  v_lab_id uuid := NULLIF(p_order->>'labId', '')::uuid;
  v_items jsonb := COALESCE(p_order->'items', '[]'::jsonb);
  v_total numeric; v_order_id uuid; v_order_code text;
BEGIN
  IF v_contract_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.contracts WHERE id = v_contract_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Hop dong khong hop le';
  END IF;
  IF v_lab_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.labs WHERE id = v_lab_id AND deleted_at IS NULL AND status = 'active') THEN
    RAISE EXCEPTION 'Lab khong hop le';
  END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Can it nhat 1 san pham';
  END IF;
  v_total := public.printing_items_total(v_items);
  v_order_code := public.nextval_printing_order_code();
  INSERT INTO public.printing_orders(contract_id, lab_id, order_code, status, payment_status, total_amount, order_date, expected_date, items, notes, created_by, created_at, updated_at, updated_by)
  VALUES (v_contract_id, v_lab_id, v_order_code, 'cho_xu_ly', 'chua_thanh_toan', v_total, now(), NULLIF(p_order->>'expectedDate', '')::date, v_items, NULLIF(p_order->>'notes', ''), p_actor_id, now(), now(), p_actor_id)
  RETURNING id INTO v_order_id;
  -- ADR-016: KHÔNG tạo phiếu chi trích trước — chi phí lab là cam kết (printing_orders.total_amount)
  RETURN jsonb_build_object('order_id', v_order_id, 'order_code', v_order_code, 'contract_id', v_contract_id, 'total_amount', v_total);
END $fn$;

CREATE OR REPLACE FUNCTION public.update_printing_order_atomic(p_order_id uuid, p_order jsonb, p_expected_updated_at timestamptz, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_current public.printing_orders%ROWTYPE;
  v_lab_id uuid := NULLIF(p_order->>'labId', '')::uuid;
  v_items jsonb := COALESCE(p_order->'items', '[]'::jsonb);
  v_total numeric; v_updated_at timestamptz;
BEGIN
  SELECT * INTO v_current FROM public.printing_orders WHERE id = p_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Khong tim thay don in'; END IF;
  IF p_expected_updated_at IS NOT NULL AND v_current.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Don in da duoc cap nhat boi nguoi khac. Vui long tai lai trang.';
  END IF;
  IF v_lab_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.labs WHERE id = v_lab_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Lab khong hop le';
  END IF;
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Can it nhat 1 san pham';
  END IF;
  v_total := public.printing_items_total(v_items);
  UPDATE public.printing_orders
  SET lab_id = v_lab_id, items = v_items, notes = NULLIF(p_order->>'notes', ''), expected_date = NULLIF(p_order->>'expectedDate', '')::date,
      total_amount = v_total, updated_at = now(), updated_by = p_actor_id
  WHERE id = p_order_id RETURNING updated_at INTO v_updated_at;
  -- ADR-016: tổng đơn đổi → trạng thái thanh toán dẫn xuất lại từ phân bổ
  PERFORM public.recompute_printing_payment_status(p_order_id);
  RETURN jsonb_build_object('order_id', p_order_id, 'order_code', v_current.order_code, 'contract_id', v_current.contract_id, 'total_amount', v_total, 'updated_at', v_updated_at);
END $fn$;

CREATE OR REPLACE FUNCTION public.delete_printing_order_atomic(p_order_id uuid, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_current public.printing_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_current FROM public.printing_orders WHERE id = p_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Khong tim thay don in'; END IF;
  IF EXISTS (SELECT 1 FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
             WHERE a.target_type = 'printing_order' AND a.target_id = p_order_id AND e.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Don in da co phieu chi tra lab, khong the xoa';
  END IF;
  UPDATE public.printing_orders SET deleted_at = now(), updated_at = now(), updated_by = p_actor_id WHERE id = p_order_id;
  RETURN jsonb_build_object('order_id', p_order_id, 'order_code', v_current.order_code, 'contract_id', v_current.contract_id);
END $fn$;

CREATE OR REPLACE FUNCTION public.printing_integrity_report()
RETURNS TABLE(check_name text, issue_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  WITH alloc AS (
    SELECT a.target_type, a.target_id, SUM(a.amount) AS allocated
    FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id WHERE e.deleted_at IS NULL
    GROUP BY a.target_type, a.target_id
  )
  SELECT 'legacy_accrual_expense_active'::text, COUNT(*)::bigint FROM public.expenses
   WHERE deleted_at IS NULL AND (printing_order_id IS NOT NULL OR work_task_id IS NOT NULL OR description LIKE '[Auto-Print]%' OR description LIKE '[Auto-Vendor]%')
  UNION ALL
  SELECT 'order_overallocated', COUNT(*)::bigint FROM public.printing_orders po JOIN alloc al ON al.target_type = 'printing_order' AND al.target_id = po.id
   WHERE po.deleted_at IS NULL AND al.allocated - 0.01 > COALESCE(po.total_amount, 0)
  UNION ALL
  SELECT 'payment_status_mismatch', COUNT(*)::bigint FROM public.printing_orders po LEFT JOIN alloc al ON al.target_type = 'printing_order' AND al.target_id = po.id
   WHERE po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy') AND COALESCE(po.total_amount, 0) > 0
     AND ((po.payment_status = 'da_thanh_toan' AND COALESCE(po.total_amount,0) - COALESCE(al.allocated,0) > 0.01)
       OR (po.payment_status = 'chua_thanh_toan' AND COALESCE(po.total_amount,0) - COALESCE(al.allocated,0) <= 0.01))
  UNION ALL
  SELECT 'allocation_to_missing_target', COUNT(*)::bigint FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id AND e.deleted_at IS NULL
   WHERE (a.target_type = 'printing_order' AND NOT EXISTS (SELECT 1 FROM public.printing_orders po WHERE po.id = a.target_id))
      OR (a.target_type = 'work_task' AND NOT EXISTS (SELECT 1 FROM public.work_tasks wt WHERE wt.id = a.target_id))
      OR (a.target_type = 'inventory_transaction' AND NOT EXISTS (SELECT 1 FROM public.inventory_transactions t WHERE t.id = a.target_id))
      OR (a.target_type = 'employee_salary' AND NOT EXISTS (SELECT 1 FROM public.employee_salaries s WHERE s.id = a.target_id));
$fn$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. NHẬP KHO — chữ ký mới: phôi trả ngay → phiếu chi trong cùng transaction
-- ═══════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid);
CREATE FUNCTION public.inventory_stock_in_atomic(
  p_item_id uuid, p_quantity integer, p_unit_cost numeric, p_supplier text, p_reason text, p_notes text, p_user_id uuid,
  p_supplier_id uuid DEFAULT NULL, p_paid boolean DEFAULT true, p_payment_method text DEFAULT 'chuyen_khoan', p_paid_date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_current_stock integer; v_old_avg numeric; v_new_stock integer; v_new_avg numeric; v_item_name text; v_status text;
  v_txn_id uuid; v_supplier_id uuid; v_expense jsonb;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than 0'; END IF;
  IF p_unit_cost IS NULL OR p_unit_cost < 0 THEN RAISE EXCEPTION 'Unit cost must be greater than or equal to 0'; END IF;
  SELECT COALESCE(current_stock, 0), COALESCE(average_unit_price, 0), name, status, supplier_id
  INTO v_current_stock, v_old_avg, v_item_name, v_status, v_supplier_id
  FROM public.inventory_items WHERE id = p_item_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item does not exist'; END IF;
  IF v_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'Cannot stock in discontinued inventory item'; END IF;
  v_supplier_id := COALESCE(p_supplier_id, v_supplier_id);
  IF p_paid AND p_quantity * p_unit_cost > 0 AND v_supplier_id IS NULL THEN
    RAISE EXCEPTION 'Nhap kho da tra tien can chon nha cung cap';
  END IF;

  v_new_stock := v_current_stock + p_quantity;
  v_new_avg := CASE WHEN v_new_stock > 0 THEN ((v_current_stock * v_old_avg) + (p_quantity * p_unit_cost)) / v_new_stock ELSE p_unit_cost END;

  INSERT INTO public.inventory_transactions (item_id, transaction_type, quantity, unit_cost, supplier, reason, notes, source_type, performed_by, created_by)
  VALUES (p_item_id, 'stock_in', p_quantity, p_unit_cost, NULLIF(BTRIM(COALESCE(p_supplier, '')), ''), COALESCE(NULLIF(BTRIM(COALESCE(p_reason, '')), ''), 'Nhap kho'), NULLIF(BTRIM(COALESCE(p_notes, '')), ''), 'stock_in', p_user_id, p_user_id)
  RETURNING id INTO v_txn_id;

  UPDATE public.inventory_items
  SET current_stock = v_new_stock, average_unit_price = ROUND(v_new_avg, 2), purchase_price = p_unit_cost,
      supplier_id = v_supplier_id, updated_by = p_user_id, updated_at = now()
  WHERE id = p_item_id;

  IF p_paid AND p_quantity * p_unit_cost > 0 THEN
    v_expense := public.record_payee_payment_atomic('supplier', v_supplier_id, p_quantity * p_unit_cost, p_payment_method, p_paid_date,
      'Nhập phôi ' || v_item_name || ' ×' || p_quantity,
      jsonb_build_array(jsonb_build_object('target_id', v_txn_id, 'amount', p_quantity * p_unit_cost)), p_user_id);
  END IF;

  RETURN jsonb_build_object('item_id', p_item_id, 'item_name', v_item_name, 'current_stock', v_new_stock, 'average_unit_price', ROUND(v_new_avg, 2),
                            'transaction_id', v_txn_id, 'expense_id', v_expense->>'expense_id');
END $fn$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. DẪN XUẤT LẠI payment_status + QUYỀN
-- ═══════════════════════════════════════════════════════════════════════════
SELECT public.recompute_printing_payment_status(id) FROM public.printing_orders WHERE deleted_at IS NULL;

REVOKE ALL ON FUNCTION public.payable_remaining(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.payable_items(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_printing_payment_status(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_payee_payment_atomic(text, uuid, numeric, text, date, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_lab_payment_atomic(uuid, numeric, text, text, jsonb, uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_payable_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_lab_debt_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_vendor_debt_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.contract_financials(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_contract_profit_report(text, date, date, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_contract_list_v2(text, text, text, text, text, date, date, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.printing_integrity_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid, uuid, boolean, text, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_printing_order_atomic(jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_printing_order_atomic(uuid, jsonb, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_printing_order_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.payable_remaining(text, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.payable_items(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_printing_payment_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_payee_payment_atomic(text, uuid, numeric, text, date, text, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_lab_payment_atomic(uuid, numeric, text, text, jsonb, uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_payable_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_lab_debt_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_vendor_debt_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.contract_financials(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_contract_profit_report(text, date, date, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_contract_list_v2(text, text, text, text, text, date, date, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.printing_integrity_report() TO service_role;
GRANT EXECUTE ON FUNCTION public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid, uuid, boolean, text, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_printing_order_atomic(jsonb, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_printing_order_atomic(uuid, jsonb, timestamptz, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_printing_order_atomic(uuid, uuid) TO service_role;

-- POST-CHECK — kết quả kỳ vọng (không raise, chỉ để verify đọc lại bằng db-q.mjs):
--   finance_payable_summary(): lab Hồng Bảo remaining 1905000 · vendor 0 dòng · supplier 0 dòng
--   printing_integrity_report(): 4 check = 0
--   count(payment_status='da_thanh_toan') giữ nguyên so với trước migration

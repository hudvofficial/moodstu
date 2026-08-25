# T-20260825-cashflow-m1-so-tien-ra — M1: Sổ tiền ra — phiếu chi = tiền thật, `expense_allocations`, bỏ trích trước, một hàm lợi nhuận

**Owner:** claude (fallback — user: "nếu được cover rồi thì cho phép bạn Làm đi") · **Trạng thái:** đã implement + migration ĐÃ ÁP prod (26/08) + verify xanh, branch `claude/cashflow-m1`, **chờ user merge → main + push** · **ADR:** ADR-016 (Accepted) · **Thiết kế:** `docs/design/dong-tien-mood-v2.md` (bản 2 + §3.1b luật ngày) · **Kết quả:** §6 cuối file
**Module:** tai-chinh (chính) · in-an-lab · nha-cung-cap · vat-tu · hop-dong (RPC) — **verify: multi-module**.

**Locks:**
- `supabase/migrations/20260825200000_cashflow_m1_expense_allocations.sql` (mới)
- `types/database.types.ts` (sinh lại)
- `lib/validations/lab.schema.ts` · `lib/validations/finance.schema.ts`
- `app/actions/lab-mutations.ts` · `app/actions/vendor-payment-actions.ts` · `app/actions/vendor-actions.ts` · `app/actions/work-task-actions.ts` · `app/actions/salary-actions.ts` · `app/actions/expense-actions.ts` · `app/actions/inventory-mutations.ts` · `app/actions/finance-dashboard-queries.ts` · `app/actions/contract-profit.ts` (xoá)
- `components/printing/labs/lab-payment-modal.tsx` · `components/inventory/stock-in-modal.tsx`
- `scripts/verify-printing.mjs` (chỉ nếu tên check đổi — xem §5)
- `vault/50-luong/luong-tien.md`, `vault/40-module/tai-chinh.md`, `in-an-lab.md`, `nha-cung-cap.md`, `vat-tu.md` (viết lại đoạn liên quan)

**KHÔNG đụng (M2+):** dashboard/ledger/cashflow RPC và UI (`finance_dashboard_metrics`, `finance_ledger*`, `get_cashflow_forecast`, `finance_reports_snapshot`, `get_finance_intelligence`, `finance_revenue_by_month`) — sau M1 chúng **tự đúng hơn** vì `expenses` chỉ còn tiền thật; nhãn/3 số làm ở M2. `payments`/`payment_plans`/`receipts`. `create_sale_receipt_atomic`, `create_contract_inventory_addon_sale_atomic`. Màn `/finance/lab-debts`, `/finance/vendor-debts` (giữ, đọc qua wrapper RPC — hợp nhất UI ở M2). `employee_salaries` phân bổ (M5). Spec `T-20260825-printing-cancel-inventory-deadcode` độc lập (không giao lock).

---

## 0. Mục tiêu đo được

Sau M1, trên production:
1. `expenses` (không xoá mềm) **không còn dòng nào** có `description LIKE '[Auto-Print]%'` / `'[Auto-Vendor]%'`; `Σ amount` = tiền thật đã rời két: **7.936.400 (lab) + 11.850.000 (thợ) + 2.880.000 (phôi) + phiếu chi lương/khác hiện có**.
2. `finance_payable_summary()`: lab Hồng Bảo còn **1.905.000**, thợ ngoài **0** (task `dang_lam` 1.350.000 chưa tính), NCC phôi **0**.
3. `printing_orders.payment_status` giữ nguyên kết quả cho 33 đơn (đếm `da_thanh_toan` trước = sau).
4. `contract_financials()` cho 60 HĐ: khớp `finance_contract_profit_report` cũ ở **59 HĐ**, lệch đúng 1 (HĐ-2026-0064: −1.350.000 vì task vendor `dang_lam` giờ tính là cam kết — ADR-016 §3).
5. Tạo đơn in / sửa đơn in / hoàn thành task vendor **không** sinh phiếu chi. Trả lab / trả thợ / nhập phôi **sinh phiếu chi thật** có ngày nhập tay.
6. `npm run verify:printing` xanh với bộ check mới; `verify:contracts`, `verify:inventory` xanh.

## 1. Migration `supabase/migrations/20260825200000_cashflow_m1_expense_allocations.sql`

Chạy bằng `node scripts/migrate-direct.mjs` (transaction). **Pre-check bắt buộc** — 6 số phải khớp, lệch thì DỪNG:
```sql
SELECT (SELECT count(*) FROM lab_payments) AS lab_pay,                       -- 26
       (SELECT coalesce(sum(amount),0) FROM lab_payments) AS lab_sum,        -- 7936400
       (SELECT count(*) FROM vendor_payments WHERE deleted_at IS NULL) AS vp, -- 5
       (SELECT coalesce(sum(amount),0) FROM vendor_payments WHERE deleted_at IS NULL) AS vp_sum, -- 11850000
       (SELECT count(*) FROM expenses WHERE deleted_at IS NULL AND (printing_order_id IS NOT NULL OR work_task_id IS NOT NULL)) AS accrual, -- 43
       (SELECT count(*) FROM inventory_transactions WHERE transaction_type='stock_in') AS stock_in; -- 4
```

### 1.1 Schema
```sql
-- Đối tác ngoài: thợ ngoài | nhà cung cấp phôi
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS vendor_type text NOT NULL DEFAULT 'tho_ngoai'
  CHECK (vendor_type IN ('tho_ngoai','nha_cung_cap'));
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.vendors(id);

-- Danh mục chi cho vật tư (chưa có)
INSERT INTO public.transaction_categories (category_code, name, type, is_default)
SELECT 'vat_tu', 'Chi phí vật tư', 'chi', false
WHERE NOT EXISTS (SELECT 1 FROM public.transaction_categories WHERE type='chi' AND category_code='vat_tu');

-- Phiếu chi: người nhận + nguồn di trú
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payee_type text NOT NULL DEFAULT 'other'
    CHECK (payee_type IN ('lab','vendor','supplier','employee','other')),
  ADD COLUMN IF NOT EXISTS payee_id uuid,
  ADD COLUMN IF NOT EXISTS legacy_source text,
  ADD COLUMN IF NOT EXISTS legacy_source_id uuid;
CREATE INDEX IF NOT EXISTS idx_expenses_payee ON public.expenses(payee_type, payee_id) WHERE deleted_at IS NULL;

-- Phân bổ phiếu chi vào bản ghi gốc
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
ALTER TABLE public.expense_allocations ENABLE ROW LEVEL SECURITY;   -- 0 policy: chỉ server action (như lab_payment_allocations)
REVOKE ALL ON public.expense_allocations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.expense_allocations TO service_role;
```

### 1.2 Di trú dữ liệu (thứ tự bắt buộc)
```sql
-- (a) Nhà cung cấp phôi — 3 cách viết → 1 đối tác
WITH sup AS (
  INSERT INTO public.vendors (full_name, service_type, status, vendor_type)
  VALUES ('Xưởng thiệp cưới HD', 'nha_cung_cap', 'active', 'nha_cung_cap') RETURNING id
)
UPDATE public.inventory_items i SET supplier_id = sup.id FROM sup
WHERE i.supplier IN ('In ấn HD', 'HD', 'Xưởng thiệp cưới HD');   -- 3 dòng

-- (b) 26 lab_payments → phiếu chi payee=lab (bảng cũ KHÔNG có ngày trả → dùng created_at::date; user sửa ngày sau ở /finance/expenses nếu cần)
INSERT INTO public.expenses (expense_date, payment_method, category_id, amount, description, recipient, payee_type, payee_id,
                             approved_by, created_by, created_at, updated_at, legacy_source, legacy_source_id)
SELECT lp.created_at::date,
       CASE WHEN lp.payment_method IN ('cash','tien_mat') THEN 'tien_mat' ELSE 'chuyen_khoan' END::public.payment_method_enum,
       public.resolve_printing_expense_category_id(), lp.amount,
       'Trả lab ' || l.lab_name || COALESCE(' — ' || lp.note, ''), l.lab_name, 'lab', lp.lab_id,
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
       CASE WHEN vp.payment_method = 'tien_mat' THEN 'tien_mat' ELSE 'chuyen_khoan' END::public.payment_method_enum,
       public.resolve_vendor_expense_category_id(), vp.amount,
       'Trả thợ ngoài ' || v.full_name || COALESCE(' — ' || vp.note, ''), v.full_name, 'vendor', vp.vendor_id,
       vp.created_by, vp.created_by, vp.created_at, vp.created_at, 'vendor_payments', vp.id
FROM public.vendor_payments vp JOIN public.vendors v ON v.id = vp.vendor_id
WHERE vp.deleted_at IS NULL;

INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_at, created_by)
SELECT e.id, 'work_task', a.work_task_id, a.amount, a.created_at, a.created_by
FROM public.vendor_payment_allocations a
JOIN public.expenses e ON e.legacy_source = 'vendor_payments' AND e.legacy_source_id = a.payment_id;

-- (d) 4 lô phôi đã nhập, user xác nhận ĐÃ TRẢ → 4 phiếu chi payee=supplier, ngày = ngày nhập
INSERT INTO public.expenses (expense_date, payment_method, category_id, amount, description, recipient, payee_type, payee_id,
                             approved_by, created_by, created_at, updated_at, legacy_source, legacy_source_id)
SELECT t.created_at::date, 'chuyen_khoan'::public.payment_method_enum,
       (SELECT id FROM public.transaction_categories WHERE type='chi' AND category_code='vat_tu'),
       t.total_cost, 'Nhập phôi ' || i.name || ' ×' || t.quantity || ' @' || t.unit_cost,
       v.full_name, 'supplier', i.supplier_id,
       t.created_by, t.created_by, t.created_at, t.created_at, 'inventory_transactions', t.id
FROM public.inventory_transactions t
JOIN public.inventory_items i ON i.id = t.item_id
JOIN public.vendors v ON v.id = i.supplier_id
WHERE t.transaction_type = 'stock_in';

INSERT INTO public.expense_allocations (expense_id, target_type, target_id, amount, created_at, created_by)
SELECT e.id, 'inventory_transaction', e.legacy_source_id, e.amount, e.created_at, e.created_by
FROM public.expenses e WHERE e.legacy_source = 'inventory_transactions';

-- (e) 43 phiếu chi trích trước → xoá mềm (giữ audit, không xoá cứng)
UPDATE public.expenses
SET deleted_at = now(), updated_at = now(),
    description = description || ' [ADR-016: trích trước, thay bằng phiếu chi thật]'
WHERE deleted_at IS NULL AND (printing_order_id IS NOT NULL OR work_task_id IS NOT NULL);
```
**Kiểm ngay trong migration** (RAISE EXCEPTION nếu sai để transaction rollback):
```sql
DO $$ BEGIN
  IF (SELECT count(*) FROM public.expenses WHERE legacy_source='lab_payments') <> 26 THEN RAISE EXCEPTION 'lab_payments di tru sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expenses WHERE legacy_source='lab_payments') <> 7936400 THEN RAISE EXCEPTION 'lab sum sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expense_allocations WHERE target_type='printing_order') <> (SELECT coalesce(sum(amount),0) FROM public.lab_payment_allocations) THEN RAISE EXCEPTION 'lab alloc sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expenses WHERE legacy_source='vendor_payments') <> 11850000 THEN RAISE EXCEPTION 'vendor sum sai'; END IF;
  IF (SELECT coalesce(sum(amount),0) FROM public.expenses WHERE legacy_source='inventory_transactions') <> 2880000 THEN RAISE EXCEPTION 'supplier sum sai'; END IF;
  IF (SELECT count(*) FROM public.expenses WHERE deleted_at IS NOT NULL AND description LIKE '%[ADR-016%') <> 43 THEN RAISE EXCEPTION 'accrual soft-delete sai'; END IF;
END $$;
```

### 1.3 Bảng cũ → `_legacy` + view tương thích (app đọc lịch sử không cần đổi)
```sql
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
```
(`lab_payments` view có thêm `expense_date` — app hiện đọc `created_at`; §2.3 đổi sang `expense_date`. Bảng `_legacy` giữ 1 release rồi drop ở M2.)

### 1.4 Bỏ trích trước
```sql
DROP TRIGGER IF EXISTS work_task_vendor_expense_sync ON public.work_tasks;
DROP FUNCTION IF EXISTS public.trg_sync_vendor_expense();
DROP FUNCTION IF EXISTS public.upsert_vendor_expense(uuid, uuid);
DROP FUNCTION IF EXISTS public.upsert_printing_expense(uuid, uuid);
```
Viết lại 3 RPC đơn in (thân giữ nguyên, chỉ bỏ/đổi phần phiếu chi — nguyên văn hiện tại đã đọc từ `pg_proc` 25/08):
- `create_printing_order_atomic(p_order jsonb, p_actor_id uuid)`: xoá dòng `PERFORM public.upsert_printing_expense(v_order_id, p_actor_id);`.
- `update_printing_order_atomic(p_order_id uuid, p_order jsonb, p_expected_updated_at timestamptz, p_actor_id uuid)`: thay `PERFORM public.upsert_printing_expense(p_order_id, p_actor_id);` bằng `PERFORM public.recompute_printing_payment_status(p_order_id);` (tổng đơn đổi → trạng thái thanh toán dẫn xuất lại).
- `delete_printing_order_atomic(p_order_id uuid, p_actor_id uuid)`: bỏ toàn bộ khối tìm/xoá `expenses`; thay bằng
  ```sql
  IF EXISTS (SELECT 1 FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
             WHERE a.target_type = 'printing_order' AND a.target_id = p_order_id AND e.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Don in da co phieu chi tra lab, khong the xoa';
  END IF;
  ```
  rồi soft-delete đơn như cũ.

### 1.5 Hàm mới
```sql
-- Còn phải trả của 1 khoản gốc (NULL nếu khoản không thuộc payee)
CREATE OR REPLACE FUNCTION public.payable_remaining(p_target_type text, p_target_id uuid, p_payee_id uuid)
RETURNS numeric LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT committed - allocated FROM (
    SELECT
      CASE p_target_type
        WHEN 'printing_order' THEN (SELECT total_amount FROM public.printing_orders WHERE id = p_target_id AND lab_id = p_payee_id AND deleted_at IS NULL AND COALESCE(status,'') NOT IN ('huy_don','da_huy'))
        WHEN 'work_task' THEN (SELECT cost FROM public.work_tasks WHERE id = p_target_id AND vendor_id = p_payee_id AND status = 'hoan_thanh' AND cost > 0)
        WHEN 'inventory_transaction' THEN (SELECT t.total_cost FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id WHERE t.id = p_target_id AND i.supplier_id = p_payee_id AND t.transaction_type = 'stock_in')
        WHEN 'employee_salary' THEN (SELECT net_salary FROM public.employee_salaries WHERE id = p_target_id AND employee_id = p_payee_id)
      END AS committed,
      (SELECT COALESCE(SUM(a.amount),0) FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
        WHERE a.target_type = p_target_type AND a.target_id = p_target_id AND e.deleted_at IS NULL) AS allocated
  ) x WHERE committed IS NOT NULL;
$$;

-- Danh sách khoản phải trả của 1 payee (FIFO theo ngày nghiệp vụ)
CREATE OR REPLACE FUNCTION public.payable_items(p_payee_type text, p_payee_id uuid)
RETURNS TABLE(target_type text, target_id uuid, item_date date, label text, committed numeric, allocated numeric, remaining numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH items AS (
    SELECT 'printing_order'::text AS target_type, po.id AS target_id, po.order_date AS item_date, po.order_code AS label, COALESCE(po.total_amount,0) AS committed
    FROM public.printing_orders po WHERE p_payee_type = 'lab' AND po.lab_id = p_payee_id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy')
    UNION ALL
    SELECT 'work_task', wt.id, COALESCE(ev.event_date::date, wt.deadline, wt.created_at::date), wt.work_type::text || COALESCE(' ' || c.contract_code, ''), COALESCE(wt.cost,0)
    FROM public.work_tasks wt LEFT JOIN public.contract_events ev ON ev.id = wt.event_id LEFT JOIN public.contracts c ON c.id = wt.contract_id
    WHERE p_payee_type = 'vendor' AND wt.vendor_id = p_payee_id AND wt.status = 'hoan_thanh' AND wt.cost > 0
    UNION ALL
    SELECT 'inventory_transaction', t.id, t.created_at::date, 'Nhập ' || i.name || ' ×' || t.quantity, COALESCE(t.total_cost,0)
    FROM public.inventory_transactions t JOIN public.inventory_items i ON i.id = t.item_id
    WHERE p_payee_type = 'supplier' AND i.supplier_id = p_payee_id AND t.transaction_type = 'stock_in'
    UNION ALL
    SELECT 'employee_salary', s.id, make_date(s.year, s.month, 1), 'Lương ' || s.month || '/' || s.year, COALESCE(s.net_salary,0)
    FROM public.employee_salaries s WHERE p_payee_type = 'employee' AND s.employee_id = p_payee_id
  ), alloc AS (
    SELECT a.target_type, a.target_id, SUM(a.amount) AS allocated
    FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id WHERE e.deleted_at IS NULL
    GROUP BY a.target_type, a.target_id
  )
  SELECT i.target_type, i.target_id, i.item_date, i.label, i.committed, COALESCE(al.allocated,0), GREATEST(i.committed - COALESCE(al.allocated,0), 0)
  FROM items i LEFT JOIN alloc al ON al.target_type = i.target_type AND al.target_id = i.target_id
  ORDER BY i.item_date, i.target_id;
$$;

-- Trạng thái thanh toán đơn in dẫn xuất từ phân bổ (thay cho ghi tay)
CREATE OR REPLACE FUNCTION public.recompute_printing_payment_status(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.printing_orders po
  SET payment_status = CASE WHEN COALESCE(po.total_amount,0) - COALESCE((
        SELECT SUM(a.amount) FROM public.expense_allocations a JOIN public.expenses e ON e.id = a.expense_id
        WHERE a.target_type = 'printing_order' AND a.target_id = po.id AND e.deleted_at IS NULL), 0) <= 0.01
      THEN 'da_thanh_toan' ELSE 'chua_thanh_toan' END,
      updated_at = now()
  WHERE po.id = p_order_id AND po.deleted_at IS NULL;
END $$;

-- Ghi 1 phiếu chi + phân bổ (thủ công hoặc FIFO). Thay record_lab_payment_atomic + record_vendor_payment_atomic.
CREATE OR REPLACE FUNCTION public.record_payee_payment_atomic(
  p_payee_type text, p_payee_id uuid, p_amount numeric, p_payment_method text,
  p_payment_date date, p_note text, p_allocations jsonb, p_actor_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expense_id uuid; v_category_id uuid; v_recipient text; v_target_type text;
  v_allocations jsonb := COALESCE(p_allocations, '[]'::jsonb); v_alloc jsonb;
  v_target_id uuid; v_amount numeric; v_alloc_total numeric := 0; v_remaining_payment numeric; v_remaining numeric;
  v_date date := COALESCE(p_payment_date, CURRENT_DATE); v_method public.payment_method_enum; r record;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'So tien thanh toan phai lon hon 0'; END IF;
  IF public.is_period_locked(v_date) THEN RAISE EXCEPTION 'Ky ke toan da khoa'; END IF;
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
    RAISE EXCEPTION 'payee_type % chua ho tro (employee: M5)', p_payee_type;
  END IF;
  IF v_recipient IS NULL THEN RAISE EXCEPTION 'Doi tac khong hop le'; END IF;

  INSERT INTO public.expenses (expense_date, payment_method, category_id, amount, description, recipient, payee_type, payee_id, approved_by, created_by, created_at, updated_at)
  VALUES (v_date, v_method, v_category_id, p_amount, COALESCE(NULLIF(p_note,''), 'Thanh toán ' || v_recipient), v_recipient, p_payee_type, p_payee_id, p_actor_id, p_actor_id, now(), now())
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
        v_alloc_total := v_alloc_total + v_amount; v_remaining_payment := v_remaining_payment - v_amount;
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

-- Wrapper giữ chữ ký cũ để app không đổi (lab-mutations / vendor-payment-actions)
CREATE OR REPLACE FUNCTION public.record_lab_payment_atomic(p_lab_id uuid, p_amount numeric, p_payment_method text, p_note text, p_allocations jsonb, p_actor_id uuid, p_payment_date date DEFAULT CURRENT_DATE)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.record_payee_payment_atomic('lab', p_lab_id, p_amount, p_payment_method, p_payment_date, p_note,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('target_id', x->>'printing_order_id', 'amount', x->>'amount')), '[]'::jsonb) FROM jsonb_array_elements(COALESCE(p_allocations,'[]'::jsonb)) x),
    p_actor_id);
$$;
CREATE OR REPLACE FUNCTION public.record_vendor_payment_atomic(p_vendor_id uuid, p_amount numeric, p_payment_method text, p_payment_date date, p_note text, p_allocations jsonb, p_actor_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public.record_payee_payment_atomic('vendor', p_vendor_id, p_amount, p_payment_method, p_payment_date, p_note,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object('target_id', x->>'work_task_id', 'amount', x->>'amount')), '[]'::jsonb) FROM jsonb_array_elements(COALESCE(p_allocations,'[]'::jsonb)) x),
    p_actor_id) || jsonb_build_object('payment_id', (public.record_payee_payment_atomic(...) ->> 'expense_id'));
$$;
```
**Lưu ý wrapper vendor:** app đọc `payment_id` từ kết quả → viết wrapper bằng plpgsql, gọi `record_payee_payment_atomic` **một lần**, gán vào biến rồi `RETURN v || jsonb_build_object('payment_id', v->>'expense_id', 'unallocated_amount', 0)` (không gọi 2 lần như dòng minh hoạ trên). `record_lab_payment_atomic` cũ có chữ ký `(uuid, numeric, text, text, jsonb, uuid)` — `CREATE OR REPLACE` với tham số thêm có DEFAULT tạo **overload mới**; phải `DROP FUNCTION public.record_lab_payment_atomic(uuid, numeric, text, text, jsonb, uuid)` trước. Tương tự `DROP FUNCTION public.record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid)` rồi tạo lại.

```sql
-- Công nợ phải trả hợp nhất
CREATE OR REPLACE FUNCTION public.finance_payable_summary()
RETURNS TABLE(payee_type text, payee_id uuid, payee_name text, item_count bigint, total_committed numeric, total_paid numeric, remaining numeric, last_item_date date, last_payment_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH payees AS (
    SELECT 'lab'::text AS payee_type, id AS payee_id, lab_name::text AS payee_name FROM public.labs WHERE deleted_at IS NULL
    UNION ALL SELECT 'vendor', id, full_name FROM public.vendors WHERE deleted_at IS NULL AND status = 'active' AND vendor_type = 'tho_ngoai'
    UNION ALL SELECT 'supplier', id, full_name FROM public.vendors WHERE deleted_at IS NULL AND vendor_type = 'nha_cung_cap'
  )
  SELECT p.payee_type, p.payee_id, p.payee_name,
         COUNT(i.target_id) FILTER (WHERE i.remaining > 0), COALESCE(SUM(i.committed),0), COALESCE(SUM(i.allocated),0), COALESCE(SUM(i.remaining),0),
         MAX(i.item_date) FILTER (WHERE i.remaining > 0),
         (SELECT MAX(e.expense_date) FROM public.expenses e WHERE e.payee_type = p.payee_type AND e.payee_id = p.payee_id AND e.deleted_at IS NULL)
  FROM payees p LEFT JOIN LATERAL public.payable_items(p.payee_type, p.payee_id) i ON TRUE
  GROUP BY p.payee_type, p.payee_id, p.payee_name
  HAVING COALESCE(SUM(i.remaining),0) > 0
  ORDER BY remaining DESC;
$$;

-- Wrapper giữ chữ ký/return cũ cho 2 màn công nợ + KPI /printing (app không đổi)
CREATE OR REPLACE FUNCTION public.finance_lab_debt_summary()
RETURNS TABLE(lab_id uuid, lab_name text, order_count bigint, total_orders numeric, total_paid numeric, remaining numeric, last_order_date timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT payee_id, payee_name, item_count, total_committed, total_paid, remaining, last_item_date::timestamptz
  FROM public.finance_payable_summary() WHERE payee_type = 'lab';
$$;
CREATE OR REPLACE FUNCTION public.finance_vendor_debt_summary()
RETURNS TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, task_count bigint, total_cost numeric, total_paid numeric, remaining numeric, last_task_date date, last_payment_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.payee_id, s.payee_name, v.phone::text, v.service_type::text, s.item_count, s.total_committed, s.total_paid, s.remaining, s.last_item_date, s.last_payment_date
  FROM public.finance_payable_summary() s JOIN public.vendors v ON v.id = s.payee_id WHERE s.payee_type = 'vendor';
$$;
```
(Hai hàm cũ trả kiểu khác → `DROP FUNCTION` trước rồi tạo lại đúng chữ ký RETURNS ở trên; đối chiếu bằng `pg_get_function_result` trước khi viết migration.)

```sql
-- Một hàm lợi nhuận hợp đồng (ADR-016 §3)
CREATE OR REPLACE FUNCTION public.contract_financials(p_contract_ids uuid[])
RETURNS TABLE(contract_id uuid, revenue numeric, task_cost numeric, print_cost numeric, cogs numeric, direct_cost numeric, total_cost numeric, profit numeric, profit_margin numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id,
         COALESCE(c.total_amount,0),
         COALESCE((SELECT SUM(wt.cost) FROM public.work_tasks wt WHERE wt.contract_id = c.id AND wt.status <> 'da_huy' AND wt.cost > 0),0),
         COALESCE((SELECT SUM(po.total_amount) FROM public.printing_orders po WHERE po.contract_id = c.id AND po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy')),0),
         COALESCE((SELECT SUM(t.total_cost) FROM public.inventory_transactions t WHERE t.contract_id = c.id AND t.transaction_type = 'stock_out' AND t.source_type IN ('contract_fulfillment','contract_addon_sale') AND COALESCE(t.is_rollback,false) = false),0),
         COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.contract_id = c.id AND e.deleted_at IS NULL AND e.payee_type = 'other'),0),
         0, 0, 0
  FROM public.contracts c WHERE c.id = ANY(p_contract_ids)
$$;
```
Viết đúng dạng có tổng: bọc SELECT trên trong CTE `parts` rồi `SELECT ..., task_cost+print_cost+cogs+direct_cost AS total_cost, revenue − total AS profit, CASE WHEN revenue = 0 THEN 0 ELSE ROUND((revenue − total)/revenue*100, 1) END AS profit_margin`.

**Thay 3 chỗ tự tính bằng hàm này:**
- `finance_contract_profit_report(...)`: giữ nguyên chữ ký/cột trả về; bỏ 3 `LEFT JOIN LATERAL (tasks / prints / expenses)`; thêm `LEFT JOIN public.contract_financials(ARRAY(SELECT id FROM paginated)) cf ON cf.contract_id = p.id`; map `task_cost := cf.task_cost`, `print_cost := cf.print_cost`, `expense_cost := cf.direct_cost + cf.cogs`, `total_cost/profit/profit_margin := cf.*`.
- `get_contract_list_v2(...)` (migration `20260825160000`): bỏ 3 LATERAL `task_cost/print_cost/expense_cost`; thêm `LEFT JOIN public.contract_financials(ARRAY(SELECT id FROM paged)) cf ON cf.contract_id = c.id`; 3 key `total_cost/profit/profit_margin` lấy từ `cf` (COALESCE 0).
- `printing_integrity_report()` viết lại — cùng chữ ký `RETURNS TABLE(check_name text, issue_count bigint)`, 4 check:
  `legacy_accrual_expense_active` (expenses không xoá mềm có `printing_order_id`/`work_task_id` hoặc `description LIKE '[Auto-%'` → phải 0) · `order_overallocated` (Σ phân bổ − 0.01 > total_amount) · `payment_status_mismatch` (`da_thanh_toan` mà còn > 0.01, hoặc `chua_thanh_toan` mà còn ≤ 0.01, chỉ đơn active không hủy) · `allocation_to_missing_target` (phân bổ trỏ tới đơn in/task/lô không tồn tại hoặc đã xoá mềm).

```sql
-- Nhập kho: chữ ký mới (DROP chữ ký cũ 7 tham số trước)
DROP FUNCTION IF EXISTS public.inventory_stock_in_atomic(uuid, integer, numeric, text, text, text, uuid);
CREATE OR REPLACE FUNCTION public.inventory_stock_in_atomic(
  p_item_id uuid, p_quantity integer, p_unit_cost numeric, p_supplier text, p_reason text, p_notes text, p_user_id uuid,
  p_supplier_id uuid DEFAULT NULL, p_paid boolean DEFAULT true, p_payment_method text DEFAULT 'chuyen_khoan', p_paid_date date DEFAULT CURRENT_DATE)
RETURNS jsonb ...
```
Thân: nguyên văn cũ, thêm `RETURNING id INTO v_txn_id` ở INSERT `inventory_transactions`; nếu `p_supplier_id IS NOT NULL` → `UPDATE inventory_items SET supplier_id = p_supplier_id` cùng câu UPDATE tồn; nếu `p_paid` → gọi `public.record_payee_payment_atomic('supplier', COALESCE(p_supplier_id, (SELECT supplier_id FROM inventory_items WHERE id = p_item_id)), p_quantity * p_unit_cost, p_payment_method, p_paid_date, 'Nhập phôi ' || v_item_name || ' ×' || p_quantity, jsonb_build_array(jsonb_build_object('target_id', v_txn_id, 'amount', p_quantity * p_unit_cost)), p_user_id)`; nếu `p_paid` mà không có supplier → `RAISE EXCEPTION 'Nhap kho da tra tien can chon nha cung cap'`. Trả thêm `'expense_id'` nếu có.

Cuối migration: `SELECT public.recompute_printing_payment_status(id) FROM public.printing_orders WHERE deleted_at IS NULL;` · REVOKE/GRANT cho mọi hàm mới/tạo lại theo mẫu `20260428130000:782-806` (REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role) — **đúng bài học `printing_stats` 25/08**. Sau khi áp: `npm run db:types`.

## 2. Server actions / schema (diff từng file)

2.1 `lib/validations/lab.schema.ts` — `labPaymentSchema` thêm `payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngay thanh toan khong hop le").optional()`. `lab-mutations.ts recordLabPayment`: truyền `p_payment_date: parsed.data.payment_date ?? undefined`; `p_payment_method` giữ (`cash`/`transfer` được RPC quy đổi). Audit `tableName: "expenses"`.

2.2 `app/actions/vendor-payment-actions.ts`: `recordVendorPayment` giữ nguyên (wrapper cùng chữ ký). `voidVendorPayment`: thay `.from("vendor_payments").delete()` bằng `UPDATE expenses SET deleted_at = now() WHERE id = payment_id AND payee_type = 'vendor'` + sau đó không cần đụng allocations (mọi phép tính lọc `expenses.deleted_at IS NULL`). Audit `tableName: "expenses"`. Kiểm period lock bằng `expense_date`.

2.3 `app/actions/lab-queries.ts`: 2 chỗ đọc `lab_payments` giữ nguyên câu select (view có đủ cột); `fetchLabPaymentHistory` đổi `order("created_at")` → `order("expense_date", { ascending: false })` và map `paymentDate` từ `expense_date` (trước đây từ `created_at`, chính là lý do lịch sử hiện toàn 25/08).

2.4 `app/actions/vendor-actions.ts:252-256` (gộp vendor → reassign): đổi `.from("vendor_payments").update({vendor_id})` thành `.from("expenses").update({ payee_id: targetId }).eq("payee_type", "vendor").eq("payee_id", sourceId)`.

2.5 `app/actions/work-task-actions.ts:308-333`: xoá toàn bộ khối "Auto-create/update vendor expense" (hàm đã drop). Thêm comment 1 dòng: `// ADR-016: chi phí thợ ngoài là cam kết (work_tasks.cost); phiếu chi chỉ tạo khi trả tiền.`

2.6 `app/actions/salary-actions.ts payEmployeeSalaryAction`: insert `expenses` thêm `payee_type: "employee"`, `payee_id: salaryRecord.employee_id`, `category_id` = id danh mục "Chi lương nhân viên" (tra `transaction_categories` theo `name`, fallback null), `approved_by: userId`. (Phân bổ vào `employee_salaries` → M5.)

2.7 `app/actions/expense-actions.ts` + `finance.schema.ts createExpenseSchema`: thêm `payee_type: z.enum([...]).default("other")`, `payee_id: z.string().uuid().optional().nullable()`; `CreateExpenseInput` tương ứng. `deleteExpense`: giữ soft-delete; thêm sau đó `for target_type='printing_order'` gọi `recompute_printing_payment_status` cho các đơn được phiếu chi này phân bổ (query `expense_allocations` theo `expense_id`).

2.8 `app/actions/inventory-mutations.ts stockIn` + `lib/validations/inventory.schema.ts stockInSchema`: thêm `supplierId?: uuid`, `paid: boolean (default true)`, `paymentMethod: "tien_mat"|"chuyen_khoan" (default chuyen_khoan)`, `paidDate?: yyyy-mm-dd`; truyền 4 tham số mới vào RPC. `components/inventory/stock-in-modal.tsx`: thêm `SelectForm` "Nhà cung cấp" (options = `vendors` `vendor_type='nha_cung_cap'` — thêm query `getSupplierOptions()` vào `app/actions/vendor-actions.ts`), toggle "Đã trả tiền" (mặc định bật, per user), phương thức + ngày trả (hiện khi bật). Sau thành công: `invalidateFinanceAfterWrite()` thêm vào (đã có ở stock-out).

2.9 `app/actions/finance-dashboard-queries.ts`:
- `getContractProfitReport` giữ (RPC đã đổi ruột); **xoá** `getContractProfitReportFallback` (bản sao công thức) — nếu RPC thiếu thì throw lỗi rõ.
- `getContractFinanceDetails`: query `work_tasks` bỏ `.is("vendor_id", null)` → `.neq("status", "da_huy")` + select thêm `vendor_id, vendors(full_name)` để drawer ghi "Thợ ngoài X"; query `expenses` bỏ `.not("description","like","[Auto-Print]%")` → `.eq("payee_type", "other")`; phần totals của drawer (nếu tính client) phải cộng `inventory` (COGS) — đọc `components/finance/dashboard/contract-profit-detail-drawer.tsx` khi implement, đảm bảo tổng = `contract_financials`.
- Xoá `app/actions/contract-profit.ts` (0 caller).

2.10 `components/printing/labs/lab-payment-modal.tsx`: không đổi UI; `payment_date` giờ được schema nhận → hết bị bỏ rơi. Kiểm `paymentDate` state mặc định = hôm nay.

## 3. Vault
`luong-tien.md` phần "Tiền RA" viết lại theo ADR-016 (bảng 3 sổ + luật ngày §3.1b); `tai-chinh.md` thêm mục "Phiếu chi = tiền thật, `expense_allocations`"; `in-an-lab.md` bỏ đoạn "`printing-workflow-mutations.ts` viết vào receipts/order_payments/inventory…" (đã sai từ ADR-014) + ghi `lab_payments` là view; `nha-cung-cap.md` cơ chế mới; `vat-tu.md` nhập kho = phiếu chi.

## 4. Verify (gate)

| Bước | Lệnh / kiểm | Kỳ vọng |
|---|---|---|
| 1 | Pre-check §1 trên prod | 26 · 7.936.400 · 5 · 11.850.000 · 43 · 4 |
| 2 | Chụp **before**: `SELECT id, contract_code, profit FROM finance_contract_profit_report('all', NULL, NULL, 1, 100)` + `SELECT count(*) FILTER (WHERE payment_status='da_thanh_toan') FROM printing_orders WHERE deleted_at IS NULL` + `finance_lab_debt_summary()` + `finance_vendor_debt_summary()` | lưu vào `scripts/tmp/m1-before.json` (không commit) |
| 3 | `node scripts/migrate-direct.mjs 20260825200000_cashflow_m1_expense_allocations.sql` | exit 0; DO-block không raise |
| 4 | `npm run db:types` · `npx tsc --noEmit` · `npx eslint <locks>` · `npm run build` | 0 lỗi |
| 5 | **after**: lặp bước 2 + `finance_payable_summary()` + `contract_financials(ARRAY(SELECT id FROM contracts WHERE deleted_at IS NULL))` | `da_thanh_toan` count bằng before; lab remaining 1.905.000; vendor 0; supplier 0; profit khớp 59/60, HĐ-2026-0064 lệch −1.350.000 |
| 6 | `npm run verify:printing` · `verify:contracts` · `verify:inventory` | xanh (integrity 4 check = 0) |
| 7 | Playwright (local `next start`) — spec mới `tests/e2e/cashflow-m1.spec.ts`, seed riêng: (a) tạo đơn in → **không** có expense mới; (b) trả lab qua modal với ngày 2026-08-20 → 1 expense `payee_type=lab` `expense_date=2026-08-20` + allocation, `payment_status` đơn → `da_thanh_toan` khi trả đủ; (c) task vendor → hoàn thành → không expense; trả thợ → expense + allocation; (d) nhập phôi "đã trả" → expense supplier + allocation, tồn kho tăng; (e) xoá đơn in đã có phân bổ → bị chặn | 5/5 |
| 8 | Render `/finance/lab-debts`, `/finance/vendor-debts`, `/printing` KPI Công nợ, `/finance/expenses` (thấy phiếu chi di trú với ngày đúng), `/contracts` cột Lợi nhuận, drawer lợi nhuận | số khớp §0 |
| 9 | Merge → prod: lặp 5, 6, 8 trên `stu.moodwedding.com` | như trên |

**Rollback:** migration chạy trong 1 transaction — lỗi giữa chừng tự huỷ. Sau khi áp mà cần lùi: bảng `_legacy` còn nguyên; `DROP VIEW` 4 view + `RENAME` ngược; `DELETE FROM expenses WHERE legacy_source IS NOT NULL`; `UPDATE expenses SET deleted_at = NULL WHERE description LIKE '%[ADR-016%'`; tạo lại 5 hàm từ migration gốc (`20260428130000`, `20260528000002`, `20260615000003`, `20260825160000`).

## 5. Ngoài phạm vi (M2+)
Dashboard 3 số + lãi/lỗ tháng theo luật ngày (M2); màn công nợ hợp nhất 1 trang (M2); drop bảng `_legacy` + view (M2 sau prod verify); ô ngày cho giao dịch kho (M3); phân bổ phiếu chi lương → `employee_salaries` (M5); `receipts` category chuẩn hoá (M4).

## 6. Kết quả thực thi (Claude fallback, 2026-08-26, branch `claude/cashflow-m1`)

**Migration `20260825200000_cashflow_m1_expense_allocations.sql` ĐÃ ÁP production** qua `migrate-direct.mjs` (1 transaction, pre-check 6 số + DO-block đối soát bên trong). **Đối soát sau áp — khớp 100% dự đoán §0:**

| Kiểm | Trước | Sau |
|---|---|---|
| `expenses` active | 43 dòng · 21.691.400 (toàn trích trước) | lab 26 · 7.936.400 + vendor 5 · 11.850.000 + supplier 4 · 2.880.000 = **35 phiếu chi thật**; 43 trích trước xoá mềm (mô tả gắn `[ADR-016…]`) |
| `expense_allocations` | — | printing_order 26 · 7.936.400 · work_task 10 · 11.850.000 · inventory_transaction 4 · 2.880.000 |
| `finance_payable_summary()` | — | lab Hồng Bảo committed 9.841.400 / paid 7.936.400 / **remaining 1.905.000**; vendor **0 dòng**; supplier **0 dòng** |
| `printing_orders` `da_thanh_toan` | 26 | **26** (dẫn xuất lại từ phân bổ, không đổi) |
| `printing_integrity_report()` | 7 check cũ | **4 check mới = 0** |
| `finance_contract_profit_report` 62 HĐ | — | **61/62 khớp**, đúng 1 lệch: HĐ-2026-0064 1.900.000 → 550.000 (−1.350.000, task thợ `dang_lam` giờ là cam kết — ADR-016 §3) |
| `get_contract_list_v2` | HĐ-2026-0064 profit 1.900.000 | 550.000 (cùng nguồn `contract_financials`) |
| Hàm trích trước | `upsert_printing_expense`, `upsert_vendor_expense`, `trg_sync_vendor_expense` | **đã drop**; `lab_payments`/`lab_payment_allocations`/`vendor_payments`/`vendor_payment_allocations` = VIEW, bảng gốc `_legacy` |
| NCC phôi | 3 chuỗi text | 1 `vendors` "Xưởng thiệp cưới HD" (`nha_cung_cap`), `inventory_items.supplier_id` gắn 3/3 SKU |

**Sửa thêm ngoài spec, phát hiện khi implement (ghi rõ để review):**
1. `record_payee_payment_atomic` tự parse `p_allocations` khi nhận jsonb kiểu **string** — `recordVendorPayment` (app) đang `JSON.stringify` mảng trước khi gửi → RPC cũ coi là "không có phân bổ" → **phân bổ thủ công của thợ ngoài trước đây âm thầm thành FIFO** (bug có sẵn). Test (c) gửi đúng dạng string và kiểm phân bổ đúng task.
2. `get_contract_list_v2` đang **GRANT EXECUTE cho anon + authenticated** (khác mọi RPC còn lại) — hàm giờ trả cả cột lợi nhuận → REVOKE trong cùng migration (app dùng service role, không ảnh hưởng).
3. `inventory_stock_in_atomic` cũ: 3 tham số text không DEFAULT nhưng types cũ khai optional (types lệch DB) → sau `db:types` lộ 2 call site (`createInventoryItem`, `stockIn`) → ép kiểu `(x ?? null) as string` theo mẫu có sẵn trong repo (`lab-mutations.ts p_note`). `createInventoryItem` (khai báo vật tư mới, tồn ban đầu) truyền `p_paid=false` — số dư kê khai không phải lô mua.
4. VIEW không có FK → generator khai mọi cột nullable + không embed được: `fetchLabPaymentHistory` tách query mã đơn (thay `printing_orders!inner`), `voidVendorPayment` tra tên vendor riêng và xoá mềm `expenses` thay vì delete cứng, `fetchVendorPaymentHistory` chuẩn hoá null. `getActiveVendors`/`getAllVendors` lọc `vendor_type='tho_ngoai'` để NCC phôi không lọt vào picker giao việc.
5. `deleteExpense` (UI) sau xoá mềm gọi `recompute_printing_payment_status` cho các đơn in được phiếu chi phân bổ.

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | 0 (sau khi vá 5 nhóm lỗi nullable/view) |
| `npx eslint` 15 file | 0 error, 0 warning (1 lỗi `react/forbid-elements` native `<input>` → dùng `<Checkbox>` SSOT) |
| `npm run build` | exit 0, PWA artifact pass |
| `npm run verify:printing` · `verify:contracts` · `verify:inventory` | **3/3 xanh** (integrity 4 check = 0; anon denied mọi RPC) |
| Playwright `tests/e2e/cashflow-m1.spec.ts` trên `next start` :3100 | **4/4 PASS**: (a) tạo đơn in → 0 phiếu chi; (b) `record_lab_payment_atomic` ngày 2026-08-20 → phiếu chi `expense_date=2026-08-20`, `approved_by`=actor, phân bổ 1, đơn `da_thanh_toan`, view đọc được; trả dư bị chặn; (e) xoá đơn đã trả bị chặn; (c) task thợ hoàn thành → 0 phiếu chi, công nợ 1.200.000, trả với allocations JSON-string → phân bổ đúng task, hết nợ; (d) nhập phôi đã trả → phiếu chi supplier 50.000 ngày 2026-08-23 + phân bổ + tồn 100; nhập chưa trả → chỉ tồn 110, nợ NCC 5.000; integrity 4/4 = 0; UI smoke: `/finance/lab-debts` (Hồng Bảo 1.905.000), `/finance/vendor-debts`, `/printing` KPI Công nợ, `/finance/expenses` (thấy "Trả lab Hồng Bảo"), `/contracts` cột Lợi nhuận HĐ seed = **+3.500.000 / chi phí 1.500.000** (= 5.000.000 − thợ 1.200.000 − đơn in 300.000, đúng `contract_financials`). Seed dọn sạch (0 sót). Lượt 1 fail 1 assertion vì 20 HĐ E2E của global-setup đẩy HĐ thật sang trang 2 — đổi sang kiểm HĐ seed của chính spec. |

**Còn lại cần user:** merge `claude/cashflow-m1` → `main` + `git push origin main` (= deploy), rồi Claude chạy lại spec trên `stu.moodwedding.com`. **Lưu ý cửa sổ lệch:** DB prod đã ở mô hình mới, app prod hiện tại vẫn đọc được (view tương thích + wrapper RPC giữ chữ ký) — chỉ 2 thao tác cũ sẽ lỗi cho tới khi deploy: "Huỷ thanh toán thợ" (delete trên view) và ghi log FAIL khi hoàn thành task vendor (hàm trích trước đã drop, được nuốt lỗi). Nên merge sớm.

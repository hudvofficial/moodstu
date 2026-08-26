# T-20260826-cashflow-m2-ba-so — M2: Ba số dashboard (Két · Lãi/lỗ · Công nợ), lãi/lỗ tháng theo luật ngày, màn "Phải trả" hợp nhất, app bỏ phụ thuộc view `_legacy`

**Owner:** claude (fallback — user: "ok viết spec rồi triển khai đi bạn") · **Trạng thái:** implementing · **Branch:** `claude/cashflow-m2` · **ADR:** ADR-016 (Accepted) — phụ lục M2 ghi ở `agent/DECISIONS.md` · **Thiết kế:** `docs/design/dong-tien-mood-v2.md` §3.1b (luật ngày), §4 (6 báo cáo), §9 (M2) · **Kết quả:** §7 cuối file
**Module:** tai-chinh (chính) · in-an-lab (đọc phiếu chi lab) · nha-cung-cap (thợ ngoài) — **verify: multi-module**.

**Locks:**
- `supabase/migrations/20260826120000_cashflow_m2_ba_so.sql` (mới, ÁP) · `supabase/migrations/20260826130000_cashflow_m2b_drop_legacy.sql` (mới, **KHÔNG áp trong M2** — xem §1.9)
- `types/database.types.ts` (sinh lại) · `types/finance-dashboard.ts` · `types/payables.ts` (mới) · `types/vendor.ts` · `types/finance-operations.ts`
- `app/actions/finance-dashboard-queries.ts` · `app/actions/payable-actions.ts` (mới) · `app/actions/vendor-payment-actions.ts` (xoá) · `app/actions/finance-operations-queries.ts` (bỏ `fetchLabDebts`) · `app/actions/lab-queries.ts` · `app/actions/printing-queries.ts` · `app/actions/lab-mutations.ts` · `app/actions/vendor-actions.ts` · `app/actions/vendor-reports-queries.ts`
- `app/(protected)/finance/payables/page.tsx` (mới) · `app/(protected)/finance/lab-debts/page.tsx` · `app/(protected)/finance/vendor-debts/page.tsx` (→ redirect)
- `components/finance/payables/**` (mới) · `components/finance/vendor-debts/**` (xoá) · `components/finance/lab-debts/**` (xoá) · `components/finance/dashboard/finance-compact-bar.tsx` · `finance-dashboard-client.tsx` · `revenue-bar-chart.tsx` · `finance-quick-nav.tsx` · `components/finance/finance-realtime-refresh.tsx`
- `lib/swr.ts` (thay 2 key) · `lib/cache-invalidation.ts`
- `scripts/verify-reports.mjs` · `scripts/verify-realtime-signals.mjs` · `scripts/vault-gen-schema.mjs`
- `tests/e2e/cashflow-m2.spec.ts` (mới) · `tests/e2e/cashflow-m1.spec.ts` · `tests/e2e/printing-drawer-fixes-verify.spec.ts` · `tests/e2e/finance-module.spec.ts`
- vault: `50-luong/luong-tien.md`, `40-module/tai-chinh.md`, `in-an-lab.md`, `nha-cung-cap.md` · `docs/design/dong-tien-mood-v2.md` §9

**KHÔNG đụng (ngoài scope, ghi nhận):** `get_finance_intelligence` / `get_cashflow_forecast` / `get_finance_advanced_intelligence` và các card "Sức khoẻ · Runway · Hoà vốn" (số theo két, nhãn "Biên lợi nhuận" của card sức khoẻ vẫn là két — M2b); `finance-close-actions.ts` snapshot chốt sổ (công thức riêng, 1 dòng dữ liệu); `finance_ledger*` (sổ cái tiền — đã đúng); `printing_stats`/`get_printing_cost_stats`; `payEmployeeSalaryAction`/lương (M5); `LabPaymentModal` ở `/printing` (giữ nguyên, chỉ sửa query bên dưới nó). Spec `T-20260825-printing-cancel-inventory-deadcode` độc lập.

---

## 0. Mục tiêu đo được

Trên production sau M2 (số tại 26/08; đối soát lại lúc chạy):
1. `/finance` hiện **3 khối** cho tháng hiện tại: **Két** (Thu / Chi / Ròng) · **Lãi/lỗ** (Doanh thu theo ngày chụp / Chi phí / Lãi) · **Công nợ** (Phải thu / Phải trả). Tháng 8/2026: Két thu = `Σ payments` T8 (18.300.000) + `Σ receipts` bán lẻ T8 (0) = **18.300.000**; chi = `Σ expenses` T8 = **18.096.400** (lab 7.546.400 + thợ 10.550.000); Lãi/lỗ: doanh thu = `Σ contracts.total_amount` chụp T8 (14 HĐ, **46.275.000**), chi phí = task T8 theo ngày sự kiện (**4.200.000** hoàn thành + task chưa hoàn thành cùng luật) + đơn in `order_date` T8 (**1.535.000**) + COGS T8 (0) + chi trực tiếp/vận hành T8 (0); Công nợ: phải thu = `Σ remaining_amount`, phải trả = **1.905.000** (lab Hồng Bảo).
2. Tháng 5/2026 (kiểm chéo luật ngày): doanh thu **41.850.000** (13 HĐ chụp T5) − task **9.600.000** (theo ngày sự kiện T5, hoàn thành) − in **3.486.400** − COGS bán lẻ **1.908.000** + bán lẻ **4.315.000** → lãi ≈ **31.170.600** (± task chưa hoàn thành có event T5). Két T5: thu 27.850.000 + 4.315.000, chi 3.270.000 (lab 390.000 + phôi 2.880.000).
3. `/reports` tháng 8: "Doanh thu" = 46.275.000 (theo ngày chụp, không còn theo `contract_date`); "Tổng chi" **không** cộng 18.096.400 phiếu chi trả nợ (trước M2: `operating_cost` = 18.096.400 → lỗ giả).
4. `/finance/payables` liệt kê **1 dòng** lab Hồng Bảo còn 1.905.000, 0 thợ, 0 NCC; "Trả" → phiếu chi; "Lịch sử" → 26 phiếu chi lab với phân bổ đơn in. `/finance/lab-debts` và `/finance/vendor-debts` → redirect `/finance/payables`.
5. App **không còn** `from("lab_payments" | "vendor_payments" | "lab_payment_allocations" | "vendor_payment_allocations")` (grep = 0 ở `app/ components/ lib/ tests/`). DB: `printing_lab_overview` không đọc view. → migration M2b (drop) áp được bất kỳ lúc nào.
6. `finance_dashboard_metrics`, `finance_revenue_by_month` **bị DROP** (không còn hai sự thật). `npm run verify:reports` xanh với 3 RPC mới + kiểm 2 hàm cũ đã mất.
7. `finance_cashflow_timeline` = đúng 3 nguồn tiền thật (payments, receipts, expenses); `Σ timeline.outflow = cashflowSummary.totalOutflow = Σ expenses` (verify:reports đã assert).

## 1. Migration A — `supabase/migrations/20260826120000_cashflow_m2_ba_so.sql` (ÁP ngay, transaction)

### 1.0 Helper ngày Việt Nam
```sql
CREATE OR REPLACE FUNCTION public.vn_date(p timestamptz) RETURNS date
LANGUAGE sql IMMUTABLE AS $$ SELECT (p AT TIME ZONE 'Asia/Ho_Chi_Minh')::date $$;
```
`contracts.work_date`, `contract_events.event_date`, `inventory_transactions.created_at` là **timestamptz** → mọi so sánh tháng phải qua `vn_date()` (đo 26/08: 0 HĐ lệch ngày UTC↔VN, nhưng luật phải đúng cho 17:00–24:00 giờ VN).

### 1.1 Luật ngày & luật gom (áp thống nhất cho §1.2–§1.4 — KHÔNG được lệch giữa các hàm)

| Khoản | Bảng | Ngày ghi sổ | Điều kiện |
|---|---|---|---|
| Doanh thu HĐ | `contracts.total_amount` | `COALESCE(vn_date(work_date), contract_date)` | `deleted_at IS NULL AND status <> 'da_huy'` |
| Doanh số ký | `contracts.total_amount` | `contract_date` | như trên |
| Doanh thu lẻ & thu khác | `receipts.receipt_amount` | `receipt_date` | `deleted_at IS NULL AND contract_id IS NULL` |
| Chi phí task | `work_tasks.cost` | `COALESCE(vn_date(ev.event_date), wt.deadline, vn_date(wt.created_at))` | `status <> 'da_huy' AND cost > 0` — **cùng luật `contract_financials`** (mọi task không huỷ, kể cả `dang_lam`) để Σ tháng = Σ HĐ; *phải trả* thợ vẫn chỉ `hoan_thanh` (`payable_items`) |
| Chi phí in lab | `printing_orders.total_amount` | `COALESCE(order_date, vn_date(created_at))` | `deleted_at IS NULL AND status NOT IN ('huy_don','da_huy')` |
| Giá vốn (COGS) | `inventory_transactions.total_cost` | `COALESCE(r.receipt_date, vn_date(t.created_at))` (LEFT JOIN `receipts r ON r.id = t.receipt_id`) | `transaction_type='stock_out' AND COALESCE(is_rollback,false)=false AND source_type IN ('retail_sale','contract_fulfillment','contract_addon_sale')` |
| Chi trực tiếp HĐ | `expenses.amount` | `expense_date` | `deleted_at IS NULL AND payee_type='other' AND contract_id IS NOT NULL` |
| Chi vận hành (overhead) | `expenses.amount` | `expense_date` | `deleted_at IS NULL AND payee_type='other' AND contract_id IS NULL`; trong đó **cố định** = `description LIKE '[Auto-Fixed]%'` (sinh bởi `generateMonthlyFixedCosts`) |
| Lương cứng (overhead) | `employee_salaries.monthly_salary` | `make_date(year, month, 1)` | Σ theo tháng. **Không** dùng `base_salary`/`total_salary` (dòng test 100.000.000 T6; `product_salary` đã nằm trong task) — M5 dọn |
| Tiền vào | `payments.amount` + `receipts` (contract_id NULL) | `payment_date` / `receipt_date` | `deleted_at IS NULL` |
| Tiền ra | `expenses.amount` (**mọi** `payee_type`) | `expense_date` | `deleted_at IS NULL`; "trả nợ" = có ≥1 dòng `expense_allocations`; "khác" = phần còn lại |
| Phải thu | `contracts.remaining_amount` | hiện tại | `> 0 AND deleted_at IS NULL AND status <> 'da_huy'` |
| Phải trả | `finance_payable_summary()` | hiện tại | theo `payee_type` |

`fixed_costs` (bảng định mức) **không** vào lãi/lỗ và **không** vào két — nó là kế hoạch; chi phí thật là phiếu chi `[Auto-Fixed]` (đã có cơ chế). `monthly_salaries.total_salary` **không** vào két/lãi-lỗ (M5).

### 1.2 `finance_month_summary(p_month int, p_year int)` — một hàm cho 3 khối
`RETURNS TABLE(` `cash_in numeric, cash_in_contract numeric, cash_in_retail numeric, cash_out numeric, cash_out_settlement numeric, cash_out_other numeric, cash_net numeric, cash_net_prev numeric,` `revenue numeric, revenue_contract numeric, revenue_retail numeric, cost_total numeric, cost_task numeric, cost_print numeric, cost_cogs numeric, cost_direct numeric, cost_overhead numeric, cost_salary_base numeric, profit numeric, profit_prev numeric, profit_margin numeric, contracts_shot bigint, contracts_missing_work_date bigint,` `receivable numeric, payable numeric, payable_lab numeric, payable_vendor numeric, payable_supplier numeric)` — `LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public`.
- Cửa sổ: `[make_date(y,m,1), +1 month)`; `*_prev` = cửa sổ tháng trước (cùng luật).
- `profit = revenue − cost_total`; `cost_total = cost_task + cost_print + cost_cogs + cost_direct + cost_overhead + cost_salary_base`; `profit_margin = ROUND(profit/revenue*100,1)` (0 khi revenue=0).
- `contracts_missing_work_date` = HĐ `deleted_at IS NULL AND status NOT IN ('da_huy','hoan_thanh') AND work_date IS NULL` (toàn hệ thống, không theo tháng — 26/08: 9 HĐ thiếu trong đó 4 đã hoàn thành → chỉ nhắc 5 đang chạy; HĐ hoàn thành thiếu ngày chụp vẫn fallback `contract_date`).
- Phải trả: `SELECT SUM(remaining) FILTER (WHERE payee_type='lab')…` từ `finance_payable_summary()`.

### 1.3 `finance_pnl_by_month(p_year int)` — thay `finance_revenue_by_month`
`RETURNS TABLE(raw_month int, month_label text, revenue numeric, cost numeric, profit numeric, cash_in numeric, cash_out numeric, signed_revenue numeric)` — 12 dòng (`generate_series`), `month_label = 'Tháng ' || n`. `revenue/cost` cùng luật §1.1 (cost = task + in + COGS + chi trực tiếp + overhead + lương cứng). `signed_revenue` theo `contract_date`.

### 1.4 `finance_reports_snapshot(p_start_date date, p_end_date date)` — `CREATE OR REPLACE`, giữ mọi key JSON, đổi nguồn
- `contracts_scope` = HĐ có ngày ghi sổ doanh thu (§1.1) trong `[start, end]`, `status <> 'da_huy'` → `totalContracts`, `completedContracts`, `contract_revenue`, `serviceDistribution`, addon.
- `task_cost` / `print_cost` / `inventory_cost` (`contract_inventory_cost` + `retail_inventory_cost`) / `contract_expense_cost` (= chi trực tiếp) theo **ngày của chính khoản đó** trong kỳ (§1.1), **không** theo contract_scope (trước đây task_cost gom mọi task của HĐ ký trong kỳ, kể cả `da_huy`, và `contract_expense_cost` lọc `NOT LIKE '[Auto-Print]%'` — bỏ).
- `operating_cost` = overhead `other` không HĐ **trừ** phần `[Auto-Fixed]`; `fixed_cost` = phần `[Auto-Fixed]`; `salary_cost` = Σ `employee_salaries.monthly_salary` × ratio tháng (prorate như cũ). `totalCost = directCost(task+print+contract_expense+inventory) + operatingCost + salaryCost + fixedCost` (cấu trúc UI "Chi trực tiếp khác / Giá vốn / Vận hành / Lương / Cố định" giữ nguyên nghĩa).
- `cashflowSummary`: `totalInflow` = payments + receipts lẻ; **`totalOutflow` = Σ expenses (mọi payee) trong kỳ**; `salaryCost` = Σ expenses `payee_type='employee'`; `fixedCost` = Σ expenses `[Auto-Fixed]%`; `operatingNet = netAfterOverhead = totalInflow − totalOutflow` (không còn cộng `monthly_salaries`/`fixed_costs` tổng hợp — hai bảng đó không phải tiền).
- Thêm key: `summary.signedRevenue` (Σ `total_amount` theo `contract_date` trong kỳ), `summary.signedContracts`, `summary.contractsMissingWorkDate`. Moodie `financial_summary` (`lib/moodie/tools.ts:548`) chỉ đọc key cũ → tương thích.

### 1.5 `finance_cashflow_timeline(p_start_date, p_end_date)` — `CREATE OR REPLACE`
Chỉ 3 UNION: payments (`payment_date`), receipts lẻ (`receipt_date`), expenses (`expense_date`, mọi payee). Bỏ 2 nhánh `monthly_salaries` × ratio và `fixed_costs` × ratio.

### 1.6 `payee_payment_history(p_payee_type text, p_payee_id uuid)`
`RETURNS TABLE(expense_id uuid, expense_date date, amount numeric, payment_method text, note text, created_at timestamptz, created_by uuid, allocations jsonb)` — `expenses` `deleted_at IS NULL AND payee_type=$1 AND payee_id=$2`, `allocations = COALESCE(jsonb_agg(jsonb_build_object('target_type', a.target_type, 'target_id', a.target_id, 'label', <nhãn>, 'amount', a.amount) ORDER BY a.created_at), '[]')` với nhãn **cùng biểu thức `payable_items`**: `printing_order` → `po.order_code`; `work_task` → `wt.work_type || ' ' || c.contract_code`; `inventory_transaction` → `'Nhập ' || i.name || ' ×' || t.quantity`; `employee_salary` → `'Lương m/y'`. `ORDER BY expense_date DESC, created_at DESC`.

### 1.7 `void_payee_payment_atomic(p_expense_id uuid, p_actor_id uuid) RETURNS jsonb`
plpgsql SECURITY DEFINER: lấy `expenses` `FOR UPDATE`; RAISE nếu không tồn tại / đã `deleted_at` / `payee_type NOT IN ('lab','vendor','supplier')` ("Chi dung cho phieu chi tra doi tac") / `is_period_locked(expense_date)`. `UPDATE expenses SET deleted_at=now(), updated_at=now()`. Nếu có allocation `printing_order` → `PERFORM recompute_printing_payment_status(target_id)` từng đơn. RETURN `jsonb_build_object('expense_id', id, 'payee_type', …, 'payee_id', …, 'amount', …)`. (`deleteExpense` ở `/finance/expenses` đã chặn phiếu `approved_by IS NOT NULL` → phiếu chi trả đối tác chỉ huỷ được từ màn Phải trả — đúng ý.)

### 1.8 `printing_lab_overview()` — `CREATE OR REPLACE` cùng chữ ký
CTE `payments` đổi từ `public.lab_payments` sang `SELECT payee_id AS lab_id, MAX(expense_date)::timestamptz AS last_payment_at FROM public.expenses WHERE payee_type='lab' AND deleted_at IS NULL GROUP BY payee_id`. Phần còn lại giữ nguyên. (Hàm duy nhất trong DB còn đọc view — kiểm bằng `pg_get_functiondef ILIKE`.)

### 1.9 DROP + quyền
```sql
DROP FUNCTION IF EXISTS public.finance_dashboard_metrics(integer, integer);
DROP FUNCTION IF EXISTS public.finance_revenue_by_month(integer);
-- mọi hàm mới/thay: REVOKE ALL … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role
--   (finance_month_summary, finance_pnl_by_month, finance_reports_snapshot, finance_cashflow_timeline,
--    payee_payment_history, void_payee_payment_atomic, printing_lab_overview). vn_date: mặc định (thuần, không dữ liệu).
```
Giữ wrapper `finance_lab_debt_summary`, `finance_vendor_debt_summary`, `record_lab_payment_atomic`, `record_vendor_payment_atomic` (`/printing` + `verify:printing` + `cashflow-m1.spec` dùng) — dọn ở M2b.

**Migration B — `20260826130000_cashflow_m2b_drop_legacy.sql` (VIẾT trong M2, KHÔNG ÁP; áp ≥ 2026-09-02 khi user gật, sau khi prod chạy M2 ổn):** pre-check `count(lab_payments_legacy)=26`, `vendor_payments_legacy WHERE deleted_at IS NULL = 5`, `expenses WHERE legacy_source IS NOT NULL ≥ 31`; `DROP VIEW` 4 view; `DROP TABLE … _legacy CASCADE` ×4 (kéo theo trigger `trigger_vendor_payments_updated_at`, `emit_realtime_signal`, 5 policy, 6 FK); `DROP FUNCTION IF EXISTS public.update_vendor_payments_updated_at()`; `DROP FUNCTION record_vendor_payment_atomic` (app không còn gọi sau M2; giữ `record_lab_payment_atomic` cho `/printing`). Sau khi áp: `npm run db:types` + `node scripts/vault-gen-schema.mjs`.

## 2. App — dashboard 3 số

### 2.1 `types/finance-dashboard.ts`
Bỏ `DashboardMetrics`. Thêm:
```ts
export interface MonthSummary {
  month: number; year: number;
  cash: { in: number; inContract: number; inRetail: number; out: number; outSettlement: number; outOther: number; net: number; netPrev: number };
  pnl: { revenue: number; revenueContract: number; revenueRetail: number; cost: number; costTask: number; costPrint: number; costCogs: number; costDirect: number; costOverhead: number; costSalaryBase: number; profit: number; profitPrev: number; margin: number; contractsShot: number; contractsMissingWorkDate: number };
  debt: { receivable: number; payable: number; payableLab: number; payableVendor: number; payableSupplier: number };
}
export interface RevenueByMonthItem { month: string; rawMonth: number; revenue: number; cost: number; profit: number; cashIn: number; cashOut: number; signedRevenue: number; }
```
`FinanceDashboardBootstrapData.metrics: MonthSummary`.

### 2.2 `app/actions/finance-dashboard-queries.ts`
- `getDashboardMetrics(month, year)` → đổi tên **`getMonthSummary(month, year)`** gọi `finance_month_summary` `.single()` → map `MonthSummary`. `getFinanceDashboardBootstrap` dùng cùng mapper (`mapMonthSummary(row, month, year)` — 1 hàm nội bộ).
- `getRevenueByMonth(year)` gọi `finance_pnl_by_month` → map đủ 8 cột.
- **Xoá** `getDashboardMetricsFallback`, `getRevenueByMonthFallback`, `queryDashboardMetrics`, `queryRevenueByMonth` (dead sau khi RPC là nguồn duy nhất — cùng lý do M1 xoá fallback profit); xoá import `calculateChangePercentage` nếu không còn ai dùng. `getServiceDistributionFallback`/`fetchLedgerFallback` **giữ** (ngoài scope).
- `tests/unit/fallback-limits.test.ts` chỉ là hằng số tự chứa (comment nhắc `getDashboardMetricsFallback`) → không đổi.

### 2.3 `components/finance/dashboard/finance-compact-bar.tsx` — giữ tên export `FinanceCompactBar`, props `{ data: MonthSummary }`
Render `grid grid-cols-1 gap-3 md:grid-cols-3`; mỗi khối = `card-base p-4`:
1. **Két tháng {m}** — số lớn `cash.net` (xanh ≥0 / đỏ) · dòng phụ `Thu {cash.in} · Chi {cash.out}` · caption `Trả nợ {outSettlement} · chi khác {outOther}` · link `Sổ cái →` `/finance/cashflow`.
2. **Lãi/lỗ tháng {m}** — số lớn `pnl.profit` + badge `margin%` · phụ `Doanh thu {revenue} · Chi phí {cost}` · caption `Theo ngày chụp · {contractsShot} HĐ` + nếu `contractsMissingWorkDate>0`: `{n} HĐ đang chạy thiếu ngày chụp` (Link `/contracts`) · link `Báo cáo →` `/reports`.
3. **Công nợ hiện tại** — số lớn `debt.receivable − debt.payable` ("ròng") · phụ `Phải thu {receivable}` (Link `/finance/debts`) · `Phải trả {payable}` (Link `/finance/payables`) · caption `Lab {payableLab} · Thợ {payableVendor} · NCC {payableSupplier}`.
Dùng `formatVnd`, `Badge`, `Link` (`prefetch={false}`), icon lucide `Wallet`/`TrendingUp`/`Scale`. Không `StatsBar` (4 ô ngang không chứa được 3 nhóm × 3 số).

### 2.4 `finance-dashboard-client.tsx`
- import `getMonthSummary`; `EMPTY_METRICS` → `EMPTY_SUMMARY: MonthSummary` (0 hết). Khối đầu: header nhỏ (`h2` "Tháng này" + pill "Cập nhật: Tháng m/y") rồi `<FinanceCompactBar data={data} />` full-width (bỏ flex 2 cột cũ).
- Chart: `<RevenueBarChart data=… selectedMonth=… />` giữ props.

### 2.5 `revenue-bar-chart.tsx`
Title "Doanh thu & tiền thu theo tháng", caption "Doanh thu theo ngày chụp · tiền thu theo ngày phiếu". 2 `<Bar>`: `revenue` (`var(--color-primary)`) và `cashIn` (`var(--color-success)`), `barGap={4}`, `maxBarSize={28}`; `<Legend>` recharts (formatter → "Doanh thu"/"Tiền thu"); Tooltip custom (như `reports-cashflow-chart.tsx`) liệt kê Doanh thu / Chi phí / Lãi-lỗ / Tiền thu / Tiền chi của tháng đó. Lọc 6 tháng gần nhất như cũ.

### 2.6 `finance-quick-nav.tsx`
Thay item `/finance/vendor-debts` bằng `{ href: "/finance/payables", label: "Phải trả", description: "Lab · thợ · NCC phôi", icon: Users, tone: "orange" }`.

## 3. App — màn "Phải trả" hợp nhất `/finance/payables`

### 3.1 `types/payables.ts` (mới)
```ts
export type PayeeType = "lab" | "vendor" | "supplier";
export const PAYEE_TYPE_LABEL: Record<PayeeType, string> = { lab: "Lab ảnh", vendor: "Thợ ngoài", supplier: "NCC phôi" };
export interface PayableRow { payee_type: PayeeType; payee_id: string; payee_name: string; item_count: number; total_committed: number; total_paid: number; remaining: number; last_item_date: string | null; last_payment_date: string | null; }
export interface PayableItem { target_type: string; target_id: string; item_date: string | null; label: string; committed: number; allocated: number; remaining: number; }
export interface PayeePaymentAllocation { target_type: string; target_id: string; label: string; amount: number; }
export interface PayeePaymentHistoryItem { id: string; expense_date: string; amount: number; payment_method: string; note: string | null; created_at: string | null; allocations: PayeePaymentAllocation[]; }
export interface RecordPayeePaymentInput { payee_type: PayeeType; payee_id: string; amount: number; payment_method: "tien_mat" | "chuyen_khoan"; payment_date: string; note?: string; allocations?: Array<{ target_id: string; amount: number }>; }
```

### 3.2 `app/actions/payable-actions.ts` (mới, `"use server"`)
- `fetchPayables()` — `withFinanceRead` → rpc `finance_payable_summary` → `PayableRow[]` (lọc `payee_type` ∈ 3 loại, ép số).
- `fetchPayableItems(payeeType, payeeId)` — `withFinanceRead` → rpc `payable_items` → chỉ `remaining > 0`.
- `recordPayeePayment(raw)` — zod `recordPayeePaymentSchema` (payee_type enum, uuid, amount>0, method enum, `payment_date` regex `^\d{4}-\d{2}-\d{2}$`, note optional, allocations optional `[{target_id uuid, amount>0}]`) → `withAdmin` → `checkPeriodLock` → rpc `record_payee_payment_atomic` với `p_allocations: allocations ?? []` (mảng thật, **không** `JSON.stringify`), `p_note: (note || null) as string` → `writeAuditLog` (`tableName: "expenses"`) → `revalidatePath("/finance/payables")`, `/finance`, `/printing`, `/printing/labs`, `/finance/expenses` → trả `{ expense_id, allocated_amount }`.
- `fetchPayeePaymentHistory(payeeType, payeeId)` — `withFinanceRead` → rpc `payee_payment_history` → map (`allocations` jsonb → mảng).
- `voidPayeePayment(raw)` — zod `{ expense_id uuid }` → `withAdmin` → rpc `void_payee_payment_atomic` → audit `DELETE expenses` → revalidate như trên → trả kết quả rpc.
Quyền: `withAdmin` như `recordVendorPayment` cũ (trang finance chỉ admin/manager).

### 3.3 `app/(protected)/finance/payables/page.tsx`
`metadata { title: "Công nợ phải trả" }`, `force-dynamic`, `const data = await fetchPayables()` → `<PayablesClient initialData={unwrap(data, [])} />` (mẫu `vendor-debts/page.tsx`).

### 3.4 `components/finance/payables/`
- `payables-client.tsx` — `useSWR(cacheKeys.payables(), fetchPayables, { fallbackData })`; Breadcrumb `Tài chính / Phải trả`; `TabsFilter` 2 tab: **"Phải trả"** (count = số dòng) · **"Chi phí thợ ngoài"** (report `fetchVendorCosts(month, year)` + `SelectPill` tháng/năm — chuyển nguyên từ `vendor-debts-client` tab "costs", dùng `VendorCostDesktopTable`/`VendorCostMobileList` sẵn có ở `components/finance/salaries/`). Tab 1: `PayablesStatsBar` (Tổng phải trả · Lab · Thợ · NCC · Đã trả) + pill lọc loại đối tác (Tất cả/Lab/Thợ/NCC) + `TierSwitch` (`PayablesDesktopTable` / `PayablesMobileList`) + empty state "Không có công nợ phải trả". Handlers: `onPay(row)` → `PayeePaymentModal`; `onHistory(row)` → `PayeeHistoryDrawer`; `onSuccess` → `mutate()` + `invalidateFinanceAfterWrite({})` + `mutate("finance-salaries")` + `revalidateByPrefixes(["printing","labs"])` + toast. FAB mobile "Thanh toán" → dòng đầu còn nợ.
- `payables-stats-bar.tsx` — `StatsBar` 4 ô: Tổng phải trả (error) · Lab (info) · Thợ ngoài (warning) · NCC phôi (primary).
- `payables-desktop-table.tsx` — cột: Đối tác (tên + badge loại) · Số khoản · Cam kết · Đã trả · Còn nợ · Khoản gần nhất · Trả gần nhất · Thao tác (History, Banknote — mẫu `vendor-debts-desktop-table`).
- `payables-mobile-list.tsx` — `SwipeableCard` (Lịch sử / Thanh toán) mẫu `vendor-debts-mobile-list`.
- `payee-payment-modal.tsx` — generic cho 3 loại: `useSWR(["payable-items", type, id], fetchPayableItems)`; FIFO/Thủ công (`TabsFilter`); danh sách khoản (`Checkbox`, nhãn `item.label`, ngày, còn lại); `CurrencyInput`; nút 50% / Tất toán; `SelectForm` phương thức (`tien_mat`/`chuyen_khoan`); `DatePicker` (mặc định hôm nay); `Textarea`; validate như `LabPaymentModal` (không vượt nợ; thủ công phải chọn ≥1); submit `recordPayeePayment` với `allocations` = phân bổ tính phía client (FIFO theo `item_date`, thủ công theo chọn). Reset form khi mở (mẫu `prevIsOpen`, không `useEffect+setState`).
- `payee-history-drawer.tsx` — `Drawer` timeline (mẫu `vendor-payment-history-drawer`): mỗi phiếu: ngày, số tiền, phương thức, ghi chú, **danh sách phân bổ** (`label` – `amount`), nút "Huỷ phiếu chi" → `voidPayeePayment` (confirm bằng `UnifiedModal` nhỏ hoặc nút 2 bước — **không** `window.confirm`), sau đó `onVoidSuccess`. Load bằng `useSWR` theo `[ "payee-history", type, id ]` (tránh `useEffect+setState`).
- `vendor-costs-stats-bar.tsx` — **move** từ `components/finance/vendor-debts/` (không đổi nội dung).

### 3.5 Redirect + xoá
- `app/(protected)/finance/lab-debts/page.tsx`, `vendor-debts/page.tsx` → `import { redirect } from "next/navigation"; export default function Page() { redirect("/finance/payables"); }`.
- Xoá: `components/finance/lab-debts/lab-debts-client.tsx`; `components/finance/vendor-debts/{vendor-debts-client,vendor-debts-stats-bar,vendor-debts-desktop-table,vendor-debts-mobile-list,vendor-payment-modal,vendor-payment-history-drawer}.tsx`; `app/actions/vendor-payment-actions.ts` (5 hàm đều chỉ 2 component trên dùng); `fetchLabDebts` + `LabDebtItem` (`finance-operations-queries.ts`, `types/finance-operations.ts`); `types/vendor.ts` bỏ `VendorPayment`, `VendorPaymentAllocation`, `VendorDebtItem`, `VendorUnpaidTask`, `VendorPaymentInput` (giữ `Vendor`, `VendorListItem`).
- `lib/swr.ts`: bỏ `labDebts`, `vendorDebts`; thêm `payables: () => "finance-payables"`. `lib/cache-invalidation.ts`: 2 chỗ → `cacheKeys.payables()`.
- `app/actions/lab-mutations.ts:341` và `vendor-actions.ts` (3×) `revalidatePath` → `/finance/payables`.

## 4. App — bỏ phụ thuộc view (để M2b drop được)

- `app/actions/lab-queries.ts`:
  - `getLabDetail` payments: `from("expenses").select("id, payee_id, amount, payment_method, description, created_by, created_at, expense_date").eq("payee_type","lab").eq("payee_id", id).is("deleted_at", null).order("expense_date", desc)` → map `LabPayment { id, lab_id: payee_id, amount, payment_method, note: description, created_at: expense_date ?? created_at, created_by }`.
  - `fetchLabUnpaidOrders` phân bổ: `from("expense_allocations").select("target_id, amount, expenses!inner(deleted_at)").eq("target_type","printing_order").in("target_id", orderIds).is("expenses.deleted_at", null)`.
  - `fetchLabPaymentHistory`: `from("expenses")` (payee lab, `deleted_at IS NULL`, `count: "exact"`, order `expense_date` desc, range) + `from("expense_allocations").select("expense_id, target_id, amount").eq("target_type","printing_order").in("expense_id", ids)` + mã đơn (giữ query thứ 3). `paymentMethod`: `tien_mat → "cash"`, còn lại `"transfer"` (khớp `PaymentMethod` của `types/printing.ts`).
- `app/actions/printing-queries.ts` `getPrintingOrderLabRemaining`: đọc `expense_allocations` + `expenses!inner` `deleted_at IS NULL` như trên (`.eq("target_type","printing_order").eq("target_id", orderId)`).
- `components/finance/finance-realtime-refresh.tsx`: bỏ `vendor_payments` khỏi `FINANCE_SIGNAL_TABLES` (phiếu chi đã là `expenses`, có signal). `scripts/verify-realtime-signals.mjs`: bỏ `vendor_payments` ở `SOURCE_TABLES`, `PHANTOM_ONLY`, `APP_FILTERS` (script hiện **đang gãy** vì `vendor_payments` là view có `CASE` → không update được; bug từ M1).
- `scripts/vault-gen-schema.mjs` GROUPS: `tai-chinh` += `"expense_allocations"`; `in-an-lab` bỏ `lab_payments`, `lab_payment_allocations`; `nha-cung-cap` bỏ `vendor_payments`, `vendor_payment_allocations`.
- `app/actions/vendor-reports-queries.ts` `fetchVendorCosts`: lọc tháng theo **ngày sự kiện** thay `deadline`: select thêm `contract_events!inner(event_date)`… — `work_tasks.event_id` nullable → dùng `.gte("deadline")` sẽ bỏ sót; cách đúng trong PostgREST không có COALESCE → **viết RPC nhỏ** `vendor_cost_report(p_month int, p_year int) RETURNS TABLE(vendor_id uuid, vendor_name text, vendor_phone text, service_type text, job_count bigint, total_cost numeric, contracts text[])` (luật ngày task §1.1, `status='hoan_thanh'`, `vendor_id IS NOT NULL`) trong migration A; action gọi RPC, giữ `VendorCostSummary`. (Bổ sung vào §1.9 quyền.)

## 5. Tests & verify

- **`tests/e2e/cashflow-m2.spec.ts`** (mới, seed riêng như m1, `sweepStaleE2EOrphans`): 
  1. RPC delta: gọi `finance_month_summary(7, 2026)` và `(8, 2026)` **trước** seed → seed HĐ `work_date 2026-07-05`, `total 5.000.000`, event `2026-07-05`, task thợ `1.200.000` `hoan_thanh`, đơn in `order_date 2026-07-10` `300.000`, trả lab `2026-08-20` 300.000, trả thợ `2026-08-22` 1.200.000 (qua `record_payee_payment_atomic('vendor', …, allocations [{target_id: task}])`) → gọi lại: **T7** `revenue_contract +5.000.000`, `cost_task +1.200.000`, `cost_print +300.000`, `profit +3.500.000`, `cash_in/out +0`; **T8** `cash_out +1.500.000`, `cash_out_settlement +1.500.000`, `profit +0`, `revenue +0`. `finance_pnl_by_month(2026)` tháng 7 `profit` delta `+3.500.000`, tháng 8 `cash_out` `+1.500.000`. `finance_reports_snapshot('2026-07-01','2026-07-31')`: `summary.totalRevenue` +5.000.000, `directCost` +1.500.000, `cashflowSummary.totalOutflow` +0; `('2026-08-01','2026-08-31')`: `cashflowSummary.totalOutflow` +1.500.000, `summary.totalCost` +0. `finance_cashflow_timeline` T8 `Σ outflow` +1.500.000.
  2. `payee_payment_history('vendor', vendorId)` → 1 dòng, `allocations[0].label` chứa `chup_anh` + mã HĐ; `void_payee_payment_atomic` → nợ thợ trở lại 1.200.000 (`finance_payable_summary`), `expenses.deleted_at` set; huỷ lần 2 → lỗi.
  3. Hai hàm cũ đã DROP: `db.rpc("finance_dashboard_metrics", …)` trả lỗi.
  4. UI smoke (login seed): `/finance` thấy "Két tháng", "Lãi/lỗ tháng", "Công nợ hiện tại"; `/finance/payables` thấy "Hồng Bảo" + "1.905.000" và dòng thợ seed (còn nợ 1.200.000 sau void) → bấm "Thanh toán" → modal hiện khoản `chup_anh` 1.200.000 → đóng; `/finance/lab-debts` → URL kết thúc `/finance/payables`; `/reports` render "Doanh thu".
- **Sửa test cũ:** `cashflow-m1.spec.ts` dòng 221–224 đọc `expenses` thay view. `printing-drawer-fixes-verify.spec.ts` seed trả lab 100.000 qua `db.rpc("record_lab_payment_atomic", { p_lab_id, p_amount: 100000, p_payment_method: "transfer", p_note, p_allocations: [{ printing_order_id: orderC.id, amount: 100000 }], p_actor_id, p_payment_date: "2026-08-20" })` → lưu `expense_id`; cleanup xoá `expense_allocations` + `expenses` theo id. `finance-module.spec.ts`: danh sách route thay 2 route cũ bằng `/finance/payables`; test 18+19 → 1 test "payables page loads + old routes redirect".
- **`scripts/verify-reports.mjs`:** thêm `finance_month_summary {p_month:4,p_year:2026}` (1 dòng, có `cash_net`, `profit`, `payable`), `finance_pnl_by_month {p_year:2026}` (12 dòng), `payee_payment_history {p_payee_type:'lab', p_payee_id: '00000000-0000-0000-0000-000000000000'}` (mảng), `vendor_cost_report {p_month:4,p_year:2026}`; assert `snapshot.summary.signedRevenue` là số; assert `finance_dashboard_metrics`/`finance_revenue_by_month` **không còn** (lỗi "not found"/"does not exist"); vòng anon-denied tự phủ RPC mới.
- **Gate trước merge:** `npx tsc --noEmit` 0 · `npx eslint` (mọi file đổi) 0 · `npm run build` 0 · `npm run verify:reports` · `verify:printing` · `verify:contracts` · `verify:inventory` · Playwright (PowerShell) `cashflow-m2.spec.ts` + `cashflow-m1.spec.ts` + `printing-drawer-fixes-verify.spec.ts` trên local, rồi `cashflow-m2` trên prod sau deploy · render `/finance` @1366, @768, @375 (3 khối xếp dọc ở phone).

## 6. Docs sau khi xanh
`vault/50-luong/luong-tien.md` (mục "Ba số" + sửa "Ba câu hỏi hay hỏi sai": doanh thu tháng = `finance_month_summary.pnl` theo ngày chụp; tiền thu = `.cash`; phải trả = `finance_payable_summary` / `/finance/payables`), `vault/40-module/tai-chinh.md` (route Công nợ: `/finance/debts` · `/finance/payables`; RPC đọc: `finance_month_summary`, `finance_pnl_by_month`, `payee_payment_history`, `vendor_cost_report`; bảng: 4 view "drop ở M2b"), `in-an-lab.md`, `nha-cung-cap.md` (đọc thẳng `expenses`), `docs/design/dong-tien-mood-v2.md` §9 (M2 ✅, M2b), `agent/DECISIONS.md` (ADR-016 phụ lục M2: 5 quyết định §1.1), `agent/TASKS.yaml`, `agent/CURRENT_STATE.md`.

## 7. Kết quả (2026-08-26, branch `claude/cashflow-m2`)

| Gate | Kết quả |
|---|---|
| Migration A `20260826120000_cashflow_m2_ba_so.sql` | **ĐÃ ÁP prod** (transaction). Đối soát: T8/2026 két +203.600 (thu 18.300.000 − chi 18.096.400, toàn bộ là trả nợ), lãi **37.090.000** (doanh thu 46.275.000 − task 7.650.000 [4.200.000 hoàn thành + 3.450.000 đang làm, cùng luật `contract_financials`] − in 1.535.000), phải thu 92.575.000, phải trả 1.905.000 (lab), 4 HĐ đang chạy thiếu ngày chụp. T5: lãi 27.670.600 (12 HĐ chụp 38.350.000 + bán lẻ 4.315.000 − task 9.600.000 − in 3.486.400 − COGS 1.908.000), két +28.895.000. `finance_pnl_by_month` T5–T8 khớp; `finance_reports_snapshot` T8 `totalRevenue` 46.275.000 / `totalCost` 9.185.000 / `cashflowSummary.totalOutflow` 18.096.400 = Σ timeline. Hàm DB còn đọc view cũ = 0. |
| Migration B `20260826130000_cashflow_m2b_drop_legacy.sql` | viết + pre-check, **chưa áp** (≥ 2026-09-02, chờ user gật) |
| `npx tsc --noEmit` · `npx eslint` 44 file đổi | 0 lỗi (1 warning `exhaustive-deps` đã sửa) |
| `npm run build` | ✓ 3.2 min, route `/finance/payables` ƒ |
| `verify:reports` | xanh — thêm `finance_month_summary` (1 dòng, đủ cột), `finance_pnl_by_month` (12 dòng, T4 khớp month_summary + snapshot: profit & cash_out), `payee_payment_history`, `vendor_cost_report`, anon denied cả 4; `finance_dashboard_metrics` + `finance_revenue_by_month` **dropped** |
| `verify:printing` · `verify:contracts` · `verify:inventory` | xanh, integrity 4/4 = 0 |
| Playwright local (`next start` :3100, `--workers=1`) | **`cashflow-m2` 3/3**: delta T7 doanh thu +5.000.000 / task +1.200.000 / in +300.000 / lãi +3.500.000 / két 0; T8 chi +1.500.000 = trả nợ, lãi +0, phải thu +5.000.000, phải trả 0; `pnl_by_month` + `reports_snapshot` + `cashflow_timeline` cùng số; `payee_payment_history` nhãn `chup_anh E2E-M2-…`; void hoàn nợ 1.200.000, void lần 2 lỗi; 2 hàm cũ mất; UI: `/finance` 3 khối, `/finance/payables` dòng thợ seed → modal thủ công thấy khoản `chup_anh`, `/finance/lab-debts` + `/finance/vendor-debts` → redirect, `/reports`. **`cashflow-m1` 4/4** (đã đổi view → `payee_payment_history`), **`printing-drawer-fixes-verify` 3/3** (seed qua `record_lab_payment_atomic`), **`finance-module` "payables page" 1/1**. Seed dọn sạch: expenses active 35, lab 1.905.000, E2E 0, orphan 0. |
| Render | `/finance` @1366 / @768 / @375: 3 khối → 1 cột ở phone; `/finance/payables` @1366 bảng, @375 danh sách card + FAB (hydration ~2,7s trên `next start` local). |
| Production (sau merge) | _(điền sau khi deploy: chạy `cashflow-m2` trên `stu.moodwedding.com`)_ |

**Bug tìm được & sửa khi implement:**
1. React Compiler hoist `payee!.payee_id` (non-null assertion trong closure fetcher `useSWR`) thành dependency memo → đọc `.payee_id` của `null` ngay render đầu → `/finance/payables` văng error boundary. Sửa: tách `payee?.payee_type ?? null` ra biến trước khi dùng (payment modal + history drawer).
2. Playwright: sau `waitForURL(/dashboard/)` trang còn kích một điều hướng cứng tới `/dashboard` vài chục ms sau → `page.goto` ngay lúc đó `net::ERR_ABORTED` (cả M1 lẫn printing spec dính khi chạy lại). Sửa `login()` ở 4 spec: `Promise.race([page.waitForEvent("load"), page.waitForTimeout(4000)])`. Các spec khác (contracts…) cùng mẫu login — chưa đụng (ngoài scope), ghi nhận.
3. Chạy 2 spec seed song song làm delta M2 đếm gấp đôi (HĐ seed của M1 cũng chụp 05/07) → chạy `--workers=1`.
4. `verify-realtime-signals.mjs` đang gãy từ M1 (touch `vendor_payments` là view có `CASE`) → bỏ bảng khỏi 3 danh sách.

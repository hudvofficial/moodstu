# Phase 00: Finance Inventory & Compatibility Audit
Status: ⬜ Pending (Awaiting DB RPC Verification)
Dependencies: Không

## Objective
Kiểm kê toàn diện schema, actions, và UI hiện có liên quan đến Finance.
Chốt source of truth cho mỗi luồng dữ liệu.
Xác định chiến lược migrate/wrap/deprecate cho actions cũ.
Output 3 decision documents làm dependency cho mọi phase sau.

## Scope
- Audit tất cả bảng DB liên quan đến tài chính.
- Map rõ data flow hiện tại.
- Chốt danh sách bảng giữ lại vs legacy vs cần tạo mới.
- Route matrix cho 13 routes.
- **Chốt 3 output documents** (SSOT, Performance, Canonical Status).

---

## 1. Database Table Inventory (Verified từ `types/database.types.ts`)

### 1.1 Bảng THU (Receipts / Inflows)

| Bảng | Cột chính (verified) | Status |
|------|----------------------|--------|
| `receipts` | `receipt_amount`, `receipt_type`, `payment_type`, `contract_id` (nullable FK), `category_id`, `status`, `notes`, `contract_code`, `previous_paid`, `total_amount`, `remaining_amount` | **GIỮ LẠI — SoT cho phiếu thu ngoài hợp đồng** |
| `payments` | `amount`, `payment_date`, `payment_method` (enum `payment_method_enum`), `contract_id` FK, `customer_id` FK, `category_id`, `receipt_code`, `approved_by` | **GIỮ LẠI — SoT cho thu tiền hợp đồng** |
| `payment_plans` | `amount`, `contract_id` FK, `due_date`, `receipt_id` FK → **`payments`** (KHÔNG phải `receipts`!), `stage_name`, `status` | **GIỮ LẠI** |

> **⚠️ QUAN TRỌNG**: `payment_plans.receipt_id` FK tới bảng `payments`, KHÔNG phải `receipts`.
> Ghost payment scan phải check `payments` table, không phải `receipts`.

### 1.2 Bảng CHI (Expenses / Outflows)

| Bảng | Cột chính (verified) | Status |
|------|----------------------|--------|
| `expenses` | `amount`, `expense_date`, `payment_method` (enum), `category_id` FK, `description`, `recipient`, `contract_id`, `image_url`, `deleted_at` (soft delete), `approved_by`, `created_by`, `created_at`, `updated_at`. **⚠️ KHÔNG CÓ cột `status`. KHÔNG CÓ cột `category_name`.** | **GIỮ LẠI** |
| `fixed_costs` | `cost_code`, `cost_name`, `cost_type`, `monthly_amount`, `start_date`, `end_date` | **GIỮ LẠI** |

> **🐛 BUG B8**: `expense-actions.ts:29` approveExpense set `status: "approved"` nhưng DB `expenses` KHÔNG CÓ cột `status`.
> **Resolution**: Phase 02 fix: approve = set `approved_by: userId`, derive status từ `approved_by IS NOT NULL`.

> **🐛 BUG B9**: `getBudgetsWithActuals` query `.select("category_name, amount")` từ bảng `expenses`, nhưng `expenses` chỉ có `category_id`, KHÔNG CÓ `category_name`.
> **Resolution**: Phase 02 fix: query `expenses.amount, category_id` → join `transaction_categories` lấy `name`.

### 1.3 Bảng CÔNG NỢ

| Bảng | Cột chính (verified) | Status |
|------|----------------------|--------|
| `debts` | `entity_name`, `entity_type`, `type`, `amount`, `paid_amount`, `remaining`, `due_date`, `entity_id`, `notes`, `status` | **GIỮ LẠI** |
| `credit_cards` | `bank_name`, `card_label`, `last_4`, `statement_day`, `due_day`, `due_next_month`, `credit_limit` | **GIỮ LẠI** |
| `contracts` | `remaining_amount` (KHÔNG phải `remaining_balance`), `paid_amount`, `total_amount`, `payment_status` | Dùng cho Debts aging query |

> **🐛 BUG B1**: `debt-actions.ts` dùng `DebtInput` interface với `debt_name`, `debt_type`, `debt_amount`.
> DB schema thực: `entity_name`, `entity_type`, `amount`. Action đang insert cột KHÔNG TỒN TẠI.

### 1.4 Bảng LƯƠNG

| Bảng | Cột chính (verified) | Status |
|------|----------------------|--------|
| `monthly_salaries` | `month`, `year`, `salary_code`, `total_salary` | **GIỮ LẠI** |
| `employee_salaries` | `base_salary`, `product_salary`, `bonus`, `penalty`, `advance_payment`, `net_salary`, `total_salary`, `monthly_salary_id` FK | **GIỮ LẠI** |
| `salary_adjustments` | `employee_salary_id` FK, `type` (bonus/penalty), `amount`, `reason`, `date`, `created_by` | **GIỮ LẠI** |

### 1.5 Bảng MỤC TIÊU & NGÂN SÁCH

| Bảng | Cột chính (verified) | Status |
|------|----------------------|--------|
| `financial_goals` | `name`, `target_amount`, `current_amount`, `deadline`, `status`, `icon`, `color` | **GIỮ LẠI** |
| `goal_contributions` | `goal_id` FK, `amount`, `contribution_date`, `notes` | **GIỮ LẠI** |
| `budgets` | `category_name` (string), `budget_amount`, `period_month`, `period_year`. UNIQUE `(category_name, period_month, period_year)` | **GIỮ LẠI** |

> **⚠️ Schema mismatch**: `budgets.category_name` là string, nhưng `expenses` chỉ có `category_id` (UUID FK). Budget vs Actuals phải join `expenses` → `transaction_categories` rồi match tên.

### 1.6 Bảng ĐẦU TƯ & TÀI SẢN

| Bảng | Mục đích | Status |
|------|----------|--------|
| `investments` | Tài sản đầu tư. `purchase_price`, `depreciation_method`, `salvage_value`, `useful_life_months`. | **GIỮ LẠI** |
| `investment_maintenance_logs` | Lịch sử bảo trì. FK `investment_id`. | **GIỮ LẠI** |

### 1.7 Bảng HỆ THỐNG

| Bảng | Mục đích | Status |
|------|----------|--------|
| `transaction_categories` | Danh mục thu/chi (type: "Thu" / "Chi"). `id`, `name`, `type`. | **GIỮ LẠI** |
| `integrity_reports` | Kết quả scan data integrity. | **GIỮ LẠI** |
| `audit_logs` | `performed_by`, `action`, `table_name`, `record_id`, `old_data`, `new_data`. | **GIỮ LẠI** |

### 1.8 Bảng CẦN TẠO MỚI (Phase 01)

| Bảng | Mục đích |
|------|----------|
| `finance_monthly_closes` | Chốt sổ tháng. `period` (YYYY-MM), `status`, `snapshot_metrics` (JSONB), `locked_by`, `locked_at`. |
| `finance_close_tasks` | Bước chốt sổ. FK `close_id`. `step_number` (1..8), `status`, `assignee_id`. |

### 1.9 QUYẾT ĐỊNH: KHÔNG tạo `finance_ledger_entries`

**Lý do**: Thu hợp đồng = `payments`, thu khác = `receipts`, chi = `expenses`. Tạo unified ledger = duplicate source of truth.
Dashboard sẽ query UNION từ 3 bảng. Nếu performance thành vấn đề (>10k rows/bảng), xem xét materialized view hoặc RPC ở phase sau.

---

## 2. Existing RPCs (Finance-related)

| RPC | Mô tả | Bảng liên quan | Verification Status |
|-----|-------|----------------|---------------------|
| `run_integrity_scan` | Ghost payment scan: check `payment_plans` có `status = 'paid'` mà `receipt_id IS NULL` | `payment_plans`, `payments` | **⚠️ Missing in types**, Needs DB Verification |
| `contribute_to_goal` | Atomic contribution | `financial_goals`, `goal_contributions` | Verified via `database.types.ts` |
| `decrement_goal_amount` | Undo contribution | `financial_goals` | Verified via `database.types.ts` |
| `create_sale_receipt_atomic`| Receipt + inventory deduction | `receipts`, `inventory_items` | **⚠️ Missing in types**, Needs DB Verification |
| `get_contract_balance` | Tính balance hợp đồng | `contracts`, `payments` | Verified via `database.types.ts` |
| `recalc_contract_totals` | Recalc paid_amount | `contracts`, `payments` | Verified via `database.types.ts` |

> **⚠️ Canonical Value**: `run_integrity_scan` check `payment_plans.status = 'paid'` — ghép với `payment-actions.ts:100` dùng `status: "paid"`. Cần thực hiện kiểm tra RPC trực tiếp trong Supabase để xác minh logic này do type không map về Frontend.

---

## 3. Route Matrix

| # | Route | Data Source | Phase |
|---|-------|-------------|-------|
| 1 | `/finance` | UNION `payments` + `receipts` + `expenses` aggregate | 03a |
| 2 | `/finance/cashflow` | UNION `payments` + `receipts` + `expenses` (paginated) | 03a |
| 3 | `/finance/receipts` | `receipts` | 03b |
| 4 | `/finance/expenses` | `expenses` | 03b |
| 5 | `/finance/categories` | `transaction_categories` | 03b |
| 6 | `/finance/debts` | `contracts.remaining_amount` + `debts` | 03c |
| 7 | `/finance/lab-debts` | `labs` + `lab_payments` + `printing_orders` | 03c |
| 8 | `/finance/salaries` | `monthly_salaries` + `employee_salaries` + `salary_adjustments` | 03d |
| 9 | `/finance/fixed-costs` | `fixed_costs` | 03c |
| 10 | `/finance/investments` | `investments` + `investment_maintenance_logs` | 03c |
| 11 | `/finance/goals` | `financial_goals` + `goal_contributions` | 03e |
| 12 | `/finance/budget` | `budgets` + `expenses` (join `transaction_categories` for category name) | 03e |
| 13 | `/finance/closes` | `finance_monthly_closes` + `finance_close_tasks` | 03e |

---

## 4. Action Files — Strategy (wrap/harden, KHÔNG tạo lại)

| Action File | Strategy | Bugs to Fix |
|---|---|---|
| `receipt-actions.ts` | HARDEN: `withAdmin`, `await writeAuditLog`, Zod | — |
| `expense-actions.ts` | HARDEN + FIX B8: `approveExpense` bỏ `status: "approved"` → dùng `approved_by: userId` | Fix B8 |
| `debt-actions.ts` | HARDEN + FIX B1 | Fix B1 schema mismatch |
| `salary-actions.ts` | HARDEN + FIX B5: recalc fail fast | Fix B5 |
| `goal-budget-actions.ts` | HARDEN + FIX B2 + B9: query `expenses.amount, category_id` → join `transaction_categories` | Fix B2, B9 |
| `investment-actions.ts` | HARDEN | — |
| `payment-actions.ts` | HARDEN + FIX B3: thêm audit log | Fix B3 |
| `integrity-actions.ts` | HARDEN: `withAdmin` | — |

---

## 5. Existing `lib/swr.ts` — Cache Keys cần bổ sung

Hiện có: `expenses()`, `debts()`, `goals()`, `receipts()`, `payments()`, `labDebts()`.

Cần thêm (Phase 03a):
```
financeDashboard: (month: number, year: number) => `finance-dashboard:${month}:${year}`,
financeLedger: (page: number, month?: number, year?: number) => ...,
financeSalaries: (month?: number, year?: number) => ...,
financeInvestments: () => "finance-investments",
financeFixedCosts: () => "finance-fixed-costs",
financeBudgets: (month: number, year: number) => `finance-budgets:${month}:${year}`,
financeCategories: () => "finance-categories",
financeCloses: (year?: number) => ...,
financeCloseDetail: (id: string) => `finance-close:${id}`,
```

---

## 6. OUTPUT: SSOT_DECISIONS (Binding cho Phase 03a-03e)

> **Đây là output bắt buộc của Phase 00. Các phase sau PHẢI tuân thủ.**

### Components PHẢI reuse (KHÔNG tạo mới)

| Component | Location | Finance usage |
|-----------|----------|---------------|
| `<KPICard>` | `components/ui/kpi-card.tsx` | Dashboard KPIs. Props: `label, value, icon, iconColor, iconBg, trend, trendUp`. Render `stats-card` + `icon-box`. |
| `<UnifiedModal>` | `components/ui/unified-modal.tsx` | TẤT CẢ modal/form/confirm. Size: `sm|md|lg|xl|2xl|3xl|full`. Props: `isOpen, onClose, title, description, children, footer, size`. |
| `<CurrencyInput>` | `components/ui/currency-input.tsx` | TẤT CẢ amount input. Render `input-base` + auto VNĐ format + shortcuts (k/m). |
| `<Skeleton>`, `<SkeletonCard>`, `<SkeletonText>`, `<SkeletonTable>` | `components/ui/skeleton.tsx` | Loading states. |
| `<TableWrapper>`, `<THead>`, `<TBody>`, `<TH>`, `<TD>`, `<TR>` | `components/ui/table.tsx` | Desktop tables. `card-base` container, sticky header, alternating rows. |
| `<Pagination>` | `components/ui/pagination.tsx` | Server-side pagination UI. Props: `page, totalPages, onChange`. |

### CSS Classes PHẢI dùng (KHÔNG viết tay)

| Need | Class | Source |
|------|-------|--------|
| Page wrapper | `main-container` | `layout.css` |
| 2-col detail | `detail-grid` + `detail-main` + `detail-sidebar` | `layout.css` |
| Form layout | `form-grid-2col`, `form-actions`, `form-total`, `form-section-heading` | `forms.css` |
| Inputs | `input-base`, `label-base`, `error-text`, `warning-text`, `input-error` | `forms.css` |
| Buttons | `btn-cta`, `btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`, `btn-icon`, `btn-interactive`, `btn-outline` | `buttons.css` |
| Badges | `badge badge-success/warning/error/info/neutral/primary`, `tag-badge` | `badges.css` |
| Tabs | `tab-pill`, `tab-pill-active`, `tab-pill-inactive`, `tab-pill-compact` | `tabs.css` |
| Cards | `stats-card`, `card-base`, `card-interactive`, `accent-card accent-card-*` | `cards.css` |
| Tables | `section-title`, `table-header` | `tables.css` |
| Animation | `entrance entrance-{1..8}`, `stagger-item`, `card-entrance`, `skeleton`, `skeleton-text`, `skeleton-card` | `animations.css` |
| Numbers | `tabular-nums` | Native CSS class |
| Indicators | `overdue-indicator`, `inset-success`, `inset-warning` | `utilities.css` |

### KHÔNG ĐƯỢC (Forbidden)

| ❌ Forbidden | ✅ Thay thế |
|---|---|
| `<input type="number">` | `<CurrencyInput>` |
| Custom modal / `modal-overlay` tự tạo | `<UnifiedModal>` |
| Custom KPI card / `bg-white rounded-lg shadow` | `<KPICard>` |
| `useEffect + fetch` | `useSWR(cacheKey, fetcher)` |
| `useQuery` / React Query | SWR only |
| Hardcode hex color (`#8b5e3c`) | `var(--color-*)`, `text-primary`, design system tokens |
| `p-4 px-6 py-8` cho page wrapper | `main-container` |
| `grid grid-cols-2 gap-3` cho form | `form-grid-2col` |
| Tạo CSS/module CSS mới cho finance | Chỉ dùng design-system SSOT. Nếu cần class mới: thêm vào `design-system.css` layer tương ứng, KHÔNG tạo file riêng. |

---

## 7. OUTPUT: PERFORMANCE_DECISIONS (Dependency cho Phase 01/02/03)

### Pagination defaults
| Config | Value | Rationale |
|--------|-------|-----------|
| `DEFAULT_PAGE_SIZE` | `20` | Phù hợp mobile card list |
| `MAX_PAGE_SIZE` | `100` | Chặn client request quá lớn |
| `LEDGER_DEFAULT_SORT` | `date DESC` | Giao dịch mới nhất trước |
| `DATE_RANGE_MAX` | `12 months` | Cashflow timeline giới hạn |

### Server-side vs Client-side
| Pattern | Rule |
|---------|------|
| Filtering | Server-side ALWAYS. Filter params → WHERE clause |
| Sorting | Server-side. `.order(column, { ascending })` |
| Aggregation | Server-side. `SUM()`, `COUNT()`. KHÔNG trả raw rows rồi reduce client |
| Pagination | Server-side. `{ page, pageSize }` → LIMIT/OFFSET → trả `{ items, total, page, pageSize }` |
| Aging calculation | Server-side. `now() - due_date` → bucket ở DB/action |

### RPC / materialized view trigger
- Nếu bất kỳ list/aggregate query vượt `200ms` (EXPLAIN ANALYZE) → tạo RPC hoặc materialized view
- Lab debts (join nhiều bảng) → RPC ưu tiên nếu N+1 pattern
- Dashboard metrics: nếu UNION 3 bảng > 200ms → tạo RPC aggregate

### SWR Cache contract
| Rule | Detail |
|------|--------|
| Cache key registry | TẤT CẢ keys khai báo trong `lib/swr.ts` `cacheKeys` object. KHÔNG hardcode inline. |
| `fallbackData` | Server component fetch initial → pass `fallbackData` prop cho client SWR |
| `keepPreviousData` | Global default = `true` (đã set trong `swrConfig`) |
| `mutate` sau mutation | `await revalidate(cacheKeys.xxx())` hoặc `revalidateMultiple([...])` |
| Double-click prevention | Submit button: `disabled` + loading spinner. Nếu KHÔNG dùng server-side `idempotency_key` → ghi rõ "client-side debounce only — fallback yếu" |

---

## 8. OUTPUT: CANONICAL_STATUS_DECISIONS (Dependency cho Phase 02/03)

| Bảng | Field | Canonical values | Ghi chú |
|------|-------|-----------------|---------|
| `payment_plans` | `status` | `"paid"` (English) | Code thực tại `payment-actions.ts:100`. Integrity scan cũng check `status = 'paid'`. KHÔNG dùng `"da_thu"`. |
| `expenses` | approval | **Derive từ `approved_by`** | `approved_by IS NOT NULL` → "Đã duyệt". `approved_by IS NULL` → "Chờ duyệt". **KHÔNG set `status` column** (cột không tồn tại). |
| `expenses` soft delete | `deleted_at` | `IS NULL` = active, `IS NOT NULL` = deleted | Filter: `.is("deleted_at", null)` |
| `finance_monthly_closes` | `status` | `draft`, `in_progress`, `pending_review`, `locked` | — |
| `finance_close_tasks` | `status` | `chua_bat_dau`, `dang_thuc_hien`, `cho_duyet`, `hoan_thanh`, `co_van_de` | — |
| `debts` | `status` | `chua_thanh_toan`, `dang_tra`, `da_thanh_toan` | Verify ở Phase 00 execute |

---

## Implementation Steps
1. [x] Verify `debts` columns bằng SQL: `SELECT column_name FROM information_schema.columns WHERE table_name = 'debts'`
2. [x] Verify `expenses` columns → confirm KHÔNG CÓ `status`, KHÔNG CÓ `category_name`
3. [x] Run `getBudgetsWithActuals(4, 2026)` → confirm bug B2/B9 fails (Action executed scratch test threw: `column expenses.category_name does not exist`). Output evidence stored.
4. [ ] Verify `run_integrity_scan` and `create_sale_receipt_atomic` in DB since they are missing from `database.types.ts`.
5. [ ] Run `run_integrity_scan` in DB → provide evidence of scan checking `status = 'paid'`.
6. [x] Document decisions → lock Phase 00 output

## Test/Verification Criteria
- [x] Danh sách DB tables match 100% `database.types.ts`
- [x] B1-B9 đều documented + resolution phase assigned
- [x] SSOT_DECISIONS, PERFORMANCE_DECISIONS, CANONICAL_STATUS_DECISIONS đã chốt
- [x] Cache keys cần thêm identified

---
Next Phase: `phase-01-schema-rpc.md`

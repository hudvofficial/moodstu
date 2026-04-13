# Phase 03b: UI Slice 2 — Create/Approve Thu Chi
Status: ⬜ Pending
Dependencies: Phase 03a (layout + read-only ledger)

## Objective
Thêm CRUD phiếu thu (receipts), phiếu chi (expenses), approve workflow, CRUD categories. Period lock check.

---

## Files to Create

| File | Mục đích |
|---|---|
| `app/(protected)/finance/receipts/page.tsx` | Server component → fetch initial → `fallbackData` |
| `components/finance/receipts/receipts-client.tsx` | Client: SWR list + "Thêm phiếu thu" CTA |
| `components/finance/receipts/receipt-form-modal.tsx` | `<UnifiedModal>`: date, type, amount (`<CurrencyInput>`), contract picker, notes |
| `app/(protected)/finance/expenses/page.tsx` | Server component |
| `components/finance/expenses/expenses-client.tsx` | Client: SWR list + filter by month + approve actions |
| `components/finance/expenses/expense-form-modal.tsx` | `<UnifiedModal>`: date, amount, recipient, category, image |
| `app/(protected)/finance/categories/page.tsx` | Server component |
| `components/finance/categories/categories-client.tsx` | CRUD list cho transaction categories |

---

## SSOT Acceptance Criteria (Phase 03b)

> **Checklist kiểm được — PHẢI pass 100% trước Phase 03c**

- [ ] Page wrapper dùng `main-container`
- [ ] TẤT CẢ modal form dùng `<UnifiedModal>` — KHÔNG custom modal
- [ ] TẤT CẢ amount input dùng `<CurrencyInput>` — KHÔNG `<input type="number">`
- [ ] Text input dùng `input-base`, label dùng `label-base`, error dùng `error-text`
- [ ] 2-column form dùng `form-grid-2col`
- [ ] Form action buttons dùng `form-actions`
- [ ] "Thêm phiếu thu" CTA dùng `btn-cta`
- [ ] Submit button dùng `btn-primary`, Cancel dùng `btn-secondary`
- [ ] Delete dùng `btn-danger`
- [ ] "Duyệt" button dùng `btn-interactive`
- [ ] Desktop table dùng `<TableWrapper>` + `<THead/TBody/TH/TD/TR>`
- [ ] Pagination dùng `<Pagination>`
- [ ] Loading dùng `<SkeletonTable>` hoặc `<SkeletonCard>`
- [ ] Expense approval badge: `approved_by ? badge badge-success ("Đã duyệt") : badge badge-warning ("Chờ duyệt")`
  - **⚠️ KHÔNG check `status` column** — expenses **KHÔNG CÓ** cột `status`
- [ ] Category tags dùng `tag-badge`
- [ ] Mọi cột tiền có `tabular-nums`
- [ ] List items dùng `stagger-item`
- [ ] Không hardcoded hex/rgb/hsl colors
- [ ] Không tạo CSS module mới
- [ ] Mọi file < 250 lines
- [ ] Icons chỉ từ `lucide-react`

---

## SWR Cache Strategy (Phase 03b)

| Data | Cache Key | Revalidation |
|------|-----------|--------------|
| Receipts list | `cacheKeys.receipts()` | Sau create/update/delete receipt |
| Expenses list | `cacheKeys.expenses(month, year)` | Sau create/update/delete/approve expense |
| Categories list | `cacheKeys.financeCategories()` | Sau create/update/delete category |

**Rules**:
- Server component fetch initial → `fallbackData` prop
- Sau mutation: `await revalidate(cacheKeys.xxx())`
- Sau approve expense: `await revalidateMultiple([cacheKeys.expenses(m, y), cacheKeys.financeDashboard(m, y)])`
- Submit button: `disabled` + loading spinner chống double click
- Nếu KHÔNG dùng server-side idempotency → ghi UI: "client-side debounce only — fallback yếu"

---

## Business Logic

### Period Lock
- Trước submit form, client gọi `is_period_locked(date)` (RPC Phase 01).
- Nếu locked → hiện warning toast: "Kỳ YYYY-MM đã khóa sổ. Không thể tạo giao dịch."
- Server action cũng check (defense in depth).

### Approve Flow (Expenses)
- `approveExpense(id)` → set **`approved_by: userId`** (KHÔNG set `status` — cột không tồn tại)
- UI display logic:
  - `expense.approved_by != null` → `badge badge-success` "Đã duyệt"
  - `expense.approved_by == null` → `badge badge-warning` "Chờ duyệt"
- **KHÔNG có `badge-error` "Đã hủy"** cho expenses — chỉ có soft delete (`deleted_at`)

---

## Component Map

| UI Element | SSOT Component/Class |
|---|---|
| Modal tạo phiếu | **`<UnifiedModal>`** size `"lg"` |
| Amount input | **`<CurrencyInput>`** |
| Text inputs | `input-base` |
| Labels | `label-base` |
| Error messages | `error-text` |
| 2-column form | `form-grid-2col` |
| Form buttons row | `form-actions` |
| Submit button | `btn-primary` |
| Cancel button | `btn-secondary` |
| Delete button | `btn-danger` |
| "Thêm phiếu thu" CTA | `btn-cta` |
| "Duyệt" button | `btn-interactive` |
| Category tag | `tag-badge` |
| Chờ duyệt | `badge badge-warning` |
| Đã duyệt | `badge badge-success` |
| List items entrance | `stagger-item` |
| Loading | `<SkeletonTable>` |

---

## Implementation Steps
1. [ ] Verify `<CurrencyInput>` exists → ✅ đã có
2. [ ] Tạo receipts pages + components
3. [ ] Tạo expenses pages + components
4. [ ] Tạo categories pages + components
5. [ ] Wire period lock check (client + server)
6. [ ] SSOT Acceptance Criteria checklist
7. [ ] `npm run build` pass

## Test/Verification Criteria
- [ ] Mở `/finance/receipts` → nhấn "Thêm phiếu thu" → `<UnifiedModal>` mở
- [ ] CurrencyInput format đúng VNĐ (1.000.000)
- [ ] Submit → phiếu thu trong list
- [ ] Submit trong kỳ đã khóa → bị chặn
- [ ] Approve expense → `approved_by` set → badge đổi sang "Đã duyệt"
- [ ] SSOT checklist 100% pass
- [ ] `npm run build` pass

---
Next Phase: `phase-03c-ui-debts-ghost.md`

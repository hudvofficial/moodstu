# Phase 01: SSOT Payment Method Centralize
Status: ⬜ Pending
Dependencies: None

## Objective
Xóa toàn bộ local hardcode `PAYMENT_METHOD_OPTIONS` / `paymentLabel()` — chuyển về import từ SSOT duy nhất tại `contract-constants.ts`.

## Vấn đề hiện tại
6 file tự define local `{ value: "tien_mat", label: "Tiền mặt" }`:
- `stock-out-modal.tsx` — inline function `paymentLabel()`
- `receipt-form-modal.tsx` — local `PAYMENT_TYPE_OPTIONS`
- `expense-form-modal.tsx` — local `PAYMENT_METHOD_OPTIONS`
- `payment-receipt-form.tsx` — local `PAYMENT_METHOD_OPTIONS`
- `cancel-banner.tsx` — local `PAYMENT_METHOD_OPTIONS`
- `finance-format.ts` — hardcode riêng trong `financeMethodLabel()`

Ngoài ra 3 schema files duplicate `z.enum(["tien_mat", "chuyen_khoan"])`.

## Implementation Steps

### A. Tạo SSOT exports
1. [ ] **contract-constants.ts** — Thêm `PAYMENT_METHOD_OPTIONS` array derived từ `PAYMENT_METHOD_MAP`
   ```ts
   export const PAYMENT_METHOD_OPTIONS = Object.entries(PAYMENT_METHOD_MAP).map(
     ([value, label]) => ({ value, label })
   );
   ```

### B. Refactor consumers (xóa local, import SSOT)
2. [ ] **stock-out-modal.tsx** — Xóa `paymentLabel()` function (line 49-51), import `PAYMENT_METHOD_OPTIONS` + `getPaymentMethodLabel`
3. [ ] **receipt-form-modal.tsx** — Xóa `PAYMENT_TYPE_OPTIONS` (line 43-46), import `PAYMENT_METHOD_OPTIONS`
4. [ ] **expense-form-modal.tsx** — Xóa `PAYMENT_METHOD_OPTIONS` (line 25-28), import từ SSOT
5. [ ] **payment-receipt-form.tsx** — Xóa `PAYMENT_METHOD_OPTIONS` (line 46-49), import từ SSOT
6. [ ] **cancel-banner.tsx** — Xóa `PAYMENT_METHOD_OPTIONS` (line 47-50), import từ SSOT

### C. Schema unification
7. [ ] **finance.schema.ts** + **inventory.schema.ts** — Import `paymentMethodSchema` từ `contract.schema.ts` thay vì duplicate

### D. Finance format cleanup
> `finance-format.ts` giữ nguyên vì nó handle thêm legacy values ("cash", "bank_transfer", "card"). 
> Nhưng thêm fallback sang `getPaymentMethodLabel()` cho canonical values.

## Files to Modify
- `types/contract-constants.ts` — Add SSOT export
- `components/inventory/stock-out-modal.tsx` — Remove local fn
- `components/finance/receipts/receipt-form-modal.tsx` — Remove local const
- `components/finance/expenses/expense-form-modal.tsx` — Remove local const
- `components/contracts/detail/payment-receipt-form.tsx` — Remove local const
- `components/contracts/detail/cancel-banner.tsx` — Remove local const
- `lib/validations/finance.schema.ts` — Import shared schema
- `lib/validations/inventory.schema.ts` — Import shared schema

## Test Criteria
- [ ] `npm run build` passes (no TS errors)
- [ ] Mở Stock-out modal → payment method hiện đúng label
- [ ] Mở Receipt form → payment type dropdown hoạt động
- [ ] Mở Expense form → phương thức dropdown hoạt động
- [ ] Grep `"Tiền mặt"` trong components/ → 0 hardcode (chỉ còn trong constants)

---
Next Phase: phase-02-ui-consistency.md

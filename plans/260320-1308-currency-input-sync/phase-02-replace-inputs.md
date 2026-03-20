# Phase 02: Replace tất cả Currency Inputs
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thay thế tất cả `type="number"` cho tiền tệ → `CurrencyInput`.
Fix SSOT violations (Intl.NumberFormat + "đ" → formatCurrency + CURRENCY_SYMBOL).

## Tasks

### 2.1. ContractFinancialSummary.tsx (Discount input)
- [ ] L79-87: `<input type="number">` → `<CurrencyInput>`
- [ ] Khi `discountType === "percent"` → giữ `type="number"` max=100 (% không phải tiền)
- [ ] Khi `discountType === "fixed"` → dùng `CurrencyInput`

### 2.2. ServiceItemForm.tsx (Edit mode)
- [ ] L129: editPrice → `<CurrencyInput>`
- [ ] L132: editDiscount → `<CurrencyInput>`
- [ ] L126: editQty → GIỮA NGUYÊN `type="number"` (số lượng, không phải tiền)

### 2.3. AddonItemForm.tsx
- [ ] L110: price → `<CurrencyInput>`
- [ ] L114: discount → `<CurrencyInput>`
- [ ] L106: qty → GIỮ NGUYÊN (số lượng)

### 2.4. CreateServiceModal.tsx
- [ ] L89: price → `<CurrencyInput>`

### 2.5. payment-receipt-form.tsx
- [ ] L173: amount → `<CurrencyInput>`
- [ ] L184: `Intl.NumberFormat("vi-VN").format(remainingAmount)` + `đ` → `formatCurrency(remainingAmount)` + `CURRENCY_SYMBOL`
- [ ] L208: tương tự

### 2.6. Verify
- [ ] Tất cả currency display dùng `formatCurrency()` + `CURRENCY_SYMBOL`
- [ ] Tất cả currency input dùng `CurrencyInput`
- [ ] Số lượng vẫn dùng `type="number"`
- [ ] Build pass: `npm run build`

## Files to Modify
- `components/contracts/form/ContractFinancialSummary.tsx`
- `components/contracts/form/modals/ServiceItemForm.tsx`
- `components/contracts/form/modals/AddonItemForm.tsx`
- `components/contracts/form/modals/CreateServiceModal.tsx`
- `components/contracts/detail/payment-receipt-form.tsx`

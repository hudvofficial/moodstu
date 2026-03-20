# Plan: Currency Input Đồng Bộ Token
Created: 2026-03-20 13:08
Status: 🟡 Planning

## Context
- Lesson #75: V2 đồng bộ là ưu tiên #1
- Phát hiện: Tất cả currency INPUT đang dùng `type="number"` → hiện số thô (5000000)
- Trong khi mọi currency OUTPUT đều dùng `formatCurrency()` + `CURRENCY_SYMBOL` → 5.000.000 VNĐ
- Thêm: `payment-receipt-form.tsx` dùng `Intl.NumberFormat` + `đ` thay vì token SSOT

## Nguyên tắc
- **Đồng bộ visual > tiện lợi kỹ thuật**
- Mọi hiển thị tiền tệ phải qua `formatCurrency()` + `CURRENCY_SYMBOL`
- Input tiền tệ phải format giống output

## Giải pháp
Tạo shared `CurrencyInput` component:
- `type="text"` (không phải `number`)
- Display: `5.000.000` (format vi-VN)
- Internal: strip dots khi onChange → trả số thô cho state
- Suffix: `VNĐ` dùng `CURRENCY_SYMBOL` token
- Hoạt động: user gõ số → auto format khi blur/focus out

## Phase Overview

| Phase | Name | Status | Priority |
|-------|------|--------|----------|
| 01 | Tạo CurrencyInput component | ⬜ Pending | 🔴 Critical |
| 02 | Replace tất cả type="number" tiền tệ | ⬜ Pending | 🔴 Critical |

---

## Scope: 12 chỗ type="number" trong contract module

### Cần đổi → CurrencyInput (tiền tệ):
1. `ContractFinancialSummary.tsx` L80 — discount input
2. `ServiceItemForm.tsx` L129 — editPrice (đơn giá)
3. `ServiceItemForm.tsx` L132 — editDiscount (giảm)
4. `AddonItemForm.tsx` L110 — price
5. `AddonItemForm.tsx` L114 — discount
6. `CreateServiceModal.tsx` L89 — price
7. `payment-receipt-form.tsx` L173 — amount

### KHÔNG đổi (số lượng, KHÔNG phải tiền):
8. `ServiceItemForm.tsx` L126 — editQty (số lượng)
9. `AddonItemForm.tsx` L106 — qty (số lượng)
10. `printing-order-form.tsx` L187 — quantity
11. `printing-order-form.tsx` L194 — quantity
12. `inventory-reservation-form.tsx` L214 — quantity

### Bonus fix (vi phạm SSOT):
- `payment-receipt-form.tsx` L184: `Intl.NumberFormat("vi-VN").format()` + `đ` → `formatCurrency()` + `CURRENCY_SYMBOL`
- `payment-receipt-form.tsx` L208: tương tự

# Phase 06: Form UI — Payment + Financial Summary
Status: ✅ Complete
Dependencies: Phase 03 (Hooks ready), Phase 05 (Items section) ✅

## Objective
Payment form (CREATE only) + Financial summary (always visible).
Port V1 ContractPaymentSection (80 lines) + financials display.

## Components

### 6.1. `ContractFinancialSummary.tsx` (~120 lines)
Always-visible financial overview

**Display:**
- [ ] Subtotal (sum of items) — `.text-body` + `<CurrencyInput>` display mode
- [ ] Discount input — `<CurrencyInput>` editable
- [ ] Total amount (subtotal - discount) — `.text-amount` bold
- [ ] Paid amount (read-only on edit) — `.text-body`
- [ ] Remaining amount — `.text-amount` + color (green if 0, amber if > 0)

**Layout:**
- Card wrapper: `.card-base` with padding
- 2-column grid on desktop, stacked on mobile
- Separator between subtotal/discount and total

### 6.2. `ContractPaymentSection.tsx` (~120 lines)
**CREATE only** — hidden on edit mode (lesson from V1)

**Fields:**
- [ ] Payment amount — `<CurrencyInput>` (default = deposit or full)
- [ ] Payment method — Select (`tien_mat` | `chuyen_khoan`)
- [ ] Payment stage — Select ("Đặt cọc", "Thanh toán đợt 1", etc.)
- [ ] Notes — textarea (optional)

**Behavior:**
- [ ] Show only when `mode === 'create'`
- [ ] Payment method → auto-sync payment_status:
  - amount == 0 → `chua_thanh_toan`
  - amount < total → `da_coc` or `thanh_toan_mot_phan`
  - amount >= total → `da_thanh_toan`
- [ ] Validate: amount >= 0, amount <= totalAmount

### 6.3. Financial Logic (in hook, NOT in component)
All calculations in `useContractFinancials`:
- [ ] `subtotal = items.reduce((sum, item) => sum + item.total_amount, 0)`
- [ ] `total = subtotal - discount`
- [ ] `remaining = total - paidAmount`
- [ ] `paymentStatus` derived from amounts

## Constraints
- Financial calculations: hook only (NOT component)
- Currency display: toLocaleString('vi-VN') (lesson #40)
- NO client-side financial persistence — server is SSOT (lesson #8)
- Payment section HIDDEN on edit (V1-proven UX)

## Files to Create
- `components/contracts/form/ContractFinancialSummary.tsx`
- `components/contracts/form/ContractPaymentSection.tsx`

## Test Criteria
- [ ] Subtotal updates when items change
- [ ] Discount validation (cannot exceed subtotal)
- [ ] Total = subtotal - discount
- [ ] Payment status auto-syncs
- [ ] Payment section hidden on edit mode
- [ ] Currency formatting correct (vi-VN)
- [ ] Remaining amount shows correct color

---
Next Phase: → phase-07-form-shell.md

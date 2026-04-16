# Phase 02: DebtFormModal Upgrade — Toggle Trả Góp

Status: ⬜ Pending
Dependencies: Phase 01 (DB Migration)

## Objective

Nâng cấp `debt-form-modal.tsx` từ form đơn giản → form 2 mode (Khoản thường + Trả góp) như V1, nhưng dùng V2 Design System hoàn toàn.

## Tính năng cần thêm

### Mode Toggle (V2 tab-pill style)
- [ ] Tab-pill "Khoản thường" / "Trả góp" thay cho V1 raw button
- [ ] State `isInstallment` toggle giữa 2 mode

### Section Trả Góp (khi bật mode Trả góp)
- [ ] **Chọn sàn TMĐT**: SimpleSelect với options (Shopee SpayLater, Kredivo, MoMo, Home Credit, FE Credit, Tiki, Lazada, Khác)
- [ ] **Liên kết thẻ tín dụng**: SimpleSelect fetch từ `credit_cards` table → hiển thị `bank_name ****last_4 (sao kê ngày X)`
- [ ] **Số kỳ trả góp**: Preset chips (3/6/9/12/18/24) + input tùy chỉnh
- [ ] **Số tiền mỗi kỳ**: CurrencyInput
- [ ] **Auto-calc tổng tiền**: Hiển thị card tổng = số kỳ × tiền/kỳ (V2 card-base style)
- [ ] Clear installment fields khi switch về "Khoản thường"

### Giữ nguyên section Common (V2 đã có)
- entity_name, entity_type, type (Thu/Trả), amount, due_date, notes

## Files to Modify

- `components/finance/debts/debt-form-modal.tsx` — Refactor lớn
- `app/actions/finance-operations-queries.ts` — Thêm `fetchCreditCards()` (nếu chưa có)

## V2 Components sử dụng

| Component | Thay cho V1 |
|-----------|-------------|
| `tab-pill` CSS class | raw button toggle |
| `SimpleSelect` | raw `<select>` |
| `CurrencyInput` | raw CurrencyInput |
| `card-base` | raw div bg-indigo-50 |
| `Button` | raw `<button>` |

## Test Criteria

- [ ] Toggle Khoản thường ↔ Trả góp — smooth, clear fields khi switch
- [ ] Chọn sàn + thẻ TD + preset kỳ → auto-calc tổng tiền
- [ ] Submit trả góp → row mới trong `debts` với installment_* fields filled
- [ ] Submit khoản thường → installment fields = NULL

---
Next Phase: [phase-03](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/plans/260416-0655-debts-v2-upgrade/phase-03-toolbar.md)

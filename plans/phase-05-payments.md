# Phase 05: Payments

**Status:** ⬜ Pending
**Dependencies:** Phase 04
**Est.:** 1 day

## Objective

Phiếu thu liên kết HĐ. Theo dõi công nợ (đã trả / còn nợ). Nhắc thanh toán khi đến milestone.

## Implementation Steps

### Server Actions
- [ ] `getPaymentsByContract()` — danh sách phiếu thu theo HĐ
- [ ] `createPayment()` — tạo phiếu thu (liên kết HĐ)
- [ ] `deletePayment()` — huỷ phiếu thu (soft delete + audit)
- [ ] `getDebtSummary()` — tổng công nợ theo khách
- [ ] `getPaymentReminders()` — HĐ sắp đến hạn thanh toán

### UI Components
- [ ] Payment list (trong contract detail tab)
- [ ] Create payment modal (UnifiedModal)
  - Số tiền (CurrencyInput)
  - Phương thức: Tiền mặt / Chuyển khoản
  - Ghi chú
  - Ngày thu
- [ ] Debt summary card (trong contract detail)
  - Tổng HĐ | Đã thanh toán | Còn nợ (progress bar)
- [ ] Payment reminders list (dashboard widget)
- [ ] Print receipt (đơn giản, nút in)

### Business Logic
- [ ] Auto tính: còn nợ = tổng HĐ - Σ phiếu thu
- [ ] Auto chuyển status HĐ khi thanh toán đủ → "payment_complete"
- [ ] Validation: phiếu thu không vượt quá còn nợ
- [ ] Payment milestones: cọc (30-50%) → trước chụp → sau giao

### Patterns Applied
- [ ] CurrencyInput component
- [ ] Atomic transaction (tạo phiếu thu + cập nhật HĐ status)
- [ ] SWR cache invalidation: payments + contracts tags
- [ ] useRealtime: live payment updates

## Test Criteria
- [ ] Tạo phiếu thu → công nợ giảm đúng
- [ ] Thanh toán đủ → HĐ tự chuyển status
- [ ] Không cho tạo phiếu thu vượt quá còn nợ
- [ ] In phiếu thu đơn giản

---
**Next Phase:** → Phase 06 (Inventory)

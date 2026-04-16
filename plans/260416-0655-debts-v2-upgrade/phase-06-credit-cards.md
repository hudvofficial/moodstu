# Phase 06: Credit Card Management (CRUD UI)

Status: ⬜ Pending
Dependencies: Phase 01

## Objective

Tạo giao diện quản lý Thẻ Tín Dụng. Backend CRUD đã có sẵn trong `debt-actions.ts`. Chỉ cần UI.

## Vị trí UI

**Option A (Recommended):** Sub-section ngay trong trang `/finance/debts` — hiện dưới dạng collapsible panel hoặc tab "Thẻ TD"
**Option B:** Trang riêng `/finance/debts/credit-cards` (nếu quá phức tạp)

> Quyết định: **User duyệt khi tới phase này**

## Tính năng

### Danh sách thẻ
- [ ] Hiển thị: bank_name, last_4 (masked ****1234), statement_day, due_day, credit_limit
- [ ] V2 style: card-base compact

### Thêm / Sửa thẻ (Modal)
- [ ] Fields: bank_name*, card_label, last_4, statement_day* (1-31), due_day* (1-31), due_next_month (toggle), credit_limit
- [ ] V2 UnifiedModal + Input + SimpleSelect
- [ ] Gọi `createCreditCard` / `updateCreditCard` actions (đã có sẵn)

### Xóa thẻ
- [ ] Confirm dialog
- [ ] Gọi `deleteCreditCard` action (đã có sẵn)
- [ ] Kiểm tra: nếu có debts liên kết → cảnh báo trước khi xóa

## Files to Create

- `components/finance/debts/credit-card-list.tsx` — **[NEW]**
- `components/finance/debts/credit-card-modal.tsx` — **[NEW]**

## Test Criteria

- [ ] CRUD thẻ tín dụng: tạo, sửa, xóa thành công
- [ ] Thẻ mới xuất hiện trong dropdown của DebtFormModal (Phase 02)
- [ ] Xóa thẻ đang liên kết debt → cảnh báo

---
Hoàn thành toàn bộ 6 phases = Debts V2 đạt parity V1 + tối ưu V2!

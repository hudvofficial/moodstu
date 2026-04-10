# Phase 02: Đồng bộ Detail Drawer (DataRow)
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tiêu chuẩn hóa hoàn toàn giao diện ReadOnly của Lead & Customer Detail Drawer bằng `DataRow`.

## Requirements
### Functional
- [x] Cắt bỏ dải Grid 2 cột tự chế cồng kềnh trong Drawer hiện tại.
- [x] Refactor mọi thông tin (SĐT, Email, Nguồn, Ngày hẹn...) thành list `DataRow`. Label bên trái màu nhạt, Value bên phải màu đậm căn lề phải.
- [x] Trả Badge "Tiềm năng" hoặc "Điểm" hiển thị bằng DataRow thay vì nhồi lên cạnh Tên (H1).

## Implementation Steps
1. [x] Import `DataRow` và áp dụng thay 100% thay cho lưới Grid của `lead-detail-drawer.tsx`.
2. [x] Làm tương tự với `customer-detail-drawer.tsx`.

## Files to Create/Modify
- `components/crm/lead-detail-drawer.tsx`
- `components/crm/customer-detail-drawer.tsx`

## Test Criteria
- [ ] Giao diện Drawer nhìn đúng chuẩn Apple Settings app, siêu gọn gàng.

---
Next Phase: `/code phase-03`

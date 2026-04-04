# Phase 02: Develop PrintingGroupDrawer UI

Status: ✅ Complete
Dependencies: Phase 01

## Objective

Xây dựng Component `PrintingGroupDrawer` mới cứng theo layout chuẩn hệ thống (Side Panel Desktop / Bottom Sheet Mobile).

## Requirements

### Functional

- [x] Hỗ trợ nhận params là 1 cục `ContractGroup` chứa nhiều orders.
- [x] Render UI Header: Mã hợp đồng, Khách hàng.
- [x] Render Body: Danh sách các đơn in con (Giống các thẻ `OrderRow` hay card đơn in riêng biệt)

## Implementation Steps

1. [x] Tạo file mới `components/printing/printing-group-drawer.tsx`.
2. [x] Thiết kế Layout dùng `<Drawer>`: Setup kích thước sidepanel khoảng 600-650px.
3. [x] Loop và render các `order` bên trong group.
4. [x] Móc nối nút bấm Edit trên OrderCard con đến sự kiện mở `PrintingDetailDrawer` (nếu cần).

## Files to Create/Modify

- `components/printing/printing-group-drawer.tsx` (NEW) - Trái tim của giao diện hiển thị group.

---

Next Phase: Phase 03 - State Wiring & Integration

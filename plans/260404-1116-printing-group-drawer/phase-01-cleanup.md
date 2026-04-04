# Phase 01: Accordion Cleanup (Desktop & Mobile)

Status: ✅ Complete
Dependencies: None

## Objective

Gỡ bỏ hoàn toàn logic Expand/Collapse (Accordion) lôi thôi ở màn hình danh sách Đơn In. Biến các Dòng/Thẻ thành dữ liệu cấp 1 gọn gàng, sẵn sàng cho việc click mở Drawer.

## Requirements

### Functional

- [x] Bỏ icon mũi tên (Chevron) xổ xuống trên Desktop.
- [x] Xoá bỏ render các dòng con `OrderRow` bên trong Table Desktop.
- [x] Bỏ mảng render lồng tại Mobile Card nội bộ.

### Non-Functional

- [x] Clean code: Dọn dẹp hết state `expanded` vô dụng.

## Implementation Steps

1. [x] Sửa `components/printing/printing-table.tsx`: Chuyển `<ContractGroupRows>` thành thẻ `<TR>` độc lập có thể click. Loại bỏ truyền state `expanded`.
2. [x] Sửa `components/printing/printing-mobile-grouped.tsx`: Cắt bỏ phần map list order con. Chỉ render vỏ nhóm hợp đồng (Số lượng đơn, tổng tiền, label trạng thái chung).

## Files to Create/Modify

- `components/printing/printing-table.tsx` - Xoá bỏ accordion logic.
- `components/printing/printing-mobile-grouped.tsx` - Clean up UI card.

---

Next Phase: Phase 02 - Develop PrintingGroupDrawer UI

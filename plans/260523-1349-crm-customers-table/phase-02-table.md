# Phase 02: Customers Table Component
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Xây dựng component `CustomersTable` hiển thị dữ liệu dạng bảng, hỗ trợ actions và tối ưu re-render.

## Requirements
### Functional
- [ ] Bảng hiển thị: Mã KH, Avatar + Tên + SĐT, Phân loại/Tags, Nguồn (Source Badge), Ngày tạo.
- [ ] Cột Thao tác (Actions) có Dropdown menu: Sửa, Xóa.
- [ ] Row hover effect và highlight khi click.
- [ ] Click vào row sẽ trigger sự kiện `onView` (để mở Drawer).

### Non-Functional
- [ ] Responsive: Đảm bảo có thể cuộn ngang trên mobile nếu cần.
- [ ] Tái sử dụng UI components từ `@/components/ui/table`.

## Implementation Steps
1. [ ] Implement `CustomersTable` nhận vào props `customers`, `onView`, `onEdit`, `onDelete`.
2. [ ] Map các cột dữ liệu theo `Customer` interface.
3. [ ] Xử lý hiển thị trạng thái bằng `Badge` cho `Source` và `Tags`.
4. [ ] Xử lý Avatar fallback.

## Files to Create/Modify
- `components/crm/customers-table.tsx` - Component chính hiển thị bảng.

---
Next Phase: Phase 03 - Customer Drawer

# Phase 04: Integration (List Client)
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Tích hợp `CustomersTable` và `CustomerDrawer` vào trang danh sách, thay thế hoàn toàn cấu trúc Card cũ. Đảm bảo luồng dữ liệu mượt mà, SWR cache hoạt động đúng.

## Requirements
### Functional
- [ ] Render `CustomersTable` thay thế cho list các `CustomerCard`.
- [ ] Đặt trạng thái `selectedCustomer` và đóng/mở Drawer.
- [ ] Chỉnh sửa hàm `handleRowClick` để set `selectedCustomer` thay vì `router.push`.
- [ ] Đảm bảo các widget và filter hiện tại tiếp tục hoạt động.

### Non-Functional
- [ ] Giữ nguyên các thao tác logic như xoá khách hàng.
- [ ] Tối ưu re-render khi mở Drawer.

## Implementation Steps
1. [ ] Cập nhật `customer-list-client.tsx` (từ `customer-list-page.tsx`).
2. [ ] Khai báo state `selectedCustomerId` và `selectedCustomerFallback` (pattern giống ContractsListClient).
3. [ ] Pass data `customers` xuống `CustomersTable`.
4. [ ] Pass `selectedCustomer` xuống `CustomerDrawer`.
5. [ ] Wire các event `onView`, `onEdit` từ bảng/ngăn kéo sang logic state nội bộ.
6. [ ] Cập nhật UI loading.

## Files to Create/Modify
- `components/crm/customer-list-client.tsx` - Ghép nối tất cả.
- `app/(protected)/crm/customers/page.tsx` - Verify.

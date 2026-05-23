# Phase 01: Setup & Refactoring
Status: ⬜ Pending
Dependencies: None

## Objective
Chuẩn bị các component khung, dọn dẹp các thành phần không cần thiết và chuẩn bị type data mapping cho UI mới (giống cấu trúc ContractsListClient).

## Requirements
### Functional
- [ ] Phân tích cấu trúc thư mục hiện tại của module `crm`.
- [ ] Tách `CustomerListPage` hiện tại thành `CustomerListClient` để quản lý State Table + Drawer.
- [ ] Giữ lại các hook SWR và Server Actions hiện có.

### Non-Functional
- [ ] Code structure: Tuân thủ cấu trúc của `/contracts`.

## Implementation Steps
1. [ ] Đổi tên và refactor cấu trúc `customer-list-page.tsx` thành `customer-list-client.tsx`.
2. [ ] Tạo file rỗng cho `customers-table.tsx` và `customer-drawer.tsx`.
3. [ ] Cập nhật `app/(protected)/crm/customers/page.tsx` để import `CustomerListClient` thay vì `CustomerListPage`.

## Files to Create/Modify
- `app/(protected)/crm/customers/page.tsx` - Sửa import.
- `components/crm/customer-list-client.tsx` - Component cha (chuyển đổi từ `customer-list-page.tsx`).
- `components/crm/customers-table.tsx` - Scaffold.
- `components/crm/customer-drawer.tsx` - Scaffold.

---
Next Phase: Phase 02 - Customers Table

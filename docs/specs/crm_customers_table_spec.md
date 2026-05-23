# Detailed Specification: CRM Customers Table Optimization

## 1. Executive Summary
Nâng cấp giao diện hiển thị danh sách khách hàng tại route `/crm/customers` bằng cách sử dụng mô hình Data Table và Drawer thay vì Card. Điều này mang lại trải nghiệm giống với module `/contracts`, tối ưu hóa việc quản lý dữ liệu số lượng lớn.

## 2. User Stories
- Là một Telesales, tôi muốn xem được 10-20 khách hàng trên một màn hình máy tính để thao tác nhanh hơn (Card hiện tại quá to).
- Là một Admin, tôi muốn nhấp vào tên một khách hàng để xem chi tiết thông tin (SĐT, ghi chú, lịch sử) ngay lập tức qua một ngăn kéo trượt, không phải chờ tải một trang web mới.
- Là một người dùng, tôi muốn bấm Sửa/Xóa khách hàng nhanh qua menu con trên từng dòng của bảng.

## 3. Logic Flowchart

```mermaid
graph TD
    A[Truy cập /crm/customers] --> B[CustomerListClient fetch data qua SWR]
    B --> C{Dữ liệu tải xong?}
    C -->|Chưa| D[Hiển thị Skeleton/Loading]
    C -->|Xong| E[Render CustomersTable]
    E --> F{Hành động của User}
    F -->|Click Row| G[Mở CustomerDrawer]
    F -->|Click Thêm KH| H[Mở Modal Thêm KH]
    F -->|Click Sửa (Table/Drawer)| I[Mở Modal Sửa KH]
    G --> J[Xem chi tiết không chuyển trang]
```

## 4. UI Components Architecture
- **CustomerListClient**: Smart component, gọi SWR hooks, quản lý URL state (Filters, Pagination) và Local State (Drawer Open/Close).
- **CustomersTable**: Dumb component, nhận list `customers` và render HTML `<table>` với Tailwindcss class `min-w-full divide-y`.
- **CustomerDrawer**: Dumb component, dùng `Sheet` component từ UI lib, nhận prop `customer` để render layout lưới 2 cột các trường thông tin.

## 5. Technical Requirements
- Xóa bỏ `customer-list-page.tsx`.
- Refactor `CustomerCompactCard` ra khỏi logic render, có thể xoá nếu không dùng ở nơi khác.
- Đảm bảo responsive: Trên di động, Drawer mở full width.

## 6. Build Checklist
- [ ] Component Table
- [ ] Component Drawer
- [ ] State logic ở Client Component cha
- [ ] Verify SWR Realtime hoạt động

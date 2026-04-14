# Phase 02: Tích hợp vào Bảng Kê (Table Row Actions)
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Gắn Modal mới tạo vào cột thao tác, thay thế hành vi chuyển trang cũ.

## Requirements
- Click icon "Eye" (Xem) sẽ bật cục State chứa ID, từ đó kích hoạt Modal tải dữ liệu chi tiết phiếu thu.

## Implementation Steps
1. [x] Sửa `receipt-row-actions.tsx` (or `receipt-desktop-table.tsx` nếu Modal bọc bên ngoài mảng). Thường đặt `<ReceiptDetailModal>` bên cạnh danh sách Action.
2. [x] Inject state mở modal thông qua `useState(false)`.

## Files to Create/Modify
- `components/finance/receipts/receipt-row-actions.tsx` - [MODIFY] Thêm Trigger Mở Modal

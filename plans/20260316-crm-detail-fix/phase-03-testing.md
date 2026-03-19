# Phase 03: Final Testing

## Objective
Kiểm thử toàn diện các kịch bản người dùng để đảm bảo không còn lỗi "tàng hình".

## Test Cases
1. [ ] **Direct Access**: Copy một ID bất kỳ của Lead cũ, dán vào URL `?id=...` -> Trang web phải hiện Panel Chi tiết ngay lập tức sau khi load xong.
2. [ ] **Pagination Sync**: Sang trang 2, 3 của Lead, click vào một người -> Panel hiển thị đúng thông tin người đó.
3. [ ] **Mobile Touch**: Click vào tên Lead trên mobile (card view) -> Chạy thẳng vào trang `/crm/leads/[id]` (Page view) thay vì Panel.
4. [ ] **Close & Open**: Mở detail -> Đóng -> Mở người khác -> Dữ liệu phải cập nhật mới (không bị dính dữ liệu cũ).

## Verification
- Kiểm tra Console log không có lỗi đỏ.
- Kiểm tra Network tab: Chỉ gọi API khi thực sự cần (không gọi thừa).

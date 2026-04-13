# Phase 01: Chuẩn hóa Tokens & Stats Container
Status: ⬜ Pending

## Objective
Xóa sổ inline pixel trong CSS, gom Filters và Thống kê thành một Card hoàn chỉnh tuân thủ 100% token hệ thống.

## Implementation Steps
1. [ ] Cập nhật `app/styles/select.css` để loại bỏ px cứng, áp dụng token `h-8 px-3 gap-1`.
2. [ ] Tạo `finance-stats-container.tsx` bọc `FinanceFilters` và `StatsBar`.
3. [ ] Layout `finance-stats-container`: Trái là tiêu đề, Phải là Filters. Phía dưới là `StatsBar`.
4. [ ] Xóa `finance-compact-bar.tsx` cũ nếu đã gộp xong.
5. [ ] Cập nhật root `finance-dashboard-client.tsx` để hiển thị Card mới thay vì thả nổi.

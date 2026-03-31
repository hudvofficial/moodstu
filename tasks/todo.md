# Plan: Refactoring Quote Modal SSOT
Status: 🟡 In Progress
Created: 2026-03-31

## Triệu chứng
Màn hình Báo Giá (`quote-modal.tsx`) bị nhũn inline, vi phạm quy định cấm `uppercase`, cấm `tracking: 0.03em+` và gán cứng màu Giá Tiền sai tương phản.

## Phases

| Phase | Name | Mục tiêu | Lịch trình |
|---|---|---|---|
| **Phase 01** | **Thanh lọc Typography & Inline Styles** | Gỡ bỏ toàn bộ `.tracking-widest`, `.uppercase`, JS inline `style={maxWidth}` và các class Tailwind viết cứng trong DOM. | 5 phút |
| **Phase 02** | **Xây chuẩn Design System (CSS)** | Tạo các class chuẩn SSOT trong `app/styles/components.css` (`.quote-card`, `.quote-header`, v.v.) và map đúng Design Tokens. Cân bằng chữ Giá Tiền. | 10 phút |
| **Phase 03** | **Kiểm định (Verify)** | Xác nhận visual Modal không sai lệch, test compact/full mode. | 5 phút |

## Checklist Thực thi
- [ ] Gỡ bỏ toàn bộ vi phạm Uppercase & Tracking.
- [ ] Dọn JS `style={{ maxWidth... }}` sang CSS utilities.
- [ ] Rời styles của Header, Title, Subtitle, Price vào `components.css`.
- [ ] Chỉnh contrast màu Giá Tiền hợp lý (Bỏ amber-100, thay bằng biến hợp lý tùy theo màu Header).
- [ ] Mở Browser UI chụp Screenshot check visual lại.

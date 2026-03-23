@[/debug] Chuẩn hóa spacing header → content mobile (lấy /contracts làm chuẩn)

## Bối cảnh

Sau refactor header (FullpageFormShell → HeaderSlotsContext), khoảng cách từ header xuống content KHÔNG thống nhất giữa các trang mobile. 

**CHUẨN: /contracts** — khoảng cách header → CompactStats card trên trang này là chuẩn. Tất cả trang khác phải khớp spacing này.

## Trang cần audit (mobile 375px)

| # | Trang | Loại | Content đầu tiên |
|---|---|---|---|
| 1 | /dashboard | Mặc định | Grid modules |
| 2 | /contracts | Mặc định | CompactStats card |
| 3 | /contracts/[id] | HeaderSlots | Info card |
| 4 | /contracts/[id]/gallery | HeaderSlots | Gallery grid |
| 5 | /contracts/create | FormPage | Section "1. Thông tin HĐ" |

## Files liên quan đến spacing

1. **components/layout/app-shell.tsx** — L93-101: main padding logic (khác nhau cho fullpage / formPage / mặc định)
2. **app/styles/globals.css** — `.main-container` class (padding chung)
3. Mỗi page component — có thể có pt/mt riêng

## Yêu cầu

1. Mở browser 375px lần lượt 5 trang — **screenshot header + content đầu tiên** cho mỗi trang
2. Đo pixel khoảng cách header bottom → content top cho mỗi trang
3. So sánh → xác định trang nào sai, trang nào đúng
4. Đề xuất 1 giá trị spacing chuẩn cho TẤT CẢ trang mobile
5. Xác định fix ở đâu: app-shell.tsx padding? .main-container? hay từng page?
6. **Chờ anh duyệt plan** trước khi fix

## Tiêu chuẩn thiết kế

- **SSOT BẮT BUỘC**: Spacing header → content PHẢI là 1 CSS variable (token) trong globals.css, ví dụ `--spacing-header-gap`. Tất cả trang tham chiếu cùng 1 biến — KHÔNG hardcode `pt-3`, `pt-4` rải rác
- Apple HIG: header → content gap thường 8-12px (compact) hoặc 16px (standard)
- Hiện tại Mood Studio dùng spacing scale: 4-8-12-16-24-32
- Đo gap từ /contracts (chuẩn) → tạo token → áp dụng cho tất cả trang qua `app-shell.tsx`

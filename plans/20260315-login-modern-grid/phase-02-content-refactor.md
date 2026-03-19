# Phase 02: Content Structural Refactor
Status: ⬜ Pending

## Objective
Viết lại cấu trúc các thành phần bên trong Form (Header, Input, Buttons) để loại bỏ hoàn toàn lỗi xếp dọc chữ.

## Requirements
- [ ] Tiêu đề h1, h2, p không được dùng `whitespace-nowrap` mà dùng cấu trúc `block w-full`.
- [ ] Nút Đăng nhập phải giữ được hình chữ nhật bo góc, không bị bóp thành hình tròn.

## Implementation Steps
1. [ ] Cấu trúc lại `<header>`: Đảm bảo logo và text nằm trong các container `block`.
2. [ ] Sửa lại nhóm Tiêu đề chào mừng: Dùng `text-center w-full block`.
3. [ ] Kiểm tra lại `Input` component: Đảm bảo không bị `flex-shrink` làm cho co lại về 0.
4. [ ] Cố định chiều cao cho nút Đăng nhập (`h-12`) và ép chiều ngang `w-full`.

## Files to Modify
- `app/login/page.tsx`
- `components/ui/input.tsx` (kiểm tra lại)

## Test Criteria
- [ ] Chữ "Chào mừng trở lại" và "Mood Studio" hiển thị trên một hàng (hoặc xuống hàng tự nhiên), không bị xếp dọc từng chữ.
- [ ] Các icon Mail, Lock nằm đúng vị trí.

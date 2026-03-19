# Phase 04: Smart Username Logic
Status: ⬜ Pending

## Objective
Cho phép người dùng đăng nhập chỉ bằng "Tên người dùng" (username) thay vì phải gõ đầy đủ email có đuôi `@moodstudio.com`.

## Requirements
- [ ] Tự động nối thêm chuỗi `@moodwedding.com` vào sau tên đăng nhập nếu người dùng không nhập ký tự `@`.
- [ ] Giữ nguyên nếu người dùng nhập email của các domain khác (gmail, yahoo...).
- [ ] Cập nhật UI Placeholder để hướng dẫn người dùng.

## Implementation Steps
1. [ ] Sửa file `app/actions/auth.ts`: Trong hàm `login`, kiểm tra field `email`. Nếu `!email.includes('@')`, thực hiện `email = `${email}@moodwedding.com``.
2. [ ] Sửa file `app/login/page.tsx`: Cập nhật `placeholder` của ô Email thành "Tên đăng nhập hoặc Email".
3. [ ] Test với account `admin` (thay vì `admin@moodstudio.com`).

## Files to Modify
- `app/actions/auth.ts`
- `app/login/page.tsx`

## Test Criteria
- [ ] Gõ `admin`, mật khẩu `12345678` -> Đăng nhập thành công.
- [ ] Gõ `admin@moodstudio.com`, mật khẩu `12345678` -> Đăng nhập thành công (không bị nhân đôi đuôi).

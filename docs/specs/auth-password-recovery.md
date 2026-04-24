# Auth Password Recovery

## Mục tiêu nghiệp vụ

- Cho phép nhân sự tự khôi phục mật khẩu mà không cần nhắn Zalo cho quản trị viên.
- Hỗ trợ cả `username` nội bộ và `email`, giống logic đăng nhập hiện tại.
- Không lộ thông tin tài khoản có tồn tại hay không.
- Xử lý rõ các trạng thái thường gặp ở production: link hết hạn, link đã dùng, nhập sai mật khẩu xác nhận, mật khẩu yếu.

## Chính sách UX + bảo mật

- Form `Quên mật khẩu?` luôn trả về thông điệp generic khi gửi mail thành công.
- `username` được tự chuẩn hóa thành `@moodwedding.com`.
- `next` ở recovery confirm route chỉ chấp nhận relative path để chặn open redirect.
- Mật khẩu mới yêu cầu:
  - tối thiểu 8 ký tự
  - có ít nhất 1 chữ cái
  - có ít nhất 1 chữ số
- Sau khi đổi mật khẩu thành công, user bị sign out và phải đăng nhập lại.

## Flow đã triển khai

### 1. Request reset

- Route: `/forgot-password`
- Action: `app/actions/password-recovery.ts`
- Input: `identifier` (`username` hoặc `email`)
- Kết quả:
  - Validate server-side
  - Gọi `supabase.auth.resetPasswordForEmail(...)`
  - Redirect mặc định của email đưa user về `/reset-password?flow=recovery`

### 2. Recovery confirm

- Route: `/auth/confirm`
- Mục đích:
  - Nhận `token_hash`
  - Verify OTP bằng server client
  - Redirect sạch sang `next`
- Guard:
  - sanitize `next`
  - redirect lỗi sang `/reset-password?error=invalid_or_expired_link`

### 3. Set new password

- Route: `/reset-password`
- Hỗ trợ 2 mode:
  - fallback cho default Supabase reset email bằng cách đọc `code` hoặc hash tokens ở client
  - mode production tối ưu qua `/auth/confirm`
- Kết quả:
  - bootstrap recovery session
  - validate password mới
  - gọi `supabase.auth.updateUser({ password })`
  - sign out
  - quay về `/login?reset=success`

## Cấu hình production bắt buộc trong Supabase

### Redirect URLs

Production domain đã chốt:

- `https://stu.moodwedding.com`

Trong Supabase Auth, cần whitelist đầy đủ domain production:

- `https://stu.moodwedding.com/reset-password`
- `https://stu.moodwedding.com/auth/confirm`
- `https://stu.moodwedding.com/login`

Nếu có staging:

- `https://staging-stu.moodwedding.com/reset-password`
- `https://staging-stu.moodwedding.com/auth/confirm`

### Email template

Flow hiện tại vẫn chạy với template reset mặc định của Supabase nhờ fallback trên `/reset-password`.

Tuy nhiên, để có flow SSR sạch hơn ở production, nên chỉnh template reset password để link đi qua:

- base URL từ `RedirectTo`
- route `/auth/confirm`
- kèm `token_hash`
- `type=recovery`
- `next=/reset-password?flow=recovery`

Mục tiêu của bước này là để app tự verify recovery token ở server trước khi user vào màn hình đổi mật khẩu.

### SMTP

- Không nên dùng mail service mặc định của Supabase cho production volume thật.
- Cần cấu hình SMTP riêng để:
  - tăng deliverability
  - giảm mail vào Spam
  - kiểm soát domain gửi mail

## Biến môi trường

Repo đã thêm fallback:

- `NEXT_PUBLIC_SITE_URL`

Production value:

- `NEXT_PUBLIC_SITE_URL=https://stu.moodwedding.com`

Nếu dùng Google Calendar OAuth ở production:

- `GOOGLE_REDIRECT_URI=https://stu.moodwedding.com/api/auth/google/callback`

Khuyến nghị set các biến này ở production để phòng trường hợp forwarded headers không có đủ thông tin host/protocol.

## QA checklist

- Nhập `username` nội bộ và nhận mail reset đúng.
- Nhập email hợp lệ và nhận mail reset đúng.
- Nhập email không tồn tại vẫn nhận thông điệp generic.
- Link hết hạn hiển thị trạng thái lỗi rõ ràng.
- Mật khẩu không đủ chuẩn bị chặn ở client trước khi submit.
- Đổi mật khẩu xong bị sign out và đăng nhập lại được bằng mật khẩu mới.

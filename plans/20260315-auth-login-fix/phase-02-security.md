# Phase 02: Database & Security

## Objective
Chuyển logic Rate Limiting từ bộ nhớ máy chủ (In-memory) vào Database để đảm bảo an toàn và tạo tài khoản Admin để test.

## Implementation Steps
1. [ ] **SQL Migration:** Tạo table `login_attempts` trong Supabase để theo dõi các lần thử sai.
2. [ ] **Rate Limit Logic:** Cập nhật `app/actions/auth.ts` để đọc/ghi số lần thử vào DB.
3. [ ] **Admin Seeding:** Chạy SQL script tạo user `admin@moodstudio.vn` (Pass: `12345678`).

## Files to Modify/Create
- `supabase/migrations/[ts]_auth_monitoring.sql`
- `app/actions/auth.ts`

## Test Criteria
- [ ] Đăng nhập sai 5 lần sẽ bị khóa 60s (DB ghi nhận).
- [ ] Có thể đăng nhập thành công bằng tài khoản admin mẫu.

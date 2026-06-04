# Staging Supabase Setup — Hướng dẫn cho anh

> Để test RLS hardening cho Contracts (an toàn, không đụng production). Em không tự làm được phần này vì cần đăng nhập tài khoản anh + giữ secrets local máy anh.

## Bước 1 — Tạo project staging (~3 phút) — **PHẦN ANH LÀM**

1. Mở **https://supabase.com** → đăng nhập (GitHub/email — dùng tài khoản anh thường dùng cho mood-studio).
2. Bấm **New project**.
   - Organization: chọn org đang có (hoặc tạo free).
   - **Name:** `mood-studio-staging` (tên gợi nhớ, không quan trọng).
   - **Database password:** tự đặt 1 password mới và **lưu vào trình quản lý mật khẩu của anh** (KeePass / 1Password / browser). ⚠️ **KHÔNG dán vào chat.**
   - **Region:** `Southeast Asia (Singapore)` — gần VN, nhanh.
   - **Plan:** Free.
3. Bấm **Create new project** → đợi ~2 phút provision.
4. Khi xong, vào **Settings → General → Reference ID** (chuỗi dạng `xxxxxxxxxxxxxxxxxxxx`).
   - **Gửi em chỉ ref này** trong chat (ref **không nhạy cảm**, dùng để link CLI).
   - **KHÔNG gửi** DB password, anon key, service_role key qua chat.

## Bước 2 — Em cài Supabase CLI + link project — **EM LÀM (sau khi có ref)**

Khi anh gửi ref, em sẽ chạy:
```bash
npm install -g supabase    # cài CLI global
supabase --version          # xác nhận
```
Rồi báo anh chạy `supabase login` (mở browser, anh đăng nhập, CLI lưu token vào máy local). Sau đó em link:
```bash
cd "/c/Users/Admin/Desktop/Ai/mood saas/mood-studio"
supabase link --project-ref <REF_ANH_GỬI>
```
(CLI sẽ hỏi DB password — anh tự nhập, em không chạm.)

## Bước 3 — Push migrations + apply RLS — **EM LÀM**

Push toàn bộ migrations (gồm cả file RLS mới) lên staging:
```bash
supabase db push
```

## Bước 4 — Seed data test (tùy chọn — anh quyết)

3 lựa chọn để có data test:
- **A. Dump production → restore staging** (an toàn nhất nếu anh OK clone data — Supabase Dashboard có **Database → Backups → Restore to project**).
- **B. Seed tay vài hợp đồng test** qua app local trỏ vào staging (tạo 1 admin employee + vài hợp đồng giả).
- **C. Test RLS với DB rỗng** — vẫn xác minh được anon/disabled bị chặn, nhưng không test được "active đọc full".

Em nghĩ **B** đủ cho mục đích test RLS — anh tự tạo 1-2 hợp đồng test, không cần data thật.

## Bước 5 — Run RLS test SQL — **ANH chạy trong Supabase SQL Editor**

Mở **staging dashboard → SQL Editor** → mở file [`RLS-TEST-PLAN.sql`](./RLS-TEST-PLAN.sql) (ở repo) → chạy từng section (§0 → §6). Mỗi section có **expected** comment — nếu kết quả lệch dù chỉ 1 chỗ → **DỪNG**, đừng apply production.

## Bước 6 — App smoke với staging — **EM hướng dẫn**

Đổi `.env.local` trỏ `NEXT_PUBLIC_SUPABASE_URL` + keys sang staging (em hướng dẫn), `pnpm dev`, login, test thao tác CRUD đầy đủ. Nếu OK → mới apply lên production.

## Bước 7 — Apply production — **chỉ sau khi staging xanh**

Apply migration RLS lên production qua Supabase Dashboard (off-peak). Có sẵn lệnh rollback trong file migration.

---

## Bảo mật — quy tắc tuyệt đối
- **Project ref**: OK gửi qua chat.
- **DB password / anon key / service_role key / JWT secret**: ⚠️ **KHÔNG bao giờ** dán vào chat. Lưu local máy anh (`.env.local` + password manager).
- `.env.local` đã `.gitignore` — không bao giờ commit.
- Nếu lỡ lộ key → vào Supabase Dashboard → **Settings → API → Reset** key đó.

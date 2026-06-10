-- ═══════════════════════════════════════════════════════════
-- Thu hồi quyền bảng thừa của role `anon` — least privilege — 2026-06-10
-- ═══════════════════════════════════════════════════════════
-- Audit 2026-06-10 (probe-anon-access.mjs, request anon THẬT theo kỷ luật A12):
-- anon có ĐỦ 7 quyền (arwdDxt) trên 67 bảng public do default-privileges của
-- Supabase (bệnh A11). Hậu quả thực tế đo được:
--   • Rò rỉ THẬT (anon đọc ra rows): labs, lab_services, transaction_categories,
--     login_attempts (lộ email + thời điểm khóa), addon_history (đọc + GHI),
--     documents, promotions, work_shifts — do policy {public} qual=true.
--   • Mong manh (0 row hiện tại nhưng chỉ policy employee-role che): customers,
--     crm_leads, receipts, contracts... — 1 policy ẩu là lộ.
-- Đối chứng: dresses/services/studio_info đã REVOKE grant trước đó → anon nhận
--   42501 DÙ vẫn còn policy qual=true → khẳng định: REVOKE grant mới chắc,
--   policy không đủ (bài học A12/A16).
--
-- Rà code: KHÔNG route nào query DB bằng vai anon, TRỪ login (rate-limit
--   pre-auth qua SSR cookie-client = vai anon, app/actions/auth.ts:99-190).
--   Gallery public → createAdminClient (service role). Reset-password →
--   chỉ supabase.auth.* (không query bảng).
--
-- Fix: REVOKE ALL quyền bảng của anon + chặn default tương lai (role postgres
-- sở hữu bảng app) + re-grant DUY NHẤT login_attempts (SELECT/INSERT/UPDATE/
-- DELETE — không cần sequence vì id = gen_random_uuid()).
-- Fail-closed: revoke chỉ siết anon, không mở gì. authenticated KHÔNG đụng
-- (ngoài scope — realtime + app reads cần grant của authenticated).
-- ═══════════════════════════════════════════════════════════

-- 1. Thu hồi toàn bộ quyền bảng/view hiện có của anon trong public
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. Chặn bảng app tương lai (owner = postgres) tự cấp quyền cho anon
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;

-- 3. Re-grant nhu cầu anon hợp lệ DUY NHẤT: rate-limit đăng nhập (pre-auth)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_attempts TO anon;

-- Chống brute-force mật khẩu album (audit 20/07, mục M6).
-- verifyGalleryPassword là server action public không giới hạn — bảng này đếm
-- số lần sai theo gallery trong cửa sổ 15 phút; server chặn khi vượt ngưỡng.
-- Chỉ truy cập qua service-role (admin client) — khóa sạch anon/authenticated.

create table if not exists public.gallery_password_attempts (
  gallery_id uuid primary key references public.galleries(id) on delete cascade,
  window_start timestamptz not null default now(),
  fail_count integer not null default 0
);

alter table public.gallery_password_attempts enable row level security;

-- Supabase default privileges tự cấp quyền cho anon/authenticated trên object mới
-- (bài học supabase-anon-default-privileges-leak) — revoke tường minh, không policy nào cả.
revoke all on table public.gallery_password_attempts from anon, authenticated;

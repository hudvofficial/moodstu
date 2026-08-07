---
title: "Bảo mật dữ liệu — RLS, grant, vai trò DB"
tags: [nen-tang, bao-mat, du-lieu]
cap-nhat: 2026-08-07
---

# Bảo mật dữ liệu — RLS, grant, vai trò DB

## Điều dễ hiểu nhầm nhất

**RLS không phải lớp bảo vệ chính của app này.** Mọi server action dùng client **service role** → bỏ qua RLS hoàn toàn. Lớp bảo vệ thật là `requireXAccess()` ở tầng app ([[xac-thuc-phan-quyen]]).

RLS + grant chỉ quan trọng ở đúng hai chỗ:
1. Vai `anon` (khách chưa đăng nhập chạm được endpoint nào đó).
2. Vai `authenticated` khi **realtime** — client subscribe trực tiếp, RLS quyết định nghe được event nào.

## Hiện trạng (quét 2026-08-07)

98/98 bảng đã **bật RLS**. 9 bảng bật RLS nhưng **0 policy** → deny-all cho mọi vai trừ service role:

`gallery_albums` · `gallery_comments` · `gallery_password_attempts` · `gallery_reactions` · `lab_payment_allocations` · `lab_payments` · `salary_adjustments` · `service_bundles` · `system_settings`

Đúng chủ đích — các bảng này chỉ được chạm qua server action. **Đừng "sửa" bằng cách thêm policy** trừ khi có nhu cầu client-direct hoặc realtime thật.

Số policy từng bảng: xem cột trong `30-du-lieu/luoc-do-*.md`.

## Bài học lớn: GRANT thắng POLICY

Supabase **tự cấp đủ 7 quyền** cho `anon` + `authenticated` trên mọi object mới trong schema `public` (default privileges). `GRANT SELECT` chỉ **thêm**, không gỡ cái đã có.

Đo thật (2026-06-10, `scripts/probe-anon-access.mjs` — request anon thật): `anon` đọc ra rows ở `labs`, `lab_services`, `transaction_categories`, `login_attempts` (lộ email + trạng thái khoá), `addon_history` (**đọc và ghi được**), `documents`, `promotions`, `work_shifts`. Nguyên nhân: policy `qual = true` + còn grant.

Bằng chứng ngược: `dresses`/`services`/`studio_info` đã REVOKE grant → anon nhận `42501` **dù vẫn còn policy `qual=true`**.

→ Migration `20260610150000`: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon` + `ALTER DEFAULT PRIVILEGES … REVOKE ALL ON TABLES FROM anon` (chặn bảng tương lai) + cấp lại đúng 4 quyền cho `login_attempts`.

**Quy tắc:** `anon` = tối thiểu tuyệt đối. Chỉ grant bảng có route public **thật sự** chạy bằng vai anon — rà code xác nhận, đừng đoán. Gallery public dùng `createAdminClient` (service role) nên **không cần** grant anon.

## VIEW nguy hiểm hơn TABLE

View **không có RLS**. Grant là lớp bảo vệ duy nhất. View đơn (1 bảng, không aggregate) còn **auto-updatable** và chạy quyền owner → `authenticated` UPDATE/DELETE xuyên view = ghi thẳng vào bảng nguồn, bypass RLS.

Mọi view `*_public` phải: `REVOKE ALL FROM anon, authenticated;` **rồi mới** `GRANT SELECT TO authenticated;` Verify bằng `information_schema.role_table_grants`.

Hiện chỉ có 1 view: `payment_plan_states`.

## Policy gọi bảng bị REVOKE → 403, không phải rỗng

Policy viết `EXISTS (SELECT 1 FROM employees …)` mà `employees` đã REVOKE khỏi `authenticated` → subquery lỗi permission → **toàn bộ request 403**, không phải "200 + 0 dòng".

Cách đúng: hàm `public.is_active_employee()` **SECURITY DEFINER STABLE**, policy dùng `USING (public.is_active_employee())`.

**Phân biệt khi debug:** `403` = vấn đề grant/permission trong policy · `200 + rỗng` = RLS đang lọc đúng.

## Verify RLS phải bằng request thật

Kiểm `pg_policies` tồn tại là **chưa đủ** — đã lọt một lần vì thế. Phải test bằng request vai thật: browser network, hoặc `SET ROLE authenticated` + `set_config('request.jwt.claim.sub', …)`.

Script sẵn có: `scripts/probe-anon-access.mjs`, `scripts/verify-realtime-signals.mjs`, `npm run verify:privileged-entrypoints`.

## SECURITY DEFINER

Hàm `SECURITY DEFINER` chạy bằng quyền chủ hàm → **bỏ qua RLS**. Mọi hàm loại này phải tự kiểm quyền bên trong. Danh sách đầy đủ có đánh dấu ⚠️ trong [[rpc-va-enum]].

## Ranh giới đã chấp nhận (không phải bug)

- **Ảnh gốc gallery lộ qua URL `lh3`** — đổi `=s600` thành `=s0` là ra ảnh gốc. Cổng tải là **UX-gate, không phải security-gate** ([[adr-index|ADR-011]]). Đừng "vá" bằng cách giấu `drive_file_id`: fileId nằm sẵn trong chính URL ảnh.
- **Bảng hợp đồng không scope theo studio** — chấp nhận được vì không có client-direct. Mở client-direct thì phải làm RLS hardening trước ([[adr-index|ADR-005]], LESSONS A9).

## Liên quan

[[cache-va-realtime]] · [[bay-du-lieu]] · [[luong-gallery]]

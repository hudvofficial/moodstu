# Plan: RLS hardening cho Contracts (điều kiện để client-direct)

> **Trạng thái:** PLAN — chưa đụng DB. Chờ anh duyệt. Rủi ro bảo mật + vỡ-app cao → không tự làm.
> **Ngày:** 2026-06-04
> **Mục tiêu:** Bật RLS đúng cho các bảng contract → mở khóa client-direct (browser query) an toàn → drawer/notes nhanh tận gốc (hết server-action serialized).

## 1. Vì sao cần (tóm tắt)
Contract drawer chậm vì `getContractDrawerExtra` + `getContractNotes` là **server action** (2 chặng, serialized). Muốn client-direct (browser query thẳng Supabase) → bảo mật chuyển hoàn toàn sang **RLS**. Audit (LESSONS A9) cho thấy 6 bảng contract **KHÔNG có RLS** → client-direct hiện tại = lộ data. Plan này dựng RLS trước.

## 2. Phát hiện nền (quyết định thiết kế)
- **SINGLE-STUDIO:** không có `studio_id`/`studios` (grep migrations = 0). → Policy **KHÔNG cần** scope studio/tenant. Chỉ cần "authenticated + nhân viên active (+ role)". ⚠️ Khác đề xuất "thêm studio_id" của bản audit ban đầu — KHÔNG làm schema studio_id.
- **Server action dùng `createClient` = anon key + user JWT = authenticated, SUBJECT TO RLS** ([lib/supabase/server.ts:10-11](../../lib/supabase/server.ts)). → Bật RLS **ảnh hưởng cả server action**, không chỉ client-direct.
- **`createAdminClient` = service_role = BYPASS RLS** (server.ts:36). Mutation nào dùng admin client → không bị RLS.
- `requireContractAccess` chỉ check **role** (admin/manager/sale), KHÔNG scope per-contract. → RLS chỉ cần tái tạo: "nhân viên active có quyền module contracts".

## 3. ✅ Rủi ro THẤP hơn dự kiến — P0 audit (2026-06-04, đã verify)
**`withAuth` dùng `createAdminClient` = service_role** ([auth_utils.ts:384](../../lib/auth_utils.ts)) → **MỌI** server action contract (21 ops, read + write) **BYPASS RLS**. → Bật RLS trên 6 bảng **KHÔNG làm vỡ server action** (chúng đi qua admin client). RLS **CHỈ gate client-direct** (browser authenticated JWT).
⇒ Chỉ cần 2 policy/bảng: `service_role ALL` (server action — explicit) + `authenticated SELECT` (client-direct đọc). **KHÔNG cần** INSERT/UPDATE/DELETE policy (writes qua admin bypass). **KHÔNG cần** đổi mutation client. **KHÔNG cần** studio_id.
**employees columns (verify từ auth_utils:89-91 `isActiveEmployeeContext`):** `auth_user_id` (= auth.uid()), `deleted_at IS NULL`, `status = 'active'`.
Rủi ro còn lại (vẫn test staging): (a) tên cột employees sai → policy lỗi; (b) trang nào đó lỡ đọc 6 bảng qua `createClient` (authenticated) thay vì withAuth-admin → sẽ bị RLS (P0 xác nhận: tất cả qua withAuth-admin, nên không có). Migration P1 đã viết sẵn: `supabase/migrations/20260604000000_contracts_rls_hardening.sql`.

## 4. Phạm vi bảng
6 bảng: `contracts`, `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans`, `contract_notes`. (Mở rộng `payments` nếu client-direct payment sau.)

## 5. Các bước (phase) — CHƯA làm, chờ duyệt

### P0 — Audit client model từng query/mutation *(bắt buộc trước khi viết policy)*
- Liệt kê MỌI nơi đọc/ghi 6 bảng này: dùng `createClient` (authenticated → cần policy) hay `createAdminClient` (bypass → không cần)?
- Quyết định: (a) giữ mutation ở authenticated → cần policy INSERT/UPDATE/DELETE đủ; HOẶC (b) chuyển mutation sang admin client (bypass) → policy chỉ cần SELECT cho authenticated (đơn giản + an toàn hơn cho client-direct).
- **Khuyến nghị:** (b) — mutation giữ qua server action dùng **admin client** (đã có manual auth check), RLS chỉ cấp **SELECT** cho authenticated. Giảm bề mặt rủi ro: client-direct chỉ ĐỌC.

### P1 — Viết migration RLS (chạy LOCAL/STAGING trước)
Cho mỗi bảng:
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

-- service_role: full (admin client + RPC) — explicit
CREATE POLICY <table>_service_role_all ON public.<table>
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- authenticated: chỉ SELECT, chỉ nhân viên active (single-studio → mọi nhân viên active đọc được, đúng mô hình hiện tại)
CREATE POLICY <table>_authenticated_read ON public.<table>
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.deleted_at IS NULL
        AND COALESCE(e.is_disabled, false) = false
        -- (tùy chọn chặt role: AND e.role IN ('admin','manager','sale'))
    )
  );
```
> Nếu P0 chọn (a) giữ writes ở authenticated → thêm policy INSERT/UPDATE/DELETE tương tự (rủi ro cao hơn). Nếu (b) admin client cho writes → CHỈ cần SELECT như trên.
> ⚠️ Xác minh tên cột thật: `employees.auth_user_id`, `deleted_at`, `is_disabled` (đọc schema employees trước — P0).

### P2 — Test đa-user/đa-role trên STAGING (gate bắt buộc)
- [ ] Nhân viên active (admin/manager/sale) → đọc được contract data (server action + browser-direct).
- [ ] Nhân viên **disabled/deleted** → bị chặn.
- [ ] **anon** (chưa login) → bị chặn.
- [ ] Mọi mutation server action (tạo/sửa/xóa HĐ, event, checklist, task, payment, note) **vẫn chạy** sau bật RLS.
- [ ] Các trang khác đọc 6 bảng này (list/detail/dashboard/finance join?) vẫn hoạt động.

### P3 — Apply production
- Off-peak, có backup. Monitor lỗi (Sentry) ngay sau apply.
- **Rollback sẵn:** `ALTER TABLE ... DISABLE ROW LEVEL SECURITY;` nếu vỡ.

### P4 — Client-direct (sau khi RLS xanh)
- Viết fetcher browser (createBrowserClient) cho `getContractDrawerExtra` + `getContractNotes` reads.
- `useContractDrawerExtra`/`useContractNotes` gọi browser fetcher thay server action.
- Giữ mutation ở server action (admin client). Verify drawer instant + bảo mật.

## 6. Ước lượng & rủi ro
- **Effort:** P0 ~0.5 ngày · P1 ~0.5 ngày · P2 (test kỹ) ~1 ngày · P3 + P4 ~0.5 ngày. Tổng ~2.5 ngày + cần môi trường staging.
- **Rủi ro:** CAO — sai/thiếu policy = vỡ app HOẶC lộ data. Bắt buộc staging + test đa-role trước production. KHÔNG làm trực tiếp production.
- **Điều kiện tiên quyết:** có Supabase staging/local để test RLS (không test trên production).

## 7. Quyết định cần từ anh
1. Có môi trường **staging/local Supabase** để test RLS không? (nếu không → KHÔNG nên làm, quá rủi ro trên production thật).
2. Chọn P0 hướng (a) writes-authenticated hay (b) writes-admin-client (khuyến nghị b).
3. Duyệt làm P0 (audit, chưa đụng DB) trước.

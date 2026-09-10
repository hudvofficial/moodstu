---
title: "Bảo mật dữ liệu — RLS, grant, vai trò DB"
tags: [nen-tang, bao-mat, du-lieu]
cap-nhat: 2026-09-10
trang-thai: da-kiem-2026-09-10
doi-chieu: vault/30-du-lieu/rls-va-quyen.md · vault/30-du-lieu/than-ham/ · vault/30-du-lieu/ham-mo-coi.md · agent/system-map/06-nen-tang.md
---

# Bảo mật dữ liệu — RLS, grant, vai trò DB

## Điều dễ hiểu nhầm nhất

**RLS không phải lớp bảo vệ chính của app này.** Mọi server action dùng client **service role** → bỏ qua RLS hoàn toàn. Lớp bảo vệ thật là `requireXAccess()` ở tầng app ([[xac-thuc-phan-quyen]]).

RLS + grant chỉ quan trọng ở đúng ba chỗ:
1. Vai `anon` (khách chưa đăng nhập chạm được endpoint nào đó).
2. Vai `authenticated` khi **realtime** — client subscribe trực tiếp, RLS quyết định nghe được event nào.
3. **Nhánh client-direct** — `lib/client-direct/contract-drawer.ts:38,48,57,64,71,114` query thẳng `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans`, `employees_public`, `contract_notes` bằng anon key (drawer hợp đồng). Ở nhánh này RLS là cổng **duy nhất**. → [[kien-truc-tong-quan]]

## Hiện trạng (quét 2026-08-31 — đọc thẳng DB production)

93/93 bảng đã **bật RLS**; 17 trong số đó bật thêm `FORCE ROW LEVEL SECURITY`. **8** bảng bật RLS nhưng **0 policy** → deny-all cho mọi vai trừ service role:

`expense_allocations` · `gallery_albums` · `gallery_comments` · `gallery_password_attempts` · `gallery_reactions` · `salary_adjustments` · `service_bundles` · `system_settings`

> Khác bản 2026-08-07 (nói "98/98 bảng · 9 bảng 0 policy"): `lab_payment_allocations` + `lab_payments` đã bị `DROP TABLE` (`20260826130000_cashflow_m2b_drop_legacy.sql:33-34,37-38`); `expense_allocations` là bảng mới (`20260825200000_cashflow_m1_expense_allocations.sql`).

Đúng chủ đích — các bảng này chỉ được chạm qua server action. **Đừng "sửa" bằng cách thêm policy** trừ khi có nhu cầu client-direct hoặc realtime thật.

Số policy từng bảng — kèm **nội dung `USING`/`WITH CHECK` đầy đủ của cả 217 policy** và grant anon/authenticated từng bảng: [[rls-va-quyen]] (sinh thẳng từ DB production, **đừng sửa tay**).

**Vì sao 93/93 mà migration chỉ có 55 lệnh `ENABLE ROW LEVEL SECURITY`:** DB có **event trigger** `rls_auto_enable()` (`SECURITY DEFINER`) tự chạy `alter table … enable row level security` cho mọi `CREATE TABLE` trong schema `public` — thân hàm ở `30-du-lieu/than-ham/he-thong.md`. Hàm này **không nằm trong bất kỳ migration nào** (`grep rls_auto_enable supabase/migrations/` = 0 file), tức được tạo ngoài migration.
> ⚠️ Hệ quả phải nhớ: **bảng mới sẽ tự bật RLS nhưng KHÔNG tự có policy** → mặc định deny-all. Nếu bảng đó cần client-direct/realtime mà quên viết policy, triệu chứng là "200 + rỗng", không phải lỗi.

## Bài học lớn: GRANT thắng POLICY

Supabase **tự cấp đủ 7 quyền** cho `anon` + `authenticated` trên mọi object mới trong schema `public` (default privileges). `GRANT SELECT` chỉ **thêm**, không gỡ cái đã có.

Đo thật (2026-06-10, `scripts/probe-anon-access.mjs` — request anon thật): `anon` đọc ra rows ở `labs`, `lab_services`, `transaction_categories`, `login_attempts` (lộ email + trạng thái khoá), `addon_history` (**đọc và ghi được**), `documents`, `promotions`, `work_shifts`. Nguyên nhân: policy `qual = true` + còn grant.

Bằng chứng ngược: `dresses`/`services`/`studio_info` đã REVOKE grant → anon nhận `42501` **dù vẫn còn policy `qual=true`**.

⚠️ **Đang có một chỗ dẫm đúng bẫy này theo chiều ngược lại.** `lib/hooks/use-prefetch-on-hover.ts:90-99` query thẳng bảng `dresses` **từ browser** (vai `authenticated`). Trên DB, `dresses` có 4 policy — trong đó `inventory_items_select` vẫn `USING true` — **nhưng cột quyền anon/authenticated là rỗng** (`20260429110000_dresses_audit_fix.sql:10` REVOKE, không migration nào GRANT lại). Prefetch này nhận `42501` và im lặng. Select còn kèm cả `purchase_price` (`:53`). Policy còn sống ≠ query chạy được.

→ Migration `20260610150000`: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon` + `ALTER DEFAULT PRIVILEGES … REVOKE ALL ON TABLES FROM anon` (chặn bảng tương lai) + cấp lại đúng 4 quyền cho `login_attempts`.

**Xác nhận trên DB (2026-08-31):** trong 93 bảng, **chỉ `login_attempts`** còn dòng `anon=` — đúng `DELETE, INSERT, SELECT, UPDATE`. 92 bảng còn lại: anon rỗng ([[rls-va-quyen]] §Tổng quan). Tức bài học dưới đây đã được vá xong, không phải hiện trạng.

**Quy tắc:** `anon` = tối thiểu tuyệt đối. Chỉ grant bảng có route public **thật sự** chạy bằng vai anon — rà code xác nhận, đừng đoán. Gallery public dùng `createAdminClient` (service role) nên **không cần** grant anon.

## VIEW nguy hiểm hơn TABLE

View **không có RLS**. Grant là lớp bảo vệ duy nhất. View đơn (1 bảng, không aggregate) còn **auto-updatable** và chạy quyền owner → `authenticated` UPDATE/DELETE xuyên view = ghi thẳng vào bảng nguồn, bypass RLS.

Mọi view `*_public` phải: `REVOKE ALL FROM anon, authenticated;` **rồi mới** `GRANT SELECT TO authenticated;` Verify bằng `information_schema.role_table_grants`.

Hiện có **2 view**: `employees_public` và `payment_plan_states` — `types/database.types.ts:5512,5539`. `employees_public` đã được siết đúng mẫu trên (`20260605020001_employees_public_grant_fix.sql:15`) và chính là view mà nhánh client-direct đọc.

## Policy gọi bảng bị REVOKE → 403, không phải rỗng

Policy viết `EXISTS (SELECT 1 FROM employees …)` mà `employees` đã REVOKE khỏi `authenticated` → subquery lỗi permission → **toàn bộ request 403**, không phải "200 + 0 dòng".

Cách đúng: hàm `public.is_active_employee()` **SECURITY DEFINER STABLE**, policy dùng `USING (public.is_active_employee())`.

**Phân biệt khi debug:** `403` = vấn đề grant/permission trong policy · `200 + rỗng` = RLS đang lọc đúng.

## Verify RLS phải bằng request thật

Kiểm `pg_policies` tồn tại là **chưa đủ** — đã lọt một lần vì thế. Phải test bằng request vai thật: browser network, hoặc `SET ROLE authenticated` + `set_config('request.jwt.claim.sub', …)`.

Script sẵn có: `scripts/probe-anon-access.mjs`, `scripts/verify-realtime-signals.mjs`, `npm run verify:privileged-entrypoints`.

## SECURITY DEFINER

Hàm `SECURITY DEFINER` chạy bằng quyền chủ hàm → **bỏ qua RLS**. Mọi hàm loại này phải tự kiểm quyền bên trong.

Số đo 2026-08-31 (từ `pg_proc`): **92/149 hàm** trên DB là `SECURITY DEFINER`. Thân hàm đầy đủ — đọc được cả phần tự kiểm quyền bên trong — ở `30-du-lieu/than-ham/*.md`. Hàm không call-site nào gọi: [[ham-mo-coi]] (30 hàm, trong đó 5 hàm **không ai gọi** cần kiểm).

## Ranh giới đã chấp nhận (không phải bug)

- **Ảnh gốc gallery lộ qua URL `lh3`** — đổi `=s600` thành `=s0` là ra ảnh gốc. Cổng tải là **UX-gate, không phải security-gate** ([[adr-index|ADR-011]]). Đừng "vá" bằng cách giấu `drive_file_id`: fileId nằm sẵn trong chính URL ảnh.
- ~~**Bảng hợp đồng không scope theo studio** — `contracts` có 2 policy SELECT cộng OR (`contracts_select` + `contracts_authenticated_read is_active_employee()`) → mọi nhân viên active đọc mọi HĐ.~~ **ĐÃ SIẾT 2026-09-10 (bước #24, ADR-019, `agent/HANDOFFS/T-20260910-t3-rls-matrix.spec.md`)** — xem mục "Ma trận đọc/ghi 9 bảng hợp đồng" dưới. Số đếm 10/09: `auth.users` = 2, chỉ **1 admin** có `auth_user_id`; 3 sale + 6 ctv active chưa có đăng nhập.

## Ma trận đọc/ghi 9 bảng hợp đồng (áp prod 2026-09-10, #24)

Áp cho `contracts`, `contract_events`, `contract_checklists`, `contract_notes`, `payment_plans`, `payment_plan_allocations`, `work_tasks`, `schedules`, `customers` — migration `20260910100000_t3_rls_matrix_revoke_writes_calendar_scope.sql`, đường lùi `agent/HANDOFFS/T-20260910-t3-rls-matrix.revert.sql`:

| | anon | authenticated (qua RLS) | service_role |
|---|---|---|---|
| **Đọc** | 0 grant | `SELECT` + **1 policy `<bảng>_read`** gương `ROLE_PERMISSIONS` (`types/roles.ts`): 6 bảng HĐ = admin/manager/**sale**; `work_tasks_read` = 3 vai đó **hoặc** `assigned_to`/`created_by` là mình; `customers_select` = admin/manager/sale; `schedules_select` = admin/manager hoặc `employee_id` là mình | tất cả |
| **Ghi** | 0 | **0** — `INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` đã REVOKE, 24 policy ghi đã gỡ → REST trả `42501` | tất cả (mọi server action bọc `withAuth`/`withAuthRead`/`withAdmin` nhận `createAdminClient()` — `lib/auth_utils.ts`) |

Hệ quả cần nhớ khi viết code mới: **ghi 9 bảng này bằng cookie client hay browser client sẽ bị `42501`** — đó là chủ đích; đường ghi duy nhất là server action. Nhánh client-direct (`lib/client-direct/contract-drawer.ts`, `payslip-modal.tsx`) chỉ đọc, vẫn chạy cho admin/manager/sale. Vì sao bỏ scope "HĐ của tôi": `contracts.created_by` lưu **auth uid**, còn `get_current_employee_id()` trả `employees.id` → nhánh đó chưa bao giờ khớp (0/63); ma trận Mood là theo vai. RPC `calendar_month_events(p_month, p_year, p_employee_id DEFAULT NULL)` chỉ `service_role` EXECUTE; lọc lịch tay theo người khi app truyền (`app/actions/calendar-queries.ts`). Probe REST 10/09 bằng user sale/ctv tạm: 15/15 đúng ma trận. Trước đó (02/09–10/09) số policy toàn DB 217 → nay **187**.

## Quyền EXECUTE của RPC — chỗ RLS không với tới (đo 11/09/2026)

Hàm `SECURITY DEFINER` **bỏ qua RLS**, nên với RPC thì `EXECUTE` chính là cổng duy nhất. Supabase cấp EXECUTE mặc định cho `anon`/`authenticated` với **mọi hàm mới trong schema `public`** (`pg_default_acl`), nên hàm nào không REVOKE tay là hàm đó mở — và `REVOKE ... FROM PUBLIC` **không** gỡ hai grant đó, phải nêu đích danh `anon, authenticated`.

- **Đã siết:** `calendar_month_events(int,int,uuid)` (#24, 10/09) · `get_finance_intelligence()` (**#18, 11/09** — trước đó `anon` gọi được `/rest/v1/rpc/get_finance_intelligence` và nhận toàn bộ số tài chính studio) · `customer_phone_report()` (#27) · nhóm sổ kỳ `finance_period_ledger` · `finance_month_summary` · `finance_pnl_by_month` · `finance_debt_stats` · `finance_payable_summary` · `finance_pending_collections` · `finance_reports_snapshot` · `get_receivable_aging` — tất cả `{postgres, service_role}`.
- **Còn mở cho `anon` + `authenticated`** (đo 11/09, đều `SECURITY DEFINER`, đều trả số tài chính): `get_cashflow_forecast` · `get_expense_breakdown` · `get_budget_vs_actual` · `get_finance_advanced_intelligence`. App chỉ gọi chúng qua server action bọc `withAuth` → siết được mà không gãy gì; **chưa có trong sổ 32 bước**, đã ghi vào `agent/inventory/00-lech-thiet-ke.md` chờ chủ quyết.

Khi viết RPC mới: mặc định `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;` ngay trong migration — và nhớ `DROP` + `CREATE` lại hàm sẽ nhận lại default ACL, phải REVOKE lần nữa (bài học #24).

## Liên quan

[[cache-va-realtime]] · [[bay-du-lieu]] · [[luong-gallery]]

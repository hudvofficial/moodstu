# T-20260910-t3-rls-matrix — T3: một policy đọc mỗi bảng theo ma trận vai · ghi chỉ qua service role · RPC lịch lọc theo người (R8)

**Owner:** claude (spec → chủ duyệt → claude áp DB + sửa 2 file app → commit ngay) · **Trạng thái:** ✅ ĐÃ ÁP PROD 10/09 (chủ "duyệt" 10/09) · app + verify xong, chờ chủ xem diff / "đẩy" · **Chương trình:** GĐ2 tuần 6, bước #24 (`agent/GOALS.yaml`), gate #3 ✅ #10 ✅ · **DB:** 9 bảng — DROP 37 policy · CREATE 7 policy · REVOKE quyền ghi của `anon`/`authenticated` · DROP+CREATE 1 hàm (thêm tham số có mặc định, giữ ACL) · **ADR:** ADR-019 (`agent/DECISIONS.md`, Proposed → Accepted khi chủ "duyệt") · **Revert:** `agent/HANDOFFS/T-20260910-t3-rls-matrix.revert.sql` (46 policy + 9 grant + thân hàm + ACL sống, đã thử local).

## 0. Vì sao

Sổ đối chiếu T3 + vault `10-nen-tang/bao-mat-du-lieu-rls.md` §lệch (02/09): *"contracts có 2 policy SELECT cộng OR → mọi nhân viên active vẫn đọc được mọi hợp đồng; cấp thêm đăng nhập thì phải siết trước"*. Trace 10/09 trên DB sống cho thấy **3 lỗ**, không phải 1:

1. **Đọc — OR làm chết scope.** 6 bảng hợp đồng (`contracts`, `contract_events`, `contract_checklists`, `contract_notes`, `payment_plans`, `payment_plan_allocations`) mỗi bảng có 2 policy SELECT permissive: `*_authenticated_read` = `is_active_employee()` (ctv/media đọc mọi HĐ qua anon key) **OR** `*_select` = admin/manager hoặc `created_by = get_current_employee_id()`. Nhánh `created_by` **chết ngay từ thiết kế**: `contracts.created_by` lưu auth uid (63/63 HĐ khớp `employees.auth_user_id`, 0/63 khớp `employees.id`) còn `get_current_employee_id()` trả `employees.id`. Ma trận thật của Mood (`types/roles.ts`, chốt #22) là **theo vai**: module `contracts` = admin/manager/sale; ctv/media/viewer không có.
2. **Ghi — quyền ghi mở cho `authenticated`.** `authenticated` đang có `INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER` trên 9 bảng (6 bảng HĐ + `work_tasks` + `schedules` + `customers`) kèm 24 policy ghi (`contracts_update` = admin/manager/**sale**…) → một sale cầm anon key + phiên đăng nhập `PATCH /rest/v1/contracts` được **mọi** HĐ, trái ý định migration `20260605000000_contracts_rls_hardening` ("ghi qua server"). App thực tế **không ghi bằng quyền này** (§1).
3. **R8 — RPC lịch không lọc theo người.** `calendar_month_events` (SECURITY INVOKER, chỉ `service_role` EXECUTE) gọi dưới `withAuth` (= service role) trả **mọi** lịch tay; `mapRpcCalendarEvent` (`app/actions/calendar-queries.ts:281`) không lọc, trong khi nhánh fallback `fetchCalendarEventsFallback` (dòng 370) có `eq("employee_id", access.employeeId)` cho vai không phải admin/manager → 2 đường, 2 kết quả; đường RPC là đường đang chạy.

Hôm nay chỉ **1 tài khoản đăng nhập được (admin)**; 3 sale + 6 ctv active chưa có `auth_user_id` → lỗ chưa bị khai thác. Vá **trước** khi cấp tài khoản, đúng thứ tự chương trình (#22 gate route → #24 gate dữ liệu).

## 1. Sự thật đã đo (10/09, chỉ đọc + diễn tập local)

**DB sống** (`scripts/db-q.mjs`, read-only): 9 bảng có **46 policy** (13 SELECT trên 6 bảng HĐ + `work_tasks_select`/`_authenticated_read`, `customers_select`, `schedules_select`, 24 policy ghi, 7 `*_service_role_all`); `authenticated` **63 grant** (7 quyền × 9 bảng), `anon` **0**; hàm `calendar_month_events(integer,integer)` owner `postgres`, ACL `{postgres=X, service_role=X}`; **default ACL** schema `public` cấp EXECUTE cho `anon`/`authenticated`/`service_role` cho hàm mới → DROP+CREATE mà không thu hồi = mở RPC cho `authenticated` (migration 20260512/20260513 đã REVOKE tay). Lịch tay 07–11/2026: **1** dòng (admin) → R8 hôm nay đổi 0 dòng, vá cho ngày có sale/ctv đăng nhập.

**Ai ghi 9 bảng** (quét `app/ lib/ components/ hooks/`, 57 chỗ `.from(<bảng>).insert|update|delete|upsert`):
- **15 file server action** — tất cả bọc `withAuth`/`withAuthRead`/`withAdmin`; `withAuth` (`lib/auth_utils.ts:411`) và `withAuthRead` (`:446`) đưa **`createAdminClient()`** (service role) vào callback → RLS/grant không đụng tới.
- `app/api/calendar/sync-worker/route.ts:208` tự tạo client bằng `SUPABASE_SERVICE_ROLE_KEY`. `lib/contract-event-google-sync.ts` nhận client từ `contract-mutations.ts` (withAuth).
- **9 file dùng browser client**: chỉ **đọc** (`lib/client-direct/contract-drawer.ts` 5 bảng con + `employees_public`; `components/finance/salaries/payslip-modal.tsx` `work_tasks`), realtime chỉ subscribe `realtime_signals`, còn lại là auth/prefetch. **0 chỗ ghi từ trình duyệt.**
- **Hàm DB ghi vào 9 bảng: 14 hàm, 14/14 SECURITY DEFINER**; **0 hàm INVOKER, 0 trigger** trên bảng khác ghi vào 9 bảng → REVOKE không làm gãy hàm/trigger nào chạy dưới `authenticated`.

**Diễn tập trên Postgres cục bộ** (`mood_restore`, dump 10/09; định nghĩa lại `auth.uid()` đọc `request.jwt.claims`; 2 danh tính giả sale/ctv + 1 việc gán ctv + 2 lịch tay; cấp grant gương prod cho role `authenticated` cục bộ):

| Vai · phép | TRƯỚC (bản sống) | SAU migration |
|---|---|---|
| sale đọc `contracts` / `contract_events` / `work_tasks` / `customers` | 66 / 217 / 168 / 66 | 66 / 217 / 168 / 66 (không đổi) |
| sale đọc `contract_checklists` / `contract_notes` / `payment_plans` / `payment_plan_allocations` / `schedules` | — | 333 / 2 / 121 / 51 / 1 (lịch của mình) |
| sale `UPDATE contracts` · `INSERT contract_notes` · `DELETE customers` · `UPDATE schedules` (của mình) | **THÀNH CÔNG** (lỗ) | **42501 permission denied** ×4 |
| ctv đọc `contracts` / `contract_events` / `customers` | **66** / **217** / 0 | **0 / 0 / 0** |
| ctv đọc `work_tasks` / `schedules` | 168 / 0 | **1** (việc của mình) / **1** (lịch của mình) |
| ctv `UPDATE work_tasks` (của mình) | — | 42501 |
| `calendar_month_events(9,2026)` = `(…, NULL)` | 3 lịch · 37 mốc · 45 việc | 3 · 37 · 45 (không đổi) |
| `calendar_month_events(9,2026,<ctv>)` / `(…,<sale>)` | (chưa có) | **1** lịch · 37 mốc · 45 việc (chỉ lọc lịch tay) |
| Đối tượng còn lại | 46 policy · 63 grant · hàm 2 tham số | **16** policy (7 `_read` + 7 `_service_role_all` + `customers_select` + `schedules_select`) · **9** grant (SELECT) · hàm 3 tham số |
| `revert.sql` | — | về **46 policy · 63 grant · hàm 2 tham số**, ctv lại đọc 66 HĐ ✓ → áp lại → 16/9 ✓ |

Lỗi bắt được nhờ diễn tập: bản đầu `revert.sql` in `TO {, s, e, r, v…}` (mảng role dạng chuỗi) → sửa generator, chạy lại toàn bộ. Sinh cả hai file từ `pg_policy` + `information_schema.role_table_grants` + `pg_get_functiondef` sống, không chép từ file migration cũ.

## 2. Phạm vi — 1 migration, 2 file app

`supabase/migrations/20260910100000_t3_rls_matrix_revoke_writes_calendar_scope.sql` (187 dòng, không BEGIN/COMMIT — `migrate-direct` tự bọc):

| Phần | Làm gì | Bảng/hàm |
|---|---|---|
| **A** | DROP 13 policy SELECT cộng OR → CREATE `<bảng>_read FOR SELECT TO authenticated USING (get_current_employee_role() = ANY ('{admin,manager,sale}'))`; riêng `work_tasks_read` thêm `OR assigned_to = get_current_employee_id() OR created_by = get_current_employee_id()` | `contracts`, `contract_events`, `contract_checklists`, `contract_notes`, `payment_plans`, `payment_plan_allocations`, `work_tasks` — **giữ nguyên** `customers_select` (admin/manager/sale) và `schedules_select` (admin/manager hoặc của mình): đã đúng ma trận |
| **B** | `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON <bảng> FROM anon, authenticated` ×9 + DROP 24 policy ghi (`*_insert/_update/_delete` của 8 bảng) | 9 bảng; `SELECT` giữ; `*_service_role_all` giữ |
| **C** | `DROP FUNCTION calendar_month_events(integer, integer)` → CREATE `(p_month, p_year, p_employee_id uuid DEFAULT NULL)`, thân hàm sống + đúng 1 dòng `AND (p_employee_id IS NULL OR s.employee_id = p_employee_id)` trong nhánh `schedules`; `REVOKE ALL … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role` (giữ ACL sống) | mốc HĐ + việc vẫn toàn studio (C9) |

App (sửa **sau khi** DB đã áp — bản app cũ gọi 2 tham số vẫn chạy nhờ `DEFAULT NULL`):
- `app/actions/calendar-queries.ts:415` — `supabase.rpc("calendar_month_events", { p_month, p_year, p_employee_id: access.isGlobalAdmin ? null : access.employeeId })` (`access` từ `lib/calendar-auth.ts`: `isGlobalAdmin` = admin/manager).
- `types/database.types.ts:5600` — `Args: { p_month: number; p_year: number; p_employee_id?: string | null }` (sửa tay: `db:types` cần đăng nhập Supabase CLI).
- Không đổi: `fetchCalendarEventsFallback`, `mapRpcCalendarEvent`, `scripts/verify-calendar.mjs` (kiểm chuỗi trong migration 20260512 — vẫn còn), `smoke-calendar.mjs` (gọi 2 tham số, hợp lệ).

Thứ tự áp: backup 10/09 02:09 OK → `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260910100000_t3_rls_matrix_revoke_writes_calendar_scope.sql` → probe §4 → sửa 2 file app → verify → `npm run vault:db-truth` → **commit ngay** (migration + revert + spec + CHANGELOG + GOALS + DECISIONS + vault). Push chờ chủ "đẩy".

## 3. Ngoài phạm vi
- `app/api/gallery-download/*` đọc `contracts` bằng cookie client (SELECT — vẫn chạy với `contracts_read` cho admin/manager/sale) → khoá thật ở **#25**.
- CRM action chỉ `withAuth` (không kiểm vai) → **#19**. Bảng ngoài 9 bảng (`leads`, `payments`, `expenses`, `printing_orders`…) giữ nguyên grant/policy — từng bước T3 sau, không gộp.
- Không đổi `contracts_select`-kiểu scope theo người phụ trách (30/63 HĐ `assigned_to NULL`; ma trận Mood là theo vai). Nếu sau này muốn "sale chỉ thấy HĐ của mình" → ADR mới + sửa `created_by` sang `employees.id`.
- Không tách DB e2e (ADR-018 rủi ro ghi nhận).

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Local | §1 | ✓ (trước → áp → revert → áp lại, cả bản có ACL) |
| Áp prod | `migrate-direct` | "completed"; 9 bảng **46 → 16** policy; grant `authenticated` **63 → 9** (chỉ SELECT), `anon` 0; hàm `calendar_month_events(integer,integer,uuid)` ACL `{postgres, service_role}` |
| Không đổi dữ liệu | count `contracts` / `work_tasks` / `schedules` / `customers` trước/sau | khớp 100% (chỉ đổi policy/grant/hàm) |
| PostgREST thật (anon key + JWT) | tạo 2 user tạm `t3-sale@test.local` (sale) + `t3-ctv@test.local` (ctv) qua service role → gọi REST → **xoá ngay** | sale `GET /rest/v1/contracts?select=id` = số HĐ sống (>0) · ctv = **0** · sale `PATCH /rest/v1/contracts?id=eq.00000000-0000-0000-0000-000000000000 {"notes":"x"}` → **403/42501** (trước: 204) · ctv `GET work_tasks` = 0 · sale `POST /rest/v1/rpc/calendar_month_events` → **403** (không EXECUTE) |
| Màn hình admin | Playwright `contracts-table-desktop.spec.ts` (admin) + `fetchCalendarEvents` tháng 9 trước/sau | 5/5 · số sự kiện lịch bằng nhau (`p_employee_id = null`) |
| Màn hình sale (client-direct) | Playwright: sale tạm mở `/contracts` → drawer 1 HĐ → panel mốc/checklist/ghi chú/kế hoạch thu tải qua anon key | có dòng, console **0** lỗi `42501`/`PGRST` |
| Tĩnh | `tsc` · `eslint` 2 file · `npm run verify:contracts` · `npm run verify:calendar` | 0 lỗi |
| Rác | `node scripts/db-q.mjs "$(cat scripts/sweep-e2e-residue.sql)"` | mọi `n` = 0 (trừ `realtime_signals`) |
| Vault | `npm run vault:db-truth` + sửa tay `bao-mat-du-lieu-rls.md` §lệch, `rls-va-quyen` sinh lại | 9 bảng đổi policy; hàm 3 tham số; mục lệch T3 gạch xong |

## 5. Rủi ro & đường lùi
- **Sót chỗ ghi bằng cookie/browser client** → lỗi `42501` hiện ngay ở console/Sentry, dữ liệu không hỏng (bị chặn, không ghi sai). Quét mã 10/09 = 0 chỗ; nếu xuất hiện → sửa chỗ đó sang `withAuth` (đúng mô hình), không mở lại grant.
- **PostgREST schema cache** sau DROP/CREATE hàm: Supabase reload tự động qua event trigger; nếu RPC tạm 404 → app đã có `isMissingRpcError` → fallback (có lọc theo người). Kiểm bằng probe §4.
- **Vai ctv/media mất quyền đọc HĐ qua anon key** — đúng ý định (không có module contracts); màn hình của họ đi qua server action (service role), không đổi.
- **Thứ tự deploy**: DB trước (tương thích ngược nhờ `DEFAULT NULL`), app sau. Không có khoảng trống.
- **Đường lùi**: `revert.sql` một lệnh `migrate-direct`, đã thử 2 lần trên local (46 policy · 63 grant · hàm 2 tham số + ACL). App bản mới truyền `p_employee_id` sẽ lỗi "function does not exist" với hàm 2 tham số → fallback TS vẫn chạy; nếu revert DB thì revert luôn 2 file app.

## 6. Kết quả — 10/09/2026

| Kiểm | Kết quả |
|---|---|
| Local | ✓ 2 vòng (trước → áp → revert → áp lại; vòng 2 có ACL hàm) — §1 |
| Áp prod | `migrate-direct` "completed successfully" (10,4 KB). 9 bảng **46 → 16 policy** (7 `_read` · 7 `_service_role_all` · `customers_select` · `schedules_select`); grant `authenticated` **63 → 9** (chỉ SELECT); `anon` 0 → 0; hàm `calendar_month_events(integer,integer,uuid)` ACL `{postgres=X, service_role=X}`; thân hàm chứa dòng R8 |
| Không đổi dữ liệu | trước = sau: contracts 65 · contract_events 220 · contract_checklists 338 · contract_notes 2 · payment_plans 123 · payment_plan_allocations 69 · work_tasks 171 · schedules 3 · customers 66 — **khớp 100%**. `calendar_month_events(9,2026)` = `(…,NULL)` = **83**; truyền id người khác = 82 (lọc đúng 1 lịch tay) |
| PostgREST thật | 2 user tạm `e2e-t3-sale/ctv-<ts>@test.local` (tạo → probe → xoá + `login_attempts`): sale GET contracts **65** · contract_events 220 · contract_checklists 338 · payment_plans 123 · customers 66 · schedules **0** · sale PATCH contracts / POST contract_notes / DELETE customers / RPC calendar_month_events → **403 `42501`** ×4 · ctv GET contracts/contract_events/customers/work_tasks = **0** ×4 · ctv PATCH work_tasks 403 → **15/15** |
| Màn hình admin | Playwright `contracts-table-desktop.spec.ts` (chromium, `next start`) **5/5** |
| Màn hình sale (client-direct) | Playwright `tests/e2e/t3-rls-client-direct.spec.ts` **2/2**: sale mở drawer HĐ-2026-0065 → 4 GET `/rest/v1/{contract_events,contract_checklists,work_tasks,payment_plans}?contract_id=eq.<id>` đều **200**, `contract_events` **3 dòng** (ảnh `test-results/t3-sale-drawer.png`), 0 REST ≥400, 0 console `42501/PGRST` · `/calendar` render lưới tháng 9, 0 "Lỗi tải dữ liệu lịch" (RPC với `p_employee_id` = sale). Bài học khi viết test: hàng đầu bảng là HĐ E2E rỗng của global-setup (19/20 seed không bảng con) → phải lọc `?q=<mã HĐ thật>`; trang lịch không bao giờ `networkidle` |
| Tĩnh | `tsc` 0 · `eslint` 2 file 0 · `verify:calendar` pass · `verify:contracts` pass · build webpack OK (`BUILD_ID LQj2hxVf…`, bundle chứa `p_employee_id`) |
| Rác | `sweep-e2e-residue.sql` sau toàn bộ probe + e2e: **0** ở 22 bảng/nhóm; `realtime_signals` 221 (ring buffer tín hiệu thật) |
| Vault | `vault:db-truth`: 149 hàm · **187 policy** (217 → 187) · `rls-va-quyen.md` 9 bảng sinh lại · `bao-mat-du-lieu-rls.md` thêm "Ma trận đọc/ghi 9 bảng hợp đồng", gạch mục lệch T3 · `xac-thuc-phan-quyen.md` thêm bullet tầng DB |
| Sổ | ADR-019 Accepted · DB-CHANGELOG 2 dòng (chuẩn bị + ĐÃ ÁP) · GOALS #24 `cho-xem-diff` |

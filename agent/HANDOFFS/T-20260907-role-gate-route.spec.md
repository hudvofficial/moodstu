# T-20260907-role-gate-route — T3 tầng route: guard `/admin` `/settings` `/crm` theo ma trận + gỡ CRM khỏi `sale` (C1)

**Owner:** claude (spec → chủ duyệt → claude code → chủ xem diff) · **Trạng thái:** ✅ IMPLEMENTED + VERIFIED — duyệt 10/09 · code+verify 10/09 · chủ "đẩy" → commit `bd9e3b5` · **Chương trình:** bước #22 (`agent/GOALS.yaml`), T3 Danh tính & Quyền, gate #3 (C1) ✅ · **DB:** KHÔNG đổi · **ADR:** không cần — dùng đúng mẫu guard đã có ở 9 module, chỉ phủ 3 route còn hở; C1 là quyết định đã chốt 02/09.

## 0. Vì sao

T3 mô hình 4 tầng (edge → route → action → RLS). Tầng **route** hiện phủ 9/14 module bằng cùng một mẫu (`layout.tsx`: `canAccess(context.shellRole, "<id>")` → `<AccessDenied/>`), nhưng **3 route hở**:

| Route | Ma trận `ROLE_PERMISSIONS` | Thực tế | Hậu quả |
|---|---|---|---|
| `/settings` (7 file: studio, credit-cards…) | admin, manager | `layout.tsx` pass-through, **không kiểm** | sale/media/viewer gõ URL là vào; chỉ action bên trong (`withAdmin`) chặn khi bấm |
| `/admin/vendors`, `/admin/backfill-dimensions` | không có khoá | **không layout, không kiểm** — 2 trang client gọi action `withAdmin` | mọi tài khoản đăng nhập mở được công cụ quản trị, bấm mới bị "không có quyền" |
| `/crm` (leads, customers) | admin, manager, **sale** | `layout.tsx` pass-through | C1 (02/09) chốt gỡ CRM khỏi `sale`: 3 sale active, 4 lead, sale chưa tạo lead nào — lỗ "sale sửa lead người khác" chưa ai đi qua nhưng cửa đang mở |

Sidebar/bottom-nav/quick-access **ẩn** menu theo ma trận (`ROLE_PERMISSIONS[role]`), nên hở chỉ qua URL gõ tay/bookmark — nhưng "ẩn menu" không phải phân quyền.

## 1. Sự thật đã đo (07/09, chỉ đọc)

- Nhân sự active: 1 admin · 3 sale · 8 ctv (= `viewer`). Không có manager, media.
- `crm_leads`: 4 dòng; `created_by` không trùng `auth_user_id` của sale nào → sale chưa từng tạo lead (khớp C1).
- Đã guard: contracts · dresses · employees · finance · inventory · moodie · printing · reports · services (layout) · dashboard (page) · calendar (page, `redirect("/")`) · productivity (page, `redirect("/dashboard")`) · audit-logs (page, `canManageSettings` → `redirect("/settings")`).
- Mẫu chuẩn (`app/(protected)/contracts/layout.tsx:10–22`): `getAuthenticatedUserContext()` → `!context` → `redirect("/login")` → `!canAccess(shellRole, id)` → `<AccessDenied moduleName/>`.
- `withAdmin` (`lib/auth_utils.ts:460`) kiểm `canCurrentUserManageSettings` (admin/manager) — tầng action của `/admin` và settings **đã có**; `withAuth` chỉ kiểm đăng nhập — tầng action của CRM (`lead-actions.ts`, `lead-lifecycle.ts`: 17 action) **chưa kiểm vai** (là việc #19/T3 tầng 3, không phải bước này).
- `proxy.ts` (edge) chỉ chặn chưa đăng nhập + bơm header vai; không biết module.

## 2. Phạm vi — 4 file, 0 DB

### 2.1 `types/roles.ts` — ma trận là nguồn duy nhất
- `sale`: **bỏ `"crm"`** (C1). Còn: dashboard, contracts, calendar, dresses, moodie.
- Thêm khoá **`"admin"`** cho `admin` và `manager` (công cụ quản trị — cùng nhóm với `withAdmin`). Không có `MODULES` id `admin` nên menu không đổi.

### 2.2 `app/(protected)/admin/layout.tsx` — **mới**, đúng mẫu contracts/layout
`canAccess(shellRole, "admin")` → `<AccessDenied moduleName="Công cụ quản trị" />`.

### 2.3 `app/(protected)/settings/layout.tsx` — thêm guard
`canAccess(shellRole, "settings")` → `<AccessDenied moduleName="Cài đặt" />`. Giữ pass-through còn lại.

### 2.4 `app/(protected)/crm/layout.tsx` — thêm guard
`canAccess(shellRole, "crm")` → `<AccessDenied moduleName="CRM" />`. Với `sale` (sau 2.1) → bị chặn; sidebar tự ẩn mục CRM vì đọc cùng ma trận.

### 2.5 Test
- `tests/unit/roles-matrix.test.ts` (mới, jest, không DB): `sale` không có `crm`; `admin`/`manager` có `admin` + `settings`; `viewer` chỉ dashboard+moodie; mọi khoá trong ma trận đều là id của `MODULES` hoặc `admin`.
- `tests/e2e/role-gate.spec.ts` (mới, Playwright, seed 2 user `department='E2E'`: 1 `sale`, 1 `viewer`; dọn afterAll): sale → `/crm/leads`, `/settings` hiện "Không có quyền truy cập", sidebar **không** có "CRM"; viewer → `/admin/vendors` hiện "Không có quyền"; sale → `/contracts` vẫn vào. Admin (user E2E admin) → 3 route vào bình thường.

## 3. Ngoài phạm vi
- Tầng **action** cho CRM (`withAuth` không kiểm vai) → #19 (inject actor + luật vai tại `withAuth`) — ghi sổ đối chiếu 🟡 nếu chưa có.
- Thống nhất `calendar`/`productivity`/`audit-logs` từ `redirect` sang `AccessDenied` — hành vi khác nhau nhưng đều chặn; #29/#30 khi đụng module.
- `manager`/`media` không có người dùng thật — không tạo seed cho họ.
- Luật sở hữu lead cho sale (C1 ghi "mở lại khi sale làm lead") — không viết bây giờ.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Ma trận | `npx jest tests/unit/roles-matrix.test.ts` | pass (4 assert) |
| Route gate | Playwright `role-gate.spec.ts` trên `next start`, cờ S3 | sale: `/crm/leads` + `/settings` → AccessDenied, sidebar 0 mục CRM, `/contracts` OK · viewer: `/admin/vendors` → AccessDenied · admin: 3 route OK — **6/6 assert** |
| Không hồi quy | `contracts-table-desktop.spec.ts` (admin) 5/5 · `npx jest` số suite đỏ = 4 có sẵn | như trước |
| tsc / eslint / build | | 0 · 0 · OK |
| Rác | quét `auth.users @test.local`, `employees department='E2E'` | 0 |

## 5. Rủi ro & đường lùi
- Sale đang mở CRM hôm nay sẽ thấy "Không có quyền" — đúng C1; chủ đã chốt. Mở lại = thêm `"crm"` vào `sale` (1 dòng).
- `AccessDenied` là component server, không redirect → không "giựt về dashboard" (bài học ghi ở contracts/layout).
- Đường lùi: `git revert` 1 commit.

## 6. Kết quả — 10/09/2026

| Kiểm | Kết quả |
|---|---|
| Ma trận | `npx jest tests/unit/roles-matrix.test.ts` **4/4** (C1 sale không crm · admin/manager có admin+settings · viewer = dashboard+moodie · mọi khoá là module thật) |
| Route gate (Playwright `role-gate.spec.ts`, `next start`, seed 3 user E2E sale/ctv/admin) | **sale**: `/crm/leads` chặn · `/settings` chặn · `/contracts` vào · sidebar 0 mục CRM · **ctv**: `/admin/vendors` chặn · `/admin/backfill-dimensions` chặn · **admin**: 3 route vào — **3/3 test, 7/7 assert** |
| Không hồi quy | `contracts-table-desktop.spec.ts` (admin) **5/5** cùng lượt · jest ma trận không đụng suite khác |
| tsc · eslint (6 file) · build | 0 · 0 · OK |
| Rác | `auth.users @test.local` 0 · `employees E2E` 0 · `contracts E2E` 0 |

Diff: `types/roles.ts` (+2 khoá admin, sale −crm) · `app/(protected)/admin/layout.tsx` (mới) · `settings/layout.tsx` · `crm/layout.tsx` (guard đúng mẫu) · `tests/unit/roles-matrix.test.ts` · `tests/e2e/role-gate.spec.ts`. Sổ đối chiếu +1 dòng (17 action CRM chỉ `withAuth` → #19).

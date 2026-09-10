# 06 — NỀN TẢNG XUYÊN SUỐT (mood-studio)

> Quét ngày 2026-08-31. Gốc repo: `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio`.
> Mọi khẳng định dưới đây kèm `file:dòng`. Không chạm database — chỉ đọc code + migration.
> Số đo hiện tại: **61 trang** (`app/**/page.tsx`) · **27 API route** (`app/**/route.ts`) · **85 file server action** (`app/actions/*.ts`) · **203 migration** (`supabase/migrations/*.sql`) · **107 RPC được gọi từ code**.

---

## 1. Sơ đồ kiến trúc tổng

```
┌─────────────────────── TRÌNH DUYỆT (client) ──────────────────────────┐
│ PWA cài được (PC · mobile · iPad)                                      │
│  · React Compiler ON (next.config.ts:32)                               │
│  · SWR + React Query + IndexedDB persist                               │
│  · Service worker workbox (next.config.ts:220-321)                     │
└───┬──────────────────────┬─────────────────────────┬──────────────────┘
    │ HTTP / RSC / SA      │ WebSocket realtime      │ (NHÁNH CLIENT-DIRECT)
    │                      │                         │ anon key + RLS
    ▼                      ▼                         ▼
┌────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐
│ proxy.ts       │   │ supabase.channel │   │ lib/client-direct/       │
│ (Next 16 đổi   │   │ postgres_changes │   │   contract-drawer.ts     │
│ tên middleware)│   │ CHỈ bảng         │   │ lib/hooks/use-prefetch-  │
│ proxy.ts:4-19  │   │ realtime_signals │   │   on-hover.ts (dresses)  │
└───────┬────────┘   └────────┬─────────┘   └────────────┬─────────────┘
        │ updateSession()      │                          │
        ▼ lib/supabase/        │                          │
┌───────────────────────┐      │                          │
│ middleware.ts:47-206  │      │                          │
│ · getClaims()         │      │                          │
│ · bơm 5 header        │      │                          │
│   x-auth-proxy-*      │      │                          │
│ · redirect /login     │      │                          │
│ · no-store headers    │      │                          │
└───────┬───────────────┘      │                          │
        ▼ (SERVER)             │                          │
┌────────────────────────────────────────┐                │
│ app/(protected)/layout.tsx:10-24       │                │
│ getAuthenticatedUserContext()          │                │
│ · null → /login · disabled → /account- │                │
│   disabled                             │                │
│ → <AppShell role userName>             │                │
│   components/layout/app-shell.tsx:51   │                │
└───────┬────────────────────────────────┘                │
        ▼                                                  │
┌───────────────────────────┐   ┌──────────────────────┐  │
│ Server Component (RSC)    │   │ Client Component     │  │
│ 54 trang trong (protected)│──▶│ "use client"         │  │
│ 44/54 force-dynamic       │   │ SWR / React Query    │  │
└───────┬───────────────────┘   └────────┬─────────────┘  │
        │                                 │                │
        ▼                                 ▼                │
┌──────────────────────────────────────────────────┐      │
│ app/actions/*.ts  ("use server", 83/85 file)     │      │
│  withAuth (167) · withAuthRead (18) · withAdmin  │      │
│  (83) · with<Module>Access                       │      │
│  lib/auth_utils.ts:401-489                       │      │
│         │                                         │      │
│         ├─▶ require<Module>Access()  ← LỚP QUYỀN │      │
│         │   lib/auth_utils.ts:522-910   DUY NHẤT │      │
│         └─▶ createAdminClient()  service_role    │      │
│             lib/supabase/server.ts:41-53         │      │
│             ⇒ BỎ QUA RLS HOÀN TOÀN               │      │
└──────────────────────┬───────────────────────────┘      │
                       ▼                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SUPABASE POSTGRES (Singapore)                    │
│  · 107 RPC được gọi từ code (phần lớn SECURITY DEFINER)          │
│  · Trigger emit_realtime_signal trên 35 bảng                     │
│  · Publication supabase_realtime = CHỈ realtime_signals          │
└──────────────────────────────────────────────────────────────────┘

NHÁNH PWA / SERVICE WORKER (client-only)
  next.config.ts:220-321 @ducanh2912/next-pwa (workbox)
   · importScripts: ["/push-sw.js"]  (next.config.ts:239)
   · proxy.ts matcher PHẢI loại trừ mọi file SW (proxy.ts:17)
   · RULE 1 supabase /auth/* → NetworkOnly
   · RULE 2 navigate → NetworkOnly (tránh shell RSC cũ)
   · RULE 4b supabase /rest/* → NetworkOnly
   · fallback document → /offline

NHÁNH GALLERY CÔNG KHAI (không đăng nhập)
  app/gallery/[accessUrl]/page.tsx  → getPublicGallery()
   → app/actions/gallery-public-actions.ts:30 createAdminClient()
   ⇒ vai anon KHÔNG query DB; token trong URL + verify_gallery_password
```

**Chạy ở đâu:**

| Chạy trên SERVER | Chạy trên CLIENT |
|---|---|
| `proxy.ts` + `lib/supabase/middleware.ts` (edge/node) | `components/layout/app-shell.tsx` và toàn bộ cây `"use client"` |
| Mọi `app/actions/*.ts` (`"use server"`) | `hooks/use-realtime*.ts` — mở WebSocket bằng anon key |
| Mọi `app/**/route.ts` | `lib/client-direct/contract-drawer.ts` — query Postgres bằng anon key |
| `lib/api/dashboard.ts` (`unstable_cache`) | `lib/swr-persist.ts` + `lib/dashboard-idb-cache.ts` (IndexedDB) |
| `lib/auth_utils.ts`, `lib/server-cache-invalidation.ts` | Service worker `public/sw.js` (sinh khi build) |

---

## 2. Xác thực & phân quyền

### 2.1 Luồng đăng nhập

| Bước | File:dòng | Việc |
|---|---|---|
| 1. Form login | `app/actions/auth.ts:112` `login(formData)` | dùng `createClient()` (SSR cookie client, vai **anon**) — `auth.ts:123` |
| 2. Rate-limit | `app/actions/auth.ts:104,168,179,190` | đọc/ghi bảng `login_attempts` **trước khi** đăng nhập |
| 3. Xác thực | `app/actions/auth.ts:144` `supabase.auth.signInWithPassword` | GoTrue phát cookie phiên |
| 4. Mọi request sau | `proxy.ts:4` → `lib/supabase/middleware.ts:47` | `updateSession()` |
| 5. Verify claim | `lib/supabase/middleware.ts:116` `supabase.auth.getClaims()` | JWT verify tại chỗ |
| 6. Bơm header | `lib/supabase/middleware.ts:131-160` | `AUTH_PROXY_SOURCE/SUB/EMAIL/ROLE/FULL_NAME` |
| 7. Chặn | `lib/supabase/middleware.ts:180-190` | chưa auth + route riêng tư → `/login`; đã auth + `/login` → `/dashboard` |
| 8. Shell | `app/(protected)/layout.tsx:10-18` | không context → `/login`; `isEmployeeDisabled` → `/account-disabled` |

**Phiên lưu ở đâu:** cookie Supabase SSR (`@supabase/ssr` `createServerClient` với `cookies.getAll/setAll`, `lib/supabase/middleware.ts:57-79`; `lib/supabase/server.ts:11-38`). Mỗi response từ middleware bị đóng dấu `Cache-Control: private, no-store` (`lib/supabase/middleware.ts:38-46`) và `next.config.ts:137-145` áp cùng chính sách cho mọi trang HTML.

**Danh sách public route** (bỏ qua kiểm auth): `lib/supabase/middleware.ts:81-107` — gồm `/login`, `/forgot-password`, `/reset-password`, `/account-disabled`, `/auth`, `/offline`, `/api/auth`, `/api/drive-download`, `/api/og`, `/api/gallery-download`, `/api/gallery-download-batch`, `/gallery`, `/manifest.json`, `/sw.js`, `/push-sw.js`, `/workbox-`, `/fallback-`, `/swe-worker-`, icon, **và `/api/e2e/`** (route tự trả 404 ở production — `app/api/e2e/login/route.ts:22-24`).

### 2.2 `employees` gắn với auth user thế nào

- Khoá nối: `employees.auth_user_id` = `auth.users.id` — `lib/auth_utils.ts:128` (`.eq("auth_user_id", userId)`).
- Đọc bằng **service role**: `lib/auth_utils.ts:195-203` `getEmployeeContextByAuthUserId` → `createAdminClient()`.
- "Active" = `deleted_at IS NULL && status === "active"` — `lib/auth_utils.ts:98-100`.
- Bootstrap khi chưa có hồ sơ (`lib/auth_utils.ts:264-340`): ưu tiên **link theo email** (`.eq("email", email).is("auth_user_id", null)` — `:279-286`), nếu không có thì `INSERT` hồ sơ mới (`:317-331`), rồi đồng bộ ngược `user_metadata.full_name` + `app_metadata.role` (`syncAuthIdentity`, `:219-262`).
- Bootstrap **chỉ chạy** khi gọi `getAuthenticatedUserContext({ bootstrapProfile: true })` (`lib/auth_utils.ts:345-354`); layout gọi **không** truyền cờ → không bootstrap (`app/(protected)/layout.tsx:10`).
- Retry khi PostgREST lỗi schema-cache: `lib/auth_utils.ts:56,102-146`.
- Toàn bộ context được cache theo request bằng React `cache()` — `lib/auth_utils.ts:342,148,158,172,195,205`.

### 2.3 Vai trò

`types/roles.ts:3` — `ROLES = ["admin","manager","sale","media","viewer"]`.
Ma trận `ROLE_PERMISSIONS` — `types/roles.ts:7-47`:

| Module | admin | manager | sale | media | viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| dashboard, moodie | ✅ | ✅ | ✅ | ✅ | ✅ |
| calendar | ✅ | ✅ | ✅ | ✅ | |
| contracts, crm, dresses | ✅ | ✅ | ✅ | | |
| productivity | ✅ | ✅ | | ✅ | |
| finance, inventory, reports, employees, printing, settings, services, salaries, goals | ✅ | ✅ | | | |

`admin` và `manager` có **danh sách module y hệt nhau** (`types/roles.ts:8-43`) — khác biệt chỉ nằm ở guard hẹp hơn.

**Cầu nối vai trò app ↔ DB:** `normalizeRole()` (`types/roles.ts:51-62`) gộp `viewer|user|ctv` **và mọi giá trị lạ** → `"viewer"` (fallback ở `:61`, không ném lỗi). `normalizeEmployeeRole()` (`:64-79`) map ngược → `"ctv"`. Enum DB `employee_role_enum = admin|manager|sale|media|ctv` (`vault/30-du-lieu/rpc-va-enum.md`, chưa đọc lại từ migration).

### 2.4 Hàm guard dùng chung — `lib/auth_utils.ts`

**Wrapper (tạo client + bắt lỗi):**

| Wrapper | Xác minh user | Dòng | Số call-site |
|---|---|---|---|
| `withAuth` | `getVerifiedUser()` → `supabase.auth.getUser()` (gọi mạng GoTrue) | `:401-423` (`:148-156`) | 167 |
| `withAuthRead` | `getClaimsUser()` → header proxy hoặc `getClaims()` tại chỗ | `:436-458` (`:158-193`) | 18 |
| `withAdmin` | `getVerifiedUser()` + `canCurrentUserManageSettings()` | `:460-489` (`:205-217`) | 83 |
| `withFinanceRead` | `withAuth` + `requireFinanceAccess` | `:591-598` | 28 |
| `withPrintingAccess` | `:615-622` | | 26 |
| `withInventoryAccess` | `:663-670` | | 19 |
| `withServicesAccess` | `:639-646` | | 14 |
| `withDressesAccess` / `Booking` / `CatalogWrite` | `:717-742` | | 10 / 9 / 5 |
| `withEmployeesAccess` / `WriteAccess` / `DirectoryAccess` | `:780-805` | | 3 / 6 / 1 |
| `withContractAccess` / `WriteAccess` / `DestructiveAccess` | `:852-877` | | **0 / 0 / 0 — định nghĩa nhưng KHÔNG file nào dùng** |

Cả ba wrapper gốc đều trả **service-role client** (`lib/auth_utils.ts:411, 446, 477` → `createAdminClient()`), tức **RLS bị bỏ qua** trên mọi luồng đăng nhập.

**Guard (`require*`) — lớp phân quyền thật:**

| Guard | Điều kiện | Dòng | Call-site |
|---|---|---|---|
| `requireSettingsAdminAccess` | employee active + `canManageSettingsRole` | `:522-537` | 3 |
| `requireCrmAccess` | có employee + `canAccess(role,"crm")` | `:544-556` | 23 |
| `requireMoodieAccess` | có employee + `canAccess(role,"moodie")` | `:562-574` | 15 |
| `requireFinanceAccess` | `canAccess(role,"finance")` (**không** đòi employee) | `:581-589` | 19 |
| `requirePrintingAccess` | `canAccess(role,"printing")` | `:605-613` | 2 |
| `requireServicesAccess` | `canAccess(role,"services")` | `:629-637` | 2 |
| `requireInventoryAccess` | `canAccess(role,"inventory")` | `:653-661` | 5 |
| `requireDressesAccess` | `canAccess(role,"dresses")` | `:677-685` | 4 |
| `requireDressesBookingAccess` | + role ∈ {admin, manager, sale} | `:687-702` | — |
| `requireDressesCatalogWriteAccess` | + role ∈ {admin, manager} | `:704-715` | — |
| `requireEmployeesAccess` | `canAccess(role,"employees")` | `:744-752` | 3 |
| `requireEmployeesWriteAccess` | + {admin, manager} | `:754-765` | — |
| `requireEmployeeDirectoryAccess` | role ≠ `viewer` (**không** kiểm module) | `:767-778` | — |
| `requireContractAccess` | `canAccess(role,"contracts")` | `:812-820` | **63** |
| `requireContractWriteAccess` | + {admin, manager, sale} | `:822-837` | 14 |
| `requireContractDestructiveAccess` | + {admin, manager} | `:839-850` | 10 |
| `requirePaymentRecordAccess` | role ∈ {admin, manager, sale} | `:884-892` | 3 |
| `requireCodebaseAccess` | role === `admin` **và** phải có employee | `:898-910` | 1 |
| `requireDashboardAccess` | `canAccess(role,"dashboard")` | `lib/api/dashboard.ts:220-237` | 6 |
| `resolveProductivityViewerContext` | role ∈ `PRODUCTIVITY_ALLOWED_ROLES` | `lib/productivity-auth.ts:57-85` | — |

Lõi chung: `resolveActiveUserRole()` — `lib/auth_utils.ts:491-520` — ném `"Tài khoản nhân viên đã bị vô hiệu hóa"` nếu employee tồn tại nhưng không active; nếu **không có employee** thì lấy role từ `app_metadata`/`user_metadata` của auth user (`:503-517`).

**Guard tầng route (Server Component layout):**

| Layout | Guard | file:dòng |
|---|---|---|
| `finance` | `canAccess(...,"finance")` → `<AccessDenied>` | `app/(protected)/finance/layout.tsx:17-21` |
| `contracts` | `canAccess(...,"contracts")` | `app/(protected)/contracts/layout.tsx:17-20` |
| `employees` | `canAccess(...,"employees")` | `app/(protected)/employees/layout.tsx:14` |
| `moodie` | `canAccess(...,"moodie")` | `app/(protected)/moodie/layout.tsx:14` |
| `inventory` | `canAccess(...,"inventory")` | `app/(protected)/inventory/layout.tsx:14` |
| `printing` | `canAccess(...,"printing")` | `app/(protected)/printing/layout.tsx:14` |
| `dresses` | `canAccess(...,"dresses")` | `app/(protected)/dresses/layout.tsx:14` |
| `reports` | `canAccess(...,"reports")` | `app/(protected)/reports/layout.tsx:14` |
| `services` | `canAccess(...,"services")` | `app/(protected)/services/layout.tsx:14` |
| **`crm`** | **KHÔNG có** — pass-through | `app/(protected)/crm/layout.tsx:1-7` |
| **`settings`** | **KHÔNG có** — pass-through | `app/(protected)/settings/layout.tsx:1-8` |
| **`admin/*`** | **KHÔNG có layout** | `app/(protected)/admin/vendors/page.tsx:7-11` không guard |

Guard tầng page riêng lẻ: `calendar` (`app/(protected)/calendar/page.tsx:13-17`), `productivity` (`:22-32`), `audit-logs` (`app/(protected)/audit-logs/page.tsx:13-14`, dùng `context.canManageSettings`), `settings/studio` (`app/(protected)/settings/studio/page.tsx:22`), `finance/page.tsx:11`.

### 2.5 API route đặc quyền

| Route | Cơ chế | file:dòng |
|---|---|---|
| `/api/push/send` | `isAuthorizedInternalRequest(Authorization, INTERNAL_API_KEY)` + zod schema | `app/api/push/send/route.ts:32-40` |
| `/api/moodie/runs/worker` | `CRON_SECRET \|\| INTERNAL_API_KEY` | `app/api/moodie/runs/worker/route.ts:7-12` |
| `/api/moodie/memory/maintenance` | `isAuthorizedInternalRequest` | (yêu cầu bởi `scripts/verify-privileged-entrypoints.mjs:13-16`) |
| `/api/e2e/login` | trả 404 khi `NODE_ENV === "production"` | `app/api/e2e/login/route.ts:22-24` |

`isAuthorizedInternalRequest` dùng `timingSafeEqual` + `import "server-only"` — `lib/internal-api-auth.ts:1-17`.

### 2.6 RLS — bằng chứng tìm được trong migration

**Nguyên tắc đã ghi bằng code:** RLS **không** phải lớp bảo vệ luồng đăng nhập (service role bỏ qua). Nó chỉ có tác dụng ở 3 chỗ: vai `anon`, vai `authenticated` khi **realtime**, và **nhánh client-direct** (mục 6).

- `ENABLE ROW LEVEL SECURITY` xuất hiện **56 lần** trong migration, trên các bảng (trích): `contracts`, `contract_events`, `contract_checklists`, `contract_notes`, `work_tasks`, `payment_plans`, `payment_plan_allocations`, `dresses`, `dress_rentals`, `dress_reservations`, `dress_rental_accessories`, `inventory_items`, `inventory_transactions`, `approval_requests`, `galleries`, `gallery_images`, `gallery_share_links`, `gallery_password_attempts`, `gallery_filter_jobs`, `gallery_selection_batches`, `gallery_selection_batch_items`, `expense_allocations`, `finance_close_tasks`, `finance_monthly_closes`, `realtime_signals`, `system_settings`, `vendors`, `push_subscriptions`, `event_templates`, `printing_order_status_history`, cùng nhóm `ai_*` và `moodie_*`.
- Helper policy chuẩn: `public.is_active_employee()` — **SECURITY DEFINER · STABLE** — `supabase/migrations/20260605030000_active_employee_rls_helper.sql:24-36`. `REVOKE ... FROM PUBLIC, anon` + `GRANT EXECUTE TO authenticated, service_role` (`:38-39`).
- Lý do phải có helper (đã ghi trong chính migration): policy inline `EXISTS (SELECT 1 FROM employees …)` làm **cả request 403** vì `employees` bị REVOKE khỏi `authenticated` — `20260605030000…sql:4-11`.
- Policy contract module viết lại theo helper: `20260605030000…sql:42-60` (`contracts`, `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans`, …).
- Bảng chỉ-server bị **REVOKE khỏi `authenticated`** (bằng chứng trực tiếp):
  - `inventory_items`, `inventory_transactions` — `20260428200000_inventory_security_hardening.sql:7-8`
  - `dresses`, `dress_reservations`, `dress_rentals`, `dress_rental_accessories` — `20260429110000_dresses_audit_fix.sql:10-13`
  - `system_settings` — `20260429142000_settings_security_hardening.sql:8-10`
  - `employees` (+ nhóm bảng nhân sự, qua vòng lặp `format(...)`) — `20260429130000_employees_audit_fix.sql:70`
  - `expense_allocations` — `20260825200000_cashflow_m1_expense_allocations.sql:58`
  - `gallery_password_attempts` — `20260721000000_gallery_password_attempts.sql:16`
  - `realtime_signals` — `20260610130000_realtime_signals.sql:39` (rồi `GRANT SELECT` lại ở `:40`)
- Vai `anon`: `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon` + `ALTER DEFAULT PRIVILEGES … REVOKE ALL ON TABLES FROM anon`, chỉ cấp lại `login_attempts` — `20260610150000_revoke_anon_table_privileges.sql:29-36`. Migration ghi rõ: **`login_attempts` là bảng duy nhất anon còn quyền**, vì login rate-limit chạy pre-auth bằng vai anon (`app/actions/auth.ts:99-190`, dẫn trong `:20-22` của migration).
- View: `employees_public` (projection an toàn cho browser) — `20260605020000_client_direct_rls_prereq.sql:29-44`; siết lại `REVOKE ALL FROM anon, authenticated` rồi `GRANT SELECT TO authenticated` ở `20260605020001_employees_public_grant_fix.sql:15`.

---

## 3. Cache & realtime

### 3.1 Các tầng cache đang dùng

| Tầng | Nơi cấu hình | Luật |
|---|---|---|
| **`unstable_cache` (server)** | `lib/api/dashboard.ts:912,1001,1037,1073,1109,1145`; `lib/productivity-auth.ts:35`; `app/actions/gallery-image-helpers.ts:56` | Dashboard: `revalidate` 120s cho `critical`/`bootstrap` (`lib/api/dashboard.ts:63,942,1195`), 300s cho các section (`:64,1021,1057,1093,1129`). Gallery: 7200s + tag `gallery-images-${id}` (`gallery-image-helpers.ts:80-83`). **`userId` luôn nằm trong key** để không rò dữ liệu giữa người dùng (`lib/api/dashboard.ts:913-919`). |
| **`revalidateTag`** | `lib/server-cache-invalidation.ts:26,71,72,95,96`; `app/actions/dashboard-cache.ts:70`; `app/actions/settings-mutations.ts:262`; `app/api/auth/google/callback/route.ts:192`; `app/actions/gallery-selection-actions.ts:45,61` | Tag thật đang có producer: `dashboard-critical`, `dashboard-revenue`, `dashboard-services`, `dashboard-events`, `dashboard-payments` (`lib/api/dashboard.ts:57-61`), `gallery-images-${id}`. |
| **`revalidatePath`** | 40 lần `inventory-mutations.ts`, 17 `lab-mutations.ts`, 13 `moodie-provider-actions.ts`, 12 `debt-actions.ts`, 11 `receipt-actions.ts` / `customer-actions.ts`, 10 `goal-budget-actions.ts`… | Xương sống làm tươi. Helper gom nhóm: `lib/server-cache-invalidation.ts:30-97` (`invalidateFinancePaths`, `invalidateContractPaths`, `invalidateDressPaths`, `invalidatePrintingPaths`, `invalidateCalendarPaths`). |
| **Client Router Cache** | `next.config.ts:188-191` | `staleTimes: { dynamic: 180, static: 600 }` — comment `:180-187` ghi rõ đã thử rút xuống 30 và **tệ hơn**, đã lùi lại 180. |
| **SWR** | `lib/swr.ts:132-154` | `revalidateOnFocus/Reconnect: true`, `dedupingInterval: 5000`, `errorRetryCount: 2`, `keepPreviousData: true`. `onErrorRetry` riêng cho lỗi *"unexpected response was received from the server"*: chỉ retry **1 lần sau 4s** (`lib/swr.ts:130,141-145`). Key factory tập trung: `lib/swr.ts:7-119`. Invalidate theo tiền tố: `revalidateByPrefixes` (`:187-192`), khớp key mảng bằng `cacheKeyMatchesPrefix` (`:172-181`). |
| **React Query** | `components/providers/query-provider.tsx:9-19` + `lib/query-config.ts:3-28` | `networkMode: "offlineFirst"`, `refetchOnWindowFocus: true`. Profile: contracts `staleTime 30′`, dashboard `staleTime 10s + refetchInterval 15s`, reference `staleTime Infinity`. |
| **IndexedDB (SWR persist)** | `lib/swr-persist.ts` | DB `mood-studio-v2` / store `swr-cache`; TTL **24h** (`:6,106`); whitelist 22 tiền tố (`:8-29`) **bao gồm `finance`, `payments`, `receipts`, `expenses`, `debts`, `goals`**; chặn key chứa `auth`/`search`/`temporary` (`:59-65`); ghi debounce 250ms (`:85-96`). |
| **IndexedDB (dashboard)** | `lib/dashboard-idb-cache.ts:9,32,56` | TTL 5 phút, đóng dấu `NEXT_PUBLIC_APP_VERSION`. |
| **PWA / workbox** | `next.config.ts:220-321` | RULE 1 supabase `/auth/*` NetworkOnly · RULE 2 navigate NetworkOnly · RULE 3 supabase storage SWR 30 ngày · RULE 4a một số RPC NetworkFirst 300s · RULE 4b supabase `/rest/*` NetworkOnly · RULE 5 `_next/static` CacheFirst · RULE 6 `lh3.googleusercontent.com` CacheFirst 30 ngày / 500 entry. `publicExcludes` loại file có `#` hoặc dấu cách (`:231`). |
| **Header trang** | `next.config.ts:137-145` | Mọi HTML: `private, no-store, max-age=0, must-revalidate` + CSP (`:10-22`) `frame-ancestors 'none'`. |
| **React `cache()` theo request** | `lib/auth_utils.ts:148,158,172,195,205,342`; `lib/supabase/server.ts:11,41` | `getAuthenticatedUserContext`, `createClient`, `createAdminClient` dedupe trong 1 request. |

### 3.2 Realtime — chỉ còn MỘT cơ chế

**Publication `supabase_realtime` hiện chỉ chứa `realtime_signals`.**

- Từng thêm 9 bảng contract (`20260610010000_realtime_publication_contract_tables.sql:26-36`) và 5 bảng CRM/calendar/dashboard (`20260610120000…sql:29-36`).
- `20260714040000_realtime_signal_only_hardening.sql:8-42` **DROP TABLE khỏi publication** đúng 15 bảng: `contracts, payments, contract_checklists, contract_notes, contract_events, work_tasks, payment_plans, dress_reservations, printing_orders, crm_leads, customers, schedules, approval_requests, receipts, google_sync_queue` — và gắn trigger `emit_realtime_signal` cho từng bảng.
- Sau đó `ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_signals` (`:48-59`), `REVOKE ALL … FROM anon, authenticated` + `GRANT SELECT TO authenticated` (`:45-46`).
- Không migration nào sau `20260714040000` thêm bảng nghiệp vụ trở lại publication (grep `supabase_realtime` chỉ khớp 4 file).

**Bảng tín hiệu:** `realtime_signals {id, table_name, op, changed_at}` — `20260610130000_realtime_signals.sql:26-31`. RLS bật, policy `USING (public.is_active_employee())` (`:34-38`). Trigger fn `emit_realtime_signal()` **SECURITY DEFINER + `SET search_path = public`**, tự dọn signal >1h, `RETURN NULL` (`:43-54`).

**35 bảng có trigger `emit_realtime_signal` (FOR EACH STATEMENT):**

| Migration | Bảng |
|---|---|
| `20260610130000…sql:62-71` | `dresses`, `dress_rentals`, `inventory_items`, `inventory_transactions`, `services`, `service_categories`, `studio_info`, `employees` |
| `20260610140000_realtime_signals_finance_tables.sql:22-31` | `expenses`, `debts`, `fixed_costs`, `financial_goals`, `budgets`, `investments`, ~~`vendor_payments`~~, `monthly_salaries`, `transaction_categories` |
| `20260714010000_settings_realtime_signals.sql:9-13` | `notification_preferences`, `system_settings`, `credit_cards` |
| `20260714030000_moodie_memory_realtime_signal.sql:5-14` | `moodie_memories` |
| `20260714040000…sql:8-24` | 15 bảng contract/CRM/calendar liệt kê ở trên |

> `vendor_payments` đã bị `DROP TABLE … CASCADE` (kéo theo trigger) — `20260826130000_cashflow_m2b_drop_legacy.sql:36-40`. Còn lại **35** bảng sống.

**Bảng tiền có vào publication không?** Câu trả lời xác minh được: **KHÔNG — không bảng nghiệp vụ nào còn trong publication, kể cả bảng tiền.** `receipts`/`payments`/`payment_plans` từng ở trong publication (`20260610010000`, `20260610120000`) nhưng đã bị gỡ (`20260714040000…sql:10,15,22`). `expenses/debts/fixed_costs/financial_goals/budgets/investments/monthly_salaries/transaction_categories` **chưa bao giờ** vào publication — migration ghi rõ *"KHÔNG grant gì, KHÔNG thêm bảng finance vào publication … Số tiền không bao giờ chảy qua realtime payload"* (`20260610140000…sql:10-12`).

**Client subscribe ở đâu (toàn bộ — 100% qua `realtime_signals`):**

| Call-site | Bảng nguồn nghe |
|---|---|
| `components/finance/finance-realtime-refresh.tsx:29-47` | `receipts`, `payments`, `payment_plans` + 8 bảng finance qua `table_name=in.(...)` (`:17-18`); handler chỉ `router.refresh()` (`:25-27`) |
| `components/contracts/contracts-list-client.tsx:222-236` | `contracts`, `customers`, `contract_events`, `contract_checklists` |
| `components/contracts/detail/contract-detail-client.tsx:496-522` | `contracts`, `customers`, `contract_events`, `work_tasks`, `payments` |
| `components/contracts/contract-drawer.tsx:115-130` | `contract_notes`, `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans` |
| `components/inventory/inventory-list-client.tsx:157-170` | `inventory_items`, `inventory_transactions` |
| `components/inventory/approval-requests-tab.tsx:39-46` | `approval_requests` |
| `components/dresses/dresses-list-client.tsx:97-99` | `dresses`, `dress_reservations`, `dress_rentals` |
| `components/dresses/standalone-rentals-client.tsx:82` / `rental-history-client.tsx:132` | `dress_rentals` / `dress_reservations` |
| `components/crm/lead-list-page.tsx:179` · `customer-list-client.tsx:101,105` | `crm_leads` · `customers`, `contracts` |
| `components/services/services-list-client.tsx:148,153` · `quote/*.tsx` | `services`, `service_categories`, `studio_info` |
| `components/settings/settings-view.tsx:66,71` · `members-section.tsx:50` · `credit-cards-client.tsx:30` · `studio-info-form.tsx:176,181` | `employees`, `notification_preferences`, `credit_cards`, `studio_info`, `system_settings` |
| `components/productivity/productivity-realtime.tsx:14,20` | `work_tasks`, `employees` |
| `components/employees/employee-detail-page.tsx:49` | `employees` |
| `components/moodie/moodie-memory-panel.tsx:64` | `moodie_memories` |
| `components/dashboard/dashboard-realtime-refresh.tsx:104-119` | **kênh tự dựng** (không qua hook) nhưng vẫn subscribe `table: "realtime_signals"` với `filter: table_name=in.(...)` — 7 bảng lọc theo `visibility` (`:9-17,33-37`) |

**Hook:** `useRealtimeSignal(sourceTable)` → `useRealtime("realtime_signals", { filter: table_name=eq.X, eventTypes: ["INSERT"] })` — `hooks/use-realtime-signal.ts:33-42`. `normalizeRealtimePayload()` dịch ngược payload signal về `{table, eventType}` gốc — `hooks/use-realtime.ts:18-33`.

**Cổng tự động:** `scripts/verify-realtime-client-surface.mjs:12-19` — fail nếu bất kỳ file `components/**` hoặc `hooks/**` gọi `useRealtime("<bảng khác realtime_signals>")`, hoặc dùng `useRealtimeMulti` với `table: "<bảng khác>"`. Chạy bằng `npm run verify:realtime-client` (`package.json:20`).
⚠️ Script **không bắt** kênh tự dựng bằng `supabase.channel(...)` như `dashboard-realtime-refresh.tsx` (file này hiện vẫn đúng luật, nhưng không có cổng canh).

---

## 4. Bản đồ route

Kiểu: **SC** = Server Component · **CC** = `"use client"` · `force-dynamic` ghi rõ khi có.
Quyền: guard tầng layout/page tìm được trong code; nếu trống thì **chỉ** guard ở tầng server action.

### 4.1 Route công khai (ngoài `(protected)`)

| Route | Kiểu | Dữ liệu | Quyền | file:dòng |
|---|---|---|---|---|
| `/` | SC | — | — | `app/page.tsx` |
| `/login` | — | `app/actions/auth.ts:112` (`login_attempts`) | public; đã auth → `/dashboard` | `lib/supabase/middleware.ts:188-190` |
| `/forgot-password`, `/reset-password` | CC | `supabase.auth.*` (browser client) | public | `components/auth/reset-password-form.tsx:17` |
| `/account-disabled` | SC | — | public | `app/account-disabled/page.tsx` |
| `/offline` | SC | — | public (fallback PWA) | `next.config.ts:232-234` |
| `/gallery/[accessUrl]` | SC `force-dynamic` | `getPublicGallery()` → **service role** | **KHÔNG đăng nhập**; quyền = token URL + `verify_gallery_password` | `app/gallery/[accessUrl]/page.tsx:5,35`; `app/actions/gallery-public-actions.ts:28-30,182-238` |

### 4.2 API route (27)

| Nhóm | Route | Quyền |
|---|---|---|
| Auth | `/api/auth/callback`, `/auth/callback`, `/auth/confirm`, `/api/auth/google`, `/api/auth/google/callback` | public prefix `/api/auth`, `/auth` (`lib/supabase/middleware.ts:88,91`) |
| Gallery công khai | `/api/gallery-download/[token]/[imageId]`, `/api/gallery-download-batch/[token]`, `/api/drive-download/[fileId]` | public prefix (`middleware.ts:92-95`) |
| Nội bộ (Bearer secret) | `/api/push/send`, `/api/moodie/runs/worker`, `/api/moodie/memory/maintenance` | `isAuthorizedInternalRequest` — `lib/internal-api-auth.ts:5-17` |
| Moodie (phiên người dùng) | `/api/moodie/runs`, `/runs/[runId]/{cancel,confirm,retry}`, `/messages/stream`, `/attachments`, `/audio/transcription`, `/provider/config`, `/voice/{ask,events,token}` | qua middleware + guard trong route |
| Khác | `/api/contracts/[id]/prefetch`, `/api/push/subscribe`, `/api/calendar/sync-worker`, `/api/monitoring/web-vitals` | `/api/monitoring/web-vitals` bị loại khỏi matcher (`proxy.ts:17`) |
| DEV | `/api/e2e/login` | 404 ở production (`app/api/e2e/login/route.ts:22-24`) |

### 4.3 Route trong `(protected)` — 54 trang

Toàn bộ đi qua `app/(protected)/layout.tsx:10-24`.

| Nhóm | Trang | Kiểu | Dữ liệu lấy từ | Quyền tầng route |
|---|---|---|---|---|
| **Dashboard** | `/dashboard` | SC `force-dynamic` | `lib/api/dashboard.ts` (`unstable_cache` + `dashboard_critical_kpis`, `dashboard_revenue_chart`, `dashboard_service_breakdown`) | `requireDashboardAccess` trong loader (`lib/api/dashboard.ts:220`) |
| **Hợp đồng** (6) | `/contracts`, `/contracts/create`, `/contracts/[id]`, `/[id]/edit`, `/[id]/print`, `/[id]/gallery` | SC (list) + CC | `app/actions/contract-queries.ts` (`get_contract_list_v2`, `get_contract_detail_v2/v3`), `gallery-admin-actions.ts` | layout `canAccess("contracts")` — `contracts/layout.tsx:20` |
| **CRM** (4) | `/crm`, `/crm/leads`, `/crm/customers`, `/crm/customers/[id]` | SC | `customer-actions.ts`, client SWR → `lead-actions.ts` | **KHÔNG có guard route** (`crm/layout.tsx:1-7`); chỉ `requireCrmAccess` trong action |
| **Tài chính** (17) | `/finance`, `/dashboard`, `/receipts(+[id],+print)`, `/expenses(+[id],+print)`, `/debts`, `/payables`, `/cashflow`, `/categories`, `/fixed-costs`, `/investments`, `/goals`, `/budget`, `/salaries`, `/closes(+[id])` | SC, hầu hết `force-dynamic` | `finance-operations-queries.ts`, `finance-dashboard-queries.ts`, `finance-intelligence-queries.ts`, `finance-close-actions.ts`, `payable-actions.ts`, `goal-budget-actions.ts` | layout `canAccess("finance")` — `finance/layout.tsx:21` |
| ↳ redirect | `/finance/lab-debts`, `/finance/vendor-debts` | SC | — | cả hai `redirect("/finance/payables")` — `lab-debts/page.tsx:4-6` |
| **Kho vật tư** (2) | `/inventory`, `/inventory/[id]` | SC `force-dynamic` | `inventory-queries.ts` (`inventory_list`, `inventory_detail_v2`, `inventory_stats`) | layout `canAccess("inventory")` |
| **In ấn / Lab** (2) | `/printing`, `/printing/labs` | SC `force-dynamic` | `printing-queries.ts`, `lab-queries.ts` | layout `canAccess("printing")` |
| **Váy cưới** (2) | `/dresses`, `/dresses/rentals` | SC `force-dynamic` | `dress-queries.ts`, `rental-queries.ts` | layout `canAccess("dresses")` |
| **Dịch vụ** (4) | `/services`, `/services/create`, `/services/[id]`, `/[id]/quote` | SC | `service-queries.ts`, `settings-queries.ts` | layout `canAccess("services")` |
| **Nhân sự** (2) | `/employees`, `/employees/[id]` | SC | `employee-queries.ts` | layout `canAccess("employees")` |
| **Lịch** | `/calendar` | SC (`routeMode: "app"`) | client SWR → `calendar-queries.ts` (`calendar_month_events`) | page: `ROLE_PERMISSIONS` check → `redirect("/")` (`calendar/page.tsx:13-17`) |
| **Năng suất** | `/productivity` | SC `force-dynamic` | `productivity-actions.ts` (`get_employee_productivity`…) | page: `PRODUCTIVITY_ALLOWED_ROLES` → `redirect("/dashboard")` (`:32`) |
| **Báo cáo** | `/reports` | SC `force-dynamic` | client → `finance-reports-queries.ts` (`finance_reports_snapshot`) | layout `canAccess("reports")` |
| **Moodie** | `/moodie` | SC `force-dynamic` (`routeMode: "chat"`) | `moodie-queries.ts` | layout `canAccess("moodie")` |
| **Cài đặt** (3) | `/settings`, `/settings/studio`, `/settings/credit-cards` | SC | `settings-queries.ts`, `lib/settings-studio-admin.ts` (**`createAdminClient` gọi thẳng trong RSC** — `settings/studio/page.tsx:18`) | layout **KHÔNG guard**; `/settings/studio` tự guard `canManageSettings` (`:22`) |
| **Nhật ký** | `/audit-logs` | SC | **`createAdminClient()` gọi thẳng trong RSC** — `audit-logs/page.tsx:16-17` | `canManageSettings` → `redirect("/settings")` (`:14`) |
| **Admin** (2) | `/admin/vendors`, `/admin/backfill-dimensions` | SC / CC | `vendor-actions.ts`, `gallery-dimensions-actions.ts` | **KHÔNG guard route** — `admin/vendors/page.tsx:7-11` |

**Chế độ khung (AppShell):** `lib/app-shell-route-mode.ts:9-17` — `fullpage` cho `*/print`, `app` cho `/calendar`, `chat` cho `/moodie`, `form` cho `/contracts/create`, `/contracts/[id]/edit`, `/services/[id]/quote`, `gallery` cho `/contracts/[id]/gallery`.
`FinanceRealtimeRefresh` + `FinanceNavGuard` mount ở **AppShell** (client, mount 1 lần) chứ không ở `finance/layout.tsx` — `components/layout/app-shell.tsx:89,93` (lý do ghi ở `:84-92`).
Điều hướng lọc theo vai: `components/layout/bottom-nav.tsx:56` dùng `ROLE_PERMISSIONS[role]`.

---

## 5. Danh mục RPC

**107 RPC được gọi từ code.** Cột "Loại": `ghi-atomic` = tên `*_atomic`/`*_cascade` (gói nhiều bước ghi), `ghi` = mutation khác, `đọc` = query/stat.

### Hợp đồng & thanh toán hợp đồng (13)

| RPC | Loại | Call-site |
|---|---|---|
| `save_contract_atomic` | ghi-atomic | `contract-mutations.ts`, `lib/moodie/code-tools.ts` |
| `cancel_contract_cascade` | ghi-atomic | `contract-lifecycle.ts` |
| `delete_contract_cascade` | ghi-atomic | `contract-lifecycle.ts` |
| `process_contract_payment_v2` | ghi-atomic | `payment-actions.ts` |
| `void_contract_payment_v2` | ghi-atomic | `payment-actions.ts` |
| `recalc_contract_totals` | ghi | `dress-mutations.ts` |
| `get_contract_list_v2` | đọc | `contract-queries.ts` |
| `get_contract_detail_v2` | đọc | `contract-queries.ts:550` (nhánh flag `NEXT_PUBLIC_RPC_V3 !== "true"`) |
| `get_contract_detail_v3` | đọc | `contract-queries.ts:550` (nhánh flag bật) |
| `contract_stats` | đọc | `contract-queries.ts` |
| `contract_stats_simple` | đọc | `contract-queries.ts` |
| `contract_financials` | đọc | `finance-dashboard-queries.ts` |
| `calendar_month_events` | đọc | `calendar-queries.ts` |

### Tiền / tài chính (27)

| RPC | Loại | Call-site |
|---|---|---|
| `record_payee_payment_atomic` | ghi-atomic | `payable-actions.ts`, `salary-actions.ts` |
| `void_payee_payment_atomic` | ghi-atomic | `payable-actions.ts` |
| `undo_contribution_atomic` | ghi-atomic | `goal-budget-actions.ts` |
| `contribute_to_goal` | ghi | `goal-budget-actions.ts` |
| `advance_close_task` | ghi | `finance-close-actions.ts` |
| `run_integrity_scan` | ghi | `integrity-actions.ts` |
| `finance_month_summary` | đọc | `finance-dashboard-queries.ts` |
| `finance_ledger` | đọc | `finance-dashboard-queries.ts` |
| `finance_ledger_range` | đọc | `finance-dashboard-queries.ts` |
| `finance_pnl_by_month` | đọc | `finance-dashboard-queries.ts` |
| `finance_cashflow_timeline` | đọc | `finance-cashflow-timeline.ts` |
| `finance_service_distribution` | đọc | `finance-dashboard-queries.ts` |
| `finance_pending_collections` | đọc | `finance-dashboard-queries.ts`, `lib/api/dashboard.ts` |
| `finance_contract_profit_report` | đọc | `finance-dashboard-queries.ts` |
| `finance_reports_snapshot` | đọc | `finance-reports-queries.ts`, `lib/moodie/tools.ts` |
| `finance_debt_stats` | đọc | `finance-operations-queries.ts`, `lib/moodie/tools.ts` |
| `finance_expense_stats` | đọc | `finance-operations-queries.ts` |
| `finance_receipt_documents` | đọc | `finance-operations-queries.ts` |
| `finance_receipt_document_stats` | đọc | `finance-operations-queries.ts` |
| `finance_payable_summary` | đọc | `payable-actions.ts` |
| `payable_items` | đọc | `payable-actions.ts` |
| `payee_payment_history` | đọc | `payable-actions.ts` |
| `is_period_locked` | đọc | `finance-operations-queries.ts`, `lib/finance-utils.ts:13` |
| `get_finance_intelligence` | đọc | `finance-intelligence-queries.ts` |
| `get_finance_advanced_intelligence` | đọc | `finance-intelligence-queries.ts` |
| `get_cashflow_forecast` | đọc | `finance-intelligence-queries.ts` |
| `get_expense_breakdown` / `get_receivable_aging` / `get_budget_vs_actual` | đọc | `finance-intelligence-queries.ts` |
| `vendor_cost_report` | đọc | `vendor-reports-queries.ts` |

### Kho vật tư (9)

| RPC | Loại | Call-site |
|---|---|---|
| `inventory_stock_in_atomic` | ghi-atomic | `inventory-mutations.ts` |
| `inventory_stock_out_atomic` | ghi-atomic | `inventory-mutations.ts` |
| `create_sale_receipt_atomic` | ghi-atomic | `inventory-mutations.ts`, `receipt-actions.ts` |
| `create_contract_inventory_addon_sale_atomic` | ghi-atomic | `inventory-mutations.ts` |
| `add_fulfillment_transaction_atomic` | ghi-atomic | `inventory-mutations.ts` |
| `update_fulfillment_transaction_atomic` | ghi-atomic | `inventory-mutations.ts` |
| `delete_fulfillment_transaction_atomic` | ghi-atomic | `inventory-mutations.ts` |
| `nextval_inventory_code` | ghi (sequence) | `inventory-mutations.ts`, `inventory-queries.ts` |
| `inventory_list` / `inventory_detail_v2` / `inventory_stats` / `inventory_item_transaction_totals` | đọc | `inventory-queries.ts` |

### In ấn & Lab (6)

| RPC | Loại | Call-site |
|---|---|---|
| `create_printing_order_atomic` | ghi-atomic | `printing-mutations.ts` |
| `update_printing_order_atomic` | ghi-atomic | `printing-mutations.ts` |
| `delete_printing_order_atomic` | ghi-atomic | `printing-mutations.ts` |
| `record_lab_payment_atomic` | ghi-atomic | `lab-mutations.ts` |
| `recompute_printing_payment_status` | ghi | `expense-actions.ts` |
| `printing_stats` / `printing_lab_overview` / `finance_lab_debt_summary` | đọc | `printing-queries.ts`, `lab-queries.ts`, `printing-reference-queries.ts` |

### Váy cưới (13)

| RPC | Loại | Call-site |
|---|---|---|
| `create_dress_contract_reservation_atomic` | ghi-atomic | `dress-mutations.ts` |
| `update_dress_reservation_status_atomic` | ghi-atomic | `dress-mutations.ts` |
| `release_dress_reservation_atomic` | ghi-atomic | `dress-mutations.ts` |
| `delete_dress_atomic` | ghi-atomic | `dress-mutations.ts` |
| `refresh_dress_status_atomic` | ghi-atomic | `dress-mutations.ts`, `rental-mutations.ts` |
| `create_standalone_dress_rental_atomic` | ghi-atomic | `rental-mutations.ts` |
| `start_dress_rental_atomic` | ghi-atomic | `rental-mutations.ts` |
| `return_dress_rental_atomic` | ghi-atomic | `rental-mutations.ts` |
| `cancel_dress_rental_atomic` | ghi-atomic | `rental-mutations.ts` |
| `mark_dress_cleaned_atomic` | ghi-atomic | `rental-mutations.ts` |
| `dress_list` / `dress_stats` / `is_dress_available` | đọc | `dress-queries.ts` |
| `dress_rental_list` | đọc | `rental-queries.ts` |

### CRM & khách hàng (4)

`convert_lead_to_customer` (ghi-atomic, `lead-lifecycle.ts`) · `append_care_log` (ghi, `lead-lifecycle.ts`) · `nextval_customer_code` (ghi-sequence, `customer-actions.ts`) · `get_crm_lead_stats` / `get_crm_customer_stats` (đọc, `lead-actions.ts` / `customer-actions.ts`).

### Nhân sự & năng suất (6)

`next_employee_code` (ghi-sequence, `employee-mutations.ts`, `employee-queries.ts`) · `employee_stats` (đọc) · `get_employee_productivity`, `get_my_employee_productivity`, `get_employee_job_details`, `get_my_employee_job_details` (đọc, `productivity-actions.ts`, `lib/productivity-transforms.ts`).

### Dịch vụ (2)

`save_service_atomic` (ghi-atomic, `service-mutations.ts`, `category-actions.ts`) · `delete_service_atomic` (ghi-atomic, `service-mutations.ts`).

### Gallery (6)

`get_gallery_data_v3` (đọc, mặc định) · `get_gallery_data_v2` (đọc, fallback — `gallery-composite-actions.ts:44-55`) · `get_gallery_summaries_by_contract` (đọc, `gallery-admin-actions.ts`) · `prepare_gallery_share` (ghi, `gallery-core.ts`) · `set_gallery_password` (ghi, `gallery-admin-actions.ts`) · `verify_gallery_password` (đọc, `gallery-public-actions.ts:238` — **đường công khai**).

### Dashboard (3)

`dashboard_critical_kpis`, `dashboard_revenue_chart`, `dashboard_service_breakdown` — đọc, `lib/api/dashboard.ts`.

### Moodie AI (8)

`claim_moodie_agent_run`, `finish_moodie_agent_run`, `heartbeat_moodie_agent_run`, `retry_moodie_agent_run` (ghi, `lib/moodie/runs/worker.ts`) · `match_moodie_memories` (đọc, `lib/moodie/memory-store.ts`) · `finalize_moodie_memory_consolidation` (ghi, `lib/moodie/memory-consolidator.ts`) · `maintain_moodie_memory_lifecycle` (ghi, `app/api/moodie/memory/maintenance/route.ts:14`) · `reserve_moodie_brave_call` (ghi, `lib/moodie/brave-usage.ts:20` — gọi qua cast `(supabase.rpc as unknown as UntypedRpc)`).

### RPC đã CHẾT (đừng dùng)

| RPC | Drop ở |
|---|---|
| `record_vendor_payment_atomic` | `20260826130000_cashflow_m2b_drop_legacy.sql` |
| `update_vendor_payments_updated_at` | `20260826130000…sql` |
| `upsert_vendor_expense`, `upsert_printing_expense`, `trg_sync_vendor_expense` | `20260825200000_cashflow_m1_expense_allocations.sql` |
| `finance_revenue_by_month`, `finance_dashboard_metrics` | `20260826120000_cashflow_m2_ba_so.sql` |
| `check_inventory_conflict`, `expire_old_reservations` | `20260826200000_drop_printing_inventory_payment_legacy.sql` |
| `get_gallery_data_v2(uuid)` — **chỉ overload 1 tham số** | `20260807000000_drop_gallery_data_v2_single_arg_overload.sql:20` (bản 3 tham số **còn sống**) |

**Hàm mới sau lần sinh vault gần nhất:** `sync_employee_salary_paid(p_salary_id uuid)` — `20260827130000_luong_cung_m5.sql:104-118` (không có trong `vault/30-du-lieu/rpc-va-enum.md`, cũng không có trong `types/database.types.ts`).

**RPC bị viết lại (đổi thân/chữ ký) trong đợt 24–27/08 — vault đang mô tả bản CŨ:**
`finance_month_summary`, `finance_period_ledger`, `finance_pnl_by_month`, `finance_cashflow_timeline`, `finance_reports_snapshot`, `finance_payable_summary`, `finance_pending_collections`, `finance_debt_stats`, `finance_contract_profit_report`, `finance_lab_debt_summary`, `finance_vendor_debt_summary`, `payable_items`, `payable_remaining`, `payee_payment_history`, `record_payee_payment_atomic`, `void_payee_payment_atomic`, `vendor_cost_report`, `get_receivable_aging`, `get_cashflow_forecast`, `get_finance_intelligence`, `get_finance_advanced_intelligence`, `contract_financials`, `get_contract_list_v2`, `printing_stats`, `printing_lab_overview`, `printing_integrity_report`, `create/update/delete_printing_order_atomic`, `recompute_printing_payment_status`, `inventory_stock_in_atomic`, `record_lab_payment_atomic`, `finance_receipt_documents`, `get_contract_detail_v3`, `add/update/delete_fulfillment_transaction_atomic`, `create_default_payment_schedule_v2`, `vn_date`.

---

## 6. Bất biến kiến trúc

| # | Luật | Bằng chứng | Cổng canh |
|---|---|---|---|
| **B1** | **Mọi server action đi qua wrapper auth rồi mới chạm DB bằng service role.** `withAuth*` trả `createAdminClient()` → RLS bị bỏ qua; `require<Module>Access()` là lớp quyền duy nhất. | `lib/auth_utils.ts:411,446,477` · `lib/supabase/server.ts:41-53` | — (không có script canh) |
| **B2** | **Đọc dùng `withAuthRead`, ghi dùng `withAuth`.** `withAuthRead` verify JWT tại chỗ (`getClaims`), tiết kiệm 200–800ms; phân quyền vẫn do `requireXAccess` đảm nhiệm. | `lib/auth_utils.ts:425-435` (comment quy tắc), `:436-458` | — |
| **B3** | **`proxy.ts` matcher phải loại trừ MỌI file service-worker.** Quên một cái → auth trả HTML login → `importScripts()` parse HTML → SW không cài được → PWA đóng băng bản cũ. | `proxy.ts:10-18` (ghi rõ `push-sw.js` từng gây đúng lỗi này) | `npm run verify:pwa-cache`, `verify:pwa-artifact` (`package.json:21-22`); `build` tự chạy `verify-pwa-build-artifact.mjs` (`package.json:7`) |
| **B4** | **Không bảng nghiệp vụ nào được vào publication realtime.** Client chỉ nghe `realtime_signals {table_name, op}` rồi refetch qua server action. | `20260714040000_realtime_signal_only_hardening.sql:1-2,8-42` | `npm run verify:realtime-client` → `scripts/verify-realtime-client-surface.mjs:12-19` |
| **B5** | **Số tiền không bao giờ chảy qua realtime payload.** Bảng finance chỉ có trigger signal, không grant, không publication. | `20260610140000_realtime_signals_finance_tables.sql:10-12` | (gián tiếp B4) |
| **B6** | **Finance GIỮ `revalidatePath`.** Realtime chỉ là "chuông báo màn hình cũ" → `router.refresh()`; không patch cache, không đọc số từ payload. | `components/finance/finance-realtime-refresh.tsx:8-11,25-27` | — |
| **B7** | **Không optimistic cho giá trị server tính** (mã tự sinh, `recalc_contract_totals`, tồn kho bình quân, trạng thái `*_atomic`). Mẫu đúng: đóng modal + revalidate. | `vault/10-nen-tang/cache-va-realtime.md` §2; helper duy nhất `lib/optimistic-mutation.ts` (`vault/10-nen-tang/quy-uoc-code.md` bảng helper) | — |
| **B8** | **Không `revalidate(key, undefined)`** — xoá cache trước khi refetch xong → nháy skeleton. Dùng `revalidateByPrefixes`. | `lib/swr.ts:183-192` (comment luật ngay trên hàm) | — |
| **B9** | **Entrypoint đặc quyền phải qua `isAuthorizedInternalRequest` + `createAdminClient`; gallery-dimensions/blurhash phải qua `withAdmin`/`withAuth` và CẤM `createAdminClient` trực tiếp.** | `scripts/verify-privileged-entrypoints.mjs:3-31` | `npm run verify:privileged-entrypoints` (`package.json:19`) |
| **B10** | **`anon` = tối thiểu tuyệt đối.** REVOKE ALL trên toàn schema + chặn default privileges; chỉ `login_attempts` được cấp lại. | `20260610150000_revoke_anon_table_privileges.sql:29-36` | `scripts/probe-anon-access.mjs` (chạy tay) |
| **B11** | **Policy RLS phải gọi `is_active_employee()` (SECURITY DEFINER), không inline `EXISTS(SELECT … FROM employees)`.** Inline → 403 toàn request vì `employees` bị REVOKE. | `20260605030000_active_employee_rls_helper.sql:4-11,24-36` | — |
| **B12** | **`CREATE OR REPLACE` không thay được hàm khác chữ ký** → sinh overload → PostgREST `HTTP 300 PGRST203` + `supabase gen types` bỏ qua hàm. Đổi chữ ký phải `DROP FUNCTION` trước. | `20260807000000_drop_gallery_data_v2_single_arg_overload.sql:3-17` | — |
| **B13** | **`userId` phải nằm trong key của mọi `unstable_cache` dashboard** để không rò dữ liệu giữa người dùng. | `lib/api/dashboard.ts:913-919, 1005-1009, 1041-1045, …` | — |
| **B14** | **File dùng chung chỉ được sửa theo hướng thêm:** `lib/swr.ts`, `components/layout/bottom-nav.tsx`, `lib/server-cache-invalidation.ts`. | `vault/10-nen-tang/quy-uoc-code.md` §"File dùng chung" | — |
| **B15** | **Mọi action trả `ActionResult<T>`, thông báo lỗi tiếng Việt.** | `lib/auth_utils.ts:408,421,442,474` (`"Chưa đăng nhập"`, `"Bạn không có quyền…"`) | — |
| **B16** | **Vercel region `sin1`** (co-location với Supabase Singapore). | `vercel.json:2` — `{"regions": ["sin1"]}` | — |

**Script `verify:*` hiện có** (`package.json:18-25,46-57`): `utf8`, `privileged-entrypoints`, `realtime-client`, `pwa-cache`, `pwa-artifact`, `moodie-runtime`, `moodie-ui`, `payment-stage-key`, `performance-release`, `printing`, `reports`, `productivity`, `calendar`, `dashboard`, `services`, `inventory`, `dresses`, `contracts`, `settings`, `employees`.
⚠️ Phần lớn nhóm `verify:<module>` là script **chạm DB thật** — không chạy trong phiên map này.

---

## 7. Mâu thuẫn tài liệu (CODE THẮNG)

| # | Vault nói | Code/migration nói | Bằng chứng |
|---|---|---|---|
| **M1** | `kien-truc-tong-quan.md` §"Nguyên tắc cứng 1": *"Không client-direct… Trình duyệt không cầm anon key để query DB"* | **SAI — có nhánh client-direct đang chạy.** `lib/client-direct/contract-drawer.ts` query thẳng `contract_events`, `contract_checklists`, `work_tasks`, `payment_plans`, `employees_public`, `contract_notes` bằng anon key, RLS làm cổng. | `lib/client-direct/contract-drawer.ts:1,11-21,38,48,57,64,71,114`; nối vào app tại `lib/hooks/use-contract-queries.ts:301`, `lib/hooks/use-contract-notes.ts:25`, `components/contracts/contracts-list-client.tsx:299`. Hạ tầng RLS chủ đích: `20260605000000_contracts_rls_hardening.sql:4-6`, `20260605020000_client_direct_rls_prereq.sql:1-6` |
| **M2** | `cache-va-realtime.md` §3a: *"`postgres_changes` trực tiếp… Hiện là nhóm contracts (9 bảng) + `crm_leads`, `customers`, `schedules`, `approval_requests`, `receipts`"* | **SAI — không còn bảng nghiệp vụ nào trong publication.** 15 bảng bị DROP khỏi publication; 100% call-site client dùng `realtime_signals`. | `20260714040000_realtime_signal_only_hardening.sql:8-42`; grep `useRealtime*` — mọi call-site dùng `realtimeSignalConfig()` hoặc `table: "realtime_signals"` |
| **M3** | Comment **trong code**: `finance-realtime-refresh.tsx:12-13` — *"receipts/payments/payment_plans: postgres_changes trực tiếp (đã trong publication)"* | **Comment lỗi thời.** Ngay dưới đó, `:31-33` dùng `realtimeSignalConfig("receipts"/"payments"/"payment_plans")`. | `components/finance/finance-realtime-refresh.tsx:12-13` vs `:31-33` |
| **M4** | `bao-mat-du-lieu-rls.md` + `canh-bao-schema.md`: *"9 bảng bật RLS nhưng 0 policy: … `lab_payment_allocations`, `lab_payments` …"* | **2/9 bảng đã bị DROP.** Danh sách còn 7. | `20260826130000_cashflow_m2b_drop_legacy.sql:33-34,37-38` |
| **M5** | `canh-bao-schema.md`: *"`types/database.types.ts` đã đồng bộ 2026-08-07: 98 bảng · 4 view · 130 RPC · 16 enum"* | **Hiện là 93 bảng · 2 view · 124 function · 16 enum.** File đã được sinh lại sau (commit `61e338a`, ADR-017 printing), nên vẫn khớp DB ở mức bảng/view — nhưng con số trong vault đã cũ. | Đếm trực tiếp `types/database.types.ts`: Tables `:16-5510` (93), Views `:5511-5571` (2 — `employees_public`, `payment_plan_states`), Functions `:5572-6783` (124), Enums `:6784-6848` (16). Bảng bị drop: `20260826130000…sql:37-40`, `20260826200000…sql:36-37`; bảng thêm `expense_allocations`: `20260825200000…sql` |
| **M6** | Cảnh báo của điều phối: *"`types/database.types.ts` ĐANG LỆCH DB"* | **Gần khớp, lệch đúng 1 hàm.** 4 migration sau lần sinh cuối (`20260827100000`, `20260827130000`, `20260827150000`, `20260827160000`) **không** đổi bảng/cột/enum — chỉ `CREATE OR REPLACE` thân hàm cùng chữ ký, **trừ** hàm mới `sync_employee_salary_paid` (không có trong types). | `git log --oneline -3 -- types/database.types.ts` → `61e338a`; grep `ALTER/CREATE/DROP TABLE\|COLUMN\|TYPE` trong 4 migration đó = rỗng; `20260827130000_luong_cung_m5.sql:104`; `grep -c sync_employee_salary_paid types/database.types.ts` = 0 |
| **M7** | `kien-truc-tong-quan.md`: *"98 bảng · 144 RPC · 186 migration"* | **203 migration** hiện tại; **107 RPC được gọi từ code**; 148 tên hàm xuất hiện trong migration (gồm cả trigger fn). | `ls supabase/migrations/*.sql \| wc -l` = 203 |
| **M8** | `ban-do-route.md`: *"61 trang · 25 API route · 87 file server action"* | 61 trang ✅; **27** API route; **85** file action. | `find app -name route.ts \| wc -l` = 27; `ls app/actions/*.ts \| wc -l` = 85 |
| **M9** | `cache-va-realtime.md`: *"React Query persist — `@tanstack/react-query-persist-client`"* | **Không dùng.** Là dependency (`package.json:79`, `:77`) nhưng **0 import** trong `lib/`, `components/`, `app/`. `QueryProvider` không bọc persist. | grep `persistQueryClient\|PersistQueryClientProvider\|createSyncStoragePersister` = 0 kết quả; `components/providers/query-provider.tsx:9-49` |
| **M10** | `cache-va-realtime.md` bảng "thư viện data theo module": `contracts = React Query`, `settings = React Query (1)`… | Đúng ở mức tổng, nhưng **inventory/services/settings/employees/dresses hiện đều có `useRealtimeSignal`**, và `settings` dùng SWR ở `settings-view.tsx`. Bảng "Realtime" trong vault (số kênh/module) không còn khớp vì mọi kênh đã gộp về `realtime_signals`. | Xem bảng §3.2 |
| **M11** | `cache-va-realtime.md`: *"`revalidatePath` nặng nhất ở `inventory-mutations.ts` (35 lần)"* | **40 lần.** | `grep -c revalidatePath app/actions/inventory-mutations.ts` = 40 |
| **M12** | — (không có trong vault) | **Tag `contract-list` / `contract-stats` là NO-OP.** `revalidateTag` được gọi nhưng **không có producer** (không `unstable_cache`/`fetch` nào gắn 2 tag này). | `lib/server-cache-invalidation.ts:4-5,71-72,95-96`; grep toàn repo chỉ khớp đúng file này |
| **M13** | — | **Tag `studio-info` cũng là NO-OP.** `revalidateTag("studio-info")` gọi ở 2 chỗ nhưng `lib/studio-info.ts` không dùng `unstable_cache`/tag. | `app/actions/settings-mutations.ts:262`; `app/api/auth/google/callback/route.ts:192`; `lib/studio-info.ts` không có `unstable_cache` |
| **M14** | — | **PWA RULE 4a cache 3 tên RPC không tồn tại**: `get_dashboard_kpi`, `get_dashboard_revenue_chart`, `get_dashboard_service_breakdown`. Tên thật là `dashboard_critical_kpis`, `dashboard_revenue_chart`, `dashboard_service_breakdown`. Ngoài ra các RPC này chỉ được gọi từ **server** (service role) nên SW không bao giờ thấy request. | `next.config.ts:270-275` vs `lib/api/dashboard.ts` (RPC thật) |
| **M15** | — | **`lib/hooks/use-prefetch-on-hover.ts:95` query thẳng bảng `dresses` từ browser** — trong khi `dresses` đã bị `REVOKE ALL … FROM PUBLIC, anon, authenticated`. Prefetch này sẽ nhận `42501`. Còn select cả `purchase_price` (`:53`). | `lib/hooks/use-prefetch-on-hover.ts:53,59,90-99`; `20260429110000_dresses_audit_fix.sql:10` (không có GRANT lại cho `authenticated` ở migration nào sau) |
| **M16** | `xac-thuc-phan-quyen.md` liệt kê `withAdmin` + các guard | **`withContractAccess` / `withContractWriteAccess` / `withContractDestructiveAccess` có định nghĩa nhưng 0 call-site** — contract actions gọi `withAuth` + `require*` trực tiếp. | `lib/auth_utils.ts:852-877`; grep call-site = 0 |
| **M17** | `bao-mat-du-lieu-rls.md`: *"Hiện chỉ có 1 view: `payment_plan_states`"* | **Có 2 view trong types**: `employees_public` và `payment_plan_states`. | `types/database.types.ts:5511-5571` |

---

## 8. Chưa xác minh

1. **Trạng thái RLS thực tế trên DB** — "98/98 bảng đã bật RLS", "9 bảng 0 policy", số policy từng bảng. Migration chỉ cho thấy 56 lệnh `ENABLE ROW LEVEL SECURITY`; phần còn lại (nếu có) do event trigger `rls_auto_enable` hoặc thao tác ngoài migration. Cần `pg_policies` — **không chạm DB trong phiên này**.
2. **`rls_auto_enable` (event trigger)** — có trong `vault/30-du-lieu/rpc-va-enum.md` nhưng **không tìm thấy trong bất kỳ migration nào** (`grep rls_auto_enable supabase/migrations/*.sql` = rỗng).
3. **REVOKE của `services`, `service_categories`, `studio_info` khỏi `authenticated`** — được nhắc trong comment `20260610130000_realtime_signals.sql:5,18-19` và `20260610120000…sql:19-21`, nhưng **không tìm được câu lệnh REVOKE tương ứng** trong migration. Chỉ `system_settings` (`20260429142000…sql:8-10`) và nhóm employees (`20260429130000…sql:70`) có bằng chứng trực tiếp.
4. **Grant hiện tại của `contracts`, `payment_plans`, `contract_notes`… cho `authenticated`** — nhánh client-direct (M1) chỉ chạy được nếu `authenticated` còn `SELECT`. Không tìm thấy REVOKE, nên **suy ra là còn** — nhưng chưa đo bằng request thật.
5. **`NEXT_PUBLIC_RPC_V3` trên production** — `.env.local` đặt `=true` (→ `get_contract_detail_v3`), giá trị trên Vercel chưa xác minh. Đây là biến build-time nên khác giá trị = khác RPC chạy thật.
6. **`ALLOW_SETTINGS_JWT_ADMIN_FALLBACK`** — nhánh dự phòng cho phép cấp quyền cài đặt từ JWT khi **không có** hồ sơ employee (`lib/auth_utils.ts:212-215, 368-369`). Không có trong `.env.local`/`.env.example` → mặc định tắt, nhưng giá trị production chưa xác minh.
7. ~~Region Vercel~~ — **đã xác minh**: `vercel.json:2` `{"regions": ["sin1"]}`.
8. **`emit_realtime_signal` có thật sự bắn event không** — vault cảnh báo "SUBSCRIBED ≠ có event" và từng phát hiện publication rỗng. Chỉ xác minh được publication *có* `realtime_signals` bằng migration; **chưa test event end-to-end**.
9. **Danh sách đầy đủ RPC còn sống trên DB** — §5 liệt kê 107 RPC *được gọi từ code*. Trong migration có 148 tên hàm (gồm ~14 trigger fn không phơi qua PostgREST). Hàm còn sống nhưng không call-site (vd `get_customer_ltv`, `backfill_payment_plan_ssot_v2`, `contract_payment_health_checks`, `printing_integrity_report`, `get_printing_cost_stats`, `finance_receipt_stats`, `finance_period_ledger`, `finance_vendor_debt_summary`, `restore_inventory_from_transaction`, `payable_remaining`, `vn_date`) chưa được đối chiếu với `pg_proc`.
10. **`enum` giá trị thực tế** — bảng enum ở §"rpc-va-enum" của vault sinh từ DB ngày 2026-08-07; chưa đối chiếu lại với migration sau đó.
11. **Số bảng thật trên DB** — `types/database.types.ts` cho 93 bảng, nhưng file này có thể chậm hơn DB. Chưa xác minh bằng `information_schema`.
12. **`components/dashboard/dashboard-realtime-refresh.tsx`** dựng kênh realtime thủ công, **không** bị `verify-realtime-client-surface.mjs` kiểm. Hiện đúng luật (`realtime_signals`), nhưng không có cổng canh nếu ai đó sửa.

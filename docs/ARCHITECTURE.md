# Mood Studio — System Architecture

> ## ⚠️ LỖI THỜI — giữ để tra lịch sử
>
> **Nguồn chân lý mới: [`vault/`](../vault/README.md)** — cụ thể [`vault/10-nen-tang/kien-truc-tong-quan.md`](../vault/10-nen-tang/kien-truc-tong-quan.md) và [`vault/00-INDEX.md`](../vault/00-INDEX.md).
>
> File này chụp ảnh hệ thống ngày 2026-07-04 và **không còn được cập nhật**. Vault được sinh lại từ DB + import graph thật (`node scripts/vault-gen-schema.mjs`, `node scripts/vault-gen-codemap.mjs`).
> Nếu file này mâu thuẫn với vault → **tin vault**.

> Generated: 2026-07-04 · Codex consult (344k tokens) · Source of truth: live codebase scan

---

## 1. System Overview

Mood Studio is a vertical SaaS for Vietnamese wedding photography studios, covering the full operational lifecycle from lead intake to contract execution, gallery delivery, printing, finance, HR, inventory, and AI-assisted mood board workflows. The application is built as a multi-module Next.js App Router system with Supabase as the transactional backend, using server actions for most writes, typed database access from `types/database.types.ts`, and a hybrid cache strategy: server-side path/tag invalidation for server-rendered finance/critical views and client-side SWR or React Query invalidation for operational modules. The intended users are studio owners, finance/admin staff, sales/CRM staff, photographers/coordinators, lab/printing operators, and customers accessing public galleries.

---

## 2. Tech Stack

| Category | Technology | Version / Notes |
|---|---|---|
| Web framework | Next.js | `^16.2.6` (App Router) |
| UI runtime | React | `19.2.3` |
| Compiler | React Compiler | Enabled via `reactCompiler: true` in `next.config.ts` |
| Language | TypeScript | Strict-mode codebase, `typescript ^5` |
| Backend platform | Supabase | PostgreSQL + Auth + Storage + Realtime |
| Supabase client | `@supabase/supabase-js` | `^2.99.1` |
| Supabase SSR | `@supabase/ssr` | `^0.9.0` |
| Client fetching | SWR | `^2.4.1`, centralized in `lib/swr.ts` |
| Client query cache | TanStack Query | Used selectively for contract detail/query flows |
| Validation | Zod | `^4.3.6` |
| Styling | Tailwind CSS | v4 stack via `tailwindcss ^4` and `@tailwindcss/postcss` |
| Component primitives | Radix UI / shadcn-style | `@radix-ui/react-select`, `@radix-ui/react-switch`, etc. |
| Charts | Recharts | `^3.8.0` |
| PWA | `@ducanh2912/next-pwa` | Configured in `next.config.ts` |
| Error tracking | Sentry | `@sentry/nextjs ^10.45.0` |
| Performance telemetry | Vercel Speed Insights | `@vercel/speed-insights ^2.0.0` |
| Navigation UX | `next-view-transitions`, `nextjs-toploader` | Used in `app/layout.tsx` |
| URL state | `nuqs` | Adapter mounted in `app/layout.tsx` |
| Tests | Jest + Playwright | Unit / integration / E2E |
| Deployment | Vercel | Region pinned to `sin1` (Singapore) in `vercel.json` |

---

## 3. Project Structure

```text
app/
├─ (protected)/               # Authenticated application shell
│  ├─ admin/                  # Admin utilities (vendors, backfill-dimensions)
│  ├─ audit-logs/             # Audit trail UI
│  ├─ calendar/               # Scheduling + Google Calendar integration
│  ├─ contracts/              # Contract lifecycle, detail, gallery, print
│  ├─ crm/                    # Leads + customers
│  ├─ dashboard/              # KPI overview
│  ├─ dresses/                # Dress inventory + rentals
│  ├─ employees/              # HR module
│  ├─ finance/                # Finance submodules (15 routes)
│  ├─ inventory/              # Consumable inventory
│  ├─ moodie/                 # AI mood board tool
│  ├─ printing/               # Printing operations + labs
│  ├─ productivity/           # Work/task productivity
│  ├─ reports/                # Revenue/profit reporting
│  ├─ services/               # Service package builder
│  ├─ settings/               # Studio/system settings
│  └─ layout.tsx              # Protected shell entry — auth gate
├─ actions/                   # 85 server action files (primary service layer)
├─ api/                       # Route handlers: auth callbacks, downloads, monitoring
├─ auth/                      # Auth callback/confirm routes
├─ gallery/                   # Public customer gallery surface
└─ layout.tsx                 # Global root layout

components/
├─ layout/                    # App shell: sidebar, header, bottom nav, SW UX
├─ performance/               # Web vitals reporting
├─ providers/                 # SWR, modal, React Query providers
├─ theme/                     # Theme provider
├─ ui/                        # Shared UI primitives
└─ <domain>/                  # Per-module components (contracts, finance, gallery…)

lib/
├─ auth_utils.ts              # Auth context, role checks, withAuth wrappers
├─ breakpoints.ts             # Responsive SSOT (3-tier: 640/768/1024)
├─ cache-invalidation.ts      # Client-side SWR/React Query invalidation helpers
├─ server-cache-invalidation.ts # Server revalidatePath/revalidateTag helpers
├─ swr.ts                     # SWR config, cacheKeys factory, mutate helpers
├─ supabase/
│  ├─ client.ts               # Browser Supabase client
│  ├─ middleware.ts           # Session refresh + auth proxy headers injection
│  └─ server.ts               # Server/admin Supabase clients (React cache())
├─ hooks/                     # SWR / TanStack Query hooks per domain
└─ validations/               # Zod schemas (15 files)

types/
└─ database.types.ts          # Generated schema: tables, RPCs, enums, views

tests/
├─ e2e/                       # Playwright E2E (including e2e-sweep.ts self-healing)
├─ integration/
└─ unit/

scripts/
└─ *.mjs                      # verify:*, smoke:*, perf:*, migrate:*, release:*
```

---

## 4. Route Architecture

### Protected vs Public

All routes under `app/(protected)/` run inside `app/(protected)/layout.tsx`, which calls `getAuthenticatedUserContext()` from `lib/auth_utils.ts` and redirects:
- Unauthenticated → `/login`
- Disabled employees → `/account-disabled`

**Public routes** (allowlisted in `lib/supabase/middleware.ts`):
- `/login`, `/forgot-password`, `/reset-password`, `/account-disabled`
- `/auth/*`, `/offline`
- `/gallery/[accessUrl]` — customer-facing gallery with password protection
- `/api/auth/*`, `/api/og/*`, `/api/gallery-download*`, `/api/drive-download/*`
- PWA assets and icons

### Route domains

| Domain | Routes | Notes |
|---|---|---|
| Dashboard | `/dashboard` | KPI shell, critical-cached server data |
| Contracts | `/contracts`, `/contracts/create`, `/contracts/[id]`, `/contracts/[id]/edit`, `/contracts/[id]/gallery`, `/contracts/[id]/print` | Core operational domain |
| CRM | `/crm/customers`, `/crm/customers/[id]`, `/crm/leads` | Leads + customer management |
| Finance | `/finance`, `/finance/dashboard`, `/finance/expenses`, `/finance/receipts`, `/finance/cashflow`, `/finance/budget`, `/finance/debts`, `/finance/goals`, `/finance/vendor-debts`, `/finance/lab-debts`, `/finance/investments`, `/finance/salaries`, `/finance/fixed-costs`, `/finance/categories`, `/finance/closes`, `/finance/closes/[id]` | Server-computed, path-invalidated |
| Calendar | `/calendar` | Scheduling + Google Calendar integration |
| Employees | `/employees`, `/employees/[id]` | HR and productivity support |
| Dresses | `/dresses`, `/dresses/rentals` | Dress inventory + rental workflow |
| Inventory | `/inventory`, `/inventory/[id]` | Consumable inventory |
| Printing | `/printing`, `/printing/labs` | Printing order operations |
| Services | `/services`, `/services/create`, `/services/[id]`, `/services/[id]/quote` | Service package builder |
| Reports | `/reports` | Revenue/profit views |
| Productivity | `/productivity` | Task/performance views |
| Moodie | `/moodie` | AI conversation-based mood board |
| Settings | `/settings`, `/settings/studio`, `/settings/credit-cards` | Configuration |
| Audit/Admin | `/audit-logs`, `/admin/vendors`, `/admin/backfill-dimensions` | Higher-privilege |

### Route handlers (`app/api/`)

- `app/api/auth/callback/` — Supabase OAuth callback
- `app/api/auth/google/callback/` — Google Calendar OAuth callback
- `app/api/calendar/sync-worker/` — background Google Calendar sync
- `app/api/contracts/[id]/prefetch/` — contract prefetch endpoint
- `app/api/drive-download/[fileId]/` — Google Drive file proxy
- `app/api/gallery-download/[token]/[imageId]/` — authenticated image download
- `app/api/gallery-download-batch/[token]/` — batch gallery download
- `app/api/monitoring/web-vitals/` — Core Web Vitals beacon
- `app/api/push/` — push notification subscribe/send
- `app/api/e2e/login/` — E2E test helper (dev/test only)

---

## 5. Data Architecture

### Source of truth

`types/database.types.ts` is the canonical typed schema. It lists all tables, enums, RPCs (Functions), and views.

### Domain tables

| Domain | Tables |
|---|---|
| Contracts | `contracts`, `contract_events`, `contract_items`, `contract_checklists`, `contract_notes`, `checklist_templates`, `event_templates`, `payment_plans`, `payment_plan_allocations`, `payments`, `price_rules` |
| CRM | `customers`, `crm_leads` |
| Finance | `budgets`, `debts`, `expenses`, `fixed_costs`, `financial_goals`, `goal_contributions`, `investments`, `investment_maintenance_logs`, `credit_cards`, `employee_salaries`, `monthly_salaries`, `finance_monthly_closes`, `finance_close_tasks`, `lab_payments`, `lab_payment_allocations`, `vendor_payment_allocations` |
| Gallery | `galleries`, `gallery_albums`, `gallery_images`, `gallery_reactions`, `gallery_comments`, `gallery_share_links`, `gallery_selection_batches`, `gallery_selection_batch_items`, `gallery_filter_jobs` |
| Dresses | `dresses`, `dress_rentals`, `dress_rental_accessories`, `dress_reservations` |
| Inventory | `inventory_items`, `inventory_transactions` |
| Printing | `labs`, `lab_services` + printing-related `contract_items` |
| Employees | `employees`, `evaluations`, `attendance`, `schedules`, `work_tasks`, `work_shifts` |
| Services | `services`, `service_categories`, `price_rules`, `addon_history` |
| System | `audit_logs`, `notifications`, `notification_queue`, `notification_preferences`, `documents`, `integrity_reports`, `ai_conversations`, `ai_messages`, `login_attempts` |

### Key relationships

- `contracts.customer_id → customers.id`
- `contract_items.contract_id → contracts.id`
- `contract_events.contract_id → contracts.id`
- `payments.contract_id → contracts.id`
- `payment_plans.contract_id → contracts.id`
- `galleries.contract_id → contracts.id`
- `gallery_albums.gallery_id → galleries.id`
- `dress_rentals.contract_id`, `dress_reservations.contract_id` — tie to contracts
- `crm_leads.created_by → employees.id` (**⚠️ employee.id, NOT userId** — see Gotchas §13)
- `employees.user_id → auth.users.id` — mapped by auth trigger

### RLS pattern

- Default: server actions use `createClient()` from `lib/supabase/server.ts` — actions run as the current user, subject to RLS
- Elevated trust: `createAdminClient()` used in bounded flows after explicit app-level authorization via `lib/auth_utils.ts`
- Auth guards in actions: `withAuth(...)`, `withAuthRead(...)`, `requireContractWriteAccess(...)`, `requireContractAccess(...)`, `requireContractDestructiveAccess(...)`

### Atomic RPCs

Business-critical operations are database RPCs that keep invariants close to data:

**Write RPCs:**
- `save_contract_atomic`, `cancel_contract_cascade`, `delete_contract_cascade`
- `process_contract_payment`, `process_contract_payment_v2`, `void_contract_payment_v2`
- `recalc_contract_totals`, `create_default_payment_schedule_v2`
- `create_printing_order_atomic`, `update_printing_order_atomic`, `delete_printing_order_atomic`
- `record_lab_payment_atomic`, `upsert_printing_expense`
- `start_dress_rental_atomic`, `return_dress_rental_atomic`, `cancel_dress_rental_atomic`
- `refresh_dress_status_atomic`, `release_dress_reservation_atomic`
- `inventory_stock_in_atomic`, `inventory_stock_out_atomic`, `restore_inventory_from_transaction`
- `create_sale_receipt_atomic`, `save_service_atomic`, `delete_service_atomic`
- `convert_lead_to_customer`, `contribute_to_goal`, `undo_contribution_atomic`
- `prepare_gallery_share`, `set_gallery_password`, `verify_gallery_password`
- `advance_close_task`, `run_integrity_scan`

**Read RPCs (heavy aggregates — never optimistically patch their outputs):**
- `get_contract_detail_v2`, `get_contract_list_v2`, `contract_stats`
- `dashboard_critical_kpis`, `dashboard_revenue_chart`, `dashboard_service_breakdown`
- `finance_dashboard_metrics`, `finance_revenue_by_month`, `finance_ledger`, `finance_cashflow_timeline`
- `finance_contract_profit_report`, `finance_receipt_stats`, `finance_expense_stats`
- `get_finance_intelligence`, `get_finance_advanced_intelligence`, `get_cashflow_forecast`
- `inventory_detail_v2`, `inventory_list`, `dress_list`, `dress_stats`
- `get_employee_productivity`, `printing_stats`, `printing_integrity_report`

---

## 6. Frontend Data Layer

### SWR foundation

`lib/swr.ts` defines the global client-fetching contract:

- **`cacheKeys`** — single source of truth for all client cache namespaces
- **`swrConfig`** defaults: `revalidateOnFocus: true`, `revalidateOnReconnect: true`, `dedupingInterval: 5000`, `errorRetryCount: 2`, `keepPreviousData: true`
- **`SWRProvider`** mounted in `app/layout.tsx`

### Cache key strategy

`cacheKeys` groups by domain, for example:
- Contracts: `contracts`, `contract:${id}`, `contract:${id}:events`, `contract:${id}:details`
- Finance: `finance-dashboard:${year}-${month}`, `finance-ledger:...`, `finance-closes:${year}`
- Inventory: `inventory`, `inventory:${id}`, `inventory:${id}:history`
- CRM: `customers`, `leads`, `customer:${id}`, `lead:${id}`
- Gallery: `gallery:${id}`, `gallery:${id}:albums`

### Client invalidation helpers (`lib/cache-invalidation.ts`)

- `revalidateFinanceCaches(scope?)`
- `revalidateCrmCaches()`
- `revalidateEmployeeCaches()`
- `revalidateServiceCaches()`
- `revalidateContractCaches(contractId?)`
- `revalidateContractDetailCaches(contractId)`
- `revalidateInventoryCaches()`
- `revalidateDressCaches()`
- `revalidatePrintingCaches()`
- `revalidateCalendarCaches()`

Contract detail/list also uses TanStack Query: `getGlobalQueryClient()` + `contractKeys.*` from `lib/hooks/use-contract-queries.ts`.

### Optimistic update rules

**✅ Safe to patch optimistically:**
- List/detail fields that are direct user edits (labels, notes, toggles)
- Statuses when the server does not recalculate adjacent fields
- Append/remove items from list caches with known payloads
- Use `patchListCache`, `removeFromListCache`, `mutateListCache` from `lib/swr.ts`

**❌ Must NOT patch optimistically:**
- Server-generated codes (contract codes, receipt codes, order IDs)
- Server-recalculated totals, balances, debt summaries, status derivations
- Payment-plan transitions and allocation side effects
- Atomic status transitions where the DB RPC is the authority
- Any finance dashboard, ledger, cashflow, profit report, or computed aggregate

**Rule:** Finance modules → close modal + revalidate from server. Non-finance → may use optimistic for stable payloads.

---

## 7. Server Action Layer

### Role of `app/actions/`

85 server action files — the primary application service layer. Each file is module-scoped:
- `contract-mutations.ts`, `contract-queries.ts`, `contract-lifecycle.ts`
- `finance-dashboard-queries.ts`, `expense-actions.ts`, `receipt-actions.ts`
- `gallery-actions.ts`, `gallery-admin-actions.ts`, `gallery-composite-actions.ts`
- `inventory-mutations.ts`, `service-mutations.ts`, `employee-mutations.ts`
- `printing-mutations.ts`, `rental-mutations.ts`, `lab-mutations.ts`
- … and 70 more

### Common action pattern

```typescript
// 1. Validate input
const validated = contractSubmissionSchema.parse(rawData)

// 2. Auth + authorization
return withAuth(async (ctx) => {
  requireContractWriteAccess(ctx, contractId)

  // 3. Profile / instrument
  return profileAction("contracts.createContract", async () => {

    // 4. DB write (RPC or table)
    const result = await supabase.rpc("save_contract_atomic", {...})

    // 5. Audit + side effects (non-blocking)
    after(() => {
      fireAuditLog(...)
      syncContractEventsToGoogle(...)
    })

    // 6. Invalidate server cache
    invalidateContractPaths(contractId, { finance: true, calendar: true })

    return result
  })
})
```

### Server cache invalidation (`lib/server-cache-invalidation.ts`)

- `invalidateDashboardCritical()` — revalidates `dashboard-critical` tag + `/dashboard` path
- `invalidateFinancePaths(scope?)` — revalidates `/finance`, `/finance/receipts`, `/finance/cashflow`, `/reports` conditionally
- `invalidateContractPaths(contractId, scope?)` — fans out to finance, dresses, printing, calendar, dashboard, productivity per scope
- `invalidateContractListCache()` — revalidates `CONTRACT_LIST_CACHE_TAG`, `CONTRACT_STATS_CACHE_TAG`
- `invalidateDressPaths(contractId?)`, `invalidatePrintingPaths(contractId?)`, `invalidateCalendarPaths(options?)`

---

## 8. Auth & Security

### Auth flow

```
Browser
  └─> Supabase Auth login / Google OAuth
      └─> JWT cookie stored by Supabase SSR
          └─> Next.js middleware runs on every request
              └─> lib/supabase/middleware.ts:
                  - Creates SSR Supabase client
                  - Refreshes session
                  - Classifies public vs protected routes
                  - Injects AUTH_PROXY_* headers
                      └─> app/(protected)/layout.tsx
                          - Reads proxied context (no extra DB round trip)
                          - Calls getAuthenticatedUserContext()
                          - Redirects disabled employees → /account-disabled
                              └─> Server actions:
                                  - withAuth() reads proxied claims
                                  - Supabase queries execute under RLS
```

### Auth proxy headers (set in middleware, read in server actions)

- `AUTH_PROXY_SOURCE_HEADER` — "proxy" marker
- `AUTH_PROXY_SUB_HEADER` — user UUID
- `AUTH_PROXY_EMAIL_HEADER` — user email
- `AUTH_PROXY_ROLE_HEADER` — role claim
- `AUTH_PROXY_FULL_NAME_HEADER` — display name

**Why:** avoids a DB round-trip for auth claims on every request. Do NOT re-introduce top-level auth DB work in shared layouts (regresses TTFB).

### Server auth clients (`lib/supabase/server.ts`)

- `createClient()` — user-scoped, subject to RLS; cached with React `cache()`
- `createAdminClient()` — bypasses RLS; used only in bounded, explicitly authorized flows

### Employee auto-provisioning

`on_auth_user_created` Supabase trigger auto-creates an `employees` row when a new Auth user is created. Seeds must `UPDATE`, not `INSERT` (the row already exists).

### Google OAuth — two separate integrations

1. **Supabase Auth / Google sign-in** — application login (`app/api/auth/google/`)
2. **Google Calendar OAuth** — per-employee calendar access (`app/api/auth/google/callback/`, stored per employee)

**⚠️ Do not conflate tokens, callbacks, or scopes between these two.**

### Security hardening

- Middleware adds `no-store` headers to auth-sensitive responses
- Service worker: Supabase Auth = `NetworkOnly`, HTML navigations = `NetworkOnly`
- Anon default privileges: Supabase grants FULL access to anon on new public objects by default — must `REVOKE` explicitly on new tables/functions; policy-only is not sufficient

---

## 9. Performance Architecture

### Root layout (`app/layout.tsx`)

- Local Inter variable font via `next/font/local` (no FOUT)
- `NextTopLoader` — page transition indicator
- `ViewTransitions` — view transition API
- `SpeedInsights` — Vercel Core Web Vitals
- `WebVitalsReporter` — custom beacon to `/api/monitoring/web-vitals`
- `SWRProvider` + `QueryProvider` — global cache mounts
- `NuqsAdapter` — URL state management
- Offline/slow-network indicators
- `dns-prefetch` + `preconnect` for Supabase and Google Drive domains

### PWA / Service Worker (`next.config.ts`)

| Resource | Strategy | Notes |
|---|---|---|
| Supabase Auth | NetworkOnly | No cached auth |
| HTML navigations | NetworkOnly | No stale shells |
| Supabase REST business data | NetworkFirst | Falls back to cache |
| `get_contract_detail_v2` | NetworkFirst with short timeout | Instant detail fallback |
| Supabase Storage | CacheFirst | Media assets |
| `lh3.googleusercontent.com` (gallery) | CacheFirst 30 days | Customer gallery images |
| Static assets | CacheFirst | JS/CSS chunks |

### React Compiler

`next.config.ts`: `reactCompiler: true` — auto-memoizes components and hooks, eliminates manual `useMemo`/`useCallback` in most cases.

### Region and latency

`vercel.json`: `regions: ["sin1"]` — Vercel execution in Singapore, co-located with Supabase Singapore cluster. This is the primary latency fix (was iad1 = US East, causing ~200ms+ baseline latency).

### Bundle discipline

- `@next/bundle-analyzer` enabled via env flag
- Sentry config minimizes bundle size impact
- Dynamic `ssr: false` loading for navigation-only client helpers in `components/layout/app-shell.tsx`
- Per-module `verify:*` scripts measure actual page/network timing

---

## 10. Responsive Design System

### Source of truth: `lib/breakpoints.ts`

### 3-tier convention (locked 2026-06-06)

| Tier | Range | Tailwind | Usage |
|---|---|---|---|
| Phone | `< 768px` | base / `max-md:` | 1-column stacks, bottom sheets, bottom nav |
| Tablet | `768–1023px` | `md:` / `md:max-lg:` | Denser operational layouts, centered modals |
| Desktop | `≥ 1024px` | `lg:` | Full chrome, wide sidebars, multi-column dashboards |

**Overlay/modal centering**: activates at `sm:` (640px).

### Constants

```typescript
BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 }
```

### Media query helpers (exported from `lib/breakpoints.ts`)

- `phoneOnly` — `< 768px`
- `tabletUp` — `>= 768px`
- `tabletOnly` — `768–1023px`
- `desktop` — `>= 1024px`
- `belowDesktop` — `< 1024px`
- `touch` — hover:none + pointer:coarse

### Shell behavior (`components/layout/app-shell.tsx`)

- Sidebar shown on tablet + desktop
- BottomNav on phone
- Route-specific shell modes: fullpage (print), workspace (calendar), chat (moodie), form (contracts/create), gallery (reduced padding)

---

## 11. Deployment & CI

### Pipeline

```
git push origin main
  └─> Vercel detects push on main branch
      └─> npm run build (Next.js build)
          └─> PWA/service-worker generation (@ducanh2912/next-pwa)
              └─> Sentry source map upload
                  └─> Deploy to region sin1 (Singapore)
```

**⚠️ Do NOT use `npx vercel --prod`** (CLI not authenticated). Deploy = `git push main`.

### Environment variables

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key
- `SUPABASE_POOLER_URL` — PgBouncer transaction-mode URL (15 connections, free plan)
- `SUPABASE_SERVICE_ROLE_KEY` — admin bypass key
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — Calendar OAuth
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` — error tracking
- `NEXT_PUBLIC_APP_VERSION` — auto-injected from `package.json` version

### Verification scripts (`npm run verify:<module>`)

`printing` · `reports` · `productivity` · `calendar` · `dashboard` · `services` · `inventory` · `dresses` · `contracts` · `settings` · `employees`

### Smoke scripts (`npm run smoke:<module>`)

`employees` · `settings` · `calendar` · `dashboard` · `contracts` · `production`

### Test suites

| Suite | Command |
|---|---|
| Unit | `npm run test:unit` |
| Integration | `npm run test:integration` |
| E2E (all) | `npm run test:e2e` |
| E2E mobile | `npm run test:e2e:mobile` |
| E2E setup | `npm run test:e2e:setup` |

### Quality gates

`npm run build` · `npm run lint` · `npm run perf:chunks` · `npm run perf:audit` · `npm run perf:operational` · `npm run perf:contract-detail` · `npm run verify:performance-release`

---

## 12. Module Isolation Rules

### 1 task = 1 module

Changes must stay within the target module. Do not touch adjacent modules unless a shared abstraction is genuinely required and verified across modules.

### Shared files — additive only

High-blast-radius shared files:

| File | Risk |
|---|---|
| `lib/swr.ts` | cacheKeys change affects all modules |
| `lib/cache-invalidation.ts` | global client invalidation scope |
| `lib/server-cache-invalidation.ts` | server revalidation scope |
| `lib/auth_utils.ts` | auth/role logic for all actions |
| `app/(protected)/layout.tsx` | shell for every protected route |
| `components/layout/app-shell.tsx` | global navigation chrome |
| `types/database.types.ts` | generated — do not hand-edit casually |

**Safe pattern**: add narrowly scoped keys/helpers. Avoid cross-module behavior changes.

### Finance must use server invalidation

Finance data is server-computed from multiple tables and RPCs. For finance:
- Keep `revalidatePath(...)` / `revalidateTag(...)` via `lib/server-cache-invalidation.ts`
- Do NOT rely on client-side optimistic recomputation
- Pattern: write → close modal → server revalidates → client sees fresh data

### Reuse existing primitives

- Cache keys → `cacheKeys` in `lib/swr.ts`
- Client invalidation → `revalidate*Caches` in `lib/cache-invalidation.ts`
- Server invalidation → `invalidate*Paths` in `lib/server-cache-invalidation.ts`
- Auth → `withAuth` / `withAuthRead` in `lib/auth_utils.ts`
- Zod schemas → `lib/validations/*.schema.ts`
- Optimistic mutation → `runOptimisticMutation` in `lib/swr.ts`

### Respect shell conventions

New pages must fit existing shell modes in `components/layout/app-shell.tsx`. Do not create bespoke navigation/frame logic.

---

## 13. Key Constraints & Gotchas

### ⚠️ Google OAuth is two separate systems

- **Login OAuth** — `app/api/auth/google/` → Supabase Auth → user session
- **Calendar OAuth** — `app/api/auth/google/callback/` → per-employee token storage

In production the two integrations use **different Google Cloud projects** (dev/prod split). Token mixup causes "Drive API works intermittently" style bugs. Keep callbacks, client IDs, and token storage completely separate.

### ⚠️ `crm_leads.created_by` FK → `employees.id` (not user ID)

`crm_leads.created_by` references `employees.id`, not `auth.users.id`. Every CRM query/filter/report must join through `employees`, not treat it as a userId. The lessons.md has this documented but it's easy to miss when reading the FK name.

### ⚠️ `employees` row auto-provisioned by DB trigger

`on_auth_user_created` trigger creates the `employees` row automatically. Seeds must `UPDATE`, not `INSERT` (row already exists). Auth can succeed but app-level authorization fails if the trigger/mapping breaks.

### ⚠️ Anon default privileges leak in Supabase

Supabase auto-grants 7 permissions to `anon` on every new public schema object. Adding a table/function without explicit `REVOKE` exposes it to unauthenticated requests. Policies alone are insufficient if the grant allows access. Always verify with a real anon token request, not just policy inspection.

### ⚠️ Finance enum coercion can silently drop rows

Historical bug (vendor accrual `hau_ky_phim` CASE coerce to enum → 22P02 error swallowed). Finance queries using `CASE` over `work_type` enum columns must cast as `::text` first. Silent data drops look like "double count" but are actually "under count". Always query raw data before assuming a finance calculation is wrong.

### ⚠️ Service type SSOT has 4 touch points

Adding a `service_type` enum value requires changes in: `types/contract.ts`, `lib/constants/service-constants.ts`, `lib/validations/contract.schema.ts`, `types/database.types.ts` (2 places). TypeScript compiler does NOT catch the `SERVICE_TYPE_GROUPS` array or the second `database.types.ts` location. Must update all 4 manually.

### ⚠️ Auth proxy headers prevent double auth lookup

`lib/supabase/middleware.ts` injects `AUTH_PROXY_*` headers so server components and actions read claims without an extra DB roundtrip. Re-introducing `await getUser()` in shared layouts breaks this optimization and regresses TTFB by ~100–300ms.

### ⚠️ Contract detail SSR is expensive

`get_contract_detail_v2` is a heavy RPC. Some contract surfaces already use client-first shells to avoid blocking TTFB. Do not move expensive contract data fetches back into top-level SSR without Suspense/streaming analysis first.

### ⚠️ E2E seeds can leak into production dropdowns

E2E tests seed into the shared production DB. A `afterAll`-only cleanup means a test crash leaves "E2E" employees active in pickers. `tests/e2e/e2e-sweep.ts` runs time-bound self-healing cleanup in `beforeAll`. If adding new E2E fixtures, follow that pattern.

### ⚠️ `migrate-direct.mjs` does NOT auto-pick the latest migration

`npm run migrate:latest` with no args runs a **hardcoded** file from the script, not the newest SQL in the migrations dir. Always pass the explicit filename: `npm run migrate <filename>`. "Created: order_payments..." in output is stale text — verify by querying `pg_indexes` directly.

### ⚠️ Deploy via git, not Vercel CLI

Vercel CLI is not authenticated in this environment. `git push origin main` is the only deploy path. Vercel auto-deploys from the `main` branch.

---

## Key Source Files (clickable reference)

| File | Purpose |
|---|---|
| `app/layout.tsx` | Global root layout, providers, fonts |
| `app/(protected)/layout.tsx` | Auth gate, employee context, shell entry |
| `app/actions/contract-mutations.ts` | Canonical mutation pattern example |
| `app/actions/finance-dashboard-queries.ts` | Finance server-query pattern |
| `app/actions/gallery-actions.ts` | Gallery workflow patterns |
| `components/layout/app-shell.tsx` | Responsive shell routing logic |
| `components/layout/sidebar.tsx` | Desktop/tablet navigation |
| `components/layout/bottom-nav.tsx` | Phone navigation |
| `lib/supabase/server.ts` | Server Supabase clients |
| `lib/supabase/middleware.ts` | Session + auth proxy injection |
| `lib/auth_utils.ts` | withAuth, role checks, employee mapping |
| `lib/swr.ts` | cacheKeys, swrConfig, mutate helpers |
| `lib/breakpoints.ts` | Responsive SSOT, BREAKPOINTS constant |
| `lib/server-cache-invalidation.ts` | revalidatePath/Tag helpers |
| `lib/cache-invalidation.ts` | Client SWR/Query invalidation helpers |
| `lib/validations/contract.schema.ts` | Zod contract validation schema |
| `types/database.types.ts` | Generated DB types, RPCs, enums |
| `next.config.ts` | Build, PWA, Sentry, CSP config |
| `vercel.json` | Deployment region (sin1) |
| `package.json` | Scripts: verify:*, smoke:*, perf:*, test:* |

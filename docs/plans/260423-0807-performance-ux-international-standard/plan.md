# Plan: Performance & UX International Standard
Created: 2026-04-23
Status: Deployed - Production Validation Pending
Owner: Mood Studio Engineering

## Overview
Mục tiêu là đưa toàn bộ Mood Studio V2 về chuẩn trải nghiệm nhanh, ổn định, dữ liệu cập nhật tức thì và có thể đo được bằng KPI. Plan này tập trung vào performance thực tế của user, không chỉ Lighthouse điểm cao:
- Giảm tải JS theo route, lazy-load đúng chỗ.
- Giảm full page refresh, thay bằng SWR mutate/optimistic update có kiểm soát.
- Chuẩn hóa realtime/refetch toàn hệ thống để user thao tác xong màn ngoài cập nhật ngay.
- Tối ưu server actions/RPC/query/index để giảm TTFB.
- Chuẩn hóa skeleton/loading/transition để thao tác không bị đứng.
- Kiểm soát PWA/service worker để vừa nhanh vừa không stale dữ liệu nghiệp vụ.
- Thiết lập đo lường Web Vitals, bundle, query timing, mutation latency trước khi deploy.

## Definition Of 100%
Một phase chỉ được xem là đạt khi có số đo, không dựa vào cảm giác.

| Metric | Target |
| --- | --- |
| LCP p75 mobile 4G | <= 2.5s |
| LCP p75 desktop | <= 2.0s |
| INP p75 | <= 150ms |
| CLS p75 | <= 0.05 |
| Dynamic route TTFB p75 | <= 800ms |
| Cached/navigation TTFB p75 | <= 200ms |
| Drawer/modal open latency | <= 300ms |
| Post-mutation UI update | optimistic <= 200ms, confirmed <= 1.5s |
| Route JS page chunk | <= 80KB for normal pages, heavy tools lazy-loaded |
| Lighthouse production mobile | Performance >= 90, Accessibility >= 95 |
| Failed/stale data incidents | 0 known critical paths |

## Scope
Modules cần audit và chuẩn hóa:
- Contracts: list, drawer, detail, checklist, notes, payment, event, dress reservation, printing order.
- Finance: dashboard, receipts, expenses, goals, salaries, debts, closes, reports, cashflow, budget.
- Inventory: list, drawer, transactions, receipt integration.
- Dresses: list, rentals, scanner, QR, reservation sync.
- Printing: list, drawer, labs, contract sync.
- CRM: customers, leads, care logs, pipeline board.
- Calendar/Productivity: task calendar, drag/drop, realtime task state.
- Employees: list, drawer/detail, assignment options.
- Services: list, form, category manager, contract item picker.
- Settings/Auth/Shell/PWA: navigation, cache, service worker, profile/settings refresh.

## Current Findings
| Area | Finding | Risk | Direction |
| --- | --- | --- | --- |
| Bundle | Recharts đã được lazy ở finance dashboard, nhưng shared vendor chunks vẫn lớn. | Route đầu có thể tải JS không cần thiết nếu import lan rộng. | Bundle analyzer theo route, lazy hóa chart/DnD/framer/report widgets. |
| Realtime | Contract detail đã filter theo contract_id, nhưng list modules còn invalidation rộng. | Nhiều thao tác của user khác làm refetch dư. | Payload-aware realtime + cache-key registry theo module. |
| Refetch | Nhiều nơi còn `router.refresh()` sau mutation. | Full RSC refresh làm UI giật, mất state, tăng TTFB. | Chuyển sang SWR mutate/optimistic update, chỉ dùng refresh khi thật sự cần. |
| Data | Nhiều finance route `force-dynamic`, dashboard gọi nhiều RPC/query. | TTFB cao, waterfall server actions. | Cache TTL ngắn, parallel query, summary RPC/materialized cache. |
| PWA | Supabase REST đang NetworkFirst có cache 1h. | Có nguy cơ stale data nếu client direct REST tăng. | Tách API nghiệp vụ NetworkOnly/short TTL, asset/cache shell riêng. |
| UX | Một số module có loading nhưng chưa đồng nhất skeleton/optimistic/error recovery. | User cảm giác chậm dù backend nhanh. | Chuẩn hóa loading boundary, empty/error/retry, optimistic feedback. |

## Phases
| Phase | Name | Status | Progress |
| --- | --- | --- | --- |
| 00 | Baseline & Instrumentation | Complete | 100% |
| 01 | Cache/Refetch Contract | In Progress | 85% |
| 02 | Realtime Strategy | In Progress | 85% |
| 03 | Server Data & Database Performance | In Progress | 65% |
| 04 | Bundle & Code Splitting | In Progress | 90% |
| 05 | Route UX, Streaming & Skeletons | In Progress | 60% |
| 06 | Mutation UX & Optimistic Updates | In Progress | 60% |
| 07 | PWA/Cache Correctness | In Progress | 75% |
| 08 | Module-by-Module Performance Pass | In Progress | 70% |
| 09 | QA, Load Test & Production Monitoring | In Progress | 45% |
| 10 | Rollout, Deploy & Regression Guard | In Progress | 60% |

## Progress Log
### 2026-04-23
Implemented:
- Added Web Vitals client reporter and `/api/monitoring/web-vitals` endpoint.
- Added `npm run perf:chunks` route bundle budget script with 80KB app route threshold.
- Extended `useRealtime` with payload-aware `onChange`, dynamic `cacheKeys`, and namespace `prefixes`.
- Added module cache invalidation SSOT in `lib/cache-invalidation.ts`.
- Converted employee list realtime to SWR prefix revalidation instead of server refresh.
- Removed unnecessary full refresh/reload in contract cancel/reactivate and credit-card settings.
- Changed PWA Supabase REST business data caching from `NetworkFirst` to `NetworkOnly`.
- Lazy-loaded heavy route chunks:
  - Finance dashboard charts.
  - Reports cashflow chart view.
  - CRM Kanban/DnD board.
  - Calendar month/week DnD grids.
  - Finance goals modal/drawer/celebration chunks.
  - Contract detail modals and below-fold blocks.

Measured after production build:
- `contracts/[id]` route chunk: 120.7KB -> 76.6KB.
- `finance/goals` route chunk: 84.8KB -> 55.7KB.
- `crm/leads` route chunk: 62.1KB -> 52.1KB.
- `calendar` route chunk: 77.2KB -> 60.4KB.
- `reports` route chunk: 46.0KB -> 39.0KB.
- `npm run perf:chunks`: pass, no app route chunk over 80KB.

Additional implementation batch:
- CRM customers/leads list now use SWR fallback data + realtime prefix invalidation instead of full `router.refresh()`.
- CRM lead Kanban/list status updates revalidate the `leads` namespace after optimistic UI change.
- Dashboard realtime now invalidates dashboard/contract/finance SWR namespaces instead of default route refresh.
- Employee detail page/drawer now refresh local detail state and employee caches after edit/restore/delete; removed full refresh dependency.
- Services form and category manager now revalidate services/categories caches without route refresh after mutations.
- Added `RealtimeSync` filter support and documented cache-first behavior.
- Added supplemental DB migration `20260423090000_performance_hot_path_indexes.sql` for contract, CRM, task, payment plan, printing, dress reservation/rental hot paths.
- Added `npm run perf:audit` regression guard for broad refresh/reload and static heavy PDF/QR imports.

Verification:
- `npx tsc --noEmit`: pass.
- `npm run lint`: pass.
- `npm run build`: pass.
- `npm run perf:chunks`: pass, no app route chunk over 80KB.
- `npm run perf:audit`: pass.

Still requires production/staging validation before claiming final 100%:
- Apply pending Supabase migrations to the target database.
- Run smoke journeys on real data after deploy.
- Capture Web Vitals p75 and route TTFB from staging/production traffic.

Deployment batch:
- Applied Supabase migration `20260423090000_performance_hot_path_indexes.sql` to linked project `moodweddingstudio` (`mnoqeluywookswpcykha`).
- Deployed production to Vercel deployment `dpl_7X6FpwnGKhkMnBUNxReZnGkqsLLt`.
- Production alias is live at `https://stu.moodwedding.com`.
- Vercel inspect status: Ready.
- HTTP smoke:
  - `/login`: 200.
  - `/offline`: 200.
  - `/sw.js`: 200.

Remaining validation after real-user/login flow:
- Run authenticated smoke journeys for contract checklist/payment/CRM/service/employee mutation flows.
- Watch Web Vitals and mutation latency from production traffic.

## Phase 00: Baseline & Instrumentation
Deliverables:
- Add production-safe Web Vitals reporting for LCP/INP/CLS/TTFB by route.
- Add optional server action profiler wrapper for slow actions/RPC timing.
- Generate bundle baseline with `ANALYZE=true npm run build`.
- Create route performance matrix for all protected modules.
- Capture local throttled baseline for key user journeys.

Acceptance:
- Every protected route has baseline JS size, TTFB, LCP estimate, mutation latency notes.
- Slow server actions > 500ms are logged in dev/staging.
- Bundle analyzer output saved or summarized in the plan progress notes.

## Phase 01: Cache/Refetch Contract
Deliverables:
- Define one cache-key registry as SSOT in `lib/swr.ts`.
- Define module invalidators:
  - `revalidateContractCaches(contractId, options)`
  - `revalidateFinanceCaches(scope)`
  - `revalidateInventoryCaches(itemId, options)`
  - `revalidateDressCaches(dressId, options)`
  - `revalidatePrintingCaches(orderId, contractId)`
  - `revalidateCrmCaches(entity, id)`
  - `revalidateEmployeeCaches(employeeId)`
  - `revalidateServiceCaches(serviceId)`
- Replace broad `router.refresh()` where SWR mutation can update exact keys.
- Keep `router.refresh()` only for auth/session, permission, layout-level settings, and truly server-only pages.

Acceptance:
- No business mutation silently depends on full page refresh for correctness.
- Contract/checklist/payment/task changes update list + drawer + detail without reload.
- Finance receipts/expenses update dashboard, ledger, reports, goals/cashflow where relevant.

## Phase 02: Realtime Strategy
Deliverables:
- Extend `useRealtime` with payload-aware callbacks so invalidators can target exact entity IDs.
- Add filters for detail pages:
  - `contract_id=eq.<id>`
  - `customer_id=eq.<id>`
  - `employee_id=eq.<id>`
  - `item_id=eq.<id>`
- For list pages, debounce and merge realtime events per table/module.
- Avoid subscribing to unrelated high-churn tables inside detail screens.
- Add a realtime audit table in docs: table, module, filter, invalidator, reason.

Acceptance:
- Detail pages do not refetch when unrelated rows change.
- List pages update within 1.5s after another user changes data.
- No route uses default realtime fallback `router.refresh()` unless explicitly documented.

## Phase 03: Server Data & Database Performance
Deliverables:
- Audit all server actions for N+1, select("*"), waterfall queries, missing pagination.
- Add/verify indexes for hot filters:
  - contracts: status, contract_code, customer_id, assigned_employee_id, contract_date.
  - work_tasks: contract_id, assigned_to, status, due_date.
  - receipts/expenses/payment_plans: contract_id, payment_date/date, status.
  - printing_orders: contract_id, lab_id, status, payment_status.
  - dress_reservations/rentals: contract_id, dress_id, status, date ranges.
  - services/employees/inventory: status + search fields.
- Convert dashboard heavy aggregations to RPC or summary queries where needed.
- Add short TTL caching for finance dashboard/query groups when data can tolerate 30-60s freshness.
- Review `force-dynamic` route list and remove where not required.

Acceptance:
- No known hot action performs avoidable N+1.
- Dashboard and reports query groups have measured p75 timing.
- Finance dashboard TTFB target is met on production data or has documented DB-side backlog.

## Phase 04: Bundle & Code Splitting
Deliverables:
- Lazy-load Recharts on every route using charts, not only finance dashboard.
- Lazy-load `@dnd-kit` board/calendar layers only when drag/drop view is active.
- Keep `html2pdf.js`, `qr-scanner`, `qr-code-styling` dynamic-only.
- Review `framer-motion` usage; replace simple swipe/motion with CSS where possible or lazy-load.
- Split heavy drawers/modals from list initial bundles.
- Add route-level bundle budget checklist.

Acceptance:
- Normal protected route page chunk <= 80KB unless documented exception.
- Heavy feature chunks load after intent: open modal, switch tab, open board, export PDF, scan QR.
- No chart/DnD/PDF/QR library appears in unrelated route chunks.

## Phase 05: Route UX, Streaming & Skeletons
Deliverables:
- Ensure every protected route has fast `loading.tsx` or Suspense skeleton.
- Use server component shell + streamed sections for slow analytics.
- Standardize list skeleton, drawer skeleton, detail skeleton, table shimmer, empty state, error retry.
- Preload likely next routes from sidebar/bottom nav where safe.
- Prefetch drawer/detail data on row hover/touch intent.

Acceptance:
- First paint shows meaningful UI shell within 500ms locally.
- Slow sections never block primary list/form interactions.
- Navigation between core modules feels instant with router cache/prefetch.

## Phase 06: Mutation UX & Optimistic Updates
Deliverables:
- Create optimistic mutation pattern per module:
  - list row update
  - stats update
  - detail refresh
  - rollback on error
- Standardize button pending state, toast, retry, idempotency guard.
- For task/checklist/payment/status toggles, update UI immediately before server confirms.
- Keep business-critical money writes conservative: optimistic display allowed, confirmed source of truth required.

Acceptance:
- Checklist tick updates dashboard/list state immediately.
- Payment/receipt write updates financial summary without reload.
- Status changes in CRM/Printing/Dresses/Contracts keep row position/counts consistent.

## Phase 07: PWA/Cache Correctness
Deliverables:
- Review Workbox runtime rules:
  - Supabase auth: NetworkOnly.
  - Supabase REST business data: NetworkOnly or short NetworkFirst TTL.
  - Storage images/static assets: long cache.
  - HTML shell: stale-while-revalidate with safe invalidation.
- Add service worker version reset strategy after deploy.
- Ensure offline page does not mask auth/data errors.
- Validate production mobile after SW update.

Acceptance:
- No business data can remain stale for minutes after mutation.
- New deploy invalidates app shell reliably on mobile.
- Offline support remains useful for shell/static, not misleading for live operations.

## Phase 08: Module-by-Module Performance Pass
Execution order:
1. Contracts: highest business criticality, many realtime/mutation paths.
2. Finance: heavy dashboard/reports/data aggregation.
3. CRM: board/list/detail, DnD, lead/customer updates.
4. Calendar/Productivity: DnD/realtime/task density.
5. Inventory/Dresses/Printing: operational sync with contracts/finance.
6. Services/Employees/Settings: option sources, forms, lower churn but must be clean.
7. Reports/Auth/Shell: perceived speed and initial app quality.

Acceptance per module:
- Cache keys documented.
- Mutations invalidate exact affected views.
- Route chunk and slow actions measured.
- Loading/error/empty states present.
- No known stale dashboard/list after successful mutation.

## Phase 09: QA, Load Test & Production Monitoring
Deliverables:
- Add Playwright smoke journeys:
  - create contract -> add service -> assign employee -> checklist tick -> dashboard/list update.
  - create receipt/expense -> finance dashboard/report update.
  - update printing/dress/inventory status -> contract detail/list update.
  - CRM lead/customer update -> list/detail update.
- Add Lighthouse production check for app shell and top 5 routes.
- Add Web Vitals route dashboard or log summary.
- Run low-end mobile and 4G throttled manual test.

Acceptance:
- Smoke tests pass before deploy.
- Build/lint/typecheck pass.
- No critical UX path relies on manual refresh.
- Performance metrics meet targets or have documented exceptions with next action.

## Phase 10: Rollout, Deploy & Regression Guard
Deliverables:
- Deploy in small batches by phase/module.
- After each deploy, verify production alias and service worker update.
- Save perf baseline before/after.
- Add release note summarizing user-visible speed improvement.
- Add regression checklist to future PR/release flow.

Acceptance:
- Production metrics improve or remain stable after each phase.
- Rollback path documented for service worker/cache issues.
- No performance fix regresses business correctness.

## Anti-Patterns To Remove
- Calling `router.refresh()` after every mutation.
- Subscribing detail pages to entire tables without row filter.
- Importing chart/DnD/PDF/QR libraries in base route bundles.
- Fetching all rows when list only needs page/search.
- Using `select("*")` in sensitive/server actions.
- Blocking primary route render on non-critical analytics widgets.
- Caching live business REST data too long in service worker.
- UI state that only becomes correct after user manually refreshes.

## Quick Commands
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Build: `npm run build`
- Bundle analysis: `ANALYZE=true npm run build`
- Top chunks: `Get-ChildItem -Path .next\static\chunks -Recurse -File | Sort-Object Length -Descending | Select-Object -First 40`
- Start implementation: `/code phase-00`
- Check progress: `/next`
- Save context: `/save-brain`

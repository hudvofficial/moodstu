# Plan: Login -> Dashboard Full Performance Optimization
Created: 2026-05-10T06:31+07:00
Re-audited: 2026-05-10T19:43+07:00
Status: Done

## Goal
Make login into `/dashboard` feel immediate without hiding real backend cost or serving stale operational data.

Target behavior:
1. Login returns after authentication and local cookie work only.
2. `/dashboard` first paint waits on auth context plus one small critical dashboard query.
3. KPI values are computed by SQL/RPC aggregates, not by many REST reads and Node-side summing.
4. Deferred dashboard sections stream independently and use aggregate RPCs where timings prove value.
5. Realtime invalidation stays correct while avoiding unnecessary full-dashboard work.

## Audit Scope
Files reviewed in this pass:
- `app/actions/auth.ts`
- `components/auth/login-page-client.tsx`
- `app/actions/dashboard-cache.ts`
- `lib/supabase/middleware.ts`
- `proxy.ts`
- `app/(protected)/layout.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/dashboard/loading.tsx`
- `lib/auth_utils.ts`
- `lib/api/dashboard.ts`
- `types/dashboard.ts`
- `components/dashboard/dashboard-realtime-refresh.tsx`
- `components/dashboard/dashboard-warmup.tsx`
- `lib/hooks/use-warmup.ts`
- `hooks/use-realtime.ts`
- `components/layout/navigation-warmup.tsx`
- `app/actions/finance-dashboard-queries.ts`
- dashboard-related Supabase migrations and existing finance RPCs

## Current Request Path
1. `login(formData)` authenticates with Supabase, optionally clears login attempts, and writes `session_type`.
2. On success, `login-page-client.tsx` sets `navigating`, calls `router.prefetch("/dashboard")`, starts `prewarmDashboardForNavigation()`, waits up to 250ms, then `router.replace("/dashboard")`.
3. `proxy.ts` runs `updateSession()`, and middleware calls `supabase.auth.getClaims()` for protected routes.
4. `(protected)/layout.tsx` calls `getAuthenticatedUserContext()`, which calls claims again and loads employee context from `employees`.
5. `/dashboard/page.tsx` awaits `getDashboardCritical()` before it can render quick access and KPI cards.
6. Revenue chart, service breakdown, upcoming events, and payment reminders are already wrapped in Suspense and stream separately.
7. The mounted dashboard also creates realtime subscriptions for seven tables and runs delayed navigation/data warmups.

## Measured Evidence
Local Supabase probes from this audit:
- Employee context lookup: cold ~1323ms to ~1954ms, warm ~373ms to ~396ms.
- Critical KPI equivalent REST fanout: ~938ms on one run, ~1727ms on another.
- Deferred section equivalent group: ~439ms.
- Existing `finance_dashboard_metrics` RPC: cold ~796ms, warm ~164ms to ~206ms.
- Existing `finance_revenue_by_month` RPC: cold ~477ms, warm ~153ms to ~198ms.

Existing dev logs show `/dashboard` requests ranging from ~1439ms to ~6.0s, including one case with `proxy.ts` around 1569ms and render around 3.1s. This confirms both auth/proxy and dashboard render can be slow.

## Root Causes
P0:
- `queryKpis()` in `lib/api/dashboard.ts` fans out to many Supabase REST queries and transfers rows that should be SQL aggregates.
- Login-side prewarm is too short to finish the critical query, so it can add a 250ms delay and still compete with the real dashboard navigation.

P1:
- Auth work is duplicated across middleware and protected layout. The app still needs layout context for shell role/userName/disabled checks, but the duplicate `getClaims()` and employee lookup need explicit timing and possible consolidation.
- `getCachedDashboardBootstrap()` remains in `lib/api/dashboard.ts` as a compatibility path and shares the dashboard cache tag; it should not become the active hot path again.

P2:
- Deferred sections still fetch raw rows in places where aggregate RPCs already exist or can be created.
- Dashboard realtime uses seven subscriptions and refreshes the full route after invalidating the critical tag.
- `DashboardWarmup` and `NavigationWarmup` can start extra prefetch work shortly after landing.

## Target Architecture
- Login success path: authenticate, set cookies, navigate. No awaited dashboard data.
- Dashboard critical path: auth context plus a single `dashboard_critical_kpis` RPC with role visibility applied in TypeScript.
- Deferred sections: keep Suspense, but use aggregate RPCs for revenue/service data and only add reminders/events RPCs if timings require it.
- Cache: section-level tags with explicit invalidation; no long full-dashboard cache.
- Realtime: one dashboard bridge that invalidates the smallest safe set of tags and refreshes once per burst.
- Warmup: only idle, cancelable, and never competing with initial dashboard render.

## Phases
| Phase | Name | Status | Main Outcome |
| --- | --- | --- | --- |
| 00 | Current Audit and Baseline | Done for planning | True current bottlenecks and timings are documented. |
| 01 | Stop Login Prewarm Race | Done Locally | Login navigates immediately after auth; no 250ms dashboard wait. |
| 02 | Critical KPI RPC | Done and Deployed | KPI critical path becomes one RPC plus typed fallback. |
| 03 | Auth and Shell Hot Path | Done Locally | Auth/proxy/context timings are visible and duplicate claims are skipped through verified proxy headers. |
| 04 | Deferred Section RPCs | Done and Deployed | Revenue chart and service breakdown use aggregate RPCs with typed fallbacks. |
| 05 | Cache, Realtime, and Client Budget | Done Locally | Realtime uses one dashboard channel, scoped critical invalidation, and no dashboard startup warmup. |
| 06 | Release Gate and Observability | Done | Lint, TypeScript, build, verify, smoke, migration list, and profiling hooks prove the release. |

## Phase Files
- `phase-00-current-audit.md`
- `phase-01-stop-login-prewarm-race.md`
- `phase-02-critical-kpi-rpc.md`
- `phase-03-auth-shell-hot-path.md`
- `phase-04-deferred-section-rpcs.md`
- `phase-05-cache-realtime-client-budget.md`
- `phase-06-release-gate-observability.md`

## Non-Goals
- No dashboard visual redesign except skeleton or loading-state fixes required by performance changes.
- No speculative indexes. Existing migrations already cover many hot paths; add DB objects only when timing or query shape proves it.
- No long-lived cache for volatile finance/contract dashboard data.
- No broad refactor of auth helpers outside the login/dashboard hot path.
- No staging of unrelated untracked files.

## Dirty Worktree Guard
Current unrelated untracked files to avoid staging or modifying unless explicitly requested:
- `docs/PROJECT_REVIEW_Contracts_Module_260509.md`
- `plans/260509-1316-optimize-contract-detail/`
- `plans/260509-1406-optimize-checklist-ux/`
- `supabase/migrations/20260509140000_contract_detail_v2_rpc.sql`

## Verification Commands
Minimum local gate:
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run verify:dashboard`
- `npm run smoke:dashboard`

Performance gate:
- Run with `AUTH_LOGIN_PROFILE=1` and `DASHBOARD_PROFILE=1` for controlled before/after logs.
- Confirm dashboard critical render target after Phase 02: warm critical RPC <= 250ms, dashboard critical section <= 600ms including auth/context on local network.
- Confirm login no longer adds an artificial 250ms prewarm wait.

## Implementation Notes
2026-05-10T20:00+07:00:
- Phase 01 implemented in `components/auth/login-page-client.tsx`; login no longer imports or waits on `prewarmDashboardForNavigation()`.
- Removed unused `prewarmDashboardForNavigation()` server action from `app/actions/dashboard-cache.ts`.
- Phase 02 implemented in code with `dashboard_critical_kpis` RPC fallback in `lib/api/dashboard.ts`.
- Added migration `supabase/migrations/20260510195000_dashboard_critical_kpis.sql`.
- Added verify/smoke coverage. Local smoke skipped the RPC probe because the migration is not deployed to the configured Supabase project yet.

2026-05-10T20:04+07:00:
- Applied migration `20260510195000_dashboard_critical_kpis.sql` to Supabase project `moodweddingstudio` (`mnoqeluywookswpcykha`).
- `npx --yes supabase migration list` now shows local and remote both at `20260510195000`.
- `npm run verify:dashboard` and `npm run smoke:dashboard` pass with the RPC deployed.

2026-05-10T20:16+07:00:
- Phase 03 implemented verified proxy-claim reuse in `lib/auth-proxy-headers.ts`, `lib/supabase/middleware.ts`, and `lib/auth_utils.ts`.
- Added `AUTH_CONTEXT_PROFILE=1` support for middleware claims, claims source, employee lookup, and full auth context timing.
- Phase 04 added and deployed `20260510201000_dashboard_deferred_sections.sql` with `dashboard_revenue_chart` and `dashboard_service_breakdown`.
- Phase 05 replaced seven dashboard realtime channels with one `dashboard-realtime` channel, scoped critical tag invalidation by changed table, and removed dashboard startup warmup prefetch.
- `npm run verify:dashboard`, `npm run smoke:dashboard`, and targeted lint/type checks pass after these changes.

2026-05-10T20:20+07:00:
- Phase 06 release gate passed: `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run verify:dashboard`, and `npm run smoke:dashboard`.
- `npx --yes supabase migration list` shows local and remote both at `20260510201000`.

2026-05-10T20:25+07:00:
- Reran full release gate after final realtime trailing-refresh adjustment; `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run verify:dashboard`, `npm run smoke:dashboard`, and `npm run build` all pass.
- Post-deploy service-role RPC samples: `dashboard_critical_kpis` 1243ms cold then 410ms/183ms warm; `dashboard_revenue_chart` 163ms/232ms/133ms; `dashboard_service_breakdown` 147ms/128ms/128ms.

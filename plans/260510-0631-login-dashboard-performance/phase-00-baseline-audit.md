# Phase 00: Baseline & Audit Lock
Status: Done

## Objective
Lock the actual current app behavior before deeper optimization. This phase proves whether the problem is login feedback, dashboard data shape, or database speed.

## Findings

1. Login feedback is already improved.
   - `components/auth/login-page-client.tsx` sets loading synchronously with `flushSync`.
   - `components/auth/login-transition.tsx` shows a full-screen transition with the logo spinner.

2. Login backend is already less wasteful than before.
   - `app/actions/auth.ts` skips `login_attempts` precheck on clean path.
   - Failed login still records attempts and sets the hint cookie.

3. The current bridge optimization is valid but incomplete.
   - `app/actions/auth.ts` prewarms dashboard after successful auth.
   - `lib/api/dashboard.ts` caches the full bootstrap briefly.
   - This removes the second wait visually, but still makes login wait for heavy dashboard sections.

4. `/dashboard` is the real render bottleneck.
   - `app/(protected)/dashboard/page.tsx` awaits `getDashboardBootstrap()`.
   - No dashboard card renders until all sections resolve.

5. The app already has a better pattern nearby.
   - `app/(protected)/finance/dashboard/page.tsx` uses Suspense zones and independent async sections.
   - Dashboard should reuse this pattern instead of inventing a new architecture.

6. Realtime needs care.
   - `components/shared/realtime-sync.tsx` uses `useRealtime`.
   - Current dashboard listeners have no explicit SWR keys/prefixes, so changes fall back to `router.refresh()`.
   - A full bootstrap `unstable_cache` can briefly return stale data after refresh.

## Acceptance Criteria

- Current dirty files are known.
- The plan identifies exact files and current bottleneck shape.
- No schema/index/RPC decision is made before section timings exist.

## Current Dirty Scope

Expected working files from the current login/dashboard optimization:
- `app/actions/auth.ts`
- `lib/api/dashboard.ts`

Existing unrelated untracked files to avoid staging:
- `docs/PROJECT_REVIEW_Contracts_Module_260509.md`
- `plans/260509-1316-optimize-contract-detail/`
- `plans/260509-1406-optimize-checklist-ux/`
- `supabase/migrations/20260509140000_contract_detail_v2_rpc.sql`


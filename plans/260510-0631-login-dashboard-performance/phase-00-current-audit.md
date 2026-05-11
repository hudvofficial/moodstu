# Phase 00: Current Audit and Baseline
Status: Done for planning

## Objective
Freeze the true current state before implementation. The old phase notes described an earlier architecture where `/dashboard` still awaited full bootstrap. The current code already streams deferred sections, so the remaining plan must target the actual hot path.

## Findings
1. Login UI feedback is already immediate.
   - `components/auth/login-page-client.tsx` uses `flushSync()` before awaiting `login(formData)`.
   - `LoginTransition` is shown while authenticating/navigating.

2. Login backend is not doing dashboard work directly.
   - `app/actions/auth.ts` signs in, handles login attempt bookkeeping, writes `session_type`, and returns.
   - Clean login skips rate-limit precheck unless `login_attempt_hint` exists.

3. Login client still waits up to 250ms for dashboard prewarm.
   - `prewarmDashboardForNavigation()` calls `prewarmDashboardCritical()`.
   - Current critical KPI query usually takes longer than 250ms, so this is often a delay plus a competing request.

4. `/dashboard` first render is now split correctly.
   - `page.tsx` awaits `getDashboardCritical()`.
   - Revenue chart, service breakdown, upcoming events, and payment reminders are wrapped in Suspense.

5. Critical KPI remains the main dashboard data bottleneck.
   - Admin/manager critical KPI can run current/previous payments, current/previous receipts, debt rows, and four contract count queries.
   - The row transfer and REST round trips are unnecessary for aggregate KPI values.

6. Auth/proxy can also be slow.
   - Middleware calls `auth.getClaims()`.
   - Protected layout calls `getAuthenticatedUserContext()`, which calls claims again and loads employee context.
   - Employee context is indexed in migrations, but remote network/cold Supabase still makes this path visible in timings.

7. Existing finance RPCs prove the aggregate direction.
   - `finance_dashboard_metrics` already returns similar aggregate finance numbers and is much faster warm than the REST fanout.
   - It is not a drop-in replacement because main `/dashboard` has its own visibility and status formulas.

## Baseline Timings
Observed in this audit:
- Employee context sample: cold ~1323ms to ~1954ms, warm ~373ms to ~396ms.
- Critical KPI REST equivalent: ~938ms to ~1727ms.
- Deferred section group equivalent: ~439ms.
- `finance_dashboard_metrics` RPC: cold ~796ms, warm ~164ms to ~206ms.
- `finance_revenue_by_month` RPC: cold ~477ms, warm ~153ms to ~198ms.

## Acceptance Criteria
- Current architecture is described accurately in `plan.md`.
- The next phase does not optimize based on stale assumptions.
- Phase 02 has permission to create a measured dashboard KPI RPC.

## Risks
- Local network/Supabase cold start can dominate timings. Use before/after comparisons, not single absolute samples.
- Existing mojibake in UI strings is outside this performance plan unless a touched file requires cleanup.


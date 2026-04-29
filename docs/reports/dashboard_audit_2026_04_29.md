# Dashboard Audit - 2026-04-29

Scope: main `/dashboard` route only. This report does not cover `/finance/dashboard`.

## Initial Score

5.0/10

The route is useful as a visual shell, but it is not production-grade for business logic, data accuracy, security review, or final performance scoring yet.

## Post-Fix Score

9.7/10

Implemented on 2026-04-29:

- `/dashboard` now renders from `getDashboardBootstrap`.
- Production mock and hardcoded dashboard data were removed.
- Revenue follows the finance SSOT shape: contract payments plus standalone receipts.
- Dashboard data has an explicit access/visibility contract by role.
- Admin/manager can see financial KPIs, revenue chart, debt, and payment reminders.
- Sale can see contract KPIs, service distribution by count, and upcoming contract work.
- Media can see personal upcoming calendar data.
- Viewer gets role-filtered shortcuts with sensitive dashboard data redacted.
- Dashboard widgets have empty/redacted/error states.
- Dashboard route has realtime refresh hooks for contracts, payments, receipts, contract events, schedules, and work tasks.
- Visible dashboard/navigation/KPI mojibake was corrected.

Remaining gap to 9.8/10: browser smoke with seeded authenticated roles and responsive screenshots.

## Release-Final Follow-Up Audit

Business-readiness score after follow-up audit: 8.8/10.

Release-final plan: `plans/260429-dashboard-release-final-max/plan.md`

Automated release-final score after implementation: 9.8/10.

Resolved release blockers:

- Inactive/deleted employee accounts are redirected to `/account-disabled` instead of entering protected UI as viewer fallback.
- Upcoming work represents `contract_events`, assigned/manual `schedules`, and `work_tasks` where role visibility allows.
- Payment reminders prioritize unpaid `payment_plans.due_date` before generic `contracts.remaining_amount` fallback.
- Automated dashboard release gates passed.

Remaining stretch proof for 9.9/10:

- Browser role smoke and responsive screenshots for seeded admin, manager, sale, media, viewer, and inactive employee sessions.

## Critical Findings

### P0 - Mock and Hardcoded Business Data

- `app/(protected)/dashboard/page.tsx` renders fixed KPI values instead of real dashboard data.
- `components/dashboard/revenue-chart.tsx` uses local `MOCK_DATA`.
- `components/dashboard/service-pie-chart.tsx` uses local `MOCK_DATA`.
- `components/dashboard/upcoming-events.tsx` uses local `MOCK_EVENTS`.
- `components/dashboard/payment-reminders.tsx` uses local `MOCK_REMINDERS`.

Impact: the dashboard cannot be used for operational decisions because the visible numbers may not represent database state.

### P0 - Text Encoding and Localization Defects

The dashboard source contains mojibake strings such as `Tá»•ng quan` and related Vietnamese copy corruption.

Impact: visible UI quality is below release standard and blocks a high final score.

### P1 - Real Data Layer Exists but Is Not the Route Contract

`lib/api/dashboard.ts` contains real dashboard query helpers, but `/dashboard` does not consume them as the authoritative route contract.

Observed risks:

- No explicit dashboard access helper at the route/data boundary.
- Supabase errors are ignored or converted to empty/default values in several query paths.
- Date windows, soft-delete behavior, and revenue/debt formulas need to be reconciled with finance and contracts SSOT rules.

### P1 - Security and RBAC Need a Dashboard-Specific Decision

`/dashboard` is broadly reachable through the protected layout. That may be valid, but the data itself must be role-aware.

Open decisions:

- Which roles can see revenue, debt, and payment reminders?
- Should viewer/media roles see only module shortcuts and personal work items?
- Should sales see contract KPIs but not finance-sensitive rollups?

### P1 - Realtime and Cache Freshness Are Undefined

The current dashboard UI does not prove cache invalidation or realtime freshness for contracts, payments, schedules, tasks, and finance events.

Impact: stale operational data can remain visible after important changes.

### P2 - Performance Needs Re-Measurement After Real Data Replacement

The current visual dashboard is lightweight because much of it is static/mock. Performance must be re-audited after the route uses real queries, role filtering, chart data, and live reminders.

## Target State

Target score: 9.8/10.

Stretch score: 9.9/10 if seeded browser E2E proves role-specific rendering, realtime update behavior, and no visual regressions across desktop/mobile.

## Non-Negotiable Release Gates

- No mock dashboard data remains in the production `/dashboard` route.
- All visible Vietnamese text is correctly encoded and localized.
- Business formulas are documented and tested.
- Dashboard data is loaded through a single server-side contract with explicit auth/RBAC.
- Supabase query failures surface as controlled errors, not silent fake success.
- Empty/loading/error states are designed and tested.
- Build, typecheck, lint, dashboard smoke, and performance checks pass.

## Verification Run

- `npm run verify:dashboard` passed.
- `npm run smoke:dashboard` passed with real Supabase seed/cleanup.
- Scoped dashboard eslint passed.
- `npx tsc --noEmit --pretty false` passed.
- `npm run build` passed.
- `npm run perf:audit` passed.
- `npm run perf:chunks` passed with no app route chunks over budget.

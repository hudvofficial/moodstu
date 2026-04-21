# Audit 2026-04-21 - Finance Smart Dashboard V1 Parity

## Scope

- V2 target: `/finance` and intended `/finance/dashboard`
- V1 reference: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp`
- Focus: business logic, production readiness, SSOT token compliance, performance/data-flow.

## Executive Status

`/finance/dashboard` is not production-ready in V2.

V2 currently has a finance hub at `/finance` and some smart dashboard components embedded inside that hub. However, the dedicated smart dashboard route does not exist, the banner links to a missing route, and the intelligence server actions still return mock data. V1 has a real `/finance/dashboard` page with streaming SSR, cached analytics services, and broader widget coverage.

## 2026-04-21 Remediation Update

The dashboard blockers from this audit have been closed for the dedicated `/finance/dashboard` route:

- Added `app/(protected)/finance/dashboard/page.tsx` and `loading.tsx` with Server Components, Suspense zones, and request-level `cache()` dedupe.
- Removed mock intelligence action behavior and added app-level finance access guards for dashboard/intelligence reads.
- Added production hardening migration `20260421113000_finance_dashboard_production_hardening.sql`.
- Added advanced parity migration `20260421124500_finance_advanced_intelligence_rpc.sql`.
- Added V2 widgets for scenario planning, customer metrics/CLV/conversion, service revenue mix, dress ROI, inventory costs, and advanced KPI grid.
- Verified scoped lint, production build, migration push, and Supabase smoke query `advanced_ok=true`.

2026-04-21 follow-up closed: the same finance revenue/outflow SSOT has been propagated through `/reports`, `/finance/goals`, and `/finance/closes`.

- `/reports`: realized inflow now uses `payments + standalone receipts`; cashflow timeline includes operating expenses, salary, and fixed costs.
- `/finance/goals`: advisor cashflow and template burn-rate include fixed costs alongside expenses and salary.
- `/finance/closes`: monthly close creation and step-8 locking write `snapshot_metrics` with the same inflow/outflow contract; close task UI follows the RPC state machine.

## V2 Findings

### Critical

- Missing route: `app/(protected)/finance/dashboard/page.tsx` does not exist while `components/finance/dashboard/smart-dashboard-banner.tsx` links to `/finance/dashboard`.
- Mock data leak: `app/actions/finance-intelligence-queries.ts` has `USE_MOCK = true`, so health score, runway, forecast, expense breakdown, AR aging, and budget-vs-actual do not use production data.
- Inconsistent revenue SSOT: dashboard metrics use `payments + standalone receipts`, while intelligence RPCs use `receipts` only. This can make the finance hub and health score disagree.
- Soft-delete mismatch: `finance_dashboard_metrics`, `finance_revenue_by_month`, and `finance_ledger` include receipts without `deleted_at IS NULL` in the SQL RPC path, while JS fallbacks filter deleted rows.
- Profit report mismatch: `getContractProfitReport()` maps `package_revenue`, `addon_revenue`, and `discount`, but `finance_contract_profit_report` RPC does not return those columns. The production RPC path silently shows those values as `0`.
- Server action access gap: finance read actions use `withAuth`, which authenticates then uses the admin Supabase client. Route layout gates `/finance`, but server actions should still enforce finance access because actions can be invoked directly.
- RPC security gap: `20260413080000_finance_intelligence_rpcs.sql` creates `SECURITY DEFINER` functions without explicit `SET search_path = public`, without `REVOKE FROM PUBLIC`, and without service-role-only grants like the dashboard ledger RPC migration.

### Missing V1 Parity

V1 `/finance/dashboard` includes these production concepts:

- Streaming SSR with 3 Suspense zones: critical KPIs, charts/forecast, bottom intelligence.
- Request-level dedupe via `React.cache()`.
- Health score with 5 weighted dimensions.
- Break-even target, contracts-needed estimate, and strategic advice hook.
- Cashflow runway and 30-day forecast.
- Expense breakdown and receivable aging.
- Budget-vs-actual and scenario planning.
- Customer metrics, revenue breakdown, dress ROI, inventory costs, and advanced KPIs.
- Finance FAB context layer.

V2 has partial components for health/runway/break-even/forecast/expense/aging/budget but they are not assembled into a dedicated route, are currently fed by mock action wrappers, and are missing the larger V1 bottom intelligence set.

## Business Logic Requirements

Define a single finance calculation contract before porting more UI:

- Revenue SSOT: decide whether inflow is `payments + receipts where contract_id is null`, all `receipts`, or receipt table as canonical ledger after payment mirroring. Then use the same formula in dashboard metrics, revenue chart, intelligence, cashflow forecast, reports, goals, and close.
- Outflow SSOT: include operating expenses plus salary and fixed-cost obligations where the business metric requires cashflow/burn-rate, not only `expenses.amount`.
- Debt SSOT: separate contract receivables from finance `debts` receivable/payable, and avoid double counting.
- Period rules: all financial reads must respect soft delete and month windows consistently.
- Profit report SSOT: RPC must return the same fields the UI renders: package revenue, addon revenue, discount, task cost, print cost, expense cost, total cost, profit, margin.
- Forecast SSOT: projected inflow should come from unpaid upcoming work/contracts; projected outflow should include fixed costs and salary schedule, not only budgets.

## SSOT Token Requirements

Do not copy V1 visual classes. Port the intent only.

- Page layout uses `main-container`, `entrance`, and existing responsive grid conventions.
- Cards use `card-base`, `stats-card`, `card-interactive`, or `accent-card`; no ad-hoc `bg-white rounded-xl p-*` wrapper drift.
- Icons use `icon-box` and Lucide only.
- Status uses `badge badge-*`.
- Tables use shared table primitives and `Pagination`.
- Amounts use `tabular-nums` and shared finance formatter.
- Drawers/modals/FAB must reuse system primitives, not custom overlays.
- Chart colors use `var(--color-*)`, not hardcoded hex colors from V1.

## Performance Requirements

- Build `/finance/dashboard` as Server Components with Suspense streaming zones like V1, not one large client component.
- Use `cache()` or the existing server cache wrapper to dedupe repeated analytics calls inside one render.
- Prefer one RPC snapshot per zone over many client SWR calls.
- If server-rendered data is handed to SWR, set the SWR policy deliberately to avoid immediate duplicate refetch where not needed.
- Dynamic-import chart libraries only for chart islands.
- Keep expensive prefetch bounded; no hover path should fire multiple heavy finance analytics requests repeatedly.

## Plan Sync

- `plans/250413-finance-dashboard-restore/phase-02-smart-dashboard.md`: reopened as production-blocked until the route exists, mock mode is removed, RPC formulas are corrected, and streaming SSR is wired.
- `plans/250413-finance-dashboard-restore/phase-03-fab-quick-actions.md`: partial; component exists but must be mounted and route targets must be verified.
- `plans/260413-1233-finance-dashboard-optimization/*`: reopened for SSOT/performance hardening after business logic is fixed.
- `plans/260411-1107-finance/phase-03a-ui-dashboard-ledger.md`: must include the new formula parity gates before dashboard/ledger can be called done.
- `docs/plans/260417-0138-finance-goals-ui-fix/phase-06-cross-module-finance-ssot.md`: added and marked complete for reports/goals/closes SSOT propagation.

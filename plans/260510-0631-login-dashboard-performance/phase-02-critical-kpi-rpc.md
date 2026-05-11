# Phase 02: Critical KPI RPC
Status: Done and Deployed

## Objective
Replace the critical KPI REST fanout with one SQL/RPC aggregate while preserving the current dashboard formulas and role visibility.

## Current Critical Query Shape
`queryKpis()` currently does:
- current revenue: payments + standalone receipts
- previous revenue: payments + standalone receipts
- total debt: all active contract `remaining_amount` rows transferred to Node and summed
- current contract count
- previous contract count
- current completed count
- previous completed count

This is the first-render hot path because `/dashboard/page.tsx` awaits `getDashboardCritical()`.

## Target RPC
Create a new service-role RPC, for example:
- `public.dashboard_critical_kpis(p_month int, p_year int)`

Return fields:
- `current_revenue numeric`
- `previous_revenue numeric`
- `total_debt numeric`
- `current_contracts bigint`
- `previous_contracts bigint`
- `current_completed bigint`
- `previous_completed bigint`

Formula parity:
- payments: `deleted_at IS NULL`, `payment_date >= start`, `< end`
- standalone receipts: `deleted_at IS NULL`, `contract_id IS NULL`, `receipt_date >= start`, `< end`
- debt: contracts with `deleted_at IS NULL`, `status <> 'da_huy'`, `remaining_amount > 0`
- new contracts: contracts with `deleted_at IS NULL`, `status <> 'da_huy'`, month `contract_date`
- completed: contracts with `deleted_at IS NULL`, `status = 'hoan_thanh'`, month `updated_at`

## Implementation Tasks
1. Add an idempotent migration for `dashboard_critical_kpis`.
2. Add a typed mapper in `lib/api/dashboard.ts`.
3. Keep the existing REST implementation as fallback if RPC is missing during rollout.
4. Compute percent changes in TypeScript with the current `percentChange()` behavior.
5. Keep role visibility in TypeScript:
   - financial fields only visible to admin/manager
   - contract fields visible to admin/manager/sale
6. Update `prewarmDashboardCritical()` to benefit from the RPC, but do not await it from login after Phase 01.
7. Add smoke checks that compare RPC output to seeded dashboard source rows.

## Acceptance Criteria
- `dashboard.kpis` timing drops materially versus baseline.
- Warm `dashboard_critical_kpis` target: <= 250ms on the same local Supabase network used for the baseline.
- Full `dashboard.critical` target: <= 600ms including access/context.
- Dashboard KPI numbers match current implementation for seeded smoke data.
- No role gains access to financial fields.

## Result
- Added migration `supabase/migrations/20260510195000_dashboard_critical_kpis.sql`.
- Added `dashboard_critical_kpis` RPC loader in `lib/api/dashboard.ts`.
- Kept the existing REST fanout as `queryKpisFallback()` for rollout safety when the RPC is missing.
- Kept role visibility in TypeScript so hidden financial values are zeroed for non-finance roles.
- Updated dashboard verify/smoke scripts.
- Applied migration `20260510195000_dashboard_critical_kpis.sql` to Supabase project `moodweddingstudio` (`mnoqeluywookswpcykha`).
- `npx --yes supabase migration list` now shows local and remote both at `20260510195000`.
- `npm run verify:dashboard` and `npm run smoke:dashboard` pass with the RPC deployed.

## Risks
- Existing `finance_dashboard_metrics` is similar but not exact. Reusing it directly risks formula drift.
- RPC can hide business logic in SQL. Keep comments and smoke coverage focused on formula parity.

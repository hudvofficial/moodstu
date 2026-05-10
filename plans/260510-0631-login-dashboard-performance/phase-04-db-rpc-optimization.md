# Phase 04: DB/RPC Optimization, If Proven
Status: Planned

## Objective
Only optimize database shape where Phase 03 proves a bottleneck.

## Candidate Improvements

1. KPI aggregate RPC
   - Replace Node-side summing of revenue/debt with SQL aggregate.
   - Candidate: `get_dashboard_kpis(month_start, month_end, previous_start, previous_end)`.
   - Benefit: fewer round trips and fewer rows transferred.

2. Revenue chart aggregate RPC
   - Aggregate payments + standalone receipts by month in SQL.
   - Benefit: avoids fetching every payment/receipt row for the 6-month chart.

3. Payment reminders RPC or view
   - Combine payment plans and fallback contract debt into one ordered result.
   - Benefit: one source of truth for "can thu tien".

4. Index cleanup only if needed
   - Existing migrations already cover many hot paths:
     - contracts date/status/remaining/service type
     - payments date/contract
     - receipts date/contract/type
     - payment_plans due/status/contract
     - schedules event_date/employee
     - work_tasks assigned/deadline/start_date
   - Do not add duplicate indexes unless explain/timing proves a gap.

## Implementation Tasks

1. Review existing migrations before writing new SQL.
2. If RPC is needed, create idempotent migration with stable return type.
3. Keep TypeScript fallback path for missing RPC during rollout.
4. Add smoke coverage for the RPC path.
5. Compare before/after timings from Phase 03 labels.

## Acceptance Criteria

- Fewer DB round trips or less row transfer on the measured slow section.
- No change to role visibility rules.
- No change to dashboard numbers versus existing implementation.
- `npm run smoke:dashboard` passes with seeded data.

## Risk

- RPC can drift from TypeScript business logic. Keep tests/smoke focused on current dashboard numbers and source inclusion.


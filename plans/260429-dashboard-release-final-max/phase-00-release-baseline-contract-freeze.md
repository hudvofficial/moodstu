# Phase 00 - Release Baseline and Contract Freeze

## Objective

Freeze the release contract before touching code so fixes stay focused on product readiness, not broad refactor.

## Tasks

1. Confirm `/dashboard` is the only UI route in scope.
2. Confirm allowed shared surfaces:
   - `lib/auth_utils.ts`
   - `lib/api/dashboard.ts`
   - dashboard widgets
   - dashboard verify/smoke scripts
3. Record current score: 8.8/10 business-readiness.
4. Record target score: 9.8/10 release-final.
5. Freeze role behavior:
   - admin/manager: full studio overview
   - sale: contracts and customer-facing work, no finance totals
   - media: personal/team calendar work, no finance totals
   - viewer: safe shortcuts only, no sensitive data
6. Define query source ownership before implementation:
   - finance cash inflow: `payments + standalone receipts`
   - debt/reminders: `payment_plans` first, `contracts.remaining_amount` fallback
   - upcoming work: `contract_events + schedules + work_tasks`

## Acceptance Criteria

- Release blockers are documented.
- Role/data source contract is explicit.
- No code implementation starts before phase ownership is clear.

## Status

Completed.

Evidence:

- Scope stayed on `/dashboard` plus directly shared auth/data helpers.
- Role behavior and data source ownership were frozen before implementation.
- Baseline score recorded as 8.8/10 and automated release target recorded as 9.8/10.

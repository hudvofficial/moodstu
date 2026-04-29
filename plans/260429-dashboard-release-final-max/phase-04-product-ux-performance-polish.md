# Phase 04 - Product UX and Performance Polish

## Objective

Polish dashboard behavior to release quality after the business logic changes.

## Tasks

1. Review all dashboard copy after final data changes.
2. Ensure cards/lists do not overflow on mobile.
3. Ensure hidden/redacted states do not look broken.
4. Keep charts lightweight and client islands small.
5. Ensure realtime updates cover new source tables:
   - `payment_plans`
   - `contract_events`
   - `schedules`
   - `work_tasks`
   - `payments`
   - `receipts`
   - `contracts`
6. Keep query fan-out bounded:
   - no unbounded selects
   - fixed list limits
   - no duplicate full-table scans when one joined query is enough
7. Update verify/smoke scripts for new business rules.

## Acceptance Criteria

- Dashboard still passes chunk budget after final business logic.
- No new mojibake or hardcoded fake data appears.
- Realtime source table coverage matches visible widgets.
- Mobile layout remains readable.

## Status

Completed.

Implementation:

- `/dashboard` realtime refresh now includes `payment_plans`.
- Dashboard list widgets display normalized source/stage context without mock data.
- Query windows and list sizes remain bounded.
- Verify/smoke scripts were updated for the release-final business rules.

Verification:

- `npm run perf:audit` passed.
- `npm run perf:chunks` passed with no app route chunks over budget.
- `npm run build` passed.

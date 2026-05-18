# Phase 08: Release Gate and Monitoring
Status: Completed
Priority: P0

## Objective
Prove the performance fixes are safe and keep them from regressing.

## Tasks
1. Run full local gate:
   - `npm run lint`
   - `npx tsc --noEmit --pretty false`
   - `npm run build`
   - `npm run verify:contracts`
   - `npm run smoke:contracts`
   - `npm run verify:dashboard`
   - `npm run smoke:dashboard`
   - `npm run perf:audit`
2. Run direct remote RPC timing samples after migrations.
3. Run browser/manual smoke for:
   - open contract list
   - open contract detail
   - add task
   - toggle task
   - add event
   - delete event
   - create payment
   - create/edit contract
4. Record before/after timings in a report.

## Acceptance Criteria
- All gates pass.
- No untracked migration is left unapplied or undocumented.
- Timing report shows improvement on P0/P1 flows.
- Any remaining slow path has a named owner and follow-up phase.

## Result
Passed:
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run verify:contracts`
- `npm run smoke:contracts`
- `npm run verify:dashboard`
- `npm run smoke:dashboard`
- `npm run perf:audit`
- `npm run verify:performance-release`
- `npm run perf:operational`

Migration `20260514084500_fix_contract_detail_v2_rpc_labs.sql` is documented and applied remotely.

Residual risk:
- Browser stopwatch timings for manual clicks were not recorded in this automated batch.
- Standalone module-specific hotspots outside the shared contracts-centered flow should get separate module plans if operators still report slowness.

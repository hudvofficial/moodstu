# Phase 06: Verification, Smoke, Browser E2E, Final Score
**Status:** In Progress
**Priority:** P2
**Target score impact:** 9.7 -> 9.8

## Goal

Prove calendar correctness, security, time-load, and UX behavior with repeatable gates.

## Work Items

1. Add `scripts/verify-calendar.mjs` and `npm run verify:calendar`.
2. Add `scripts/smoke-calendar.mjs` and `npm run smoke:calendar`.
3. Cover script-level checks:
   - viewer denied.
   - sale/media own-only schedule mutation.
   - admin/manager team mutation.
   - invalid date order rejected.
   - timestamped same-day availability conflict detected.
   - Google imported event mutation denied.
4. Cover browser smoke:
   - open `/calendar`.
   - change month/week/day on desktop.
   - filter by status and employee.
   - create/edit/delete own schedule.
   - drag/drop own schedule.
   - open task detail and update deadline.
   - verify mobile month drawer and create flow.
5. Run full verification and update final report with exact commands and scores.

## Acceptance Criteria

- No open P0/P1 findings remain.
- `verify:calendar` and `smoke:calendar` pass.
- Build, chunk budget, TypeScript, lint, perf audit, and DB migration checks pass.
- Final score is justified by evidence, not only asserted.
- Remaining gaps are small enough for 9.8/10; 9.9 requires production-like cross-role browser E2E and realtime two-client proof.

## Verification

```powershell
npx eslint "app/(protected)/calendar" app/actions/calendar-queries.ts app/actions/calendar-mutations.ts app/actions/calendar-task-actions.ts components/calendar hooks/use-calendar-data.ts hooks/use-calendar-keyboard.ts lib/utils/calendar-utils.ts types/calendar.types.ts
npx tsc --noEmit --pretty false
npx supabase db push --dry-run
npm run verify:calendar
npm run perf:audit
npm run build
npm run perf:chunks
npm run smoke:calendar
```

## Notes

- `verify:calendar` and `smoke:calendar` are implemented and passing.
- Browser E2E remains open for final 9.8/10 sign-off.

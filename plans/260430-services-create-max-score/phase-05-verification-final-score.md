# Phase 05: Verification, Smoke, Final Score
**Status:** Completed  
**Priority:** P2  
**Dependencies:** Phases 00-04  
**Score impact:** 9.7 -> 9.8+

## Objective

Lock the final score with repeatable technical checks and documented smoke evidence.

## Target Files

- `scripts/verify-services.mjs`
- `docs/reports/services_create_score_2026_04_30.md`
- `package.json` only if a new script is added

## Implementation Steps

1. Extend `verify:services` where feasible.
   - Create test service.
   - Update test service.
   - Delete test service.
   - Create bundle service with controlled child.
   - Confirm rollback behavior for invalid bundle.
   - Clean up records.

2. Document role smoke.
   - Admin/manager can open and create.
   - Sale/media/viewer are redirected away from `/services/create`.
   - Direct server action calls still require Services permission.

3. Run final gates.

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:services
npm run perf:audit
npm run build
npm run perf:chunks
```

4. Write final score report.
   - Score before.
   - Score after.
   - Commands run.
   - Manual smoke results.
   - Residual risks.

## Acceptance Criteria

- All final gates pass.
- Score report is committed in docs.
- Any missing E2E/remote credential prerequisite is explicitly documented.

## Final Score Rule

- 9.8/10 if all phases pass with manual smoke.
- 10/10 only after automated browser E2E runs in CI with seeded role matrix.

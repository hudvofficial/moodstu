# Phase 07: E2E, Remote Verification, and Final Score
**Status:** Partially Completed
**Priority:** P2
**Target score impact:** 9.7 -> 9.8+

## Goal

Prove the module is production-ready after all fixes and update the score with concrete evidence.

## Work Items

1. Add/prepare seeded verification users:
   - admin
   - manager
   - sale
   - media
   - viewer.
2. Add/prepare deterministic test data:
   - available dress
   - maintenance dress
   - retired dress
   - contract reservation
   - standalone rental
   - returned/cleaning history.
3. Add browser smoke coverage:
   - admin/manager can access `/dresses`.
   - sale can access intended booking flows.
   - media/viewer are blocked.
   - catalog destructive actions are hidden/blocked for sale if restricted.
   - search/filter/sort/pagination work.
   - contract reservation blocks standalone rental overlap.
   - standalone rental blocks contract reservation overlap.
   - concurrent/duplicate booking path fails safely.
   - start/return/cancel/clean transitions work.
   - contract add-on totals and line items stay consistent.
4. Run remote Supabase verification:
   - anon table reads denied
   - direct RPC grants safe
   - service-role paths available
   - storage posture matches Phase 06 decision.
5. Update final report:
   - `docs/reports/dresses_audit_2026_04_29.md` or a completion report
   - final score
   - commands run
   - residual risks.

## Acceptance Criteria

- All Phase 00-06 acceptance criteria are complete.
- TypeScript, lint, perf audit, build, chunk budget, DB push, and verify script pass.
- Browser smoke covers role access, booking conflicts, lifecycle, accounting, and core list UX.
- Final report records before/after score and exact verification evidence.
- No P0 or P1 audit items remain open.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:dresses
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase migration list
```

Add browser command after identifying the repo's current E2E script. If none exists, add a focused Playwright smoke script for `/dresses`.

## Notes

- Target score is 9.8/10 after this phase.
- Stretch score 9.9/10 requires seeded browser E2E plus remote verification against the same environment intended for production.

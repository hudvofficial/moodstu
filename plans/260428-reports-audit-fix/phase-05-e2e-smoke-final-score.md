# Phase 05: E2E/Smoke Verification and Final Scoring
**Status:** Completed
**Priority:** P2
**Dependencies:** Phases 00-04
**Audit issues:** Warning 7, Suggestions 1-5

## Objective

Lock the final score with repeatable verification and user-facing smoke coverage.

## Target Files

- `scripts/verify-reports.mjs`
- `docs/reports/reports_audit_2026_04_28.md`
- `docs/specs/reports.md` or `docs/specs/finance.md`
- Optional Playwright smoke tests if the repo test setup supports them.

## Implementation Steps

1. Complete `verify:reports`.
   - Service-role RPC shape checks.
   - Anon denial checks.
   - Snapshot basis key checks.
   - Ledger/cashflow consistency checks where basis allows.

2. Add visible report semantics.
   - Debt view should display "current/as-of today" if not period-scoped.
   - Export workbook should include the report basis and generation timestamp.

3. Manual smoke checklist.
   - Admin/manager can open `/reports`.
   - Sale/media/viewer cannot open `/reports`.
   - Overview, cashflow, debts, and profit tabs load.
   - Custom date beyond 366 days is blocked gracefully.
   - Export works for a normal month and blocks excessive row counts.

4. Optional Playwright smoke.
   - Add if login/test credentials are available.
   - Otherwise document manual checks as residual risk.

5. Final score update.
   - Update audit report with final score and verification commands.
   - Expected score after all phases: 9.5-9.7/10.
   - 10/10 only if browser E2E with real roles is automated and passing.

## Acceptance Criteria

- `npm run verify:reports` passes.
- Manual or automated role smoke test is documented.
- `/reports` score is updated with evidence.
- No route chunk over budget.

## Final Verification Commands

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:reports
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
```

---
Plan complete after this phase.

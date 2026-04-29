# Phase 05: E2E/Smoke Verification and Final Score
**Status:** Completed
**Priority:** P2
**Dependencies:** Phases 00-04
**Audit issues:** Suggestions 1-5

## Objective

Lock the final productivity score with repeatable remote verification and role-based UI smoke coverage.

## Target Files

- `scripts/verify-productivity.mjs`
- `docs/reports/productivity_audit_2026_04_28.md`
- `docs/specs/productivity.md`
- Optional Playwright smoke tests if test credentials are available

## Implementation Steps

1. Complete `verify:productivity`.
   - Service-role team overview shape.
   - Service-role team detail shape.
   - Anon denial for all productivity RPCs.
   - Self RPC redaction/scope if self RPCs remain authenticated-callable.
   - Metric sanity checks: non-negative counts/hours/costs.

2. Manual smoke checklist.
   - Admin and manager can open team view.
   - Media can open self view only.
   - Sale/viewer cannot open `/productivity`.
   - Unlinked media user sees linked-employee empty state.
   - Detail drawer never shows stale employee rows.
   - Period switch works for week/month/quarter.
   - Realtime or mutation invalidation refreshes productivity after task update.

3. Optional browser E2E.
   - Add only if login/test credentials exist.
   - Cover admin/manager/media/sale/viewer route behavior.
   - Cover detail drawer employee-switch stale-data regression.

4. Update final score.
   - Expected score after phases 00-04 and verification: 9.6/10.
   - Score can reach 9.8+ with automated browser E2E and stable test credentials.
   - 10/10 requires automated role matrix, real DB verification, and mutation smoke.

## Acceptance Criteria

- `npm run verify:productivity` passes.
- TypeScript, lint, build, perf audit, and chunk budget pass.
- Remote DB dry-run is up to date.
- Audit report is updated with final score and verification evidence.
- Residual risk is documented.

## Final Verification Commands

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:productivity
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
```

---
Plan complete after this phase.

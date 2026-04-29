# Phase 05: Regression Gates, Browser Smoke, and Final Score
**Status:** Completed
**Priority:** P2
**Target score impact:** 9.6 -> 9.8

## Goal

Prove the module is fixed with repeatable automated checks and targeted browser smoke coverage.

## Work Items

1. Run full static verification:
   - TypeScript
   - Lint
   - Perf audit
   - Chunk budget
2. Run DB/security verification:
   - Supabase dry-run
   - Supabase push
   - `npm run verify:employees`
3. Run build verification.
4. Browser smoke matrix:
   - Admin/manager can open `/employees`.
   - Unauthorized roles cannot open `/employees`.
   - Soft-deleted/inactive linked identity cannot access protected app context.
   - Employee list SSR data appears on first load.
   - Create/update/delete/restore flows handle success and expected errors.
   - Stale update conflict is visible.
   - Assignment picker still works in at least one dependent module.
5. Update plan status and final score evidence.

## Acceptance Criteria

- All command gates pass or documented blockers are explicit and actionable.
- Browser smoke covers role boundaries and core lifecycle flows.
- Final score is justified with evidence, not just asserted.
- Remaining gaps are small enough to score 9.8/10, or explicitly listed if score must stay lower.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
npx supabase db push --dry-run
npx supabase db push
npm run verify:employees
npm run build
npm run perf:chunks
```

## Notes

- 9.8/10 requires passing remote DB verification and build/chunk gates.
- 9.9/10 requires seeded browser E2E that can be rerun without manual role setup.

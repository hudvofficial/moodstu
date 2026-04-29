# Phase 06: Verification, Smoke, and Final Score
**Status:** Completed
**Priority:** P2
**Target score impact:** 9.6 -> 9.8

## Goal

Prove the module is fixed with repeatable command gates, security verification, seeded smoke coverage, and an updated final report.

## Work Items

1. Finish `scripts/verify-contracts.mjs`:
   - Search by contract code/customer fields.
   - Public gallery mutation without proof is denied.
   - Cross-gallery proof cannot mutate another gallery image.
   - Plaintext gallery password is not returned from public read actions.
   - Invalid date order is rejected server-side.
   - Mismatched task event/contract is rejected.
   - Unauthorized destructive lifecycle action is denied.
2. Add `smoke:contracts` if no reusable E2E command exists:
   - Open `/contracts`.
   - Search/filter/page.
   - Open drawer/detail.
   - Cold-load detail directly.
   - Add or seed a payment and verify refresh behavior.
   - Create or edit a contract with valid dates.
   - Attempt invalid date order and expect a visible error.
   - Open public gallery, verify access, select image, update note, and verify denied mutation cases through script-level checks.
3. Run full verification:
   - TypeScript.
   - Scoped lint.
   - Perf audit.
   - Supabase dry-run/push when migrations are present.
   - `verify:contracts`.
   - Build.
   - Chunk budget.
   - Smoke.
4. Update final documentation:
   - `docs/reports/contracts_audit_2026_04_29.md` or a completion report.
   - Before/after score.
   - Commands run.
   - Remote timing after fixes.
   - Remaining risks and score ceiling.
5. Update this plan's status and phase statuses after implementation.

## Acceptance Criteria

- All Phase 00-05 acceptance criteria are complete.
- No open P0/P1 findings remain from the source audit.
- Command verification passes or blockers are explicit and actionable.
- Browser smoke covers the contracts list/detail/create-edit/payment/gallery flows.
- Final score is justified with evidence, not just asserted.
- Remaining gaps are small enough to score 9.8/10; seeded cross-role browser E2E remains the 9.9 stretch item.

## Verification

```powershell
npx tsc --noEmit --pretty false
npx eslint "app/(protected)/contracts" app/actions/contract-queries.ts app/actions/contract-mutations.ts app/actions/contract-lifecycle.ts app/actions/contract-event-actions.ts app/actions/payment-actions.ts app/actions/work-task-actions.ts app/actions/checklist-actions.ts components/contracts components/gallery lib/hooks/use-contracts.ts lib/hooks/use-contract-notes.ts hooks/useContractFilters.ts lib/validations/contract.schema.ts types/contract.ts types/contract-form.ts types/contract-constants.ts
npm run perf:audit
npx supabase db push --dry-run
npx supabase db push
npm run verify:contracts
npm run build
npm run perf:chunks
npm run smoke:contracts
```

## Notes

- Target 9.8/10 is complete with command proof plus security-focused abuse checks for public gallery mutations.
- Stretch 9.9/10 requires seeded browser E2E across admin, manager, sale, media/viewer, and public gallery visitor paths.

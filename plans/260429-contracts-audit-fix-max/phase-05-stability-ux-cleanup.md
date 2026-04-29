# Phase 05: Stability Cleanup and UX Consistency
**Status:** Completed
**Priority:** P2
**Target score impact:** 9.5 -> 9.6

## Goal

Remove contract-module lint/stability drift and verify that the security/performance changes did not regress the user-facing workflows.

## Work Items

1. Clear scoped lint warnings from the audit:
   - `components/contracts/detail/checklist-manager.tsx`: remove unused import.
   - `components/contracts/detail/contract-detail-client.tsx`: stabilize array dependencies.
   - `components/contracts/form/hooks/useContractForm.ts`: fix missing hook dependency without creating validation loops.
   - `components/contracts/gallery/gallery-image-grid.tsx`: remove unused React imports.
2. Normalize error states:
   - Search/list failure is visible and actionable.
   - Gallery mutation denial rolls back optimistic state and shows a clear message.
   - Task/date validation errors are surfaced from server action failures.
3. Recheck responsive layouts touched by data-shape changes:
   - Desktop table badges.
   - Mobile contract cards.
   - Detail payment summary.
   - Gallery public selection state.
   - Event/task timeline.
4. Keep copy and labels consistent with existing module language.
5. Update any phase docs if implementation changes the chosen approach.

## Acceptance Criteria

- Scoped ESLint reports 0 warnings for the contract/gallery files covered by the audit, or any remaining warning is documented with a concrete reason.
- No text/badge overlap on mobile card, desktop table, detail payment header, or public gallery image cards.
- Optimistic UI paths roll back on failed server actions.
- Existing create/edit/detail/print/gallery workflows remain navigable.

## Verification

```powershell
npx eslint "app/(protected)/contracts" app/actions/contract-queries.ts app/actions/contract-mutations.ts app/actions/contract-lifecycle.ts app/actions/contract-event-actions.ts app/actions/payment-actions.ts app/actions/work-task-actions.ts app/actions/checklist-actions.ts components/contracts components/gallery lib/hooks/use-contracts.ts lib/hooks/use-contract-notes.ts hooks/useContractFilters.ts lib/validations/contract.schema.ts types/contract.ts types/contract-form.ts types/contract-constants.ts
npx tsc --noEmit --pretty false
npm run perf:audit
```

## Notes

- Keep this phase scoped. Do not redesign contracts UI unless a regression from earlier phases requires it.
- If browser tooling is available, capture screenshots for `/contracts`, detail, and public gallery at mobile and desktop widths.

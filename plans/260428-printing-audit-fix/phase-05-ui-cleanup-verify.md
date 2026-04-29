# Phase 05: UI Semantics, Cleanup, Final Verification
**Status:** Done
**Priority:** P2
**Dependencies:** Phases 00-04
**Audit issues:** Warnings 8, Suggestions 1-5

## Objective

Clean up the remaining UX/business semantics and reduce maintenance risk after the P0/P1 fixes are stable.

## Target Files

- `components/printing/printing-detail-drawer.tsx`
- `components/printing/printing-list-page.tsx`
- `components/printing/labs/lab-list-page.tsx`
- `components/printing/labs/lab-form-modal.tsx`
- `components/contracts/detail/printing-order-form.tsx`
- `components/contracts/detail/print-orders-block.tsx`
- `app/actions/printing-actions.ts`
- `types/printing.ts`
- `types/printing-constants.ts`
- `docs/specs/printing.md` or a new module ownership note

## Implementation Steps

1. Resolve printing lifecycle semantics.
   - Decide whether `da_nhan` means received from lab or delivered to customer.
   - If it means received from lab, update UI labels that say "delivered to customer".
   - If delivery to customer is a real step, add a status/date model for it and wire `delivered_date`.

2. Reduce large component size.
   - Split `printing-detail-drawer.tsx` into drawer shell, item editor, contract selector, and action footer.
   - Split `lab-list-page.tsx` into stats/filter row, lab card, and list body.
   - Move lab service diff/sync helpers out of `lab-form-modal.tsx` if still client-local.

3. Lazy-load write-heavy UI.
   - Dynamically load printing detail drawer/form when opened.
   - Dynamically load lab form modal when opened.
   - Confirm no first-paint regression.

4. Clean bridge/domain boundaries.
   - Move `updateReservationStatus` out of `printing-actions.ts` to a dress/domain action if feasible.
   - Keep only backward-compatible bridge exports that are still needed by contract detail.

5. Add integrity checks.
   - Add SQL/report query for printing expense drift.
   - Add SQL/report query for lab payment allocation drift.
   - Add SQL/report query for paid orders without allocation and deleted orders with active expenses.

6. Document ownership rules.
   - Printing owns print order lifecycle and lab selection.
   - Finance owns expense/payment accounting.
   - Contracts may initiate print orders only through the agreed permission policy.

## Acceptance Criteria

- UI labels match persisted status/date semantics.
- Large component files are smaller and easier to reason about, without changing behavior.
- Write-heavy modals do not inflate initial route chunks.
- Domain bridge has no unrelated dress mutation unless documented as temporary.
- Final verification commands pass.

## Final Verification Commands

```powershell
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
```

## Manual Smoke Test

- `/printing`: load, filter by status/lab/payment, paginate, create/edit/delete order.
- `/printing/labs`: load, filter/sort cards, create/edit/toggle/delete lab, edit services.
- Contract detail: create print order and update status.
- `/finance/lab-debts`: verify debt agrees with printing lab debt.
- Locked period: verify accounting mutation is rejected.

---
Plan complete after this phase.

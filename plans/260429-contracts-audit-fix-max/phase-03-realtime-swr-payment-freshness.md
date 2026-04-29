# Phase 03: Realtime, SWR, and Payment Freshness
**Status:** Completed
**Priority:** P1
**Target score impact:** 9.0 -> 9.2

## Goal

Ensure contract detail refreshes when payments change and avoid unnecessary realtime/SWR refresh storms.

## Work Items

1. Fix the incorrect realtime table in `components/contracts/detail/contract-detail-client.tsx`:
   - Replace `useRealtime("receipts", { filter: contract_id })` with `useRealtime("payments", { filter: contract_id })`.
   - Remove the receipts subscription unless a separate receipts table is intentionally part of the detail page.
2. Verify cache mutation paths after payment changes:
   - `app/actions/payment-actions.ts`
   - `app/actions/contract-queries.ts`
   - `lib/hooks/use-contracts.ts`
   - detail SWR keys.
3. Narrow realtime invalidation:
   - Detail refresh only when the changed row belongs to the current contract.
   - List/stat refresh is debounced and only runs when aggregate-visible contract data changes.
   - Avoid immediate echo-refresh after optimistic local mutations.
4. Stabilize hook dependencies:
   - Memoize arrays/objects passed into callbacks.
   - Keep `refreshContractCaches` stable without capturing freshly created arrays every render.
5. Add smoke coverage:
   - Open contract detail.
   - Create payment through server action or seeded script.
   - Assert payment history and paid/remaining values refresh through the intended cache path.

## Acceptance Criteria

- External payment insert/update/delete on `payments` refreshes the active detail view.
- Payment history, paid amount, remaining amount, and payment status do not stay stale until unrelated refresh.
- Removing `receipts` subscription does not break any current UI path.
- Local payment mutations do not cause visible flicker or repeated refresh loops.
- TypeScript and scoped lint pass.

## Verification

```powershell
npm run verify:contracts
npx tsc --noEmit --pretty false
npx eslint components/contracts/detail/contract-detail-client.tsx app/actions/payment-actions.ts app/actions/contract-queries.ts lib/hooks/use-contracts.ts
```

## Notes

- If a future receipts module needs realtime, add it as an explicitly named subscription with a verified data source.
- This phase is intentionally small but important because stale financial state is a production trust issue.

# Phase 04: Time-load and Query Optimization
**Status:** Done
**Priority:** P1
**Dependencies:** Phase 00, Phase 01, Phase 03
**Audit issues:** Warnings 2, 3, 4, 5, 9

## Objective

Reduce page-load query count and remove app-side full-table aggregation from `/printing`, `/printing/labs`, and finance lab-debt paths.

Current chunks are healthy, so this phase focuses on database time-load and payload size.

## Target Files

- `app/actions/printing-queries.ts`
- `app/actions/printing-reference-queries.ts`
- `app/actions/lab-queries.ts`
- `app/actions/finance-operations-queries.ts`
- `app/(protected)/printing/page.tsx`
- `app/(protected)/printing/labs/page.tsx`
- `components/printing/printing-list-page.tsx`
- `components/printing/labs/lab-list-page.tsx`
- `supabase/migrations/*`

## Implementation Steps

1. Collapse printing stats.
   - Use one `printing_stats()` RPC for status counts and cost sums.
   - Keep existing indexes or add targeted indexes only if query plans show need.

2. Build lab overview RPC.
   - `printing_lab_overview()` returns lab identity, status, service_count, last_payment_at, unpaid_orders, outstanding_debt.
   - Replace `fetchLabsList` multi-query aggregation for labs page.
   - Avoid transferring 500 service rows and 500 payment rows just to render cards.

3. Keep service detail lazy.
   - Fetch full `lab_services` only when editing a lab or opening its detail drawer/modal.
   - If the modal currently needs all services in initial card data, split the fetch path.

4. Replace `getLabDebts` app aggregation.
   - Use the same debt RPC as finance, with ordering and limit in SQL.
   - Remove normal-path unbounded unpaid order reads.

5. Confirm SWR behavior.
   - Preserve `revalidateOnMount: false` where fallback SSR data is supplied.
   - Use targeted mutate keys after mutations.

6. Optional contract search RPC.
   - If Phase 01 showed embedded `.or(...)` is fragile, replace with SQL/RPC and indexed search.

## Acceptance Criteria

- `/printing/labs` no longer loads all services, payments, and unpaid orders as separate normal-path queries.
- Lab debt summary is SQL/RPC-backed.
- `/printing` stats use one aggregate RPC.
- No route chunk exceeds 80KB after changes.
- Build, perf audit, and chunk checks pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
rg -n 'fetchLabsList|getLabDebts|printing_lab_overview|printing_stats|revalidateOnMount' app/actions 'app/(protected)/printing' components/printing supabase/migrations
```

## Manual Checks

- Open `/printing` and confirm stats, filters, list, pagination.
- Open `/printing/labs` and confirm lab cards, filters, debt totals, and edit modal service list.
- Confirm finance lab-debt screen matches printing labs debt.

---
Next Phase: [Phase 05 - UI Semantics, Cleanup, Final Verification](./phase-05-ui-cleanup-verify.md)

# Phase 03: Time-Load Optimization and Lazy Tab Data
**Status:** Completed
**Priority:** P1
**Dependencies:** Phase 02
**Audit issues:** Critical 4, Suggestion 3

## Objective

Make `/reports` first load fetch only the default overview data, then fetch cashflow/debts/profit data only when users open those views.

## Target Files

- `app/(protected)/reports/page.tsx`
- `components/reports/reports-client.tsx`
- `components/reports/reports-cashflow-view.tsx`
- `components/reports/reports-debts-view.tsx`
- `components/finance/dashboard/profit-report-table.tsx`
- `lib/swr.ts`

## Implementation Steps

1. Reduce SSR work.
   - Initial page should fetch only report snapshot required for overview.
   - Remove initial SSR calls for debt stats, cashflow, ledger, pending collections, and profit table unless the default view changes.

2. Lazy-load tab data.
   - Cashflow tab fetches timeline and ledger on first open.
   - Debts tab fetches debt stats and pending collections on first open.
   - Profit tab loads `ProfitReportTable` and its data on first open.

3. Avoid SWR double-fetch.
   - When fallback data is provided, set `revalidateOnMount: false`.
   - Keep `keepPreviousData` where UX needs continuity.

4. Add targeted loading/error states.
   - Each tab should show its own loading and error state.
   - A failed hidden tab should not poison overview.

5. Recheck route chunk.
   - Keep `/reports` under 80KB.
   - Ensure heavy chart/table code remains dynamic.

## Acceptance Criteria

- `/reports` first load no longer calls all report dependencies.
- Switching tabs fetches only required data.
- No immediate SWR revalidation duplicate for SSR fallback data.
- Route chunk remains under budget.

## Test Commands

```powershell
npm run build
npm run perf:chunks
npm run perf:audit
```

---
Next Phase: [Phase 04 - Cashflow RPC, Export Bounds, and Data Volume Controls](./phase-04-cashflow-export-volume.md)

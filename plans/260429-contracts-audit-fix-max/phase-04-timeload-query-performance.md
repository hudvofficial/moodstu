# Phase 04: Time-Load, Query Shape, and Index Performance
**Status:** Completed
**Priority:** P1
**Target score impact:** 9.2 -> 9.5

## Goal

Improve contracts list and detail cold-load timings while preserving visible badges, payments, gallery, task, checklist, and print data.

## Work Items

1. Replace heavy list embeds with aggregate data:
   - Move progress badge inputs to DB aggregate fields such as task total, done count, overdue count, and stage counts.
   - Move missing-info badge inputs to checklist missing/complete counts and grouped summary fields.
   - Keep full task/checklist rows out of the first page list payload unless explicitly needed for a tooltip.
2. Promote Phase 00 search into the canonical list path:
   - Prefer a `contract_list` RPC or view that handles filters, search, sorting, paging, exact/known count, and badge aggregates.
   - Keep the app code thin and typed around the returned list row contract.
3. Add or verify indexes:
   - `contracts(status, contract_date desc)`
   - `contracts(payment_status, contract_date desc)`
   - `contracts(customer_id)`
   - `payments(contract_id, payment_date desc)`
   - `work_tasks(contract_id, status, deadline)`
   - `contract_checklists(contract_id, is_completed)`
   - `contract_events(contract_id, sort_order)`
   - `gallery_images(gallery_id, sort_order)`
   - Trigram indexes for search fields if using `ilike`.
4. Optimize detail cold path:
   - Split above-the-fold contract/customer/payment summary from heavy secondary sections.
   - Load gallery, print orders, audit logs, checklist/task history, and payment plans lazily or through parallel narrow RPCs.
   - Keep SWR fallback data for repeat navigation.
   - Surface each secondary query failure instead of silently showing empty arrays unless the section is explicitly optional.
5. Tighten count behavior:
   - Decide whether estimated count is acceptable.
   - If exact counts are needed, move counts into the list RPC or cached stats contract.
6. Record timing before and after:
   - Contracts list first page.
   - Stats RPC.
   - Detail cold load.
   - Search query by code/customer.

## Acceptance Criteria

- First page list payload no longer embeds full task/checklist rows.
- Progress and missing-info badges remain correct.
- `/contracts` first page improves from the audit's 1604ms baseline or has documented remote/network constraints.
- Contract detail cold load improves from the audit's 2879ms embedded-query baseline or heavy secondary sections visibly lazy-load after the main detail shell.
- Search, filters, sort, pagination, and stats still work.
- Perf audit passes.

## Verification

```powershell
npm run verify:contracts
npm run perf:audit
npx tsc --noEmit --pretty false
npx eslint app/actions/contract-queries.ts components/contracts lib/hooks/use-contracts.ts
npm run build
npm run perf:chunks
```

## Notes

- Do not optimize by hiding missing query errors. The audit already gave credit for explicit error checks in detail; preserve that behavior.
- If aggregate badge fields replace arrays, update shared types and components in the same phase.

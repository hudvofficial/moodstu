# Phase 02: Aggregate SQL, Detail Correctness, and Codegen
**Status:** Completed
**Priority:** P1
**Target score impact:** 8.9 -> 9.2

## Goal

Remove correctness and scaling limits from stats/detail/code generation.

## Work Items

1. Add aggregate RPC for stats:
   - `inventory_stats()`
   - Returns `total`, `active`, `lowStock`, `totalValue`, `transactionsThisMonth`.
   - Uses SQL aggregates instead of returning every item row to Node.
2. Add aggregate RPC or query for item totals:
   - `inventory_item_transaction_totals(p_item_id uuid)`
   - Returns lifetime `totalIn`, `totalOut`, `transactionCount`, and recent transaction page/count if practical.
3. Update `fetchInventoryDetail`:
   - Keep recent transactions limited for display.
   - Use aggregate totals for summary cards.
4. Add DB-backed inventory code generation:
   - Preferred: `nextval_inventory_code()` with locking/sequence-like behavior.
   - Fallback acceptable: transaction-safe RPC that retries unique violations.
5. Update generated TypeScript DB types if RPCs are added.

## Acceptance Criteria

- Detail summary stays correct even with more than 50 transactions.
- Stats are computed in SQL and do not scan all inventory rows in Node.
- Concurrent item creates cannot race into duplicate `VT-###` codes.
- `getNextInventoryCode` and `createInventoryItem` use the same DB-backed source of truth.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:inventory
npm run perf:audit
```

## Notes

- Preserve existing result shapes where possible to minimize UI churn.
- If database types cannot be regenerated immediately, add minimal typed RPC entries consistently with existing `types/database.types.ts` patterns.

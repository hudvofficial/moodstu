# Phase 03: Contract Add-on Accounting Integrity
**Status:** Completed
**Priority:** P1
**Target score impact:** 8.6 -> 9.0

## Goal

Make dress reservation add-ons, `contract_items`, and contract totals commit or roll back together, with clear cancellation/release semantics.

## Work Items

1. Move contract-linked dress reservation creation into an atomic RPC that handles:
   - availability check
   - reservation insert
   - `contract_items` insert
   - contract total/remaining recalculation or synchronized update
   - audit metadata.
2. Define release/cancel behavior:
   - void or soft-delete the related `contract_items` row, or
   - mark the add-on line as cancelled and exclude it from totals.
3. Replace manual total increment/subtract logic in server actions.
4. Recalculate contract totals from source rows when possible instead of relying only on arithmetic deltas.
5. Add a repair/report script for existing inconsistencies:
   - active reservation without contract item
   - contract item without active reservation
   - contract totals not matching active items.

## Acceptance Criteria

- Partial failure cannot leave a reservation without its contract item or totals.
- Release/cancel cannot leave a visible contract add-on row that is no longer included in totals.
- Contract remaining amount never becomes inconsistent with total/paid values because of dress add-on operations.
- Existing inconsistent rows can be detected and repaired or at least reported before production rollout.

## Verification

```powershell
npm run verify:dresses
npx tsc --noEmit --pretty false
npm run lint
rg -n "contract_items|total_amount|remaining_amount|dress.*contract" app supabase scripts
```

## Notes

- This phase may touch contract detail display if the current UI expects released items to remain visible.
- If existing contract total sync helpers exist, reuse them instead of adding a parallel accounting formula.

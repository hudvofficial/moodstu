# Phase 01: Stock Lifecycle and Delete Invariants
**Status:** Completed
**Priority:** P0
**Target score impact:** 8.3 -> 8.9

## Goal

Make stock state impossible to corrupt through normal app flows or direct server-action calls.

## Work Items

1. Update stock RPCs:
   - Select and lock `status`.
   - Reject deleted items.
   - Reject `status <> 'active'`.
   - Preserve `FOR UPDATE` row locking.
2. Update `fetchInventoryPickerItems`:
   - Active-only by default.
   - Return enough metadata for disabled labels only if discontinued items must be visible.
3. Update stock-in/out UI:
   - Hide or disable stock buttons for discontinued items.
   - Show clear reason when action is blocked.
4. Update `deleteInventoryItem`:
   - Fetch `current_stock`.
   - Count transactions for the item.
   - Block delete if stock is non-zero.
   - Block delete if transaction history exists, unless the item has never been used and stock is zero.
   - Recommend status change to `discontinued` for used items.
5. Ensure receipt sale inventory options remain active and in-stock only.

## Acceptance Criteria

- Discontinued items cannot be stocked in/out from UI, server actions, or RPCs.
- Deleted items cannot be stocked in/out.
- Item with `current_stock > 0` cannot be deleted.
- Item with transaction history cannot be hidden as deleted; user is guided to discontinue.
- Zero-stock, never-used item can still be removed if business wants cleanup.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:inventory
```

## Notes

- Keep audit logs for blocked/allowed mutation paths where existing mutation logging already exists.
- Prefer explicit Vietnamese user messages in UI/action errors.

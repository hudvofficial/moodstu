# Phase 03: UI Migration + Cleanup
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Chuyển UI form từ legacy `addInventoryReservation` → `reserveDressForContract`. Xóa dead code.

## Files to Modify
- `components/contracts/detail/inventory-reservation-form.tsx` — Migrate import
- `app/actions/inventory-actions.ts` — Xóa dead code

## Implementation Steps

### 1. Migrate `inventory-reservation-form.tsx`
- [ ] Đổi import:
  ```diff
  - import { getAvailableItems, addInventoryReservation } from "@/app/actions/inventory-actions";
  + import { getAvailableItems } from "@/app/actions/inventory-actions";
  + import { reserveDressForContract } from "@/app/actions/dress-mutations";
  ```
- [ ] Đổi handleSubmit call:
  ```diff
  - const result = await addInventoryReservation({
  -   contractId, itemId: selectedId, isAddon,
  -   rentalPrice: price, startDate, endDate, notes
  - });
  + const result = await reserveDressForContract({
  +   inventoryItemId: selectedId, contractId,
  +   isAddon, rentalPrice: price,
  +   startDate: startDate || new Date().toISOString().split('T')[0],
  +   endDate: endDate || new Date().toISOString().split('T')[0],
  +   notes: notes.trim() || undefined,
  + });
  ```

### 2. Xóa `addInventoryReservation` (`inventory-actions.ts` L142-188)
- [ ] Xóa entire function block (47 lines)
- [ ] Keep `getAvailableItems` (vẫn được dùng)

### 3. Verify no other imports
- [ ] Grep `addInventoryReservation` → must return 0 results

## Test Criteria
- [ ] Build passes
- [ ] No orphan imports

# Phase 04: Verification
Status: ⬜ Pending
Dependencies: Phase 01, 02, 03

## Objective
Verify toàn bộ thay đổi compile, lint pass, và logic đúng.

## Verification Steps

### 1. Build Check
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run lint` → pass

### 2. Symmetry Audit
- [ ] `reserveDressForContract` INSERT ↔ `releaseReservation` UPDATE(returned)
- [ ] Reserve: item.status→reserved ↔ Release: item.status→available
- [ ] Reserve: contract.total += ↔ Release: contract.total -=
- [ ] Both use `inventory_item_id` (not `item_id`)
- [ ] Both have `fireAuditLog`
- [ ] Both `revalidatePath('/dresses', '/contracts')`

### 3. Dead Code Check
- [ ] `grep addInventoryReservation` → 0 results
- [ ] `grep "item_id"` in dress-queries.ts → only `inventory_item_id`

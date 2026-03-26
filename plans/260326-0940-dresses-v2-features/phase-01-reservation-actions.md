# Phase 01: Reservation Completion
Status: ⬜ Pending
Dependencies: None
Effort: ~5 min

## Audit Context
V2 already has:
- `addInventoryReservation()` in `inventory-actions.ts` L142-172
- `getDressAvailability()` in `dress-queries.ts` L121-145
- `fetchDressDetail()` with parallel queries in `dress-queries.ts`

## Tasks

### 1. BL-1 Fix: Add availability check to `addInventoryReservation()`
- File: `app/actions/inventory-actions.ts`
- Before insert (L150), call getDressAvailability check
- If overlap → throw Error("Trang phục đã được đặt trong khoảng thời gian này")
- Pattern: inline check (not calling getDressAvailability directly — keep server-side)

### 2. New: `releaseReservation()` in `dress-mutations.ts`
- Input: `reservationId: string`
- Steps:
  1. withAuth + validate reservationId
  2. Fetch reservation → get item_id, contract_id, is_addon info
  3. Update reservation status → "returned", set returned_at
  4. Update inventory_items status → "available"
  5. Optional: if addon, reverse contract_items + contract total
  6. fireAuditLog
  7. revalidatePath("/dresses") + revalidatePath("/contracts")
- SWR: `revalidate(cacheKeys.dresses())` + `revalidate(cacheKeys.dressStats())`

## Files to Modify
- `app/actions/inventory-actions.ts` — BL-1 fix (add ~5 lines)
- `app/actions/dress-mutations.ts` — add `releaseReservation` (~30 lines)

## Test Criteria
- [ ] Cannot reserve dress with overlapping dates (BL-1 fixed)
- [ ] Can release a reservation → item status back to "available"
- [ ] Audit log recorded for release

---
Next Phase: phase-02-detail-drawer.md

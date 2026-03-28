# Phase 01: Schema (DB)

Status: ✅ Complete
Dependencies: Phase 0 (Align/Spec) ✅

## Objective

Tạo bảng `inventory_items` + fix bảng `inventory_transactions` để sẵn sàng cho backend layer.

## Completed

### Batch 1: Cleanup
- [x] Rename 6 indexes `inventory_*` → `dresses_*` trên bảng `dresses`
- [x] Fix RLS `inventory_transactions` (`USING(true)` → `service_role` V2 pattern)
- [x] Fix FK `performed_by` → `auth.users(id)` (Lesson #72)

### Batch 2: Creation
- [x] CREATE TABLE `inventory_items` (19 cols, 4 indexes, RLS V2)
- [x] ADD FK `item_id` → `inventory_items(id)` trên `inventory_transactions`
- [x] Rollback ENUM `inventory_transaction_type_enum` → VARCHAR (ABC Group B)
- [x] ADD COLUMN `created_by` FK → `auth.users(id)`

### Verify
- [x] Regen `database.types.ts`
- [x] `npm run build` → 0 errors

---
Next Phase: [phase-02-actions.md](./phase-02-actions.md)

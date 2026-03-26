# Phase 02: Fix Column Bugs
Status: ✅ Complete
Dependencies: None (independent of Phase 01)

## Objective
Fix sai tên cột trong `fetchRentalHistory` — DB dùng `inventory_item_id`, code đang dùng `item_id` + `rental_price` (không tồn tại).

## Files to Modify
- `app/actions/dress-queries.ts` — Fix L158-170

## Implementation Steps

### 1. Fix select query (L160)
- [ ] Remove `item_id` → use `inventory_item_id`
- [ ] Remove `rental_price` (column doesn't exist in `inventory_reservations`)
- [ ] Before:
  ```
  `id, item_id, contract_id, status, rental_price, start_date, end_date, notes, created_at, ...`
  ```
- [ ] After:
  ```
  `id, inventory_item_id, contract_id, status, start_date, end_date, notes, created_at, ...`
  ```

### 2. Fix filter query (L170)
- [ ] Before: `.eq("item_id", filters.item_id)`
- [ ] After: `.eq("inventory_item_id", filters.item_id)`

## Test Criteria
- [ ] TypeScript compiles
- [ ] Rental history page loads without Supabase errors

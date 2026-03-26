# Phase 01: Backend — Zod Schema + Server Action
Status: ✅ Complete
Dependencies: None

## Objective
Tạo `reserveDressForContract` trong `dress-mutations.ts` theo Gold Standard, symmetry ngược với `releaseReservation`.

## Files to Modify
- `lib/validations/dress.schema.ts` — Thêm `reserveDressSchema`
- `app/actions/dress-mutations.ts` — Thêm `reserveDressForContract`

## Implementation Steps

### 1. Thêm Zod schema (`dress.schema.ts`)
- [ ] Tạo `reserveDressSchema` với fields:
  ```
  inventoryItemId: z.string().uuid()
  contractId: z.string().uuid()
  contractItemId: z.string().uuid().optional()
  customerId: z.string().uuid().optional()
  startDate: z.string()  // ISO date
  endDate: z.string()    // ISO date
  exportType: z.enum(["xuat_ban", "xuat_thue"]).optional()
  isAddon: z.boolean().default(false)
  rentalPrice: z.number().min(0).default(0)
  notes: z.string().optional()
  ```
- [ ] Export type `ReserveDressInput`

### 2. Tạo `reserveDressForContract` (`dress-mutations.ts`)
- [ ] Function signature: `export async function reserveDressForContract(rawData: unknown)`
- [ ] Step-by-step logic:
  1. **Zod validate** — `reserveDressSchema.safeParse(rawData)`
  2. **Check item exists** — `inventory_items` WHERE `id = inventoryItemId` AND `deleted_at IS NULL`
  3. **Date overlap check** — query `inventory_reservations` WHERE `inventory_item_id = X` AND status IN ('reserved','rented') AND `start_date <= endDate` AND `end_date >= startDate`
  4. **Insert reservation** — `inventory_reservations` với đúng columns: `inventory_item_id, contract_id, contract_item_id, customer_id, start_date, end_date, export_type, status='reserved', notes`
  5. **Update item status** — `inventory_items.status = 'reserved'`
  6. **Addon billing** (nếu `isAddon && rentalPrice > 0`):
     - INSERT `contract_items` (item_name, quantity:1, unit_price, total_amount, is_addon:true, type:'trang_phuc', addon_category:'trang_phuc')
     - UPDATE `contracts` SET total_amount += rentalPrice, remaining_amount += rentalPrice
     - Lưu contract_item.id → link `inventory_reservations.contract_item_id`
  7. **fireAuditLog** — action: CREATE, tableName: inventory_reservations
  8. **revalidatePath** — `/dresses`, `/contracts`, `/contracts/{contractId}`

### 3. Symmetry verification vs releaseReservation
- [ ] Reserve: INSERT reservation (status=reserved) ↔ Release: UPDATE reservation (status=returned)
- [ ] Reserve: item.status='reserved' ↔ Release: item.status='available' (if no other active)
- [ ] Reserve: total += price ↔ Release: total -= price

## Test Criteria
- [ ] TypeScript compiles without errors
- [ ] Function exports correctly

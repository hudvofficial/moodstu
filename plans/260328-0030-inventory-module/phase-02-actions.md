# Phase 02: Actions (Backend)

Status: ⬜ Pending
Dependencies: Phase 01 (Schema) ✅

## Objective

Tạo backend layer: types, constants, Zod schemas, queries, mutations. Follow Gold Standard từ Dresses module.

## V1 Gap Analysis

So sánh V1 `inventory.ts` (323L) → V2:

| V1 Function | V2 Equivalent | Gap? |
|---|---|---|
| `getInventoryAction(search?)` | `fetchInventoryList(filters)` | ✅ V2 mạnh hơn |
| `createInventoryItem(data)` | `createInventoryItem(data)` | ✅ + Zod + audit |
| `updateInventoryItem(id, data)` | `updateInventoryItem(id, data)` | ✅ + opt lock |
| `deleteInventoryItem(id)` | `deleteInventoryItem(id)` | ✅ soft delete |
| `createInventoryTransaction()` | `stockIn()` + `stockOut()` | ✅ tách rõ ràng |
| `getItemTransactions(itemId)` | merged vào `fetchInventoryDetail()` | ✅ |
| `getAllTransactions(filters)` | `fetchTransactionHistory()` | ✅ ported |
| `getInventoryStats()` | `getInventoryStats()` | ✅ + transactionsThisMonth |
| — | `getNextInventoryCode()` | ✅ V2 mới |

## Files to Create (5 files)

### 1. Types & Constants

#### [NEW] `types/inventory.ts` (~80L)
- `InventoryItem` — 19 fields match DB
- `InventoryFilters` — search, category, status, page
- `InventoryStats` — total, active, lowStock, totalValue, transactionsThisMonth
- `InventoryDetail` — extends InventoryItem + transactions[]
- `InventoryTransaction` — row + joined item name + performer name

#### [NEW] `types/inventory-constants.ts` (~70L)
- `INVENTORY_STATUS_MAP` — active/discontinued → Vietnamese + Badge variant
- `INVENTORY_CATEGORY_MAP` — 5 categories (khung_anh, album, hoa, tieu_hao, trang_tri)
- `INVENTORY_UNIT_MAP` — 6 units (cai, bo, hop, cuon, met, to)
- `TRANSACTION_TYPE_MAP` — stock_in/stock_out → Vietnamese + Badge
- `INVENTORY_PAGE_SIZE = 20`

### 2. Zod Schema

#### [NEW] `lib/validations/inventory.schema.ts` (~80L)
- `INVENTORY_CATEGORIES` const array
- `INVENTORY_STATUSES` — `['active', 'discontinued']`
- `INVENTORY_UNITS` const array
- `inventoryCreateSchema` — name (required), category, unit, min_stock, purchase_price, sale_price, supplier, image_url, notes
- `inventoryUpdateSchema` — id + updated_at (opt lock) + partial data
- `stockInSchema` — itemId, quantity (>0), unitCost (≥0), supplier?, notes?
- `stockOutSchema` — itemId, quantity (>0), contractId?, reason?, customer fields, notes?

### 3. Server Actions

#### [NEW] `app/actions/inventory-queries.ts` (~180L)

| Function | Mô tả |
|----------|--------|
| `fetchInventoryList(filters?)` | List + filter + search + pagination |
| `fetchInventoryDetail(id)` | Item + recent transactions (last 50) |
| `fetchTransactionHistory(filters?)` | Full log — type/item/contract/daterange + pagination |
| `getInventoryStats()` | total, active, lowStock, totalValue, transactionsThisMonth |
| `getNextInventoryCode()` | MAX() parse → `VT-XXX` |

#### [NEW] `app/actions/inventory-mutations.ts` (~200L)

| Function | Logic |
|----------|-------|
| `createInventoryItem(data)` | Auto-gen `VT-XXX` + retry race |
| `updateInventoryItem(id, data)` | Opt lock (`updated_at`) |
| `deleteInventoryItem(id)` | Soft delete |
| `stockIn(data)` | + stock + recalc avg price |
| `stockOut(data)` | Check stock → − stock → low stock warning |

**stockIn Average Price:**
```
new_avg = ((current_stock × old_avg) + (qty × unit_cost)) / (current_stock + qty)
```

**stockOut Low Stock Warning:**
```
if (updated.current_stock < updated.min_stock)
  return { warning: "⚠️ {name} sắp hết!" }
```

## Technical Notes

- `performed_by` FK → `auth.users(id)` (V2), nhưng cần hiện tên nhân viên → lookup `employees.auth_user_id`
- Tất cả mutations: `withAuth` + `safeParse` + `revalidatePath('/inventory')` + `fireAuditLog`
- Queries: return empty on error, không throw

## Test Criteria

- [ ] `npm run build` → 0 errors
- [ ] All 10 functions exported correctly
- [ ] Types match DB schema

---
Next Phase: [phase-03-ui.md](./phase-03-ui.md)

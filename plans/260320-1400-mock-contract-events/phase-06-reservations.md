# Phase 06: INSERT Inventory Reservations + Update delivery_date
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tạo 2 inventory reservations (trang phục) và cập nhật delivery_date cho contract.

## 6A: Inventory Reservations

Cần tìm inventory_items thực có sẵn trong DB, hoặc tạo mới nếu chưa có.

### Mock Data
| # | Item | Dates | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Vest chú rể (từ contract_item) | 10/04 → 16/05 | reserved | Vest xám 3 mảnh, size L |
| 2 | Váy cưới dạ hội | 15/05 → 16/05 | reserved | Váy đuôi cá trắng, size S |

### SQL Strategy
```sql
-- Step 1: Check if inventory items exist
SELECT id, name FROM inventory_items LIMIT 5;

-- Step 2: If items exist, create reservations
-- If not, create 2 inventory items first, then reservations

INSERT INTO inventory_reservations (contract_id, inventory_item_id, start_date, end_date, status, notes)
VALUES
  ('b9dcca30-...', '<ITEM_1_ID>', '2026-04-10', '2026-05-16', 'reserved', 'Vest xám 3 mảnh, size L'),
  ('b9dcca30-...', '<ITEM_2_ID>', '2026-05-15', '2026-05-16', 'reserved', 'Váy đuôi cá trắng, size S');
```

## 6B: Update delivery_date

```sql
UPDATE contracts
SET delivery_date = '2026-07-01',
    updated_at = NOW()
WHERE id = 'b9dcca30-de58-46d1-ab3a-44b610a5bbb2';
```

## Test Criteria
- [ ] CostumesBlock hiện 2 items với tên + ngày
- [ ] SummaryCard hiện delivery_date = 01/07/2026

---
Next Phase: [phase-07-notes.md](./phase-07-notes.md)

# Plan: Đặt Thuê Trang Phục V2 — Level C

**Created:** 2026-03-26 19:06  
**BRIEF:** [dress_rental_brief.md](file:///C:/Users/Admin/.gemini/antigravity/brain/cebbb0ee-fe13-4646-a2f3-83c3fbcab5d1/dress_rental_brief.md)

## Context

- DB table: `inventory_items` (có sẵn `rental_price`, `status`)
- Status enum hiện tại: `available | reserved | rented | maintenance | retired`
- Cần thêm: `cleaning` (đang giặt), `overdue` (quá hạn)
- Reservation system hiện tại: `inventory_reservations` (link HĐ ↔ dress)
- Rental system mới: `dress_rentals` (standalone, walk-in khách vãng lai)

## Status Flow

```
available → reserved → rented → cleaning → available
                         ↘ overdue
              cancelled ←┘
```

## Phases

| Phase | Name | Status | Files |
|-------|------|--------|-------|
| 01 | DB Migration | ⬜ | 2 migration files |
| 02 | Server Actions | ⬜ | 3 files |
| 03 | UI RentalModal + Nút | ⬜ | 4 files |
| 04 | Trả váy + Phụ kiện + Giặt | ⬜ | 4 files |
| 05 | Trang Rentals + Calendar | ⬜ | 5 files |
| 06 | SMS + Lịch sử + Báo cáo | ⬜ | 3 files |

---

## Phase 01 — DB Migration (~30 min)

### Mục tiêu
Tạo tables `dress_rentals` + `dress_rental_accessories`, mở rộng dress status enum.

### Migration 1: `dress_rentals` table
```sql
CREATE TABLE dress_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,

  -- Khách vãng lai (không FK)
  customer_name TEXT NOT NULL,
  phone TEXT,

  -- Thời gian
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  actual_return_date DATE,

  -- Tài chính
  rental_price NUMERIC DEFAULT 0,
  deposit NUMERIC DEFAULT 0,
  deposit_returned BOOLEAN DEFAULT FALSE,
  damage_fee NUMERIC DEFAULT 0,

  -- Trạng thái
  status TEXT DEFAULT 'reserved'
    CHECK (status IN ('reserved','renting','returned','overdue','cancelled')),

  -- Chi tiết
  accessories TEXT,
  notes TEXT,
  return_condition TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_dress_rentals_item ON dress_rentals(item_id);
CREATE INDEX idx_dress_rentals_status ON dress_rentals(status);
CREATE INDEX idx_dress_rentals_dates ON dress_rentals(pickup_date, return_date);
CREATE INDEX idx_dress_rentals_phone ON dress_rentals(phone);

-- RLS
ALTER TABLE dress_rentals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_read" ON dress_rentals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_insert" ON dress_rentals FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_update" ON dress_rentals FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "auth_delete" ON dress_rentals FOR DELETE USING (auth.role() = 'authenticated');

-- Updated_at trigger
CREATE TRIGGER update_dress_rentals_updated_at
  BEFORE UPDATE ON dress_rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Migration 2: `dress_rental_accessories` table
```sql
CREATE TABLE dress_rental_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES dress_rentals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INT DEFAULT 1,
  returned BOOLEAN DEFAULT FALSE,
  condition_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rental_accessories_rental ON dress_rental_accessories(rental_id);

ALTER TABLE dress_rental_accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON dress_rental_accessories FOR ALL USING (auth.role() = 'authenticated');
```

### Migration 3: Mở rộng dress status
```sql
-- Thêm cleaning, overdue vào DRESS_STATUSES
-- (DB không có CHECK constraint cho inventory_items.status, chỉ cần update code)
```

### Files

| Action | File |
|--------|------|
| NEW | Supabase migration via `apply_migration` |

---

## Phase 02 — Server Actions (~45 min)

### Mục tiêu
CRUD + check trùng lịch + dress status liên động.

### Files

| Action | File | Mô tả |
|--------|------|-------|
| NEW | `app/actions/rental-mutations.ts` | createRental, updateRental, cancelRental |
| NEW | `app/actions/rental-queries.ts` | fetchRentals, fetchRentalsByItem |
| NEW | `lib/validations/rental.schema.ts` | Zod schemas + types |

### Actions chi tiết

**`createRental(data)`**
1. Validate input (Zod)
2. Check trùng lịch: query `dress_rentals` WHERE `item_id` = X AND `status` IN ('reserved','renting') AND date ranges overlap
3. Insert `dress_rentals`
4. Update `inventory_items.status` = 'reserved'
5. `revalidatePath('/dresses')`

**`startRental(rentalId)`** — Đổi từ "Đã đặt" → "Đang thuê"
1. Update `dress_rentals.status` = 'renting'
2. Update `inventory_items.status` = 'rented'

**`returnDress(rentalId, returnData)`** — Trả + check tình trạng
1. Update `dress_rentals.status` = 'returned', `actual_return_date`, `return_condition`, `damage_fee`
2. Update `inventory_items.status` = 'cleaning'
3. Optional: update `dress_rental_accessories` returned flags

**`markCleaned(itemId)`** — Giặt xong
1. Update `inventory_items.status` = 'available'

**`cancelRental(rentalId)`**
1. Update `dress_rentals.status` = 'cancelled'
2. Check no other active rentals → update `inventory_items.status` = 'available'

**`refundDeposit(rentalId)`**
1. Update `dress_rentals.deposit_returned` = true

---

## Phase 03 — UI: RentalModal + Nút (~1 ngày)

### Mục tiêu
- RentalModal form (UnifiedModal pattern)
- Nút "Đặt thuê"/"Trả váy" trên DressDrawerContent

### Files

| Action | File | Mô tả |
|--------|------|-------|
| NEW | `components/dresses/rental-modal.tsx` | Form thuê: khách, ngày, tài chính, phụ kiện |
| NEW | `types/rental.ts` | Type DressRental |
| NEW | `types/rental-constants.ts` | RENTAL_STATUS_MAP |
| MODIFY | `components/dresses/dress-drawer-content.tsx` | Thêm nút "Đặt thuê" + section rentals |
| MODIFY | `lib/validations/dress.schema.ts` | Thêm `cleaning`, `overdue` vào DRESS_STATUSES |
| MODIFY | `types/dress-constants.ts` | Thêm `cleaning`, `overdue` vào DRESS_STATUS_MAP |

### RentalModal fields
- Tên khách * (text)
- SĐT * (tel)
- Ngày lấy * (DatePicker)
- Ngày trả dự kiến * (DatePicker)
- Phí thuê (CurrencyInput — default = `inventory_items.rental_price`)
- Tiền cọc (CurrencyInput)
- Phụ kiện đi kèm (dynamic list: name + quantity)
- Ghi chú (textarea)

### Nút trên DressDrawerContent
- `status === 'available'` → Nút "Đặt thuê" (primary) → mở RentalModal
- `status === 'reserved'` → Nút "Bắt đầu thuê" (warning) + "Hủy đặt"
- `status === 'rented'` → Nút "Trả váy" (success)
- `status === 'cleaning'` → Nút "Đã giặt xong" (neutral) → mark available

---

## Phase 04 — Trả váy + Phụ kiện + Giặt (~1 ngày)

### Mục tiêu
- ReturnModal: check tình trạng, phí hư hại, hoàn cọc
- Phụ kiện tracking khi trả
- Flow giặt/bảo trì

### Files

| Action | File | Mô tả |
|--------|------|-------|
| NEW | `components/dresses/return-modal.tsx` | Modal trả: tình trạng, damage, phụ kiện check |
| MODIFY | `app/actions/rental-mutations.ts` | returnDress logic + accessories update |
| MODIFY | `components/dresses/dress-drawer-content.tsx` | Wire ReturnModal + "Đã giặt xong" |
| MODIFY | `components/dresses/dress-card.tsx` | Badge hiển thị cleaning/overdue |

### ReturnModal
- Tình trạng trả: radio (Tốt / Hư hại nhẹ / Hư hại nặng)
- Ghi chú tình trạng (textarea, show khi hư hại)
- Phí phát sinh (CurrencyInput, show khi hư hại)
- Checklist phụ kiện: hiển thị danh sách → tick đã trả
- Checkbox "Hoàn cọc ngay" (default: true nếu tình trạng OK)

---

## Phase 05 — Trang Rentals + Calendar (~1-2 ngày)

### Mục tiêu
- Trang `/dresses/rentals` danh sách đơn thuê
- Calendar view availability

### Files

| Action | File | Mô tả |
|--------|------|-------|
| NEW | `app/(protected)/dresses/rentals/page.tsx` | Server page fetch |
| NEW | `components/dresses/rentals-list-client.tsx` | Client list + filters |
| NEW | `components/dresses/rental-calendar.tsx` | Calendar view |
| MODIFY | `app/actions/rental-queries.ts` | fetchAllRentals + fetchCalendar |
| MODIFY | navigation/sidebar | Thêm link Rentals |

### List features
- Filter: status tabs (Tất cả / Đang thuê / Quá hạn / Đã trả)
- Search: tên khách hoặc SĐT
- Sort: ngày thuê mới nhất
- Card: tên khách + váy + ngày + status badge

### Calendar view
- Gantt-style hoặc month calendar
- Mỗi váy 1 hàng, block màu = ngày thuê
- Click block → xem chi tiết rental

---

## Phase 06 — SMS + Lịch sử + Báo cáo (~1 ngày)

### Mục tiêu
- SMS nhắc trả
- Lịch sử thuê theo khách
- Báo cáo doanh thu cho thuê

### Files

| Action | File | Mô tả |
|--------|------|-------|
| NEW | `app/actions/rental-notifications.ts` | SMS via Supabase Edge Function |
| MODIFY | `components/dresses/rentals-list-client.tsx` | Tab "Theo khách" group by phone |
| NEW | `components/dresses/rental-report.tsx` | Báo cáo: tổng thu, cọc, hư hại |

### SMS Logic
- Cron check daily: rentals WHERE `status = 'renting'` AND `return_date <= TODAY + 1`
- Send SMS nhắc khách
- Edge Function + Supabase scheduled jobs

### Báo cáo
- Tổng doanh thu thuê (rental_price)
- Tổng cọc thu / đã hoàn
- Tổng phí hư hại
- Filter theo tháng/quý

---

## Verification Plan

### Mỗi Phase
- `npm run build` — 0 errors
- Test UI trên browser (screenshot)

### End-to-end
1. Đặt thuê 1 váy → check dress status = reserved
2. Bắt đầu thuê → status = rented
3. Trả váy + check phụ kiện → status = cleaning
4. Mark giặt xong → status = available
5. Thử đặt trùng lịch → phải bị reject
6. Hủy đặt → status = cancelled, dress = available

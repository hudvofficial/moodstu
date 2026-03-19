# Phase 06: Inventory (Kho Trang Phục)

**Status:** 🟡 Stitch Done (4/4 screens)
**Dependencies:** Phase 04
**Est.:** 1.5 days

## Objective

Quản lý kho trang phục (váy cưới + áo dài + vest). Trạng thái real-time, conflict check theo date range, liên kết với HĐ.

## Implementation Steps

### Server Actions
- [ ] `getInventoryItems()` — list + filter (loại, status, search)
- [ ] `getInventoryItemById()` — detail + lịch sử thuê
- [ ] `createInventoryItem()` — thêm trang phục mới
- [ ] `updateInventoryItem()` — cập nhật (info, status, giá)
- [ ] `retireInventoryItem()` — ngừng kinh doanh
- [ ] `checkAvailability()` — kiểm tra trang phục có trống trong khoảng ngày
- [ ] `reserveItems()` — đặt trang phục cho HĐ (tạo reservation)
- [ ] `releaseReservation()` — trả trang phục (huỷ reservation)
- [ ] `updateItemStatus()` — chuyển trạng thái (rented → cleaning → available)

### Status Machine
```
available → reserved → rented → cleaning → available
                                    ↓
                              maintenance → available
                                    ↓
                                 retired
```

### Conflict Check Logic
- [ ] `check_inventory_conflict(item_id, date_start, date_end)` — RPC
  - Kiểm tra overlap với reservations hiện có
  - Buffer 2 ngày giặt sau mỗi rental
  - Return: available / conflict (with conflicting contract info)

### UI Components
- [ ] Inventory list page (grid/list view, filter by type/status)
- [ ] Item detail page (ảnh, info, calendar availability, lịch sử thuê)
- [ ] Create/Edit form (UnifiedModal)
  - SKU/mã trang phục
  - Loại (Váy cưới / Áo dài / Vest)
  - Size, Màu sắc
  - Giá thuê (CurrencyInput)
  - Ảnh (upload Supabase Storage)
- [ ] Availability calendar (mini calendar hiển thị ngày trống/đã book)
- [ ] Status badge (color-coded cho 6 trạng thái)
- [ ] Client-side tabs: Tất cả | Váy | Áo dài | Vest

### Contract Integration
- [ ] Khi tạo HĐ cưới/rental → picker chọn trang phục → auto check conflict
- [ ] Khi HĐ huỷ → auto release reservation
- [ ] Dashboard widget: "Trang phục sắp hết" (nhiều booking liên tục)

### Patterns Applied
- [ ] useRealtime: live status updates (nhiều sale cùng xem kho)
- [ ] Supabase Storage: upload ảnh trang phục
- [ ] Date range overlap query (v1 lesson: cần index tốt)
- [ ] Optimistic UI khi chuyển status

## Test Criteria
- [ ] CRUD trang phục OK
- [ ] Conflict check: 2 HĐ cùng book 1 váy cùng ngày → bị chặn
- [ ] Buffer giặt: trả ngày 1 → không cho thuê ngày 2-3 → OK từ ngày 4
- [ ] Upload ảnh trang phục
- [ ] Realtime: mở 2 tab, book ở tab A → status đổi ở tab B
- [ ] Filter theo loại trang phục

---
**Next Phase:** → Phase 07 (Dashboard)

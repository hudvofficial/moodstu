# Spec: Dresses Module (Quản Lý Trang Phục)
Status: 📋 Draft — chờ User duyệt

---

## 1. Mô tả nghiệp vụ (đúc kết từ V1)

Module quản lý toàn bộ kho trang phục cưới: **váy cưới, áo dài, vest, váy tráp, đồ bé, phụ kiện**.

### V1 đã có (cần giữ nguyên nghiệp vụ):
| Feature | V1 Implementation | V2 Target |
|---------|-------------------|-----------|
| **Catalog CRUD** | Create/Edit/Delete qua `DressModal` | Giữ, nâng cấp Zod + Optimistic Lock |
| **Card Grid** | 2-6 cột responsive, ảnh 3:4, hover edit | Giữ layout, dùng CSS tokens |
| **6 Categories** | Váy cưới, Áo dài, Vest, Váy tráp, Đồ bé, Khác | ✅ Giữ nguyên |
| **3 Status** | Sẵn sàng, Đang giặt, Đang cho thuê | Thêm: Đã đặt, Bảo trì |
| **QR/Barcode Scan** | `barcode_scanner` button, hidden input auto-focus | ✅ Port sang V2 |
| **Filter Toolbar** | Status chips + Category dropdown | ✅ Port, dùng `nuqs` |
| **Contract Integration** | `DressSelector` — chọn váy cho HĐ, checkbox "phát sinh" | Port sang `reserveDressForContract` |
| **Rental History** | `/dresses/rentals` — mobile cards + desktop table | Port, dùng `inventory_reservations` |
| **DressRentalsBlock** | Trong Contract Detail — hiển thị váy đã thuê | Port sang `costumes-block.tsx` (V2 đã có) |
| **ROI Analytics** | `DressROICard` — lần thuê, doanh thu, ROI% | Port sang Finance dashboard |
| **QRCodeLabel** | Sinh QR cho mỗi váy (in label dán) | ✅ Port |
| **ImageUpload** | Ảnh váy trong modal | ✅ Dùng shared `ImageUpload` |
| **Pagination** | 18 items/page | ✅ Port |

### V1 KHÔNG có (V2 thêm mới):
- ❌ Audit Logs → V2 thêm `fireAuditLog`
- ❌ Optimistic Locking → V2 thêm `updated_at` check
- ❌ Zod validation → V2 thêm schema
- ❌ Soft Delete → V2 thêm `deleted_at`
- ❌ Availability calendar (check conflict ngày) → V2 thêm

---

## 2. Database Schema

### ⚠️ QUYẾT ĐỊNH KIẾN TRÚC (CẦN ANH DUYỆT)

> **Tình trạng hiện tại:**
> - `wedding_dresses` (V1, **0 rows**) — bảng riêng, status tiếng Việt
> - `dress_rentals` (V1, **0 rows**) — bảng rental riêng, FK → wedding_dresses
> - `inventory_items` (V2, **2 rows**) — bảng gom tất cả, comment ghi "Gom V1 wedding_dresses + inventory_items"
> - `inventory_reservations` (V2, **2 rows**) — đặt trước theo HĐ, date range
>
> **Đề xuất:** Dùng `inventory_items` (V2) làm SSOT. `wedding_dresses` và `dress_rentals` là V1 legacy, **0 rows = chưa dùng**. Xóa `dress-actions.ts` cũ.

### Tables sẽ dùng:

| Table | Vai trò | Cần migration? |
|-------|---------|----------------|
| `inventory_items` | Catalog trang phục (filter `category`) | Thêm `purchase_price`, `brand`, `created_by`, `updated_by`, `deleted_at` |
| `inventory_reservations` | Đặt trước theo HĐ + ngày | Đã đủ columns |
| `inventory_transactions` | Lịch sử nhập/xuất | Đã đủ |

### V1 schema fields cần đảm bảo có trong `inventory_items`:

| V1 `wedding_dresses` field | V2 `inventory_items` mapping | Status |
|---------------------------|------------------------------|--------|
| `dress_code` | `item_code` ✅ | Đã có |
| `dress_name` / `name` | `name` ✅ | Đã có |
| `category` | `category` ✅ | Đã có |
| `size` | `size` ✅ | Đã có |
| `color` | `color` ✅ | Đã có |
| `rental_price` | `rental_price` ✅ | Đã có |
| `purchase_price` | ❌ **CẦN THÊM** | Migration |
| `image_url` | `image_url` ✅ | Đã có |
| `status` | `status` ✅ (nhưng dùng English) | Đã có |
| `condition` | `condition` ✅ | Đã có |
| `notes` | `notes` ✅ | Đã có |

---

## 3. Server Actions (Gold Standard)

### `dress-queries.ts` [NEW]
```
fetchDressList(filters: DressFilters) → DressItem[]
  - Filter: category, status, search (name/code), pagination
  - Sort: created_at DESC (default)

fetchDressDetail(id) → DressItem + reservations[]
  - Join inventory_reservations + contracts

getDressStats() → { total, available, reserved, rented, maintenance }

getDressAvailability(id, startDate, endDate) → boolean
  - Check conflict với inventory_reservations
```

### `dress-mutations.ts` [NEW]
```
createDress(data: CreateDressInput) → ActionResult<{id: string}>
  - Zod: dressCreateSchema.safeParse()
  - Auto-gen item_code nếu trống
  - fireAuditLog + revalidatePath

updateDress(id, data: UpdateDressInput) → ActionResult<null>
  - Optimistic Locking: check updated_at
  - Zod: dressUpdateSchema.safeParse()
  - fireAuditLog + revalidatePath

deleteDress(id) → ActionResult<null>
  - Soft delete (set deleted_at)
  - Check: không được xóa nếu đang reserved/rented
  - fireAuditLog (severity: WARNING) + revalidatePath

reserveDressForContract(input) → ActionResult<null>
  - Check availability (conflict date range)
  - Insert inventory_reservations
  - Optional: thêm contract_items nếu là addon
  - fireAuditLog + revalidatePath(/contracts, /dresses)

releaseDressReservation(reservationId) → ActionResult<null>
  - Update status → available
  - fireAuditLog + revalidatePath
```

### Xóa files cũ:
- [x] `dress-actions.ts` — Vi phạm: `Record<string, unknown>`, tiếng Việt status, thiếu Zod/AuditLog/OptLock

---

## 4. Zod Schemas

```typescript
// lib/validations/dress.schema.ts

export const DRESS_CATEGORIES = [
  "Váy cưới", "Áo dài", "Vest", "Váy tráp", "Đồ bé", "Khác"
] as const;

export const DRESS_STATUSES = [
  "available", "reserved", "rented", "maintenance", "retired"
] as const;

export const dressCreateSchema = z.object({
  name: z.string().min(1, "Tên trang phục là bắt buộc"),
  item_code: z.string().optional(),
  category: z.enum(DRESS_CATEGORIES),
  size: z.string().optional(),
  color: z.string().optional(),
  rental_price: z.number().min(0).default(0),
  sale_price: z.number().min(0).default(0),
  purchase_price: z.number().min(0).default(0),
  condition: z.enum(["new", "good", "fair", "worn"]).default("new"),
  image_url: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});
```

---

## 5. UI Components

### File Structure:
```
app/(protected)/dresses/
├── page.tsx              — SSR fetch → client component
├── loading.tsx           — Skeleton (port V1 DressesSkeleton)
├── error.tsx             — Error boundary
└── rentals/
    └── page.tsx          — Rental history (V1 port)

components/dresses/
├── dresses-list-page.tsx     — Main page (SWR + cards + filters)
├── dress-card.tsx            — Card (ảnh 3:4 + tên + giá + status badge + code)
├── dress-detail-drawer.tsx   — Chi tiết + lịch sử đặt
├── dress-form-modal.tsx      — Create/Edit (ImageUpload, QRCode, category chips)
├── dress-filters.tsx         — Mobile dropdowns + Desktop FilterChips
├── dress-stats-bar.tsx       — Stats (total/available/reserved/rented)
├── dress-scan-input.tsx      — QR/Barcode scanner hidden input
└── dress-qr-label.tsx        — QR label print (port V1 QRCodeLabel)

types/
├── dress.ts                  — DressItem, DressFilters, DressStats
└── dress-constants.ts        — CATEGORIES, STATUS_MAP, CONDITION_MAP
```

### Layout (giữ đúng V1):
- **Mobile:** 2 cột cards, dropdown filters, FAB button
- **Desktop:** 5-6 cột cards, FilterChips + category dropdown, stats bar

### Status Badge Colors (V2 — English status, Vietnamese display):
| DB Status | Display | Color |
|-----------|---------|-------|
| `available` | Sẵn sàng | 🟢 green |
| `reserved` | Đã đặt | 🔵 blue |
| `rented` | Đang thuê | 🟠 orange |
| `maintenance` | Bảo trì | 🟡 yellow |
| `retired` | Ngừng dùng | ⚫ gray |

---

## 6. Compliance Checklist (Gold Standard)

- [x] Actions split: `dress-queries.ts` + `dress-mutations.ts`
- [x] All mutations use `withAuth()`
- [x] Zod validation via `safeParse()`
- [x] Audit Logs via `fireAuditLog()`
- [x] Optimistic Locking (check `updated_at`)
- [x] `revalidatePath()` sau mutations
- [x] `ActionResult<T>` return type
- [x] `created_by` / `updated_by` FK → `auth.users(id)`
- [x] `loading.tsx` + `error.tsx`
- [x] CSS tokens from `design-system.css` (KHÔNG hardcode hex)
- [x] SWR (KHÔNG React Query)
- [x] `nuqs` for URL-based filters
- [x] Soft delete (`deleted_at`)

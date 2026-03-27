# Spec: Inventory Module

Status: 📋 Draft v2 — cập nhật theo feedback đồng bộ V2

---

## 1. Mô tả nghiệp vụ

Module **Kho vật tư** quản lý toàn bộ trang phục, phụ kiện, vật tư tiêu hao của Wedding Studio:

- **Quản lý items:** CRUD vật tư/trang phục, tracking tồn kho (current_stock), cảnh báo tồn kho thấp (min_stock)
- **Nhập/Xuất kho:** Ghi nhận mọi transaction IN/OUT, liên kết contract nếu có, tính giá trung bình
- **Reservations:** Đặt trước trang phục cho hợp đồng (date range conflict check)
- **Thống kê:** Tổng items, giá trị kho, items sắp hết, giao dịch trong tháng

### Nghiệp vụ cốt lõi (từ V1):
1. Danh sách vật tư → filter theo category, status → search theo tên/mã
2. Xem chi tiết item → lịch sử giao dịch nhập/xuất
3. Nhập kho (IN): nhận NCC, lý do, đơn giá → cập nhật tồn + giá TB
4. Xuất kho (OUT): liên kết contract, check đủ tồn → cảnh báo nếu thấp
5. Stats: tổng items, giá trị kho, low stock alerts, giao dịch tháng

---

## 2. Database Schema

### Schema hiện có + Migration cần thêm

#### Migration 1: ENUM types (đồng bộ V2)

```sql
-- Tạo ENUM cho status (thay VARCHAR free-text)
CREATE TYPE inventory_status_enum AS ENUM (
  'available',     -- Có sẵn
  'rented',        -- Đang cho thuê
  'maintenance',   -- Đang bảo trì
  'retired'        -- Ngừng sử dụng
);

-- Tạo ENUM cho category (thay VARCHAR free-text)
CREATE TYPE inventory_category_enum AS ENUM (
  'vay_cuoi',      -- Váy cưới
  'vest',          -- Vest
  'ao_dai',        -- Áo dài
  'phu_kien',      -- Phụ kiện (khăn voan, vương miện, giày...)
  'vat_tu',        -- Vật tư tiêu hao (khung ảnh, album...)
  'trang_tri',     -- Đồ trang trí
  'khac'           -- Khác
);

-- Migrate existing data
ALTER TABLE inventory_items
  ALTER COLUMN status TYPE inventory_status_enum
    USING status::inventory_status_enum;

ALTER TABLE inventory_items
  ALTER COLUMN category TYPE inventory_category_enum
    USING category::inventory_category_enum;

ALTER TABLE inventory_items
  ALTER COLUMN status SET DEFAULT 'available'::inventory_status_enum;
```

**`inventory_items`** (3 rows có sẵn):
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | gen_random_uuid() |
| item_code | VARCHAR UNIQUE | Mã vật tư |
| name | VARCHAR | Tên |
| category | `inventory_category_enum` | ✅ **ENUM mới** — snake_case |
| size, color, condition | VARCHAR | Thuộc tính vật lý |
| rental_price, sale_price, purchase_price | NUMERIC | Giá bán/cho thuê/mua |
| current_stock | INT | Tồn kho hiện tại |
| min_stock | INT | Ngưỡng cảnh báo |
| average_unit_price | NUMERIC | Giá TB (nhập kho) |
| image_url | TEXT | Ảnh |
| status | `inventory_status_enum` | ✅ **ENUM mới** — available/rented/maintenance/retired |
| notes | TEXT | Ghi chú |
| created_by, updated_by | UUID FK → auth.users | ✅ Đúng chuẩn |
| created_at, updated_at | TIMESTAMPTZ | Audit |
| deleted_at | TIMESTAMPTZ | Soft delete ✅ |

**`inventory_transactions`** (0 rows):
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_id | UUID FK → inventory_items | |
| transaction_type | VARCHAR CHECK IN/OUT | |
| quantity | INT | |
| unit_cost, total_cost (generated) | NUMERIC | |
| contract_id | UUID FK → contracts | (nullable) |
| contract_code | VARCHAR | (denorm — chấp nhận) |
| reason, supplier, notes | TEXT | |
| performed_by | UUID FK → auth.users | ✅ |
| customer_name, customer_phone, customer_address | VARCHAR/TEXT | Cho xuất bán |
| created_at | TIMESTAMPTZ | |

**`inventory_reservations`** (2 rows):
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| inventory_item_id | UUID FK → inventory_items | |
| contract_id, contract_item_id, customer_id | UUID FK | |
| start_date, end_date | DATE | Date range |
| export_type | ENUM xuat_ban/xuat_thue | |
| status | VARCHAR | reserved/confirmed/cancelled |
| notes | TEXT | |

> **RLS:** Cả 3 bảng đều enabled. Đã có sẵn policies.

### Schema Changes Needed:
- [x] Tạo `inventory_status_enum` (đồng bộ pattern V2: contract_status_enum, lead_status_enum...)
- [x] Tạo `inventory_category_enum` (snake_case, Lesson #65)
- [x] Migrate existing VARCHAR → ENUM
- [x] Indexes cho `category`, `status` (filter performance)

---

## 3. Server Actions

### ✅ ĐÃ TỒN TẠI — CẦN REFACTOR

Hiện có 2 files:
- `inventory-actions.ts` (161 lines) — CRUD items + transactions + stats
- `inventory-query-actions.ts` (79 lines) — Transaction history queries

**Refactor cần làm** (theo v2-module-template):

#### `inventory-queries.ts` [NEW] — tách queries ra riêng
- `fetchInventoryList(search?, category?, status?)` — list items (thay `getInventoryAction`)
- `fetchInventoryDetail(id)` — chi tiết 1 item
- `getInventoryStats()` — stats (move từ inventory-actions.ts)
- `getItemTransactions(itemId, page)` — (move từ inventory-query-actions.ts)
- `getAllTransactions(filters)` — (move từ inventory-query-actions.ts)
- `getAvailableItems()` — items available cho reservation

#### `inventory-mutations.ts` [NEW] — CRUD + transactions
- `createInventoryItem(rawData)` — Zod validation, fireAuditLog
- `updateInventoryItem(id, rawData, expectedUpdatedAt)` — Optimistic Locking
- `deleteInventoryItem(id)` — Soft delete (set deleted_at)
- `createInventoryTransaction(input)` — Stock check OUT, low stock warning

#### Xóa files cũ:
- [DELETE] `inventory-actions.ts`
- [DELETE] `inventory-query-actions.ts`

---

## 4. UI Components

### File Structure (theo module-blueprint §1):
```
app/(protected)/inventory/
├── page.tsx              — Server Component (SSR fetch → props)
├── loading.tsx           — Skeleton loader
├── error.tsx             — Error boundary
└── [id]/page.tsx         — Detail page (item detail + transaction history)

components/inventory/
├── inventory-list-page.tsx      — Client wrapper (SWR + filters)
├── inventory-table.tsx          — Desktop table
├── inventory-card.tsx           — Mobile card
├── inventory-filters.tsx        — Filter bar (TabsFilter + SelectPill)
├── inventory-stats-bar.tsx      — Stats (shared StatsBar)
├── inventory-detail-page.tsx    — Detail view
├── inventory-form-modal.tsx     — Create/Edit item
├── inventory-transaction-modal.tsx — Nhập/Xuất kho modal

types/
├── inventory.ts                 — DB types + enums
└── inventory-constants.ts       — Display maps, labels
```

### Pages & Components:

**1. List Page** (`/inventory`)
- Stats bar: tổng items | giá trị kho | cảnh báo thấp | GD tháng
- Filter: TabsFilter (Tất cả / Có sẵn / Đang thuê / Bảo trì / Hết hàng)
- SelectPill: filter category (Váy cưới / Vest / Phụ kiện / Vật tư)
- Desktop: Table (mã | tên | category | tồn | giá thuê | trạng thái)
- Mobile: Cards
- FAB: "Thêm vật tư"

**2. Detail Page** (`/inventory/[id]`)
- Breadcrumb → Kho vật tư → [item name]
- Main: Thông tin chung (ảnh, mã, tên, category, kích thước, màu sắc, tình trạng)
- Sidebar: Giá (thuê/bán/mua), tồn kho hiện tại, ngưỡng cảnh báo
- Tab: Lịch sử giao dịch (paginated), Reservations

**3. Form Modal** — Tạo/Sửa item
- Fields: tên, mã (auto-gen), category (SelectForm), size, color, condition
- Giá: rental_price, sale_price, purchase_price (CurrencyInput)
- Tồn kho: current_stock, min_stock
- Image, notes

**4. Transaction Modal** — Nhập/Xuất kho
- Type: IN/OUT (tabs)
- Item selector, quantity, unit_cost (CurrencyInput)
- Reason, supplier (IN), contract link (OUT)
- Customer info (xuất bán): tên, SĐT, địa chỉ

---

## 5. Status Transitions

### Item Status (không có FSM phức tạp — free update):
```
available ←→ rented ←→ maintenance ←→ retired
```
Không cần lifecycle file — trạng thái cập nhật trực tiếp.

---

## 6. Compliance Check

### Architecture
- [x] DB schema đã tồn tại — KHÔNG cần migration
- [ ] Actions split: queries + mutations (refactor cần thiết)
- [ ] withAuth() cho mọi action
- [ ] Zod validation cho mutations
- [ ] fireAuditLog cho mutations
- [ ] Optimistic Locking cho update
- [ ] revalidatePath sau mutations
- [x] created_by FK → auth.users(id) ✅

### UI
- [ ] loading.tsx + Skeleton
- [ ] error.tsx
- [ ] 3 UX states (loading, empty, error)
- [ ] Responsive: Desktop + Mobile
- [ ] CSS SSOT tokens only
- [ ] Transaction modal (Nhập/Xuất kho) — full scope
- [ ] Max 250 lines/file

### Database
- [x] Soft delete: deleted_at ✅
- [x] RLS enabled ✅
- [x] Audit columns ✅
- [ ] Status ENUM `inventory_status_enum` ✅ (migration cần apply)
- [ ] Category ENUM `inventory_category_enum` ✅ (migration cần apply)

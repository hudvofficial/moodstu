# Spec: Inventory (Kho Vật Tư Tiêu Hao)

**Status:** 📋 Draft — chờ User duyệt

---

## 1. Mô tả nghiệp vụ

Module **độc lập**, quản lý vật tư tiêu hao — KHÔNG liên quan Dresses (trang phục).

**Đối tượng:** Khung ảnh, album, standee, hoa giả, backdrop, giấy in, mực, keo...

### Core Flows

```
FLOW 1: NHẬP KHO (Stock In)
NCC giao hàng → Chọn/tạo vật tư → Nhập SL + đơn giá + NCC
  → Tạo transaction (type=IN)
  → Cộng current_stock
  → Tính lại average_unit_price

FLOW 2: XUẤT KHO (Stock Out)
Cần vật tư → Chọn item + SL → Check tồn kho
  ✅ Đủ → Tạo transaction (type=OUT) → Trừ stock → Link HĐ nếu có
  ❌ Thiếu → Báo lỗi

FLOW 3: QUẢN LÝ VẬT TƯ (CRUD)
Danh sách → Filter (category, status) → Xem chi tiết → Tạo/Sửa/Ngưng
```

---

## 2. Database Schema

### 2.1. Bảng `inventory_items` [MỚI]

| Column | Type | Note |
|--------|------|------|
| `id` | UUID PK | `gen_random_uuid()` |
| `item_code` | VARCHAR(20) UNIQUE | Auto-gen: `VT-001` |
| `name` | VARCHAR(200) NOT NULL | Tên vật tư |
| `category` | VARCHAR(50) | Group B — `khung_anh`, `album`, `hoa`, `tieu_hao`, `trang_tri` |
| `unit` | VARCHAR(30) | `cai`, `bo`, `hop`, `cuon`, `met`, `to` |
| `current_stock` | INTEGER DEFAULT 0 | Tồn kho hiện tại |
| `min_stock` | INTEGER DEFAULT 0 | Ngưỡng cảnh báo |
| `purchase_price` | NUMERIC(15,2) DEFAULT 0 | Giá mua gần nhất |
| `average_unit_price` | NUMERIC(15,2) DEFAULT 0 | Giá trung bình (weighted) |
| `sale_price` | NUMERIC(15,2) DEFAULT 0 | Giá bán (nếu xuất bán) |
| `supplier` | VARCHAR(200) | NCC chính |
| `image_url` | TEXT | Ảnh vật tư |
| `status` | VARCHAR(20) DEFAULT 'active' | Group B — `active`, `discontinued` |
| `notes` | TEXT | Ghi chú |
| `created_by` | UUID FK → `auth.users(id)` | Lesson #72 |
| `updated_by` | UUID FK → `auth.users(id)` | |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ DEFAULT now() | |
| `deleted_at` | TIMESTAMPTZ DEFAULT NULL | Soft delete |

**Indexes:** `status`, `category`, `item_code`
**RLS:** `service_role_full_access` + `anon_no_access`

### 2.2. Bảng `inventory_transactions` [ĐÃ CÓ — FIX]

Bảng đã tồn tại (17 columns, 0 rows). Cần fix:
1. **Thêm FK:** `item_id` → `inventory_items(id)`
2. **Rollback ENUM:** `inventory_transaction_type_enum` → VARCHAR (ABC Group B, Lesson #89)
3. **Fix FK:** `performed_by` — hiện FK trỏ bảng không xác định → **Drop + Re-add FK** → `auth.users(id)` (Lesson #72)
4. **Thêm audit columns:** `created_by` FK → `auth.users(id)` (hiện chỉ có `performed_by`)

> [!WARNING]
> ENUM rollback: ALTER column type → DROP old enum type.
> `performed_by` FK cũ cần DROP trước rồi re-create trỏ đúng `auth.users(id)`.

### 2.3. Auto-code: `item_code`

```
Prefix: VT-
Format: VT-001, VT-002, ...
Logic: SELECT MAX + 1 (retry loop 3 lần — race prevention)
```

---

## 3. Server Actions

### inventory-queries.ts (READ)

| Function | Mô tả |
|----------|--------|
| `fetchInventoryList(filters?)` | List + filter (category, status, search) |
| `fetchInventoryDetail(id)` | Detail + transactions history |
| `getInventoryStats()` | Tổng items, giá trị kho, low stock count |
| `getNextInventoryCode()` | Auto-gen VT-XXX |

### inventory-mutations.ts (WRITE)

| Function | Mô tả |
|----------|--------|
| `createInventoryItem(data)` | Tạo vật tư mới |
| `updateInventoryItem(id, data)` | Sửa info (optimistic locking) |
| `deleteInventoryItem(id)` | Soft delete |
| `stockIn(itemId, qty, unitCost, supplier?, notes?)` | Nhập kho → transaction + stock + avg price |
| `stockOut(itemId, qty, contractId?, reason?, notes?)` | Xuất kho → check stock → transaction → trừ stock |

**Tất cả:** `withAuth` + `try-catch` + `revalidatePath` + `fireAuditLog` + Zod `safeParse`

---

## 4. UI Components

### File Structure

```
app/(protected)/inventory/
├── page.tsx              ← SSR + metadata
├── loading.tsx           ← Skeleton (BẮT BUỘC)
├── error.tsx             ← Error boundary (BẮT BUỘC)
└── [id]/page.tsx         ← Detail

components/inventory/
├── inventory-list-page.tsx     ← Client (SWR + filters)
├── inventory-filters.tsx       ← SelectPill (category, status)
├── inventory-stats-bar.tsx     ← StatsBar
├── inventory-table.tsx         ← Desktop table
├── inventory-card.tsx          ← Mobile card
├── inventory-detail-page.tsx   ← Detail + transaction history
├── inventory-form-modal.tsx    ← Create/Edit (openModal)
├── stock-in-modal.tsx          ← Nhập kho form
└── stock-out-modal.tsx         ← Xuất kho form

types/
├── inventory.ts                ← Types + Group B enums
└── inventory-constants.ts      ← Labels, maps
```

### Shared Components Used

| Component | Dùng ở đâu |
|-----------|-----------|
| `StatsBar` | Tổng items, giá trị kho, low stock |
| `TabsFilter` | Status (Tất cả / Active / Ngưng) |
| `SelectPill` | Category filter |
| `SearchBar` | Tìm tên/mã |
| `FAB` | Mobile "+" |
| `Badge` | Status |
| `CurrencyInput` | Giá mua/bán |
| `openModal()` | Tất cả modals |

---

## 5. Status Transitions

```
active ←→ discontinued
```

- `active`: kinh doanh, nhập/xuất OK
- `discontinued`: ngưng, không cho nhập/xuất

---

## 6. Compliance Checklist

- [x] Actions: queries + mutations split
- [x] withAuth() mọi action
- [x] Zod safeParse cho mutations
- [x] fireAuditLog cho mutations
- [x] Optimistic locking cho update
- [x] FK `*_by` → `auth.users(id)` (Lesson #72)
- [x] ABC Group B cho category/status/unit/transaction_type (Lesson #89-90)
- [x] Soft delete + RLS
- [x] loading.tsx + error.tsx
- [x] CSS SSOT — NO hardcode hex
- [x] NO border — shadow only
- [x] openModal() — NO self-render
- [x] SelectPill for filters, SelectForm for forms
- [x] Max 250 lines/file
- [x] Responsive Desktop + Mobile

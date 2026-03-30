# Spec: Services Module (Quản Lý Dịch Vụ & Bảng Giá)
Status: 📋 Draft — chờ User duyệt

---

## 1. Mô tả nghiệp vụ (đúc kết từ V1)

Module quản lý toàn bộ danh mục dịch vụ, sản phẩm và gói combo của studio. Đây là **backbone** của hệ thống — mọi hợp đồng đều reference đến `services`.

### 1.1 V1 Feature Inventory (đầy đủ — 12 files, ~3,600 lines)

| Feature | V1 Files | Lines | V2 Target |
|---------|----------|-------|-----------|
| **Services CRUD** | `ServiceForm.tsx` | 536 | Tách: `form/index.tsx` + sections + hook |
| **Service List** | `ServiceManagement.tsx` | 409 | Tách: `services-list-client.tsx` + table + stats + filters |
| **Service Row (expand)** | `ServiceRow.tsx` | 214 | 2 variants: mobile flex + desktop tr/td |
| **Service Card (grid)** | `ServiceCard.tsx` | 145 | Grid card với content preview |
| **Service Search** | `ServiceSearch.tsx` | 86 | Mobile: icon toggle, Desktop: inline — merge vào filters |
| **Category Manager** | `CategoryManager.tsx` | 163 | Port: UnifiedModal + inline CRUD |
| **Content Editor** | `ServiceContentEditor.tsx` | 224 | Structured description (JSON sections → items) |
| **Bundle Builder** | `ServiceBundleSection.tsx` | 241 | Manual mode + Visual mode toggle |
| **Quote Modal** | `QuoteModal.tsx` | 202 | Popup preview: brand header + sections + price + studio info |
| **Quote View** | `QuoteView.tsx` | 218 | Full-page printable: toolbar + card + print CSS |
| **Quote Preview** | `QuotePreview.tsx` | 127 | In-form live preview card |
| **Services Client** | `ServicesClient.tsx` | 130 | SWR wrapper + skeleton (V2: merge vào page.tsx SSR) |
| **Builder Mode** | `BuilderMode.tsx` | 9.4KB | Visual drag-drop (Phase 2) |
| **Bundle Canvas** | `BundleCanvas.tsx` | 6.3KB | Canvas rendering (Phase 2) |
| **Component Selector** | `ComponentSelector.tsx` | 5.9KB | Service picker for builder (Phase 2) |
| **Smart Suggestions** | `SmartSuggestions.tsx` | 5.4KB | AI-powered suggestions (Phase 2) |
| **Rule Manager** | `RuleManager.tsx` | 15.2KB | Price rules CRUD (Phase 2) |
| **Quote Modern View** | `QuoteModernView.tsx` | 8.7KB | Modern quote layout (Phase 2) |

### 1.2 Nghiệp vụ chính (business logic cần giữ đúng):

1. **Service Code generation** — Format `SV-YYYYMMDD-NNNN`, auto-gen nếu trống, collision retry
2. **Category filtering** — Dynamic categories từ `service_categories` table, filter bằng slug
3. **Structured Description** — JSON format: `[{ title: "Section", items: ["item1", "item2"] }]`
   - Fallback: Parse legacy text (auto-detect headers bằng uppercase/trailing dot)
   - Display: Expandable sections trong list, full in quote view
4. **Bundle/Combo** — Parent–child relationship qua `service_bundles`, tính giá vốn
5. **Quote System** — 3 levels: Modal popup → Full page → In-form preview
   - Fetch `studio_info` (cached) để hiển thị branding
   - Print support (`window.print()` với CSS `@media print`)
6. **View modes** — Toggle List (table) ↔ Grid (cards) — state giữ local
7. **Stats Strip** — 4 metrics: Tổng dịch vụ, Giá TB, Cao nhất, Thấp nhất
8. **Client-side filter + search** — Kết hợp: search (URL param) + category filter (local state)

### 1.3 V1 KHÔNG có (V2 thêm mới):
- ❌ Audit Logs → V2 thêm `fireAuditLog`
- ❌ Optimistic Locking → V2 thêm `updated_at` check
- ❌ Zod validation → V2 thêm schema
- ❌ Soft Delete → V2 thêm `deleted_at`
- ❌ Error Boundary → V2 thêm `error.tsx`
- ❌ Loading Skeleton → V2 thêm `loading.tsx`
- ❌ Server-side pagination → V1 fetch all 50, filter client-side. V2: server-side `.range()`

---

## 2. Database Schema

### 2.1 Bảng hiện có (đã tồn tại trong Supabase V2):

| Table | Vai trò | Status |
|-------|---------|--------|
| `services` | Catalog dịch vụ chính | ✅ Đã có |
| `service_categories` | Nhóm dịch vụ (Chụp ảnh, Váy cưới, Trang điểm...) | ✅ Đã có |
| `service_bundles` | Thành phần combo (child items of parent service) | ✅ Đã có |
| `service_relations` | Builder mode relations (Phase 2) | ✅ Đã có |
| `price_rules` | Quy tắc giá động (Phase 2) | ✅ Đã có |
| `studio_info` | Thông tin studio (cho Quote branding) | ✅ Đã có |

### 2.2 `services` table columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | gen_random_uuid() |
| `service_code` | VARCHAR | Auto-gen `SV-YYYYMMDD-NNNN`, unique |
| `service_name` | VARCHAR | NOT NULL |
| `service_type` | VARCHAR | Legacy field — synced with category name |
| `category_id` | UUID FK → service_categories | Nullable |
| `description` | TEXT | Structured content JSON: `[{title, items[]}]` |
| `selling_price` | NUMERIC | NOT NULL, >= 0 |
| `cost_price` | NUMERIC | V2 field (tương đương `import_price` V1) |
| `unit` | VARCHAR | "Gói", "Suất", "Bộ"... |
| `quantity_stock` | INT | Relevant cho sản phẩm bán |
| `status` | VARCHAR | `active` / `inactive` (V2 English) |
| `fulfillment_type` | VARCHAR | IN_HOUSE / BUNDLE / RENTAL / OUTSOURCE |
| `image_url` | VARCHAR | Optional |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |
| `created_by` | UUID FK → auth.users | V2 thêm |
| `updated_by` | UUID FK → auth.users | V2 thêm |
| `deleted_at` | TIMESTAMPTZ | V2 soft delete |

### 2.3 `service_bundles` table:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `parent_service_id` | UUID FK → services | NOT NULL |
| `child_service_id` | UUID FK → services | NOT NULL |
| `quantity` | INT | Default 1 |
| `adjustment_price` | NUMERIC | Điều chỉnh giá, default 0 |
| `notes` | TEXT | Optional |

### 2.4 `service_categories` table:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | VARCHAR | NOT NULL |
| `slug` | VARCHAR | Auto-gen từ `name` (Vietnamese slug) |
| `icon` | VARCHAR | Google Material Symbols icon name |

### 2.5 ⚠️ MIGRATION CẦN DUYỆT:

> Cần kiểm tra `services` table hiện có trong V2 Supabase và bổ sung nếu thiếu:
> - `created_by`, `updated_by` (audit columns)
> - `deleted_at` (soft delete)
> - `cost_price` (nếu chưa có)
> - Enforce `service_code` NOT NULL nếu hiện tại nullable

---

## 3. Types (ABC Group B — VARCHAR + TS Enum)

### `types/service.ts` [NEW]

```typescript
// ─── FULFILLMENT TYPE (Group B: VARCHAR + TS) ─────────────
export const FULFILLMENT_TYPES = ["IN_HOUSE", "BUNDLE", "RENTAL", "OUTSOURCE"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

// ─── SERVICE STATUS (Group B: VARCHAR + TS) ───────────────
export const SERVICE_STATUSES = ["active", "inactive"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

// ─── CONTENT STRUCTURE (Description JSON format) ──────────
export interface ContentSection {
  title: string;
  items: string[];
}

// ─── DB Record ────────────────────────────────────────────
export interface ServiceRecord {
  id: string;
  service_code: string;
  service_name: string;
  service_type: string;
  category_id: string | null;
  description: string | null;
  selling_price: number;
  cost_price: number;
  unit: string | null;
  quantity_stock: number;
  status: ServiceStatus;
  fulfillment_type: FulfillmentType | string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  // Joined data
  category?: { id: string; name: string; slug: string; icon: string | null } | null;
}

// ─── CATEGORY ─────────────────────────────────────────────
export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

// ─── BUNDLE ITEM ──────────────────────────────────────────
export interface ServiceBundleItem {
  id: string;
  parent_service_id: string;
  child_service_id: string;
  quantity: number;
  adjustment_price: number;
  notes: string | null;
  // Joined
  child_service?: Pick<ServiceRecord, "id" | "service_code" | "service_name" | "selling_price"> | null;
}

// ─── FILTERS ──────────────────────────────────────────────
export interface ServiceFilters {
  search?: string;
  categorySlug?: string;
  status?: ServiceStatus;
  page?: number;
  limit?: number;
}

// ─── STATS ────────────────────────────────────────────────
export interface ServiceStats {
  total: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
}
```

### `types/service-constants.ts` [NEW]

```typescript
import type { ServiceStatus, FulfillmentType } from "./service";

export const SERVICE_STATUS_MAP: Record<ServiceStatus, { label: string; variant: string }> = {
  active: { label: "Đang kinh doanh", variant: "success" },
  inactive: { label: "Ngừng kinh doanh", variant: "neutral" },
};

export const FULFILLMENT_TYPE_MAP: Record<FulfillmentType, { label: string; icon: string }> = {
  IN_HOUSE: { label: "Tự làm", icon: "engineering" },
  BUNDLE: { label: "Combo", icon: "layers" },
  RENTAL: { label: "Cho thuê", icon: "checkroom" },
  OUTSOURCE: { label: "Gia công", icon: "factory" },
};

export const SERVICE_UNITS = ["Gói", "Suất", "Bộ", "Cái", "Chiếc", "Lần"] as const;
```

### `types/service-form.ts` [NEW]

```typescript
import type { ContentSection } from "./service";

export interface ServiceFormData {
  service_name: string;
  service_code: string;
  service_type: string;
  category_id: string;
  description: string;         // JSON string of ContentSection[]
  selling_price: number;
  cost_price: number;
  unit: string;
  quantity_stock: number;
  status: string;
  fulfillment_type: string;
  image_url: string;
}

export interface BundleItemInput {
  child_service_id: string;
  quantity: number;
  adjustment_price?: number;
  notes?: string;
}

// Description parsed for editing
export interface EditableSection {
  id: string;                   // Client-only ID for React key
  title: string;
  items: string[];
}
```

---

## 4. Server Actions (Gold Standard)

### `service-queries.ts` [NEW]

```
getServices(filters: ServiceFilters)
  → { services: ServiceRecord[]; totalCount: number }
  - Server-side pagination via .range()
  - Join: service_categories (category_id FK)
  - Category filter: inner join when filtering by slug
  - Search: sanitizeSearch() + .or(ilike service_name, ilike service_code)
  - Filter: .is("deleted_at", null)
  - Sort: created_at DESC

getServiceById(id: string) → ServiceRecord
  - Join category
  - Soft delete check: .is("deleted_at", null)
  - 404 if not found

getServiceCategories() → ServiceCategory[]
  - Order by name
  - Cached (React cache wrapper)

getBundleItems(serviceId: string) → ServiceBundleItem[]
  - Join child_service: id, service_code, service_name, selling_price
  - Filter by parent_service_id

searchServicesForBundle(query: string) → ServiceRecord[]
  - Lightweight select: id, service_code, service_name, selling_price
  - Max 20 results
  - sanitizeSearch()
  - Exclude: deleted services

getStudioInfo() → StudioInfo
  - For quote branding
  - Cached (module-level or React cache)
```

### `service-mutations.ts` [NEW]

```
createService(rawData: unknown, bundleItems?: BundleItemInput[])
  → ActionResult<{ id: string }>
  - Zod: serviceCreateSchema.safeParse()
  - Auto-gen service_code: SV-YYYYMMDD-NNNN (nếu trống)
  - Code uniqueness check + collision retry (max 3)
  - Insert service
  - Handle bundle items insert (if BUNDLE fulfillment_type)
  - fireAuditLog(CREATE, "services") + revalidatePath("/services")

updateService(id: string, rawData: unknown, bundleItems?: BundleItemInput[], expectedUpdatedAt?: string)
  → ActionResult<{ id: string }>
  - Zod: serviceUpdateSchema.safeParse()
  - Optimistic Locking: check updated_at vs expectedUpdatedAt
  - Code uniqueness check (exclude self)
  - Update service
  - Sync bundle: DELETE old → INSERT new (if bundleItems provided)
  - fireAuditLog(UPDATE, "services") + revalidatePath("/services")

deleteService(id: string) → ActionResult<null>
  - Pre-check: đang dùng trong contract_details? → block
  - Pre-check: đang là child trong service_bundles? → block with info
  - Soft delete: SET deleted_at = now()
  - fireAuditLog(DELETE, "services", severity: "WARNING") + revalidatePath
```

### Files đã có trong V2 (giữ nguyên):
- ✅ `category-actions.ts` — upsertCategory, deleteCategory, getAvailableServices, quickCreateService
- ✅ `builder-actions.ts` — getServiceRelations, getPriceRules, upsertRelation, upsertPriceRule

---

## 5. Zod Schemas

```typescript
// lib/validations/service.schema.ts [NEW]

import { z } from "zod";
import { FULFILLMENT_TYPES, SERVICE_STATUSES } from "@/types/service";

export const serviceCreateSchema = z.object({
  service_name: z.string().min(1, "Tên dịch vụ là bắt buộc").max(200),
  service_code: z.string().optional(),
  service_type: z.string().optional().default(""),
  category_id: z.string().uuid().optional().or(z.literal("")),
  description: z.string().optional().default(""),     // JSON string
  selling_price: z.number().min(0, "Giá bán phải >= 0"),
  cost_price: z.number().min(0).default(0),
  unit: z.string().optional().default("Gói"),
  quantity_stock: z.number().int().min(0).default(0),
  status: z.enum(SERVICE_STATUSES).default("active"),
  fulfillment_type: z.enum(FULFILLMENT_TYPES).default("IN_HOUSE"),
  image_url: z.string().url().optional().or(z.literal("")),
});

export const serviceUpdateSchema = serviceCreateSchema.partial().extend({
  service_name: z.string().min(1, "Tên dịch vụ là bắt buộc").max(200),
});

export const bundleItemSchema = z.object({
  child_service_id: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  adjustment_price: z.number().default(0),
  notes: z.string().optional(),
});
```

---

## 6. UI Components — Chi Tiết Mobile vs Desktop

### 6.1 File Structure

```
app/(protected)/services/
├── page.tsx              — SSR: fetch services + categories → client component
├── loading.tsx           — Skeleton (2 variants: mobile 2-col, desktop 4-col stats)
├── error.tsx             — ErrorFallback
├── create/
│   └── page.tsx          — SSR: fetch categories → ServiceForm (create mode)
└── [id]/
    ├── page.tsx          — SSR: fetch by ID → ServiceForm (edit mode)
    └── quote/
        └── page.tsx      — SSR: fetch service → QuoteView (full-page printable)

components/services/
├── services-list-client.tsx    — SWR + filters + view toggle (< 300 lines)
├── service-table.tsx           — Desktop table (SSOT TableSuite)
├── service-row-mobile.tsx      — Mobile list item (expandable)
├── service-card.tsx            — Grid card view (responsive)
├── service-stats-bar.tsx       — 4 stat cards
├── service-filters.tsx         — Category chips + search (nuqs)
├── service-empty-state.tsx     — Empty state illustration
├── form/
│   ├── index.tsx               — ServiceForm orchestrator (< 250 lines)
│   ├── ServiceInfoSection.tsx  — Name, code, type, category picker
│   ├── ServicePriceSection.tsx — Prices, unit, stock, fulfillment type
│   ├── ServiceContentEditor.tsx — Structured description editor (JSON sections)
│   ├── ServiceBundleSection.tsx — Bundle items search + list (Phase 1b)
│   └── hooks/
│       └── useServiceForm.ts   — Form state + submit logic
├── quote/
│   ├── quote-modal.tsx         — Popup modal (ModalPortal): brand header + sections + price
│   ├── quote-view.tsx          — Full-page: toolbar + print CSS + branded card
│   └── quote-preview.tsx       — In-form live preview (ServiceForm sidebar)
└── category-manager-modal.tsx  — CRUD modal (UnifiedModal)
```

### 6.2 List Page — Desktop (lg+: ≥1024px)

```
┌─────────────────────────────────────────────────────────────┐
│ 🏷️ HEADER: "Bảng giá dịch vụ"    [🔍 Search bar 80ch]  [+ Thêm gói] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ Tổng DV  │ │  Giá TB  │ │ Cao nhất │ │ Thấp nhất│        │
│ │   23     │ │ 8.5tr    │ │ 25tr     │ │ 1.5tr    │        │
│ │ gói      │ │ VNĐ      │ │ VNĐ      │ │ VNĐ      │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                             │
│ ┌─ [Tất cả] [📷Chụp ảnh] [💄Trang điểm] [👗Váy] ─── │ ≡ ⊞ ⚙ 🔧 │
│                                                             │
│ VIEW: TABLE (default)                                       │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ TH: ▶│ Tên dịch vụ        │ Danh mục │  Giá    │ ⚡  │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │  ▶ │ Wedding Premium Gold │ Chụp ảnh │12.000.000│ 🖊📋│   │
│ │    │ 15 hạng mục • 3 nhóm │          │     VNĐ  │     │   │
│ │ ─── (EXPANDED) ──────────────────────────────────── │   │
│ │    │ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│ │    │ │ NGÀY CHỤP│ │ HẬU KỲ  │ │SẢN PHẨM │           │   │
│ │    │ │ • 2 ekip │ │ • 100 ảnh│ │ • Album  │           │   │
│ │    │ │ • 3 locn │ │ • Video  │ │ • Canvas │           │   │
│ │    │ └─────────┘ └─────────┘ └─────────┘           │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │  ▶ │ Combo Ngày Cưới      │ Ngày Cưới│25.000.000│ 🖊📋│   │
│ │    │ 22 hạng mục • 5 nhóm │          │     VNĐ  │     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│ Hiển thị 23 / 23 gói dịch vụ          [Xóa bộ lọc]        │
└─────────────────────────────────────────────────────────────┘
```

**Desktop table columns:** (dùng SSOT TableSuite)
| Column | Width | Align | Content |
|--------|-------|-------|---------|
| Expand toggle | 40px | center | `chevron_right` (rotates 90° on expand) |
| Tên dịch vụ | flex | left | `service_name` (15px bold) + unit badge + `${itemCount} hạng mục` |
| Danh mục | auto | center | Category name text |
| Giá | auto | center | `selling_price` (bold, tabular-nums) + "VNĐ" suffix |
| Thao tác | auto | center | 3 icon buttons: Quote 📋 + Edit 🖊 + Open 🔗 (opacity: 0→1 on hover) |

**Desktop expanded row:** `colSpan={5}`, grid 3 columns, shows `parseContentStructure()` sections.

**Desktop GRID view:** (toggle ⊞)
- `grid-cols-3 xl:grid-cols-4`
- Cards: header (name + unit badge) + content preview (max 2 sections × 4 items) + footer (price + Quote/Chi tiết links)
- Edit overlay: absolute top-right, opacity 0→1 on group-hover

### 6.3 List Page — Mobile (< lg: < 1024px)

```
┌─────────────────────────┐
│ Bảng giá dịch vụ 🔍 [+] │ ← Search = icon toggle
├─────────────────────────┤
│ (expandable search bar) │ ← Slide-down from header
├─────────────────────────┤
│ ┌──────┐ ┌──────┐       │
│ │23 gói│ │8.5tr │       │ ← 2x2 stats grid
│ └──────┘ └──────┘       │
│ ┌──────┐ ┌──────┐       │
│ │25tr ↑│ │1.5tr↓│       │
│ └──────┘ └──────┘       │
├─────────────────────────┤
│ [📱Tất cả] [📷] [💄]... │ ← Horizontal scroll chips
│ ────────────────────────│     (icon only on mobile,
│                         │      text appears on sm+)
│ ┌───────────────────────┤
│ │▶ Wedding Premium Gold │
│ │  15 hạng mục • 3 nhóm │ ← Flex row: expand + name + price
│ │              12.000.000│
│ ├───────────────────────┤
│ │   ┌─ EXPANDED ───────┤│ ← pl-10, bg-surface-secondary
│ │   │ NGÀY CHỤP:        ││
│ │   │ • 2 ekip chụp     ││
│ │   │ • 3 địa điểm      ││
│ │   │ HẬU KỲ:           ││
│ │   │ • 100 ảnh chỉnh   ││
│ │   └──────────────────┘│
│ ├───────────────────────┤
│ │▶ Combo Ngày Cưới      │
│ │  22 hạng mục  25.000.000│
│ └───────────────────────┤
│                         │
│ 23 / 23 gói dịch vụ    │
└─────────────────────────┘
```

**Mobile list item layout:**
```
flex items-center gap-2 px-3 py-3
├── [Expand btn] 24x24, rounded-lg
├── [flex-1 min-w-0] → service_name (13px semibold truncate)
│                     + unit badge (9px uppercase)
│                     + subtitle: "X hạng mục • Y nhóm"
└── [Price] 13px bold tabular-nums, text-right
```

**Mobile tap behavior:**
- Tap expand chevron → show/hide content
- Tap name area → `onQuote()` → opens QuoteModal
- Tap price → `onQuote()` → opens QuoteModal
- No edit/open buttons on mobile (via QuoteModal → edit link)

**Mobile GRID view:**
- `grid-cols-1 md:grid-cols-2` — single column on phone, 2 on tablet

### 6.4 Service Form Page (`/services/create` + `/services/[id]`)

**Desktop:**
```
┌─────────────────────────────────────────────────────┐
│ HEADER: "Thêm danh mục kinh doanh" [← Quay lại]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ INFO SECTION ─────────────────────────────────┐ │
│  │ Tên dịch vụ: [__________________________]      │ │
│  │ Mã dịch vụ:  [SV-20260330-____] (auto-gen)     │ │
│  │ Loại DV:     [dropdown ▼]                       │ │
│  │ Danh mục:    [dropdown ▼]   [⚙ Quản lý DM]     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ PRICE SECTION ────────────────────────────────┐ │
│  │ Giá bán: [__________]  Giá vốn: [__________]  │ │
│  │ Đơn vị: [Gói ▼]       Tồn kho: [0____]        │ │
│  │ Trạng thái: [active ▼] Loại TH: [IN_HOUSE ▼]  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ CONTENT EDITOR ───────────────────────────────┐ │
│  │ ┌── Section 1: [NGÀY CHỤP_______] ────── [🗑]  │ │
│  │ │  • [2 ekip chụp_______________] [✕]          │ │
│  │ │  • [3 địa điểm________________] [✕]          │ │
│  │ │  [+ Thêm dòng]                               │ │
│  │ └──────────────────────────────────────────────│ │
│  │ ┌── Section 2: [HẬU KỲ__________] ────── [🗑]  │ │
│  │ │  • [100 ảnh chỉnh sửa_________] [✕]          │ │
│  │ │  [+ Thêm dòng]                               │ │
│  │ └──────────────────────────────────────────────│ │
│  │ [+ Thêm Mục Mới] (dashed border button)        │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ BUNDLE SECTION (if BUNDLE type) ──────────────┐ │
│  │ [Thủ công] [Visual Builder]  ← mode toggle     │ │
│  │ 🔍 [Tìm dịch vụ để thêm vào gói...]           │ │
│  │ ┌── Item 1: Wedding Photo    SL:[1]  [🗑]      │ │
│  │ ├── Item 2: Makeup Basic     SL:[1]  [🗑]      │ │
│  │ └── Item 3: Album 30x40     SL:[2]  [🗑]      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  [🔘 Xem trước báo giá]  ← opens QuotePreview      │
│  [💾 Lưu dịch vụ]        ← primary action           │
│                                                     │
│  ┌─ QUOTE PREVIEW (sidebar / below) ──────────────┐ │
│  │ Live card preview (QuotePreview component)      │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Mobile Form:**
- Same sections, stacked vertically (single column)
- Smaller padding: `px-4` instead of `px-6`
- Category Manager: full-screen modal (via UnifiedModal `size="md"`)
- Bundle search: full-width
- Save button: sticky bottom bar or FAB
- Quote Preview: hidden on mobile (accessible via separate route)

### 6.5 Quote System (3 levels)

#### Level 1: QuoteModal (popup overlay)
- Trigger: Click "Báo giá" in list row/card
- Container: `ModalPortal` + fixed inset + backdrop blur
- Smart width: `maxWidth: 340px` (compact ≤10 items) or `400px`
- Header: primary bg + studio logo + service name + price
- Body: Scrollable sections list
- Footer: Studio contact info (hotline + address)

#### Level 2: QuoteView (full-page — `/services/[id]/quote`)
- Toolbar (sticky top): Back link + Print/PDF button + Edit link
- Card: max 520px centered, logo header + full sections + price section + contact footer
- Print CSS: Hide sidebar + bottom nav, force color-adjust
- Hides navigation: Injects `<style>` to hide sidebar/nav for clean screenshot

#### Level 3: QuotePreview (in-form live card)
- Embedded in ServiceForm page as sidebar/below content
- Auto-updates as form fields change
- Typography-driven compact card (max 400px)

### 6.6 Category Manager Modal

- **Trigger:** Settings icon (⚙) in filter bar
- **Component:** `UnifiedModal` (size="md")
- **Content:**
  - Inline form: name input + icon input + Submit/Cancel
  - List: category rows with icon + name + Edit/Delete buttons
  - Delete: confirm() dialog, blocked if category has linked services
- **On close:** Refresh categories list

---

## 7. Utility Functions Needed

### V2 sẽ cần (port hoặc tạo mới):

```typescript
// lib/utils/service.ts [NEW or merged into existing format.ts]

// Parse structured description — port from V1 format.ts
parseContentStructure(text: string | null): ContentSection[]
  - Try JSON.parse → array of {title, items[]}
  - Fallback: Parse legacy plain text (header detection)

// Slugify Vietnamese — already exists in category-actions.ts
toSlug(name: string): string

// Generate service code — port from V1 mutations
generateServiceCode(): string
  - Format: SV-YYYYMMDD-NNNN (N = random 4 digits)

// Sanitize search — port from V1 queries
sanitizeSearch(input: string): string
  - Strip SQL wildcards: %, _
  - Trim whitespace
```

---

## 8. Implementation Phases

### Phase 1a: Core Infrastructure
1. **Migration** — Bổ sung columns thiếu (`created_by`, `updated_by`, `deleted_at`, `cost_price`)
2. **Types** — `service.ts`, `service-constants.ts`, `service-form.ts`
3. **Zod Schema** — `service.schema.ts`
4. **Utility** — `parseContentStructure`, `generateServiceCode`, `sanitizeSearch`
5. **Queries** — `service-queries.ts` (5 functions)
6. **Mutations** — `service-mutations.ts` (3 functions)

### Phase 1b: List Page
7. **Page** — `page.tsx` (SSR) + `loading.tsx` + `error.tsx`
8. **List Client** — `services-list-client.tsx` (SWR + filters + view toggle)
9. **Stats Bar** — `service-stats-bar.tsx`
10. **Filters** — `service-filters.tsx` (nuqs + category chips)
11. **Table Desktop** — `service-table.tsx` (SSOT TableSuite + expandable rows)
12. **Row Mobile** — `service-row-mobile.tsx` (flex layout + expand)
13. **Card Grid** — `service-card.tsx` (content preview)
14. **Empty State** — `service-empty-state.tsx`

### Phase 1c: Form + CRUD
15. **Form Orchestrator** — `form/index.tsx`
16. **useServiceForm** — `form/hooks/useServiceForm.ts`
17. **Info Section** — `form/ServiceInfoSection.tsx`
18. **Price Section** — `form/ServicePriceSection.tsx`
19. **Content Editor** — `form/ServiceContentEditor.tsx`
20. **Category Manager** — `category-manager-modal.tsx`
21. **Create Page** — `create/page.tsx`
22. **Edit Page** — `[id]/page.tsx`

### Phase 1d: Quote System
23. **Quote Modal** — `quote/quote-modal.tsx`
24. **Quote View** — `quote/quote-view.tsx` + route `/services/[id]/quote`
25. **Quote Preview** — `quote/quote-preview.tsx`

### Phase 2: Bundle & Advanced (sau Phase 1 hoàn thành)
26. **Bundle Section** — `form/ServiceBundleSection.tsx`
27. **Builder Mode** — Visual drag-drop `builder-mode.tsx`
28. **Bundle Canvas** — `bundle-canvas.tsx`
29. **Component Selector** — `component-selector.tsx`
30. **Smart Suggestions** — `smart-suggestions.tsx`
31. **Rule Manager** — `rule-manager.tsx`
32. **Quote Modern View** — `quote-modern-view.tsx`

---

## 9. Routing

| Route | Chức năng | Render | Auth |
|-------|-----------|--------|------|
| `/services` | Danh sách dịch vụ (list + grid) | SSR → Client | ✅ Protected |
| `/services/create` | Tạo dịch vụ mới | SSR → Client | ✅ Protected |
| `/services/[id]` | Sửa dịch vụ (load pre-fetched data) | SSR → Client | ✅ Protected |
| `/services/[id]/quote` | Full-page printable quote | SSR → Client | ✅ Protected |

---

## 10. V1 → V2 Migration Map (chi tiết)

### Sự khác biệt chính:

| Aspect | V1 | V2 |
|--------|----|----|
| Auth | `requireAdmin()` / `withAdmin()` | `withAuth()` (role-aware) |
| Validation | Manual `validateServiceData()` | Zod `safeParse()` |
| Audit | `logError()` only | `fireAuditLog()` mandatory |
| Delete | Hard delete | Soft delete (`deleted_at`) |
| Status | Tiếng Việt "Kinh doanh" | English "active" |
| Price field | `import_price` | `cost_price` |
| Cache | React Query `queryClient` | SWR `mutate()` |
| Filters | `useSearchParams` manual | `nuqs` URL state |
| Table UI | Inline `<table>` + custom styles | SSOT TableSuite |
| Form | God component (536 lines!) | Split: orchestrator + sections + hook |
| Search | Separate component, icon toggle mobile | Merged into filters, nuqs |
| Data fetch | V1: client-side SWR via RQ | V2: SSR page.tsx + SWR refresh |

### File mapping (V1 → V2):

| V1 File | Lines | V2 Mapping |
|---------|-------|------------|
| `ServicesClient.tsx` | 130 | → ❌ Removed — Logic moves to SSR `page.tsx` |
| `ServiceManagement.tsx` | 409 | → `services-list-client.tsx` + `service-stats-bar.tsx` + `service-filters.tsx` |
| `ServiceSearch.tsx` | 86 | → ❌ Removed — Merged into `service-filters.tsx` |
| `ServiceRow.tsx` | 214 | → `service-table.tsx` (desktop, SSOT TR/TD) + `service-row-mobile.tsx` (mobile) |
| `ServiceCard.tsx` | 145 | → `service-card.tsx` |
| `ServiceForm.tsx` | 536 | → `form/index.tsx` + `ServiceInfoSection.tsx` + `ServicePriceSection.tsx` + `useServiceForm.ts` |
| `ServiceContentEditor.tsx` | 224 | → `form/ServiceContentEditor.tsx` |
| `ServiceBundleSection.tsx` | 241 | → `form/ServiceBundleSection.tsx` (Phase 2) |
| `CategoryManager.tsx` | 163 | → `category-manager-modal.tsx` |
| `QuoteModal.tsx` | 202 | → `quote/quote-modal.tsx` |
| `QuoteView.tsx` | 218 | → `quote/quote-view.tsx` |
| `QuotePreview.tsx` | 127 | → `quote/quote-preview.tsx` |

### Builder components (V1 → Phase 2):

| V1 File | Size | V2 Mapping |
|---------|------|------------|
| `BuilderMode.tsx` | 9.4KB | → `builder/builder-mode.tsx` |
| `BundleCanvas.tsx` | 6.3KB | → `builder/bundle-canvas.tsx` |
| `ComponentSelector.tsx` | 5.9KB | → `builder/component-selector.tsx` |
| `SmartSuggestions.tsx` | 5.4KB | → `builder/smart-suggestions.tsx` |
| `RuleManager.tsx` | 15.2KB | → `builder/rule-manager.tsx` |
| `QuoteModernView.tsx` | 8.7KB | → `quote/quote-modern-view.tsx` |

---

## 11. Compliance Checklist (Gold Standard)

### Architecture
- [ ] Actions split: `service-queries.ts` + `service-mutations.ts`
- [ ] No cross-module functions in action files
- [ ] All actions use `withAuth()` wrapper
- [ ] Zod validation via `safeParse()` ở đầu mutation
- [ ] Audit Logs via `fireAuditLog()` cho mọi mutation
- [ ] Optimistic Locking (check `updated_at`) cho Update
- [ ] `revalidatePath()` gọi sau mutations
- [ ] `created_by` / `updated_by` FK → `auth.users(id)`

### Types
- [ ] Types centralized in `types/service.ts`
- [ ] Constants/labels in `types/service-constants.ts`
- [ ] Form types in `types/service-form.ts`
- [ ] Zod Schema tại `lib/validations/service.schema.ts`
- [ ] Không dùng `any` — dùng proper types hoặc `Record<string, unknown>`

### Components
- [ ] No file > 300 lines (split nếu cần)
- [ ] Form dùng composition hook `useServiceForm()`
- [ ] CSS classes từ SSOT (`design-system.css`) — KHÔNG hardcode hex
- [ ] Table dùng SSOT TableSuite (`components/ui/table.tsx`)
- [ ] `error.tsx` + `loading.tsx`
- [ ] Mobile và Desktop layouts TÁCH BẠCH:
  - [ ] Mobile: `block lg:hidden` — compact, touch-friendly
  - [ ] Desktop: `hidden lg:block` — full table, hover effects
- [ ] Currency via `formatCurrency()` + `CURRENCY_SYMBOL`
- [ ] Modals: `UnifiedModal` hoặc `ModalPortal`

### Database
- [ ] Soft delete: `deleted_at` column + `.is("deleted_at", null)` trên mọi query
- [ ] Audit columns: `created_by`, `updated_by`, `created_at`, `updated_at`

### Performance
- [ ] SWR cho client-side data (KHÔNG React Query)
- [ ] Pagination server-side cho lists > 50 items
- [ ] `React.memo` cho ServiceRow/ServiceCard
- [ ] Dynamic import cho modals (`CategoryManager`, `QuoteModal`, `RuleManager`)
- [ ] `parseContentStructure()` chạy bên ngoài render (useMemo)
- [ ] Category list cached (React `cache()`)

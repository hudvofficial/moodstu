# Spec: Printing & Labs Module

Status update: **FINAL v5.2** - 2026-04-28 audit fixes applied and migration pushed.

## 2026-04-28 Ownership And Integrity Rules

- Access: all `/printing` pages and printing/lab server actions require the `printing` module permission.
- Contracts may initiate print orders only through printing-gated actions. Contract detail can display existing print order data through its contract read model.
- Printing owns print order lifecycle, lab selection, order items, and status transitions.
- Finance owns the accounting records created from printing costs. Printing mutations must sync expenses through atomic RPCs, not best-effort app-side inserts.
- Lab payments must allocate to concrete printing orders through `lab_payment_allocations`. A payment can partially close debt, but only orders with fully allocated cost move to `da_thanh_toan`.
- `da_nhan` means the studio has received the printed product from the lab. `received_date` is set on this transition. `delivered_date` remains reserved for a future customer-delivery workflow.

### Integrity Queries

Automated verification command:

```powershell
npm run verify:printing
```

Use these after finance/printing incidents or before release scoring:

```sql
-- Active print orders with cost but no active linked expense.
SELECT po.id, po.order_code, po.total_amount
FROM public.printing_orders po
LEFT JOIN public.expenses e
  ON e.printing_order_id = po.id
 AND e.deleted_at IS NULL
WHERE po.deleted_at IS NULL
  AND COALESCE(po.status, '') <> 'da_huy'
  AND COALESCE(po.total_amount, 0) > 0
  AND e.id IS NULL;

-- Deleted/cancelled print orders that still have active linked expenses.
SELECT po.id, po.order_code, e.id AS expense_id, e.amount
FROM public.printing_orders po
JOIN public.expenses e
  ON e.printing_order_id = po.id
 AND e.deleted_at IS NULL
WHERE po.deleted_at IS NOT NULL
   OR COALESCE(po.status, '') = 'da_huy';

-- Paid lab orders whose allocation does not cover the order cost.
SELECT po.id, po.order_code, po.total_amount, COALESCE(SUM(lpa.amount), 0) AS allocated
FROM public.printing_orders po
LEFT JOIN public.lab_payment_allocations lpa ON lpa.printing_order_id = po.id
WHERE po.deleted_at IS NULL
  AND po.payment_status = 'da_thanh_toan'
GROUP BY po.id, po.order_code, po.total_amount
HAVING COALESCE(SUM(lpa.amount), 0) + 0.01 < COALESCE(po.total_amount, 0);
```

Status: ✅ **FINAL v5.1** — all gaps closed, approved for implementation

---

## 1. Module Breakdown

### 1A. Sub-modules

| Sub-module          | Mô tả                                                 | Ưu tiên      |
| ------------------- | ----------------------------------------------------- | ------------ |
| **Printing Orders** | Quản lý đơn đặt in (list, filter, stats, CRUD)        | P0 — Core    |
| **Lab Management**  | CRUD xưởng in (tên, liên hệ, bảng giá)                | P0 — Core    |
| **Lab Debts**       | Tổng hợp công nợ lab (unpaid orders → debt dashboard) | P1 — Phase 2 |
| **Lab Payments**    | Thanh toán công nợ lab (quick pay → auto expense)     | P1 — Phase 2 |

### 1B. Nghiệp vụ (Business Flow)

```
Hợp đồng (Contract) → Tạo đơn in (Printing Order) → Chọn Lab
    → Gửi lab thực hiện → Lab giao hàng về → Giao cho khách
    → Auto tạo chi phí (Expense) khi có amount > 0
    → Tổng hợp đơn chưa TT = Công nợ Lab
```

---

## 2. Database Schema

### Trạng thái: Tables ĐÃ TỒN TẠI, cần MIGRATION NHỎ

> [!WARNING]
> DB hiện **KHÔNG có** `deleted_at` và `updated_by` trên `printing_orders` lẫn `labs`.
> **Cần migration nhỏ** (ALTER TABLE ADD COLUMN) — xem §2E.
> DB hiện **KHÔNG có data** (0 rows) → không rủi ro data migration.

### 2A. `printing_orders` (verified từ `database.types.ts`)

| Column                     | Type                 | Ghi chú                                              |
| -------------------------- | -------------------- | ---------------------------------------------------- |
| `id`                       | uuid PK              |                                                      |
| `order_code`               | text                 | Auto-gen: `IN-{base36}`                              |
| `contract_id`              | uuid FK → contracts  |                                                      |
| `lab_id`                   | uuid FK → labs       | Nullable (chưa chọn lab)                             |
| `status`                   | text                 | `cho_xu_ly`, `dang_in`, `da_in`, `da_nhan`, `da_huy` |
| `payment_status`           | text                 | `chua_thanh_toan` / `da_thanh_toan`                  |
| `total_amount`             | numeric              | Tính từ items                                        |
| `order_date`               | timestamptz          | Ngày tạo đơn                                         |
| `expected_date`            | timestamptz          | Ngày dự kiến nhận                                    |
| `received_date`            | timestamptz          | Set khi status → `da_nhan`                           |
| `delivered_date`           | timestamptz          | Reserve cho V2                                       |
| `items`                    | jsonb                | `[{name, size, quantity, unitPrice}]`                |
| `notes`                    | text                 |                                                      |
| `created_by`               | uuid FK → auth.users |                                                      |
| `created_at`, `updated_at` | timestamptz          |                                                      |
| ~~`deleted_at`~~           | ❌ CHƯA CÓ           | Cần migration                                        |
| ~~`updated_by`~~           | ❌ CHƯA CÓ           | Cần migration                                        |

### 2B. `labs` (existing)

| Column           | Type       | Ghi chú                                     |
| ---------------- | ---------- | ------------------------------------------- |
| `id`             | uuid PK    |                                             |
| `lab_name`       | text       | ⚠️ Column tên `lab_name`, KHÔNG phải `name` |
| `contact_person` | text       |                                             |
| `phone`          | text       |                                             |
| `address`        | text       |                                             |
| `status`         | text       | `active`/`inactive`                         |
| ~~`deleted_at`~~ | ❌ CHƯA CÓ | Cần migration                               |
| ~~`updated_by`~~ | ❌ CHƯA CÓ | Cần migration                               |

### 2C. `lab_services` (existing — giữ nguyên)

| Column       | Type           |
| ------------ | -------------- |
| `id`         | uuid PK        |
| `lab_id`     | uuid FK → labs |
| `item_name`  | text           |
| `cost_price` | numeric        |

### 2D. `lab_payments` (existing — giữ nguyên)

| Column           | Type           |
| ---------------- | -------------- |
| `id`             | uuid PK        |
| `lab_id`         | uuid FK → labs |
| `amount`         | numeric        |
| `payment_method` | text           |
| `note`           | text           |
| `created_by`     | uuid           |

### 2E. Migration (Phase 0 — chạy trước khi code)

```sql
-- printing_orders: thêm soft delete + audit
ALTER TABLE printing_orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE printing_orders ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- labs: thêm soft delete + audit
ALTER TABLE labs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
```

**Delivery:** Chạy qua **Supabase Dashboard → SQL Editor**.
Save vào `docs/migrations/printing-v1.sql` để lưu trữ.

---

## 3. API Contracts (Server Actions)

### Return Type Convention (LOCKED)

> [!IMPORTANT]
> **Tất cả** functions trong `app/actions/` sử dụng `withAuth()` và trả `ActionResult<T>`.
>
> **Nguồn `ActionResult` (LOCKED):** `auth_utils.ts` định nghĩa type này **cục bộ, KHÔNG export**.
> Repo pattern hiện tại (`customer-actions.ts` L12, `lead-actions.ts` L12) = **duplicate local type** trong mỗi action file.
>
> **Implementer PHẢI** paste đoạn sau vào đầu mỗi file action mới:
>
> ```typescript
> type ActionResult<T = null> =
>   | { success: true; data: T }
>   | { success: false; error: string };
> ```
>
> `withAuth<T>()` trả `Promise<ActionResult<T>>` — callback chỉ cần return raw data,
> `withAuth` tự wrap thành `{ success: true, data }` hoặc `{ success: false, error }`.
>
> **Callers LUÔN check** `result.success` trước khi dùng `result.data`.
> Pattern này áp dụng cho CẢ queries LẪN mutations — không có ngoại lệ.
> **KHÔNG sửa `auth_utils.ts`** để export type — giữ nguyên pattern duplicate local.

### 3A. Existing Actions (DEPRECATED — xem §8 Bridge)

| File hiện tại         | Functions                                                                                    | Vấn đề                           |
| --------------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| `printing-actions.ts` | `getLabs`, `createPrintingOrder`, `updatePrintOrderStatus`, `updateReservationStatus`        | Mixed domain, thiếu Zod          |
| `lab-actions.ts`      | `addLab`, `updateLab`, `deleteLab`, `updateLabStatus`, lab services CRUD, `recordLabPayment` | Hard delete, validation thủ công |
| `lab-sync-actions.ts` | `getLabDebts`, `autoCreatePrintingOrder`, `syncAlbumStatus`                                  | Trộn query + mutation            |

### 3B. New Actions — Exact Signatures

#### `printing-queries.ts` [NEW]

```typescript
"use server";
import { withAuth } from "@/lib/auth_utils";

export async function fetchPrintingOrders(filters: PrintingFilters): Promise<
  ActionResult<{
    orders: PrintingOrderRow[];
    total: number;
    page: number;
    pageSize: number;
  }>
>;
// return withAuth(async (supabase, userId) => { ... })
// SELECT: printing_orders.*, labs(id, name:lab_name), contracts(contract_code, customers(full_name))
// .is("deleted_at", null)
// Filters: status, lab_id, payment_status, date range, search (order_code)
// Pagination: .range(from, to), { count: "estimated" }

export async function getPrintingOrderStats(): Promise<
  ActionResult<PrintingStats>
>;
// return withAuth(async (supabase) => { ... })
// PrintingStats = { total, choXuLy, dangIn, daIn, daNhan, totalCost, unpaidCost }

export async function getPrintingOrderDetail(
  id: string,
): Promise<ActionResult<PrintingOrderDetail>>;
// return withAuth(async (supabase) => { ... })
// Full order + labs + contract info

export async function getContractOptions(
  search?: string,
): Promise<
  ActionResult<{ id: string; contract_code: string; customer_name: string }[]>
>;
// return withAuth(async (supabase) => { ... })
// For standalone form — search by contract_code or customer full_name
// .ilike("contract_code", `%${search}%`)

export async function getLabDebts(options?: {
  fromDate?: string;
  limit?: number;
}): Promise<ActionResult<LabDebtData>>;
// Moved from lab-sync-actions.ts
```

#### `printing-mutations.ts` [NEW]

```typescript
"use server";
import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

export async function createPrintingOrder(
  rawData: unknown,
): Promise<ActionResult<{ orderCode: string }>>;
// Zod safeParse → insert → auto-expense pipeline → fireAuditLog
// revalidatePath("/printing")

export async function updatePrintingOrder(
  id: string,
  rawData: unknown,
  expectedUpdatedAt?: string,
): Promise<ActionResult<null>>;
// Zod safeParse → optimistic lock check → update → fireAuditLog
// revalidatePath("/printing")

export async function updatePrintingOrderStatus(
  id: string,
  newStatus: string,
  contractId: string,
): Promise<ActionResult<null>>;
// Validate VALID_TRANSITIONS → update status → set received_date if da_nhan → fireAuditLog
// revalidatePath("/printing")

export async function deletePrintingOrder(
  id: string,
): Promise<ActionResult<null>>;
// Soft delete: .update({ deleted_at: new Date().toISOString() }) → fireAuditLog
// revalidatePath("/printing")
```

#### `lab-queries.ts` [NEW]

```typescript
"use server";
import { withAuth } from "@/lib/auth_utils";

export async function fetchLabsList(): Promise<ActionResult<Lab[]>>;
// All labs with status, service count. .is("deleted_at", null)

export async function getLabDetail(
  id: string,
): Promise<ActionResult<LabDetail>>;
// Lab + services + payment history

export async function getLabOptions(): Promise<
  ActionResult<{ id: string; lab_name: string }[]>
>;
// Active labs only — for SelectForm dropdown
```

#### `lab-mutations.ts` [NEW]

```typescript
"use server";
import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

export async function createLab(rawData: unknown): Promise<ActionResult<Lab>>;
export async function updateLab(
  id: string,
  rawData: unknown,
): Promise<ActionResult<null>>;
export async function deleteLab(id: string): Promise<ActionResult<null>>; // Soft delete
export async function toggleLabStatus(
  id: string,
  status: "active" | "inactive",
): Promise<ActionResult<null>>;

// Lab Services
export async function createLabService(
  rawData: unknown,
): Promise<ActionResult<null>>;
export async function updateLabService(
  id: string,
  rawData: unknown,
): Promise<ActionResult<null>>;
export async function deleteLabService(id: string): Promise<ActionResult<null>>;

// Lab Payments
export async function recordLabPayment(
  rawData: unknown,
): Promise<ActionResult<null>>;

// All mutations: revalidatePath("/printing"), revalidatePath("/printing/labs")
```

### 3C. Revalidation Map (LOCKED — includes V1 cross-module paths)

> [!IMPORTANT]
> V1 actions revalidate `/contracts`, `/contracts/{contractId}`, `/finance` — new actions MUST preserve these.

| Mutation                    | `revalidatePath`                                                          |
| --------------------------- | ------------------------------------------------------------------------- |
| `createPrintingOrder`       | `"/printing"`, `"/contracts"`, `"/contracts/${contractId}"`, `"/finance"` |
| `updatePrintingOrder`       | `"/printing"`                                                             |
| `updatePrintingOrderStatus` | `"/printing"`, `"/contracts/${contractId}"`                               |
| `deletePrintingOrder`       | `"/printing"`, `"/contracts/${contractId}"`                               |
| `createLab`                 | `"/printing/labs"`, `"/printing"`                                         |
| `updateLab`                 | `"/printing/labs"`, `"/printing"`                                         |
| `deleteLab`                 | `"/printing/labs"`, `"/printing"`                                         |
| `toggleLabStatus`           | `"/printing/labs"`, `"/printing"`                                         |
| `createLabService`          | `"/printing/labs"`                                                        |
| `updateLabService`          | `"/printing/labs"`                                                        |
| `deleteLabService`          | `"/printing/labs"`                                                        |
| `recordLabPayment`          | `"/printing/labs"`, `"/printing"`, `"/finance"`                           |

### 3D. Cache Keys (append to `lib/swr.ts`)

```typescript
// Add to cacheKeys object in lib/swr.ts (append-only, do NOT modify existing keys)
printingOrders: () => "printing-orders",
printingStats: () => "printing-stats",
printingDetail: (id: string) => `printing:${id}`,
labs: () => "labs",
labDetail: (id: string) => `lab:${id}`,
labDebts: () => "lab-debts",
```

---

## 4. Data Flow

```
┌──────────────────────────────────────────────────┐
│ /printing (List Page)                            │
│  SSR: fetchPrintingOrders + getPrintingOrderStats│
│  ↓ props                                         │
│  PrintingListPage (Client - SWR refresh)         │
│  ├── PrintingStatsBar                            │
│  ├── PrintingFilters (TabsFilter + SelectPill)   │
│  ├── PrintingTable (desktop) / PrintingCard (mob)│
│  └── Pagination                                  │
│  ↓ user click "Tạo đơn"                         │
│  PrintingFormModal (UnifiedModal)                │
│  ├── SelectForm (chọn Lab — getLabOptions)       │
│  ├── SelectForm (chọn Contract — getContractOptions) │
│  ├── Items editor (dynamic rows)                 │
│  └── Submit → createPrintingOrder()              │
│       ↓ server                                   │
│       Insert printing_orders                     │
│       Auto-create expense (if amount > 0)        │
│       fireAuditLog → revalidatePath              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ /printing/labs (Lab Management)                  │
│  SSR: fetchLabsList                              │
│  ↓ props                                         │
│  LabListPage (Client)                            │
│  ├── Lab cards/table                             │
│  ├── Lab services inline                         │
│  └── Debt summary per lab                        │
│  ↓ user CRUD                                    │
│  LabFormModal → createLab/updateLab              │
└──────────────────────────────────────────────────┘
```

---

## 5. Status Transitions (FSM) — LOCKED

> Source of truth: [status-select.tsx L23-29](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/ui/status-select.tsx#L23-L29)

### Printing Order Status (5 trạng thái V1)

```
cho_xu_ly ──→ dang_in ──→ da_in ──→ da_nhan
    │           │          │
    └───────────┴──────────┴──→ da_huy
```

| From        | To        | Trigger        | Side-effect                              |
| ----------- | --------- | -------------- | ---------------------------------------- |
| `cho_xu_ly` | `dang_in` | Gửi lab in     | —                                        |
| `dang_in`   | `da_in`   | Lab hoàn thành | —                                        |
| `da_in`     | `da_nhan` | Nhận hàng về   | Set `received_date = now()` (idempotent) |
| `*`         | `da_huy`  | Hủy đơn        | —                                        |

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  cho_xu_ly: ["dang_in", "da_huy"],
  dang_in: ["da_in", "da_huy"],
  da_in: ["da_nhan", "da_huy"],
  da_nhan: [], // terminal
  da_huy: [], // terminal
};
```

### Payment Status

| Value             | Mô tả                    |
| ----------------- | ------------------------ |
| `chua_thanh_toan` | Default khi tạo          |
| `da_thanh_toan`   | Sau khi recordLabPayment |

---

## 6. Edge Cases

| #   | Case                      | Xử lý                                                          |
| --- | ------------------------- | -------------------------------------------------------------- |
| 1   | Tạo đơn in không chọn Lab | Cho phép — `lab_id = null`, status `cho_xu_ly`                 |
| 2   | Xóa Lab đang có đơn in    | Không cho xóa (check FK) — chỉ deactivate                      |
| 3   | Update status invalid     | Check `VALID_TRANSITIONS` → return error                       |
| 4   | Duplicate `received_date` | Idempotent: `if (!current.received_date)` mới set              |
| 5   | Đơn in amount = 0         | Không tạo auto-expense                                         |
| 6   | Contract đã hủy           | Vẫn hiển thị đơn in (historical data)                          |
| 7   | Lab bị deactivate         | Đơn in existing giữ nguyên, không cho tạo mới với lab inactive |

---

## 7. Acceptance Criteria

### P0 — Core (Phase 1)

- [ ] `/printing` hiển thị danh sách đơn in, StatsBar (tổng, chờ xử lý, đang in, đã in, đã nhận)
- [ ] Filter: Tabs status + SelectPill lab + search order_code
- [ ] CRUD đơn in (Modal): chọn Lab, chọn Contract, items, ngày dự kiến
- [ ] Status transition inline (table row) via `SelectStatus`
- [ ] Desktop table + Mobile cards
- [ ] `/printing/labs`: CRUD Lab, xem bảng giá
- [ ] Pagination + Empty states (no data + no filter match)
- [ ] Loading skeleton + Error boundary

### P1 — Debt Dashboard (Phase 2)

- [ ] Tab "Công nợ" hiển thị tổng nợ theo lab
- [ ] Quick Pay → tạo lab_payment + revalidate

---

## 8. File Structure & Authority

### 8A. Files to CREATE (authoritative list — ONLY these files)

```
app/(protected)/printing/
├── page.tsx                    [NEW] SSR wrapper
├── loading.tsx                 [NEW] Skeleton
├── error.tsx                   [NEW] Error boundary
└── labs/
    ├── page.tsx                [NEW]
    ├── loading.tsx             [NEW]
    └── error.tsx               [NEW]

app/actions/
├── printing-queries.ts         [NEW]
├── printing-mutations.ts       [NEW]
├── lab-queries.ts              [NEW]
└── lab-mutations.ts            [NEW]

components/printing/
├── printing-list-page.tsx      [NEW]
├── printing-stats-bar.tsx      [NEW]
├── printing-filters.tsx        [NEW]
├── printing-table.tsx          [NEW]
├── printing-card.tsx           [NEW]
├── printing-form-modal.tsx     [NEW]
└── labs/
    ├── lab-list-page.tsx       [NEW]
    ├── lab-table.tsx           [NEW]
    ├── lab-form-modal.tsx      [NEW]
    └── lab-services-editor.tsx [NEW]

types/
├── printing.ts                 [NEW]
└── printing-constants.ts       [NEW]

lib/validations/
├── printing.schema.ts          [NEW] Zod
└── lab.schema.ts               [NEW] Zod

hooks/
└── usePrintingFilters.ts       [NEW]

docs/migrations/
└── printing-v1.sql             [NEW]
```

### 8B. Files to MODIFY (exhaustive list — NO other files)

| File                                   | Change                                                 | Scope               |
| -------------------------------------- | ------------------------------------------------------ | ------------------- |
| `lib/swr.ts`                           | Append 6 cache keys (§3D)                              | Append-only         |
| `app/actions/printing-actions.ts`      | Convert to bridge re-exports (§8D)                     | Phase 5             |
| `app/actions/contract-queries.ts` L282 | Fix alias `labs(id, name)` → `labs(id, name:lab_name)` | 1-line fix, Phase 5 |

### 8C. Files to KEEP (KHÔNG thay đổi — zero modifications)

| File                                                  | Consumer           | Note                                 |
| ----------------------------------------------------- | ------------------ | ------------------------------------ |
| `components/contracts/detail/print-orders-block.tsx`  | Contract Detail    | Imports from `printing-actions.ts`   |
| `components/contracts/detail/printing-order-form.tsx` | Contract Detail    | Imports from `printing-actions.ts`   |
| `components/contracts/detail/costumes-block.tsx`      | Contract Detail    | Imports `updateReservationStatus`    |
| `components/ui/status-select.tsx`                     | Print Orders Block | Exports `PRINT_ORDER_STATUS_OPTIONS` |

### 8D. Bridge Strategy — LOCKED (no alternatives)

> [!IMPORTANT]
> `printing-actions.ts` becomes a **re-export bridge** in Phase 5:
>
> ```typescript
> "use server";
> // printing-actions.ts — BRIDGE FILE
> // Re-export new implementations for KEEP file consumers
> export { updatePrintingOrderStatus as updatePrintOrderStatus } from "./printing-mutations";
> export { createPrintingOrder } from "./printing-mutations";
> export { getLabOptions as getLabs } from "./lab-queries";
>
> // updateReservationStatus — STAYS HERE UNCHANGED.
> // This function belongs to dress domain, OUT OF SCOPE for printing module.
> // Original function code remains inline. Do NOT move, do NOT re-export from elsewhere.
> export async function updateReservationStatus(
>   reservationId: string,
>   newStatus: string,
>   contractId: string,
> ) {
>   /* original code stays here verbatim */
> }
> ```
>
> **Callers (exhaustive):**
>
> | Caller                       | Import                           | Handled by                                         |
> | ---------------------------- | -------------------------------- | -------------------------------------------------- |
> | `print-orders-block.tsx` L5  | `updatePrintOrderStatus`         | Re-export from `printing-mutations`                |
> | `printing-order-form.tsx` L6 | `createPrintingOrder`, `getLabs` | Re-export from `printing-mutations`, `lab-queries` |
> | `costumes-block.tsx` L6      | `updateReservationStatus`        | Stays inline — unchanged                           |

### 8E. Labs Field Alias — LOCKED BUG FIX

> [!CAUTION]
> **BUG:** `contract-queries.ts` L282: `labs(id, name)` → Supabase error: `column labs_1.name does not exist`.
> DB column = `lab_name`.
>
> **Fix (Phase 5):** Change to `labs(id, name:lab_name)`.
> **New queries** MUST use `labs(id, name:lab_name)` — output `{ id, name }`.

---

## 9. Shared Components / Hooks / Tokens (READ-ONLY)

### Components (from REGISTRY.md)

| Component                           | Dùng ở                                          |
| ----------------------------------- | ----------------------------------------------- |
| `StatsBar`                          | `printing-stats-bar.tsx`                        |
| `TabsFilter`                        | `printing-filters.tsx`                          |
| `SelectPill`                        | `printing-filters.tsx`                          |
| `TableWrapper/THead/TBody/TH/TD/TR` | `printing-table.tsx`, `lab-table.tsx`           |
| `Badge` + `getStatusVariant()`      | Status display                                  |
| `SelectStatus`                      | Inline status change                            |
| `SelectForm`                        | Form modal dropdowns                            |
| `UnifiedModal`                      | `printing-form-modal.tsx`, `lab-form-modal.tsx` |
| `CurrencyInput`                     | Unit price                                      |
| `DatePicker`                        | Expected date                                   |
| `FAB`                               | Mobile "Tạo đơn"                                |
| `Pagination`                        | List pagination                                 |
| `EmptyState`                        | No data + No filter match                       |
| `Skeleton`                          | `loading.tsx`                                   |
| `ConfirmDialog`                     | Xóa đơn / xóa lab                               |
| `Breadcrumb`                        | Labs sub-page                                   |

### CSS Tokens

| Token                            | Dùng ở                   |
| -------------------------------- | ------------------------ |
| `.main-container`                | Page wrapper             |
| `.card-base`                     | Lab card, stats          |
| `.card-interactive`              | Clickable cards (mobile) |
| `.input-base`                    | Form inputs              |
| `.label-base`                    | Form labels              |
| `.form-grid-2col`                | Form layout              |
| `.form-actions`                  | Modal footer             |
| `.btn .btn-primary/.btn-outline` | Buttons                  |
| `.badge .badge-*`                | Status badges            |
| `.section-heading`               | Section titles           |

### Hooks (exact file paths in `hooks/`)

| Hook             | File                | Dùng ở                        |
| ---------------- | ------------------- | ----------------------------- |
| `useIsMobile()`  | `use-mobile.ts`     | Responsive table/cards        |
| `useDebounce`    | `use-debounce.ts`   | Search delay                  |
| `useListFilters` | `useListFilters.ts` | Base for `usePrintingFilters` |
| `useEscape`      | `useEscape.ts`      | Close modals                  |

> Repo dùng hỗn hợp kebab-case và camelCase. Import theo tên file thực tế.

---

## 10. Implementation Order — LOCKED

```
Phase 0: Migration
  → Run SQL via Supabase Dashboard (§2E)
  → Save to docs/migrations/printing-v1.sql

Phase 1: Types + Validation
  → types/printing.ts
  → types/printing-constants.ts
  → lib/validations/printing.schema.ts
  → lib/validations/lab.schema.ts

Phase 2: Actions (queries + mutations)
  → app/actions/printing-queries.ts
  → app/actions/printing-mutations.ts
  → app/actions/lab-queries.ts
  → app/actions/lab-mutations.ts
  → lib/swr.ts (append cache keys)

Phase 3: UI — Routes + Components
  → app/(protected)/printing/page.tsx, loading.tsx, error.tsx
  → app/(protected)/printing/labs/page.tsx, loading.tsx, error.tsx
  → components/printing/*.tsx
  → hooks/usePrintingFilters.ts

Phase 4: Bridge + Alias Fix
  → app/actions/printing-actions.ts → re-export bridge
  → app/actions/contract-queries.ts L282 → name:lab_name

Phase 5: Verification (§12)
```

> [!CAUTION]
> **KHÔNG** thay đổi thứ tự. Mỗi phase phụ thuộc phase trước.
> Phase 4 (bridge) PHẢI chạy SAU Phase 2+3 hoàn tất — vì bridge re-exports từ new files.

---

## 11. Non-Goals (LOCKED — explicitly excluded from V1)

| Item                     | Lý do                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `da_giao` status         | Reserve cho V2. Không có UI consumer                                                     |
| `delivered_date` display | Reserve cho V2. Column exists nhưng không dùng                                           |
| Modify KEEP files        | `print-orders-block.tsx`, `printing-order-form.tsx`, `costumes-block.tsx` — zero changes |
| Modify shared components | `components/ui/*` — READ-ONLY                                                            |
| New CSS tokens           | Dùng existing SSOT tokens only                                                           |
| `dress-mutations.ts`     | `updateReservationStatus` stays inline in bridge                                         |
| Auto-test suite          | Manual verification + build check + grep compliance                                      |

---

## 12. Verification Plan — LOCKED

### Step 1: Build Check

```bash
npm run build   # MUST pass 0 errors
```

### Step 2: SSOT Grep Compliance

```bash
# All must return 0 results:
grep -rn "#[0-9a-fA-F]\{6\}" components/printing/
grep -rn "border-border" components/printing/
grep -rn "<select" components/printing/
grep -rn "<th \|<td \|<tbody\|<thead" components/printing/
grep -rn "style={{" components/printing/
grep -rn "any" components/printing/ types/printing*
```

### Step 3: Bridge Integrity

```bash
# KEEP files must still import successfully:
grep -n "from.*printing-actions" components/contracts/detail/print-orders-block.tsx
grep -n "from.*printing-actions" components/contracts/detail/printing-order-form.tsx
grep -n "from.*printing-actions" components/contracts/detail/costumes-block.tsx
# All 3 must return results (imports still exist)
```

### Step 4: Contract Alias Fix Verification

```bash
grep -n "labs.*name" app/actions/contract-queries.ts
# Must show: labs (id, name:lab_name)  — NOT labs (id, name)
```

### Step 5: Visual Verification (Browser)

- [ ] Open `/printing` → list + stats + filters visible
- [ ] Create order → modal with Lab + Contract dropdowns
- [ ] Status change inline → toast + UI update
- [ ] Mobile (375px) → cards instead of table
- [ ] Open `/printing/labs` → lab list visible
- [ ] Open existing contract detail → print-orders-block still works (backward-compat)

### Step 6: Cache Key Verification

```bash
grep -n "printingOrders\|printingStats\|printingDetail\|labs\(\)\|labDetail\|labDebts" lib/swr.ts
# Must show all 6 new keys
```

---

## 13. Execution Rules (Constraints)

### 13A. File Authority

| Rule                            | Description                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| **Only §8A files are created**  | No files outside the list                                                               |
| **Only §8B files are modified** | `swr.ts` (append), `printing-actions.ts` (bridge), `contract-queries.ts` (1-line alias) |
| **§8C files are untouched**     | Zero modifications to KEEP files                                                        |

### 13B. API Contract

| Rule                                     | Description                                                |
| ---------------------------------------- | ---------------------------------------------------------- |
| **All actions return `ActionResult<T>`** | Via `withAuth()`. No raw returns, no custom wrappers       |
| **Preserve auto-expense pipeline**       | `createPrintingOrder` must keep auto-expense logic from V1 |
| **Bridge preserves signatures**          | V1 callers continue working without code changes           |

### 13C. FSM Rules

| Rule                              | Description                                                |
| --------------------------------- | ---------------------------------------------------------- |
| **5 status LOCKED**               | `cho_xu_ly → dang_in → da_in → da_nhan → da_huy`           |
| **Transitions synchronous**       | `updatePrintingOrderStatus()` → validate → update → return |
| **Side-effects after transition** | `received_date` set only AFTER `da_nhan` succeeds          |
| **Idempotent**                    | Double-call `da_nhan` → `received_date` not overwritten    |
| **Invalid → reject**              | `VALID_TRANSITIONS[current].includes(new)` or error        |

### 13D. Shared Layer

| Rule                                                        | Description                                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Existing shared files = READ-ONLY**                       | KHÔNG sửa nội dung file đã tồn tại trong `components/ui/*`, `hooks/*`, `lib/*`                                               |
| **NEW files trong `hooks/`, `lib/validations/` = ĐƯỢC TẠO** | `usePrintingFilters.ts`, `printing.schema.ts`, `lab.schema.ts` đã khai báo trong §8A — tạo file mới OK, sửa file cũ KHÔNG OK |
| **Exception: `lib/swr.ts`**                                 | Append 6 cache keys (§3D) — append-only, KHÔNG sửa existing keys                                                             |
| **No new CSS tokens**                                       | Use existing SSOT tokens from REGISTRY.md                                                                                    |

### 13E. Architecture

| Decision                | Rule                                            |
| ----------------------- | ----------------------------------------------- |
| **Types: STRICT**       | No `any`, no `as unknown`, no implicit inferred |
| **UI: SSOT Visual**     | Use tokens/components from REGISTRY.md          |
| **Pattern: Clone-only** | Clone from Contracts/Employees. No new patterns |

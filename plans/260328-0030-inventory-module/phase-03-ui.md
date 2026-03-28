# Phase 03: UI (Frontend) — Inventory Module (FINAL)

Status: ⬜ Pending
Dependencies: Phase 02 (Actions) ✅

---

## Clone Source: Contracts Module (Primary Reference)

> **Tại sao Contracts, không phải Employees/Dresses?**
> - Contracts dùng **SWR client** = phù hợp realtime stock
> - Contracts có **`<Suspense>`** wrapper = bắt buộc cho `useSearchParams()`
> - Contracts có **`useRealtime()`** = auto-refresh stock changes
> - Contracts dùng **`useListFilters` (nuqs)** = instant filter, no lag
> - Contracts có **DesktopTable + MobileCard cùng 1 file** = DRY
> - Contracts dùng **`<Badge>` component** = latest pattern (Employee dùng `VARIANT_COLORS` cũ)

---

## Quyết Định (User Approved)

| Quyết định | Chọn | Lý do |
|-----------|------|-------|
| Data Architecture | **SWR Client** (Contracts pattern) | Realtime stock, instant filter |
| Desktop CTA | 3 nút tách (Khai báo + Nhập + Xuất) | V1 proven |
| Navigation | Detail page `/inventory/[id]` (KHÔNG drawer) | Data-heavy |
| Table layout | Data table (KHÔNG card-grid) | Inventory = data, not images |

---

## Architecture Pattern (Clone Contracts Exactly)

```
app/(protected)/inventory/page.tsx          ← Client shell (metadata + import)
  └─ components/inventory/inventory-list-client.tsx  ← SWR + Suspense wrapper
       └─ InventoryListInner                 ← Main client component
            ├─ useInventoryFilters()          ← nuqs hook (instant URL sync)
            ├─ useInventory()                 ← SWR data fetching
            ├─ useInventoryStats()            ← SWR stats
            ├─ useRealtime("inventory_items") ← Auto-refresh
            ├─ <StatsBar> + 3 buttons (desktop)
            ├─ <FAB> (mobile)
            ├─ <InventoryFilters>
            ├─ <InventoryTable>               ← DesktopTable + MobileCard (1 file)
            └─ <Pagination> + footer count
```

---

## Files (15 files)

### A. Pages (4 files — route setup)

| # | File | Pattern Source |
|---|------|---------------|
| 1 | `app/(protected)/inventory/page.tsx` | `contracts/page.tsx` — client shell |
| 2 | `app/(protected)/inventory/loading.tsx` | Skeleton page |
| 3 | `app/(protected)/inventory/error.tsx` | `contracts/error.tsx` — SSOT tokens |
| 4 | `app/(protected)/inventory/[id]/page.tsx` | Detail page |

### B. Components (8 files)

| # | File | Pattern Source | ~Lines |
|---|------|---------------|--------|
| 5 | `components/inventory/inventory-list-client.tsx` | `contracts-list-client.tsx` | ~200 |
| 6 | `components/inventory/inventory-filters.tsx` | `contracts-dropdown-filters.tsx` + `employee-filters.tsx` | ~100 |
| 7 | `components/inventory/inventory-stats-bar.tsx` | `compact-stats.tsx` | ~40 |
| 8 | `components/inventory/inventory-table.tsx` | `contracts-table.tsx` (Desktop+Mobile CÙNG FILE) | ~200 |
| 9 | `components/inventory/inventory-detail-page.tsx` | New (detail layout) | ~200 |
| 10 | `components/inventory/inventory-form-modal.tsx` | UnifiedModal pattern | ~180 |
| 11 | `components/inventory/stock-in-modal.tsx` | UnifiedModal pattern | ~130 |
| 12 | `components/inventory/stock-out-modal.tsx` | UnifiedModal pattern | ~130 |

### C. Hooks (1 file)

| # | File | Pattern Source | ~Lines |
|---|------|---------------|--------|
| 13 | `hooks/useInventoryFilters.ts` | `useContractFilters.ts` (nuqs) | ~80 |

### D. Modify Existing (2 files)

| # | File | Change |
|---|------|--------|
| 14 | `lib/swr.ts` | + 4 inventory cacheKeys |
| 15 | `components/layout/sidebar.tsx` | + inventory nav item |

---

## SSOT Token Map — TUYỆT ĐỐI KHÔNG HARDCODE

### Typography

| Nơi dùng | SSOT Token | ❌ KHÔNG |
|----------|-----------|---------|
| Page title | `.text-page-title` | ❌ `text-2xl font-bold` |
| Error heading | `.text-h2` | ❌ `text-xl font-semibold` |
| Error body | `.text-body` + `text-text-secondary` | ❌ `text-sm text-gray-500` |
| Modal title | `.text-h3` | ❌ `text-lg font-semibold` |
| Table header | `text-xs uppercase tracking-wider text-text-secondary` | ❌ `text-[10px]` |
| Card item name | `text-sm font-bold text-text-main` | ❌ `text-h3` |
| Card muted | `text-xs text-text-muted` | ❌ `text-gray-400` |
| Form label | `.label-base` | ❌ `text-sm font-medium` |
| Stat value | StatsBar handles | ❌ Inline |
| Footer count | `text-xs text-text-muted` (centered) | ❌ `text-gray-400` |

### Forms

| Nơi dùng | SSOT | ❌ KHÔNG |
|----------|------|---------|
| Text input | `.input-base` | ❌ `border rounded-lg` |
| Form label | `.label-base` | ❌ `text-sm font-medium` |
| Error msg | `.error-text` | ❌ `text-red-500` |
| Form 2-col | `.form-grid-2col` | ❌ `grid grid-cols-2` |
| Footer btns | `.form-actions` | ❌ `flex justify-end` |
| Currency | `<CurrencyInput>` | ❌ Custom |
| Form dropdown | `<SelectForm>` | ❌ `<select>` / `<SelectPill>` |

### Badges (dùng `<Badge>` component — KHÔNG VARIANT_COLORS)

| Status | Badge | Source |
|--------|-------|--------|
| Hoạt động | `<Badge variant="success">` | `INVENTORY_STATUS_MAP` |
| Sắp hết | `<Badge variant="warning">` | `INVENTORY_STATUS_MAP` |
| Hết hàng | `<Badge variant="error">` | `INVENTORY_STATUS_MAP` |
| Ngưng sử dụng | `<Badge variant="neutral">` | `INVENTORY_STATUS_MAP` |
| Category | `<Badge variant="info">` | `INVENTORY_CATEGORY_MAP` |

### Layout & Cards

| Nơi dùng | SSOT |
|----------|------|
| Page wrapper | `.main-container gap-3!` |
| Stats+Button bar | `flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs` |
| Desktop table wrapper | `.card-base overflow-x-auto` |
| Mobile card | `.card-base p-4` + `entrance entrance-N` |
| Detail page | Breadcrumb + grid layout |
| Error boundary | `flex flex-col items-center justify-center min-h-[400px]` |

### Buttons

| Nơi dùng | SSOT | ❌ KHÔNG |
|----------|------|---------|
| "Khai báo vật tư" | `.btn .btn-primary` | ❌ `bg-blue-600 text-white px-4 py-2 rounded` |
| "Nhập kho" | `.btn .btn-primary` (variant hoặc outline) | ❌ `bg-green-500 text-white rounded-lg` |
| "Xuất kho" | `.btn .btn-primary` (variant hoặc outline) | ❌ `bg-red-500 hover:bg-red-600` |
| Error retry | `.btn .btn-primary` | ❌ `bg-indigo-600 px-6 py-3 rounded-full` |
| Mobile FAB | `<FAB>` component | ❌ Custom `fixed bottom-4 right-4` div |
| Icon button | `.icon-btn` hoặc inline flex | ❌ `w-8 h-8 bg-gray-100 rounded` |

### Animations

| Nơi dùng | SSOT | ❌ KHÔNG |
|----------|------|---------|
| Mobile cards | `.entrance .entrance-N` (stagger 1-5) | ❌ Custom keyframes |
| Loading | `.skeleton` | ❌ `animate-pulse bg-gray-200` |

---

## Mobile vs Desktop — TÁCH BẠCH

### `inventory-list-client.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ MOBILE (lg:hidden)                │ DESKTOP (hidden lg:flex) │
├───────────────────────────────────┼──────────────────────────┤
│ <StatsBar> (scroll ngang)         │ <StatsBar> + 3 CTA btns │
│ <FAB> bottom-right                │ (không FAB)              │
│ Filters: pills scroll            │ Filters: tabs + pills    │
│ isLoading? → <Loader2>           │ isLoading? → <Loader2>   │
│ <MobileCardList>                  │ <DesktopTable>           │
│ <Pagination> compact              │ <Pagination> full        │
│ Footer count                      │ Footer count             │
└───────────────────────────────────┴──────────────────────────┘
```

### `inventory-filters.tsx`

| Element | Mobile (`lg:hidden`) | Desktop (`hidden lg:flex`) |
|---------|---------------------|---------------------------|
| Status | `<TabsFilter variant="pills">` | `<TabsFilter>` (default) |
| Category | `<SelectPill>` scroll | `<SelectPill>` right group |
| Stock status | `<SelectPill>` scroll | `<SelectPill>` right group |
| Sort | `<SelectPill>` scroll | `<SelectPill>` right group |
| Separator | `border-l border-border` | Không cần |
| Layout | `flex-nowrap overflow-x-auto scrollbar-hide` | `lg:justify-between` |

### `inventory-table.tsx` (Desktop + Mobile CÙNG FILE — clone Contracts)

**DesktopTable** (function component trong file):
```
<div className="hidden lg:block card-base overflow-x-auto">
  <table> → Vật tư | Loại | Tồn kho | Đơn giá TB | Trạng thái | →
  Row click → navigate /inventory/[id]
</div>
```

**MobileCardList** (function component trong file):
```
<div className="lg:hidden flex flex-col gap-3 pt-1">
  {items.map((item, i) => (
    <button className="card-base p-4 entrance entrance-{i+1}">
      Row 1: Mã vật tư + <Badge status>
      Row 2: Tên vật tư (font-bold)
      Row 3: <Badge category> + Stock count
      Row 4: Đơn giá
    </button>
  ))}
</div>
```

**EmptyState** (wrapper export):
```tsx
export function InventoryTable(props) {
  if (props.items.length === 0) return <EmptyState icon={Package} ... />;
  return <><DesktopTable {...props} /><MobileCardList {...props} /></>;
}
```

### `inventory-detail-page.tsx`

**Desktop** — `grid grid-cols-12 gap-6` (responsive utility, KHÔNG có `.detail-grid` token):
```
<div className="main-container">
  <Breadcrumb items={[{ label: "Kho vật tư", href: "/inventory" }, { label: item.name }]} />
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">     ← 1col mobile, 12col desktop
    <div className="lg:col-span-8 space-y-6">                  ← Main content
      Info card (.card-base)                                    ← .text-h3 name, .text-caption code
      Transaction history table (TableWrapper)                  ← Reuse table components
    </div>
    <div className="lg:col-span-4 space-y-4">                  ← Sidebar
      Quick actions card (.card-base)                           ← 3 buttons: Nhập/Xuất/Sửa
      Stats summary card (.card-base)                           ← .text-label + .text-h2
    </div>
  </div>
</div>
```

**Mobile** — tự động stack (grid-cols-1): Breadcrumb → Info → Actions → History (vertical)

### `inventory-form-modal.tsx` (UnifiedModal)

| Field | Component |
|-------|----------|
| Tên vật tư * | `<input className="input-base">` |
| Mã vật tư | `<input className="input-base font-mono">` (auto-gen) |
| Phân loại | `<SelectForm>` |
| Đơn vị | `<SelectForm>` |
| Giá nhập TB | `<CurrencyInput>` |
| Tồn kho tối thiểu | `<input type="number" className="input-base">` |
| Nhà cung cấp | `<input className="input-base">` |
| Ghi chú | `<textarea className="input-base">` |
| Grid | `.form-grid-2col` |
| Footer | `.form-actions` |

---

## Hooks & Data Layer

### `useInventoryFilters` (clone `useContractFilters`)

```ts
const INVENTORY_FILTER_DEFAULTS = {
  status: "all",    // "all" | "active" | "low_stock" | "out_of_stock" | "discontinued"
  search: "",
  category: "all",  // "all" | category values
  sort: "newest",   // "newest" | "name_asc" | "stock_asc" | "stock_desc"
  page: "1",
};

export function useInventoryFilters() {
  const { params, setParam, setParams } = useListFilters(INVENTORY_FILTER_DEFAULTS);
  // ... setStatus, setSearch, setCategory, setSort, setPage
}
```

### SWR Hooks (new file: `lib/hooks/use-inventory.ts`)

```ts
// lib/hooks/use-inventory.ts
// ⚠️ KEY PHẢI ENCODE FILTERS — SWR auto-refetch khi filters thay đổi
export function useInventory(filters: InventoryFilters) {
  return useSWR(
    [cacheKeys.inventory(), filters],  // ← Array key = filters encoded
    () => getInventoryList(filters),
    { keepPreviousData: true }         // ← Không flash trắng khi filter
  );
}
export function useInventoryStats() {
  return useSWR(cacheKeys.inventoryStats(), () => getInventoryStats());
}
export function prefetchInventory(id: string) {
  mutate([cacheKeys.inventoryDetail(id)], getInventoryDetail(id));
}
```

### SWR Cache Keys (add to `lib/swr.ts`)

```ts
inventory: () => "inventory",
inventoryStats: () => "inventory-stats",
inventoryDetail: (id: string) => `inventory:${id}`,
inventoryHistory: (id: string) => `inventory:${id}:history`,
```

---

## SSOT Full Inventory — Shared Components, Hooks & Tokens

### A. UI Components (Inventory sẽ dùng)

| Component | Import Path | Dùng ở | Ghi chú |
|-----------|------------|--------|---------|
| `StatsBar` | `@/components/ui/stats-bar` | stats-bar | Shared, items array |
| `TabsFilter` | `@/components/ui/tabs-filter` | filters | `variant="pills"` cho mobile |
| `Badge` | `@/components/ui/badge` | table, card, detail | `variant` + optional `dot` prop |
| `FAB` | `@/components/ui/fab` | list-client mobile | `onClick` + `label` |
| `Pagination` | `@/components/ui/pagination` | list-client | `page` + `totalPages` + `onChange` |
| `EmptyState` | `@/components/ui/ux-states` | table empty | `icon` + `title` + `description` |
| `UnifiedModal` | `@/components/ui/unified-modal` | form/stock modals | `openModal()` pattern |
| `CurrencyInput` | `@/components/ui/currency-input` | form + stock-in modal | VND format |
| `ConfirmDialog` | `@/components/ui/confirm-dialog` | delete confirm | Destructive action |
| `Skeleton` | `@/components/ui/skeleton` | loading.tsx | Shimmer loading |
| `SearchBar` | `@/components/ui/search-bar` | list-client (desktop) | `input-base pl-10`, X clear btn |
| `Breadcrumb` | `@/components/ui/breadcrumb` | detail page | Navigation trail |
| `DatePicker` | `@/components/ui/date-picker` | (nếu cần filter theo ngày) | Label + value prop |

### B. Select System — 4 Variants (TUYỆT ĐỐI ĐÚNG CONTEXT)

| Variant | Import | Dùng KHI | ❌ KHÔNG dùng khi |
|---------|--------|---------|-------------------|
| `SelectPill` | `@/components/ui/select/SelectPill` | **Filter bar** — nhỏ gọn, pill shape | ❌ Trong form modal |
| `SelectForm` | `@/components/ui/select/SelectForm` | **Form modal** — full-width, label | ❌ Trong filter bar |
| `SelectStatus` | `@/components/ui/select/SelectStatus` | Status có dot color | ❌ Nếu không cần dot |
| `SelectGrouped` | `@/components/ui/select/SelectGrouped` | Options có group headers | ❌ Flat options |

**Inventory dùng:**
- `SelectPill` → filters (category, stock status, sort)
- `SelectForm` → form modal (category, unit, reason)

### C. Table System — `@/components/ui/table.tsx`

| Export | Dùng khi |
|--------|---------|
| `TableWrapper` | Container: `bg-bg-card rounded-xl shadow-sm` + scroll |
| `THead` | Table header: `bg-bg-base/50` |
| `TBody` | Table body |
| `TH` | Header cell: `text-tiny font-bold uppercase tracking-[0.15em]` |
| `TD` | Data cell: `text-sm font-semibold text-text-secondary` |
| `TR` | Row: `hover:bg-bg-hover/50` + `cursor-pointer` |

> ⚠️ **LƯU Ý:** Contracts dùng raw `<table>` + `card-base` (CHƯA migrate).
> Inventory **PHẢI** dùng `<TableWrapper>/<TH>/<TD>/<TR>` — đây là SSOT mới nhất.

### D. Hooks (Inventory sẽ dùng)

| Hook | Import | Mục đích | Pattern Source |
|------|--------|---------|----------------|
| `useListFilters` | `@/hooks/useListFilters` | **Core** — nuqs URL sync, instant filter | Universal |
| `useRealtime` | `@/hooks/use-realtime` | Auto-refresh on DB change | Contracts |
| `useDebounce` | `@/hooks/use-debounce` | Debounce search input (300ms) | Universal |
| `useIsMobile` | `@/hooks/use-mobile` | Responsive logic (nếu cần JS check) | Universal |

**Inventory tạo mới:**

| Hook | File | Mô tả |
|------|------|-------|
| `useInventoryFilters` | `hooks/useInventoryFilters.ts` | Wraps `useListFilters` + typed setters |
| `useInventory` | `lib/hooks/use-inventory.ts` | SWR fetch list + stats |

### E. Shared Utilities

| Utility | Import | Dùng cho |
|---------|--------|---------|
| `formatCurrency` | `@/lib/utils` | Hiển thị giá VND |
| `formatDate` | `@/lib/utils` | Hiển thị ngày |
| `getInitials` | `@/lib/utils` | Avatar fallback |
| `CURRENCY_SYMBOL` | `@/lib/utils` | "₫" |
| `cn` | `@/lib/utils` | Merge classNames |

### F. Constants System

| File | Dùng cho |
|------|---------|
| `types/inventory.ts` | TypeScript types (InventoryItem, etc.) |
| `types/inventory-constants.ts` | `INVENTORY_STATUS_MAP`, `INVENTORY_CATEGORY_MAP`, `INVENTORY_UNIT_MAP` |
| `lib/validations/inventory.schema.ts` | Zod schemas (create, update, stock-in, stock-out) |

### G. CSS Token Cheat Sheet — Quick Reference

```
Typography:  .text-page-title | .text-h2 | .text-h3 | .text-body | .text-body-sm | .text-caption | .text-label
Forms:       .input-base | .label-base | .error-text | .form-grid-2col | .form-actions
Layout:      .main-container | .card-base | .card-interactive
Buttons:     .btn .btn-primary | .btn .btn-secondary | .btn .btn-danger | .btn .btn-ghost
Animations:  .entrance .entrance-N | .stagger-item | .skeleton | .skeleton-text
Colors:      text-text | text-text-secondary | text-text-muted | text-primary | text-success | text-warning | text-error
Backgrounds: bg-bg-card | bg-bg-base | bg-bg-hover | bg-surface | bg-primary/10 | bg-success/10
```

---

## Performance Patterns

| Pattern | Cách dùng | Tại sao |
|---------|----------|---------|
| SWR `keepPreviousData` | Default trong `swrConfig` | Không flash trắng khi filter |
| nuqs `shallow: true` | Via `useListFilters` | Instant URL sync, không re-render server |
| `useRealtime` | `useRealtime("inventory_items")` | Multi-user stock sync |
| `<Suspense>` | Wrap `InventoryListInner` | BẮT BUỘC cho `useSearchParams()` |
| `useMemo` | Derived stats, tabsWithCounts | Tránh recalculate mỗi render |
| `useCallback` | Event handlers passed to children | Tránh children re-render |
| `useDebounce` | Search input (300ms delay) | Giảm API calls |
| `mutate()` | Sau create/update/delete | Instant UI update |
| `Skeleton` | `loading.tsx` | Page-level loading state |
| CSS `lg:hidden` / `hidden lg:block` | Responsive | SSR-safe, không hydration mismatch |

---

## Test Criteria

- [ ] `npm run build` → 0 errors
- [ ] Desktop: table (TableWrapper) + 3 buttons + filters + pagination
- [ ] Mobile: cards (entrance anim) + FAB + pills scroll + no table
- [ ] Modals: create/edit via UnifiedModal, stock-in/out modals
- [ ] **SSOT audit pass:**
  - [ ] `grep -rn "text-(xl|2xl|3xl).*font-bold" components/inventory/` → 0 hits
  - [ ] `grep -rn "bg-(red|green|blue)-" components/inventory/` → 0 hits
  - [ ] `grep -rn "uppercase tracking-wider" components/inventory/` → 0 hits
  - [ ] Tất cả form inputs dùng `.input-base`
  - [ ] Tất cả labels dùng `.label-base`
  - [ ] Tất cả badges dùng `<Badge>` component
  - [ ] Tất cả selects trong forms dùng `<SelectForm>`, filters dùng `<SelectPill>`
- [ ] Sidebar: inventory nav item visible + active state
- [ ] Detail page: breadcrumb + grid (desktop) + stack (mobile)
- [ ] Realtime: stock change in another tab → auto refresh
- [ ] Filters: instant tab switch (nuqs), URL shareable, back button
- [ ] Error boundary: crash → `.text-h2` + `.btn .btn-primary`
- [ ] SearchBar: debounced, `.input-base`, X clear button

---
Next Phase: [phase-04-verify.md](./phase-04-verify.md)

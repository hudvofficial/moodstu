# 📘 Module Blueprint — SSOT cho Module Mới

> **1 FILE DUY NHẤT.** Không cần đọc thêm file nào khác.
> Chứa: File structure + Component catalog + CSS tokens + Clone templates + Hooks + Checklist.
>
> **Nguyên tắc: CLONE CODE, CHỈ ĐỔI DATA. KHÔNG TỰ VIẾT.**

---

## 1. File Scaffold — Cấu trúc bắt buộc

```
[module]/
├── app/(protected)/[module]/
│   ├── page.tsx              ← Server Component (fetch → pass props)
│   ├── loading.tsx           ← Skeleton loader (BẮT BUỘC)
│   └── [id]/
│       └── page.tsx          ← Detail page
│
├── components/[module]/
│   ├── [module]-list-page.tsx      ← Client wrapper (hooks + SWR)
│   ├── [module]-filters.tsx        ← Filter bar (TÁCH FILE RIÊNG — BẮT BUỘC)
│   ├── [module]-stats-bar.tsx      ← Stats (dùng shared StatsBar — TÁCH FILE RIÊNG)
│   ├── [module]-table.tsx          ← Data table (desktop)
│   ├── [module]-card.tsx           ← Card view (mobile)
│   ├── [module]-detail-page.tsx    ← Detail view
│   └── [module]-form-modal.tsx     ← Create/Edit form
│
├── app/actions/
│   ├── [module]-mutations.ts       ← CRUD
│   └── [module]-queries.ts         ← Data fetching
│
└── types/
    ├── [module].ts                 ← Types
    └── [module]-constants.ts       ← Display maps, enum labels
```

### Naming Convention

| Loại | Convention | Ví dụ |
|------|-----------|-------|
| Files | kebab-case | `employee-mutations.ts` |
| Components | PascalCase | `EmployeeFormModal` |
| Types | PascalCase | `EmployeeDetail` |
| Constants | UPPER_SNAKE | `GENDER_OPTIONS` |
| DB enums | snake_case | `cho_xu_ly` |

---

## 2. Component Catalog — TOÀN BỘ `components/ui/`

### 2A. List Page Components

| Component | Import | Dùng ở đâu | Props chính |
|-----------|--------|-----------|-------------|
| `StatsBar` | `@/components/ui/stats-bar` | Stats summary (list page) | `items: StatItem[]` |
| `TabsFilter` | `@/components/ui/tabs-filter` | Status tabs | `tabs, activeTab, onChange, variant?` |
| `SelectPill` | `@/components/ui/select/SelectPill` | **Filter toolbar** (list page) | `options, value, onChange, placeholder, defaultValue` |
| `SearchBar` | `@/components/ui/search-bar` | Desktop search (nếu cần) | `value, onChange, placeholder` |
| `FAB` | `@/components/ui/fab` | Mobile floating button | `onClick, label, icon?` |
| `Pagination` | `@/components/ui/pagination` | Phân trang | `page, totalPages, onChange` |
| `EmptyState` | `@/components/ui/ux-states` | Khi list rỗng | `icon, title, description, actionLabel, onAction` |
| `KPICard` | `@/components/ui/kpi-card` | Dashboard KPI cards | `label, value, icon, iconColor, iconBg, trend?` |

### 2B. Table Components

| Component | Import | Dùng ở đâu |
|-----------|--------|-----------|
| `TableWrapper` | `@/components/ui/table` | Bao ngoài table (responsive scroll) |
| `THead` | `@/components/ui/table` | Header |
| `TBody` | `@/components/ui/table` | Body |
| `TH` | `@/components/ui/table` | Header cell |
| `TD` | `@/components/ui/table` | Body cell |
| `TR` | `@/components/ui/table` | Table row (hover, onClick) |

### 2C. Form Components

| Component | Import | Dùng ở đâu | Props chính |
|-----------|--------|-----------|-------------|
| `SelectForm` | `@/components/ui/select/SelectForm` | **Dropdown TRONG FORM** | `options, value, onChange, label` |
| `SelectGrouped` | `@/components/ui/select/SelectGrouped` | Grouped dropdown trong form | `groups, value, onChange, label` |
| `CurrencyInput` | `@/components/ui/currency-input` | Input tiền (auto-format VNĐ, shortcut k/m) | `value, onChange, label, error?` |
| `DatePicker` | `@/components/ui/date-picker` | Chọn ngày | `value, onChange, label` |
| `UnifiedModal` | `@/components/ui/unified-modal` | Modal wrapper | `isOpen, onClose, title, size, footer` |
| `ConfirmDialog` | `@/components/ui/confirm-dialog` | Xác nhận delete | `isOpen, onClose, onConfirm, title, message` |

### 2D. Display Components

| Component | Import | Dùng ở đâu | Props chính |
|-----------|--------|-----------|-------------|
| `Badge` | `@/components/ui/badge` | Status labels, tags | `variant, children, dot?` |
| `getStatusVariant()` | `@/components/ui/badge` | Map enum → badge variant | `status: string → BadgeVariant` |
| `SelectStatus` | `@/components/ui/select/SelectStatus` | **Inline status editor** (table rows) | `current, options: StatusOption[], onUpdate` |
| `Avatar` | `@/components/ui/avatar` | User avatar (image or initials) | `name, src?, size?` |
| `Breadcrumb` | `@/components/ui/breadcrumb` | Page navigation | `items: {label, href}[]` |
| `Drawer` | `@/components/ui/drawer` | Side panel (desktop) / Bottom sheet (mobile) | `isOpen, onClose, title, children, width?` |
| `Skeleton` | `@/components/ui/skeleton` | Loading placeholder | `className` |
| `SkeletonCard` | `@/components/ui/ux-states` | Loading card placeholder | — |

### ⚠️ PHÂN BIỆT RÕ — KHÔNG NHẦM

| Component | ✅ ĐÚNG ở đâu | ❌ SAI ở đâu |
|-----------|--------------|-------------|
| `SelectPill` | Filter toolbar (list page) | ❌ Form modal |
| `SelectForm` | Form modal, form fields | ❌ Filter toolbar |
| `SelectStatus` | Inline status editor (table rows, detail) | ❌ Filter, ❌ Form |
| `TabsFilter` | Status filter bar | ❌ Form |
| `SearchBar` | Desktop filter bar | ❌ Mobile status bar |
| `CurrencyInput` | Form tiền tệ | ❌ Filter |
| `StatsBar` | List page stats | ❌ Detail page (dùng KPICard) |
| `KPICard` | Dashboard, detail stats cards | ❌ List page (dùng StatsBar) |

---

## 3. CSS Token Catalog — SSOT Classes

### Typography (`typography.css`)

| Token | Dùng cho |
|-------|---------| 
| `.text-display` | Số lớn (dashboard KPI) |
| `.text-h1` | Page title |
| `.text-h2` | Section title lớn |
| `.text-h3` | Card title, modal title |
| `.text-body` | Body text |
| `.text-body-sm` | Small body |
| `.text-caption` | Muted small text |
| `.text-label` | Form labels |
| `.text-overline` | UPPERCASE subheading |
| `.text-amount` | Currency display |
| `.section-heading` | Card/form sub-section titles |

### Forms (`forms.css`)

| Token | Dùng cho | ❌ KHÔNG dùng |
|-------|---------|----|
| `.input-base` | Mọi input field | ❌ inline `border rounded-lg px-3 py-2` |
| `.label-base` | Mọi form label | ❌ inline `text-sm font-medium` |
| `.error-text` | Error message dưới input | ❌ inline `text-red-500 text-xs` |
| `.warning-text` | Warning message | — |
| `.form-grid-2col` | 2 cột responsive grid | ❌ inline `grid grid-cols-2 gap-3` |
| `.form-actions` | Footer buttons trong modal | ❌ inline `flex justify-end gap-2` |

### Layout (`components.css`)

| Token | Dùng cho |
|-------|---------|
| `.main-container` | Page layout wrapper (padding + gap responsive) |
| `.section-title` | Section heading (icon + text + dashed border) |
| `.table-header` | Table header row |

### Cards & Pages (`pages.css`)

| Token | Dùng cho |
|-------|---------|
| `.card-base` | Static card |
| `.card-interactive` | Clickable card (hover lift + shadow) |
| `.stats-card` | KPI/stats card (used by `KPICard`) |
| `.detail-grid` | Detail page layout (12-col grid desktop) |
| `.detail-main` | Main content (8 cols desktop) |
| `.detail-sidebar` | Sidebar (4 cols desktop) |

### Buttons (`components.css`)

| Token | Dùng cho |
|-------|---------|
| `.btn` | Button base |
| `.btn-primary` | Primary action |
| `.btn-outline` | Secondary action |
| `.btn-ghost` | Tertiary action |
| `.btn-danger` | Delete/cancel |
| `.btn-interactive` | Neutral interactive |
| `.icon-btn` | Icon-only button |

### Badges (`pages.css`)

| Token | Dùng cho |
|-------|---------|
| `.badge` | Badge base |
| `.badge-success` `.badge-warning` `.badge-error` `.badge-info` `.badge-neutral` `.badge-primary` `.badge-accent` | Status variants |

### Select (`select.css`)

| Token | Dùng cho |
|-------|---------|
| `.select-content` | Dropdown panel |
| `.select-item` | Dropdown option |
| `.select-trigger-pill` | Pill-style trigger |

### Utilities (`utilities.css`)

| Token | Dùng cho |
|-------|---------|
| `.accent-card` `.accent-card-gold` | Accent border cards |
| `.progress-track` | Progress bar track |
| `.stagger-item` | Staggered animation children |
| `.scrollbar-hide` | Ẩn scrollbar (Tailwind utility) |

---

## 4. Shared Hooks

| Hook | Import | Dùng cho |
|------|--------|---------|
| `useDebounce` | `@/hooks/use-debounce` | Delay search input |
| `useMobile` | `@/hooks/use-mobile` | Detect mobile viewport |
| `useEscape` | `@/hooks/useEscape` | Close on Escape key |
| `useListFilters` | `@/hooks/useListFilters` | URL-based filter state (generic) |
| `useContractFilters` | `@/hooks/useContractFilters` | Contract-specific filters (clone cho module khác) |
| `useInfiniteScroll` | `@/hooks/use-infinite-scroll` | Infinite scroll pagination |
| `useScrollDirection` | `@/hooks/use-scroll-direction` | Detect scroll up/down |
| `useSwipeDismiss` | `@/hooks/useSwipeDismiss` | Swipe to dismiss (mobile) |
| `useOnlineStatus` | `@/hooks/useOnlineStatus` | Online/offline detection |
| `useRealtime` | `@/hooks/use-realtime` | Supabase realtime subscription |

### SWR Cache Pattern (lib/swr.ts)

```tsx
import { cacheKeys, revalidate } from "@/lib/swr";

// Fetch
const { data, isLoading, error } = useSWR(cacheKeys.dresses(), fetcher);

// Revalidate sau mutation
revalidate(cacheKeys.dresses());
revalidate(cacheKeys.dressStats());
```

---

## 5. Clone Templates — COPY RỒI ĐỔI DATA

> **QUY TRÌNH:** Clone file → Find & Replace entity name → đổi data → DIFF kiểm tra.

### BLOCK 1: Stats Container + FAB

**Clone:** [employee-list-page.tsx L56-66](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/employees/employee-list-page.tsx#L56-L66)

```tsx
{/* ── Stats + Action (unified container) ── */}
<div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
  <[Module]StatsBar stats={stats} />
  <div className="hidden lg:flex">
    <button onClick={handleCreate} className="btn btn-primary gap-2 shrink-0">
      <Plus className="w-5 h-5" />
      <span>Tạo [entity]</span>
    </button>
  </div>
</div>

<FAB onClick={handleCreate} label="Tạo [entity]" />
```

### BLOCK 2: Stats Bar (TÁCH FILE RIÊNG)

**Clone:** [employee-stats-bar.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/employees/employee-stats-bar.tsx)

```tsx
import { StatsBar } from "@/components/ui/stats-bar";

export default function [Module]StatsBar({ stats }: Props) {
  const items = [
    { icon: Icon1, label: "tổng", value: String(stats.total), iconBg: "bg-primary/10", iconColor: "text-primary" },
    { icon: Icon2, label: "hoạt động", value: String(stats.active), iconBg: "bg-success/10", iconColor: "text-success" },
  ];
  return <StatsBar items={items} />;
}
```

### BLOCK 3: Filter Bar (TÁCH FILE RIÊNG — BẮT BUỘC)

**Clone:** [employee-filters.tsx](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/employees/employee-filters.tsx)

```tsx
import { TabsFilter } from "@/components/ui/tabs-filter";
import { SelectPill } from "@/components/ui/select/SelectPill";

export default function [Module]Filters({ stats }: Props) {
  return (
    <>
      {/* ── MOBILE: 1 hàng cuộn ngang ── */}
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter tabs={STATUS_TABS} activeTab={current} onChange={fn} variant="pills" />
        <div className="h-5 border-l border-border shrink-0" />
        <SelectPill options={OPTS} value={v} onChange={fn} placeholder="..." defaultValue="all" />
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
        <TabsFilter tabs={STATUS_TABS} activeTab={current} onChange={fn} />
        <div className="flex items-center gap-2">
          <SelectPill options={OPTS} value={v} onChange={fn} placeholder="..." defaultValue="all" />
        </div>
      </div>
    </>
  );
}
```

#### Mobile vs Desktop

| Yếu tố | Mobile (`lg:hidden`) | Desktop (`hidden lg:flex`) |
|---------|---------------------|---------------------------|
| Status | `<TabsFilter variant="pills">` | `<TabsFilter>` (default) |
| Layout | `flex-nowrap overflow-x-auto scrollbar-hide` | `lg:justify-between` |
| Dropdowns | Cùng hàng, scroll ngang | Nhóm bên phải `flex gap-2` |
| Separator | `border-l border-border` | Không cần |

### BLOCK 4: List Content (Table/Cards + Empty + Pagination)

**Clone:** [employee-list-page.tsx L72-104](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/components/employees/employee-list-page.tsx#L72-L104)

```tsx
{items.length === 0 ? (
  hasFilters ? (
    <EmptyState icon={FilterX} title="Không tìm thấy" description="..." actionLabel="Xóa bộ lọc" onAction={clearFilters} />
  ) : (
    <EmptyState icon={ModuleIcon} title="Chưa có [entity]" description="..." actionLabel="Tạo [entity]" onAction={handleCreate} />
  )
) : (
  <>
    <div className="hidden lg:block"><[Module]Table items={items} /></div>
    <div className="lg:hidden space-y-2">
      {items.map((item) => <[Module]Card key={item.id} item={item} />)}
    </div>
    <Pagination page={page} totalPages={totalPages} onChange={handlePage} className="mt-4" />
    <p className="text-center text-xs text-text-muted mt-1">
      Hiển thị {start}–{end} của {total} [entity]
    </p>
  </>
)}
```

### BLOCK 5: Loading / Error States

**Copy nguyên — không đổi gì:**

```tsx
{isLoading && (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 text-primary animate-spin" />
    <span className="ml-2 text-sm text-text-secondary">Đang tải dữ liệu...</span>
  </div>
)}
{error && !isLoading && (
  <div className="flex items-center justify-center py-16">
    <p className="error-text">Lỗi tải dữ liệu</p>
  </div>
)}
```

### BLOCK 6: Form Modal

```tsx
import { UnifiedModal } from "@/components/ui/unified-modal";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Layout
<div className="form-grid-2col">
  <div>
    <label className="label-base">Field 1</label>
    <input className="input-base w-full" />
  </div>
  <SelectForm label="Field 2" value={v} onChange={fn} options={opts} />
</div>
<div className="form-grid-2col">
  <CurrencyInput label="Giá" value={v} onChange={fn} />
  <CurrencyInput label="Chi phí" value={v} onChange={fn} />
</div>

// Delete confirmation
<ConfirmDialog isOpen={confirmOpen} onClose={fn} onConfirm={handleDelete}
  title="Xóa [entity]" message="Bạn có chắc?" confirmLabel="Xóa" />
```

### BLOCK 7: Detail Page

```tsx
<div className="main-container">
  <Breadcrumb items={[{ label: "[Module]", href: "/[module]" }, { label: data.name }]} />
  <div className="detail-grid">
    <div className="detail-main">
      {/* Main content sections */}
    </div>
    <div className="detail-sidebar">
      {/* Sidebar sections */}
    </div>
  </div>
</div>
```

### BLOCK 8: Desktop Table

```tsx
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";

<TableWrapper>
  <THead>
    <tr>
      <TH>Tên</TH>
      <TH>Trạng thái</TH>
      <TH>Ngày tạo</TH>
    </tr>
  </THead>
  <TBody>
    {items.map((item) => (
      <TR key={item.id} onClick={() => handleView(item)}>
        <TD>{item.name}</TD>
        <TD><Badge variant={getStatusVariant(item.status)}>{item.status_label}</Badge></TD>
        <TD>{formatDate(item.created_at)}</TD>
      </TR>
    ))}
  </TBody>
</TableWrapper>
```

### BLOCK 9: Full Page Structure Order

```tsx
<div className="main-container gap-3!">
  {/* 1 */} Stats Container + Desktop Button
  {/* 2 */} <FAB /> (mobile)
  {/* 3 */} <[Module]Filters /> (TÁCH FILE RIÊNG)
  {/* 4 */} Loading State
  {/* 5 */} Error State
  {/* 6 */} List Content (Table/Cards/Empty + Pagination + Footer count)
  {/* 7 */} Form Modal
</div>
```

---

## 6. Hook Pattern — Form State

```tsx
export function use[Module]Form(initialData?: ModuleType) {
  const [formData, setFormData] = useState<FormData>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.requiredField) newErrors.requiredField = "Bắt buộc";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return { formData, updateField, errors, isSubmitting, validate };
}
```

---

## 7. Error Handling — Mọi mutation PHẢI có feedback

```tsx
const result = await createModule(data);
if (result.success) {
  toast("Thành công", "success");
  closeModal();
} else {
  toast(result.error || "Có lỗi", "error");
}
```

**Rules:** Mọi action return `{ success, data?, error? }`. Mọi button có loading state.

---

## 8. Cross-module

- ❌ KHÔNG copy query logic → import từ source module
- ❌ KHÔNG import component từ module khác trực tiếp
- ✅ Shared UI → `components/ui/`
- ✅ Cross-module WRITE → `revalidatePath` CẢ 2 module paths

---

## 9. UX States — PHẢI có đủ

| State | Component | Bắt buộc |
|-------|----------|----------|
| Loading (page) | `loading.tsx` + `Skeleton` | ✅ |
| Loading (section) | `Loader2` spinner | ✅ |
| Empty (no data) | `EmptyState` + CTA | ✅ |
| Empty (no filter match) | `EmptyState` + "Xóa bộ lọc" | ✅ |
| Error | `.error-text` | ✅ |
| Submit loading | `isSubmitting` disable button | ✅ |

---

## 10. CHECKLIST TRƯỚC KHI BÁO DONE

```
□ CLONE từ Gold Standard (employees/contracts) — KHÔNG tự viết
□ Stats bar TÁCH FILE RIÊNG [module]-stats-bar.tsx dùng shared <StatsBar>
□ Filter bar TÁCH FILE RIÊNG [module]-filters.tsx
□ Mobile: <TabsFilter variant="pills"> + <SelectPill> (lg:hidden)
□ Desktop: <TabsFilter> + pills nhóm phải lg:justify-between (hidden lg:flex)
□ Desktop table dùng <TableWrapper> <THead> <TBody> <TH> <TD> <TR>
□ Mobile cards <div className="lg:hidden space-y-2">
□ Empty state × 2 (no data + no filter match) dùng <EmptyState>
□ Loading/Error states copy nguyên template
□ FAB đặt SAU stats container
□ Pagination + footer count
□ Form: SelectForm (KHÔNG SelectPill), CurrencyInput, ConfirmDialog
□ Form grid: .form-grid-2col (KHÔNG inline grid-cols-2)
□ Detail page: Breadcrumb + .detail-grid + .detail-main + .detail-sidebar
□ Badge dùng <Badge variant={getStatusVariant(status)}>
□ DIFF kiểm tra structure giống hệt Gold Standard source
```

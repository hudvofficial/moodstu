# 📦 UI Component Registry — SSOT

> **AI ENFORCEMENT:** Trước khi viết BẤT KỲ `<table>`, `<select>`, `<input>`, `<div className="rounded-xl shadow">` 
> → PHẢI kiểm tra file này. Nếu component đã có → DÙNG NÓ. KHÔNG TỰ VIẾT.

---

## Table (table.tsx)
```
TableWrapper  → <div card-base> + <table>     | THAY CHO: <div className="card-base overflow-hidden"><table>
THead         → <thead> sticky bg-bg-sidebar   | THAY CHO: <thead className="bg-bg-sidebar...">
TBody         → <tbody> zebra-stripes           | THAY CHO: <tbody>
TH            → <th> px-4 py-3 font-medium      | THAY CHO: <th className="px-4 py-3...">
TD            → <td> px-4 whitespace-nowrap      | THAY CHO: <td className="px-4...">
TR            → <tr> hover h-14 cursor-pointer   | THAY CHO: <tr className="hover:bg-... cursor-pointer">
```

## Select (select/)
```
SelectPill    → Filter toolbar (list page)      | ❌ KHÔNG dùng trong form
SelectForm    → Form fields (modal/form)        | ❌ KHÔNG dùng trong filter
SelectStatus  → Inline status editor (table)    | ❌ KHÔNG dùng trong form/filter
SelectGrouped → Grouped dropdown (form)         | Import: @/components/ui/select/SelectGrouped
```

## Form (various)
```
CurrencyInput → Input tiền (auto VNĐ format)    | ❌ KHÔNG <input type="number">
DatePicker    → Chọn ngày                        | ❌ KHÔNG <input type="date">
UnifiedModal  → Modal wrapper                    | ❌ KHÔNG tự viết modal backdrop
ConfirmDialog → Xác nhận delete                  | ❌ KHÔNG window.confirm()
```

## Layout
```
StatsBar      → Stats row (list page)            | ❌ KHÔNG tự viết flex+icon+number
TabsFilter    → Status tabs                      | ❌ KHÔNG tự viết tab buttons
FAB           → Mobile floating button           | ❌ KHÔNG tự viết fixed button
Pagination    → Phân trang                       | ❌ KHÔNG tự viết prev/next
EmptyState    → Empty + CTA                      | ❌ KHÔNG tự viết "no data" div
Breadcrumb    → Page navigation                  | ❌ KHÔNG tự viết breadcrumb
Badge         → Status label                     | ❌ KHÔNG tự viết span+colors
Drawer        → Side panel / bottom sheet        | Import: @/components/ui/drawer
Skeleton      → Loading placeholder              | Import: @/components/ui/skeleton
KPICard       → Dashboard stat cards             | Import: @/components/ui/kpi-card
Switch        → Toggle boolean (iOS style)       | Import: @/components/ui/switch  ❌ KHÔNG tự viết role="switch"
```

## CSS Tokens (KHÔNG inline)
```
.card-base           → Card container            | ❌ KHÔNG "rounded-xl shadow-xs bg-bg-card"
.card-interactive    → Clickable card             | ❌ KHÔNG "hover:shadow-md transition"
.input-base          → Form input                 | ❌ KHÔNG "border rounded-lg px-3 py-2"
.label-base          → Form label                 | ❌ KHÔNG "text-sm font-medium"
.error-text          → Error message              | ❌ KHÔNG "text-red-500 text-xs"
.form-grid-2col      → 2-col form grid            | ❌ KHÔNG "grid grid-cols-2 gap-3"
.form-actions        → Modal footer buttons       | ❌ KHÔNG "flex justify-end gap-2"
.main-container      → Page wrapper               | ❌ KHÔNG "max-w-7xl mx-auto px-4"
.detail-grid         → Detail 12-col layout       | ❌ KHÔNG "grid grid-cols-12"
.detail-main         → 8 cols                     | ❌ KHÔNG "col-span-8"
.detail-sidebar      → 4 cols                     | ❌ KHÔNG "col-span-4"
.btn .btn-primary    → Buttons                    | ❌ KHÔNG "bg-primary text-white rounded"
.badge .badge-*      → Badge variants             | ❌ KHÔNG "bg-green-100 text-green-800"
.section-heading     → Section title              | ❌ KHÔNG "text-lg font-bold"
```

## Hooks
```
useDebounce          → Delay search
useMobile            → Detect mobile
useListFilters       → URL-based filters
useInfiniteScroll    → Infinite scroll
useScrollDirection   → Scroll up/down
useSwipeDismiss      → Swipe dismiss (mobile)
useOnlineStatus      → Online/offline
useRealtime          → Supabase realtime
useEscape            → Close on Escape
```

---

> **RULE:** Nếu viết code mới mà output HTML/CSS trùng với cột "THAY CHO" ở trên
> → BẮT BUỘC dùng component/token bên trái. Vi phạm = Revert.

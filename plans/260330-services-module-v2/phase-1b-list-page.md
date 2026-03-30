# Phase 1b: List Page (Desktop + Mobile)
Status: ⬜ Pending
Dependencies: Phase 1a (queries + types must exist)

## Objective
Xây dựng trang danh sách dịch vụ với đầy đủ layout Desktop và Mobile TÁCH BẠCH.
Table dùng SSOT TableSuite, filters dùng nuqs.

## Implementation Steps

### 1. Route Pages
- [ ] Tạo `app/(protected)/services/page.tsx` — SSR fetch services + categories → pass to client
- [ ] Tạo `app/(protected)/services/loading.tsx` — Skeleton (2 variants: mobile 2x2, desktop 4-col stats)
- [ ] Tạo `app/(protected)/services/error.tsx` — ErrorFallback

### 2. Stats Bar
- [ ] Tạo `components/services/service-stats-bar.tsx`
  - 4 metrics: Tổng DV, Giá TB, Cao nhất, Thấp nhất
  - Desktop: `grid-cols-4`, icon 40x40
  - Mobile: `grid-cols-2`, icon 32x32, smaller text

### 3. Filters
- [ ] Tạo `components/services/service-filters.tsx`
  - nuqs URL state: `search`, `category`
  - Category chips: horizontal scroll trên mobile, inline trên desktop
  - Mobile search: icon toggle → expandable bar (slide-down)
  - Desktop search: always visible inline input (64-80ch width)
  - View toggle: list ≡ / grid ⊞ buttons
  - Settings buttons: Category Manager ⚙ + Rule Manager 🔧

### 4. List Client (Orchestrator)
- [ ] Tạo `components/services/services-list-client.tsx` (< 300 lines)
  - SWR data fetching
  - State: viewMode (list/grid), quoteService
  - Renders: StatsBar + Filters + Content (Table/Grid) + Footer count
  - Dynamic imports: CategoryManager, QuoteModal

### 5. Desktop Table View
- [ ] Tạo `components/services/service-table.tsx`
  - SSOT TableSuite: TableWrapper, THead, TBody, TH, TD, TR
  - Container: `hidden lg:block`
  - Columns: Expand | Tên DV (name + unit + itemCount) | Danh mục | Giá | Thao tác
  - Row expand: colSpan full, grid 3-col, shows parseContentStructure() sections
  - Actions: opacity 0→1 on hover (Quote + Edit + Open icons)
  - React.memo for row component

### 6. Mobile List View
- [ ] Tạo `components/services/service-row-mobile.tsx`
  - Container: `block lg:hidden`
  - Layout: `flex items-center gap-2 px-3 py-3`
  - Elements: Expand chevron (24px) + Name area (flex-1, truncate) + Price (right)
  - Tap: name/price → onQuote(), chevron → expand/collapse
  - Expand content: same as desktop but single column, pl-10
  - React.memo

### 7. Grid View (Cards)
- [ ] Tạo `components/services/service-card.tsx`
  - Desktop: `grid-cols-3 xl:grid-cols-4`
  - Mobile: `grid-cols-1 md:grid-cols-2`
  - Card: header (name + unit badge) + body (preview: 2 sections × 4 items max) + footer (price + links)
  - Edit overlay: absolute top-right, opacity 0→1 on group-hover
  - React.memo

### 8. Empty State
- [ ] Tạo `components/services/service-empty-state.tsx`
  - Icon: inventory_2 (30px, muted)
  - Title: "Không tìm thấy dịch vụ nào"
  - Subtitle: "Thử chọn bộ lọc khác..."

## Files to Create

| Action | File | Purpose |
|--------|------|---------|
| [NEW] | `app/(protected)/services/page.tsx` | SSR route |
| [NEW] | `app/(protected)/services/loading.tsx` | Skeleton |
| [NEW] | `app/(protected)/services/error.tsx` | Error boundary |
| [NEW] | `components/services/services-list-client.tsx` | Main client orchestrator |
| [NEW] | `components/services/service-stats-bar.tsx` | 4 stat cards |
| [NEW] | `components/services/service-filters.tsx` | Category + search + toggle |
| [NEW] | `components/services/service-table.tsx` | Desktop table (SSOT) |
| [NEW] | `components/services/service-row-mobile.tsx` | Mobile list item |
| [NEW] | `components/services/service-card.tsx` | Grid card |
| [NEW] | `components/services/service-empty-state.tsx` | Empty state |

## SSOT Compliance
- [ ] Table: MUST use TableWrapper/THead/TBody/TH/TD/TR from `components/ui/table.tsx`
- [ ] CSS: ONLY tokens from `design-system.css` — NO hardcoded hex
- [ ] Modal: CategoryManager via `UnifiedModal`
- [ ] Currency: `formatCurrency()` + "VNĐ" suffix

## Test Criteria
- [ ] Desktop (lg+): Table renders with 5 columns, rows expand/collapse
- [ ] Mobile (<lg): Flex rows render, expand/collapse works
- [ ] Grid view: Cards render responsive (1→2→3→4 columns)
- [ ] Category filter: Click chip → filters list
- [ ] Search: Type → debounce → filter results
- [ ] Stats: Recalculate on filter change
- [ ] Empty state: Shows when no results

## V1 Features Covered
- [x] Service List (#2)
- [x] ServiceRow Desktop expand (#3)
- [x] ServiceRow Mobile (#4)
- [x] ServiceCard grid (#5)
- [x] Stats Strip (#6)
- [x] Category Filter (#7)
- [x] View Toggle (#8)
- [x] Search (#9)
- [x] Empty State (#18)

---
Next Phase: → [phase-1c-form-crud.md](./phase-1c-form-crud.md)

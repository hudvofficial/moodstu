# Finance UI — SSOT Token Map & Performance Standards
Status: Đính kèm vào tất cả Phase 03a–03e

## 1. Design System Token Map (BẮT BUỘC dùng, KHÔNG tạo CSS mới)

### 1.1 Layout Classes (từ `styles/layout.css`)

| Component Finance | Class SSOT | KHÔNG ĐƯỢC dùng |
|---|---|---|
| Page wrapper | `main-container` | ❌ `p-4`, `px-6`, `py-8` tự viết |
| Detail page 2 cột (ví dụ: Close detail) | `detail-grid` + `detail-main` + `detail-sidebar` | ❌ `grid grid-cols-12` tự viết |
| Icon container (KPI, card) | `icon-box` | ❌ `w-10 h-10 rounded-lg grid place-items-center` tự viết |
| Disabled state | `disabled` | ❌ `opacity-50 cursor-not-allowed pointer-events-none` |
| Link style | `link-base` | ❌ `text-primary font-semibold hover:underline` |

### 1.2 Card Classes (từ `styles/cards.css`)

| Component Finance | Class SSOT | Khi nào dùng |
|---|---|---|
| KPI cards (Tổng thu, Tổng chi, Lợi nhuận) | `stats-card` | Luôn luôn cho metric cards |
| Clickable cards (Goal card, Debt card) | `card-interactive` | Card có hover effect |
| Static cards (Close step, Budget row) | `card-base` | Card chỉ hiển thị |
| Left-accent cards (Aging badges, status) | `accent-card` + `accent-card-{color}` | Accent variants: rose/sky/gold/green/orange |

> **⚠️ BẮT BUỘC**: KPI Cards trên Dashboard PHẢI dùng `<KPICard>` component có sẵn tại `components/ui/kpi-card.tsx`. KHÔNG tạo component card mới.

### 1.3 Button Classes (từ `styles/buttons.css`)

| Hành động Finance | Class SSOT | Button text ví dụ |
|---|---|---|
| Thêm phiếu thu / Tạo chốt sổ (CTA chính) | `btn-cta` | "Thêm phiếu thu" |
| Submit form trong modal | `btn-primary` | "Lưu", "Xác nhận" |
| Cancel / Đóng | `btn-secondary` | "Hủy" |
| Xóa phiếu | `btn-danger` | "Xóa" |
| Filter, action phụ | `btn-ghost` | "Lọc theo tháng" |
| Icon-only (edit, delete row) | `btn-icon` | ✏️ 🗑️ |
| CTA pill (approve expense) | `btn-interactive` | "Duyệt" |
| Outline (sửa, in) | `btn-outline` | "Sửa phiếu" |

### 1.4 Badge Classes (từ `styles/badges.css`)

| Trạng thái Finance | Class SSOT |
|---|---|
| Đã duyệt / Hoàn thành | `badge badge-success` |
| Chờ duyệt / Đang xử lý | `badge badge-warning` |
| Đã hủy / Có vấn đề | `badge badge-error` |
| Thông tin | `badge badge-info` |
| Trung lập (draft, mới) | `badge badge-neutral` |
| Primary accent | `badge badge-primary` |
| Trên ảnh/nền tối | `badge-solid-{variant}` |
| Tags (category, type) | `tag-badge` |

### 1.5 Form Classes (từ `styles/forms.css`)

| Element Finance | Class SSOT | KHÔNG ĐƯỢC |
|---|---|---|
| Text input, date picker | `input-base` | ❌ `border rounded-md px-4 py-2` tự viết |
| Số tiền (amount) | `<CurrencyInput>` (`components/ui/currency-input.tsx`) | ❌ `<input type="number">` |
| Label | `label-base` | ❌ `text-sm font-medium text-gray-600` |
| Error message | `error-text` | ❌ `text-xs text-red-500` |
| Warning (dedup) | `warning-text` | ❌ tự tạo warning style |
| 2-column form | `form-grid-2col` | ❌ `grid grid-cols-2 gap-3` tự viết |
| Form actions row | `form-actions` | ❌ `flex justify-end gap-3` tự viết |
| Section heading | `form-section-heading` | ❌ `text-lg font-bold` |
| Total line | `form-total` | ❌ `text-right font-bold` |
| Select trigger | `select-trigger` (extends `input-base`) | ❌ tự viết select |
| Search input | `search-input` | ❌ `input border-none bg-gray-100` |
| Input error border | `input-error` | ❌ `border-red-500` |
| Input with suffix (₫, %) | `input-with-suffix` + `input-suffix-field` + `input-suffix` | ❌ absolute positioned tự viết |
| Switch toggle | `switch-root` + `switch-thumb` (Radix) | ❌ custom toggle |

### 1.6 Modal Classes (từ `styles/modals.css`)

| Element | Class SSOT |
|---|---|
| Modal wrapper | **`<UnifiedModal>`** (`components/ui/unified-modal.tsx`) |
| Overlay | `modal-overlay` (auto từ UnifiedModal) |
| Card panel | `modal-card` (auto từ UnifiedModal) |
| Header row | `modal-header` (auto từ UnifiedModal) |
| Scrollable body | `modal-body` (auto từ UnifiedModal) |
| Sticky footer | `modal-footer` via `footer` prop (auto từ UnifiedModal) |
| Close button | `modal-close-btn` (auto từ UnifiedModal) |
| Drag handle (mobile) | `modal-drag-handle` (auto từ UnifiedModal) |

> **⚠️ BẮT BUỘC**: Tất cả modal PHẢI dùng `<UnifiedModal>`. KHÔNG tạo modal riêng. Size options: `sm | md | lg | xl | 2xl | 3xl | full`.

### 1.7 Tab Classes (từ `styles/tabs.css`)

| Element | Class SSOT |
|---|---|
| Tab item | `tab-pill` |
| Active tab | `tab-pill tab-pill-active` |
| Inactive tab | `tab-pill tab-pill-inactive` |
| Compact tab (header) | `tab-pill-compact` |

### 1.8 Table Classes (từ `styles/tables.css`)

| Element | Class SSOT |
|---|---|
| Section title (dashed border) | `section-title` |
| Table header TH | `table-header` |

### 1.9 Animation Classes (từ `styles/animations.css`)

| Tình huống | Class SSOT |
|---|---|
| Page load fade-up | `entrance` + `entrance-{1..8}` |
| List items stagger | `stagger-item` |
| Cards entrance | `card-entrance` |
| Popover in | `animate-popover-in` |
| Modal open (mobile) | `animate-slide-up` (auto từ UnifiedModal) |
| Modal open (desktop) | `animate-modal-in` (auto từ UnifiedModal) |
| Loading skeleton | `skeleton` + `skeleton-text` / `skeleton-title` / `skeleton-card` |

### 1.10 Utility Classes (từ `styles/utilities.css`)

| Tình huống | Class SSOT |
|---|---|
| Hide scrollbar | `no-scrollbar` / `scrollbar-hide` |
| Overdue row indicator | `overdue-indicator` (red left inset) |
| Success indicator | `inset-success` (green left inset) |
| Warning indicator | `inset-warning` (orange left inset) |
| Text interactive color | `text-interactive` |
| Text interactive light | `text-interactive-light` |

### 1.11 @theme Tokens (từ `globals.css @theme`)

| Token | Value | Dùng ở đâu trong Finance |
|---|---|---|
| `--color-primary` | `#8b5e3c` | Text chính, headings |
| `--color-interactive` | `#cf6717` | CTA buttons, active tabs |
| `--color-success` | `#4caf50` | Thu, profit positive |
| `--color-error` | `#f44336` | Chi, nợ quá hạn, loss |
| `--color-warning` | `#ff9800` | Chờ duyệt, aging 31-60 |
| `--color-info` | `#2196f3` | Thông tin, tooltip |
| `--color-bg-card` | `#ffffff` | Card backgrounds |
| `--color-bg-sidebar` | `#f5efe6` | Table header bg |
| `--spacing-sm/base/lg/xl` | `8/16/24/32px` | Spacing scale |
| `--radius-sm/md/lg/xl` | `6/8/12/16px` | Border radius |
| `--shadow-sm/md/lg` | earth-tone shadows | Card shadows |
| `--font-size-h1/h2/h3/body/body-sm/caption/micro` | typography scale | Text sizing |
| `--z-modal` | `9999` | Modal z-index |
| `--z-dropdown` | `10000` | Dropdown z-index |

---

## 2. Existing Shared Components (PHẢI reuse, KHÔNG tạo mới)

| Component | Location | Dùng cho Finance |
|---|---|---|
| `<KPICard>` | `components/ui/kpi-card.tsx` | Dashboard KPI: Tổng thu, Tổng chi, etc. |
| `<UnifiedModal>` | `components/ui/unified-modal.tsx` | Tất cả form modals (receipt, expense, debt, adjustment, etc.) |
| `<CurrencyInput>` | `components/ui/currency-input.tsx` | Tất cả amount input fields |
| `<Skeleton>` | `components/ui/skeleton.tsx` | Loading states |
| `<ModalPortal>` | `components/ui/modal-portal.tsx` | Auto-used by UnifiedModal |

---

## 3. Performance Patterns (BẮT BUỘC)

### 3.1 Data Fetching

| Pattern | Implementation | KHÔNG ĐƯỢC |
|---|---|---|
| List data | `useSWR(cacheKey, fetcher)` | ❌ `useEffect` + `fetch` |
| Cache revalidation | `mutate(cacheKey)` sau mutation | ❌ full page reload |
| Pagination | Server-side `LIMIT/OFFSET` truyền qua SWR params | ❌ Client-side filter toàn bộ data |
| Cache keys | Đăng ký tại `lib/swr.ts` SSOT | ❌ Hardcode cacheKey inline |

### 3.2 Loading States

| Layer | Pattern |
|---|---|
| Full page | `skeleton-card` + `skeleton-text` (từ animations.css) |
| Inline (card, row) | `.skeleton` class |
| Button submit | `disabled` state + spinner icon |

### 3.3 Responsive Pattern

| Viewport | Pattern | Breakpoint |
|---|---|---|
| Mobile (< 768px) | Card list / accordion | Default |
| Desktop (≥ 1024px) | Full table | `lg:` prefix hoặc `@media (min-width: 1024px)` |
| Between (768-1023) | Mobile layout maintained | Không có separate tablet layout |

### 3.4 Component Size Limit

- **Max 250 lines per file** — vượt thì chia DCP (Desktop Component Pattern).
- Desktop table → `*-desktop-table.tsx`.
- Mobile list → `*-mobile-list.tsx` hoặc inline trong index.

### 3.5 Entrance Animation

```tsx
// Standard page entrance pattern
<div className="entrance entrance-1">
  <KPICard ... />
</div>
<div className="entrance entrance-2">
  <CashflowChart ... />
</div>
```

### 3.6 Number Formatting

```tsx
// BẮT BUỘC: tabular-nums cho cột tiền
<span className="tabular-nums font-bold">
  {amount.toLocaleString("vi-VN")}₫
</span>
```

---

## 4. SSOT Compliance Checklist (Dùng ở Phase 04)

```bash
# 1. No hardcoded hex colors
grep -rn "#[0-9a-fA-F]\{3,6\}" components/finance/ --include="*.tsx"
# Expected: 0 results

# 2. No inline styled cards/modals
grep -rn "bg-white rounded" components/finance/ --include="*.tsx"
# Expected: 0 results (should use card-base, stats-card, etc.)

# 3. All modals use UnifiedModal
grep -rn "modal-overlay" components/finance/ --include="*.tsx"
# Expected: 0 results (UnifiedModal handles this)

# 4. CurrencyInput for amounts
grep -rn "type=\"number\"" components/finance/ --include="*.tsx"
# Expected: 0 results

# 5. SWR only
grep -rn "useQuery\|React\.useEffect.*fetch" components/finance/ --include="*.tsx"
# Expected: 0 results

# 6. File size check
find components/finance -name "*.tsx" -exec wc -l {} + | sort -rn
# Expected: all < 250 lines

# 7. lucide-react only
grep -rn "from.*react-icons\|from.*@mui/icons\|from.*heroicons" components/finance/ --include="*.tsx"
# Expected: 0 results
```

---

## 5. Mapping mỗi Phase → SSOT Components

| Phase | Components dùng |
|---|---|
| **03a** Dashboard | `<KPICard>`, `stats-card`, `icon-box`, `entrance`, `skeleton`, `card-base`, `main-container`, `tab-pill` (sub-nav), recharts |
| **03b** Thu Chi | `<UnifiedModal>`, `<CurrencyInput>`, `input-base`, `label-base`, `form-grid-2col`, `form-actions`, `btn-cta`, `btn-primary`, `btn-secondary`, `badge-*`, `table-header`, `stagger-item` |
| **03c** Debts | `card-interactive`, `accent-card-*`, `badge-warning`/`badge-error`, `overdue-indicator`, `inset-warning`, `section-title`, `detail-grid` |
| **03d** Payroll | `table-header`, `tabular-nums`, `<CurrencyInput>`, `<UnifiedModal>`, `btn-interactive`, `form-total`, `stats-card` |
| **03e** Close | `card-base`, `badge-*` (5 trạng thái), `btn-primary`/`btn-danger`, `<UnifiedModal>` (confirm), `detail-grid` + `detail-sidebar`, `entrance-*`, `disabled` (locked steps) |

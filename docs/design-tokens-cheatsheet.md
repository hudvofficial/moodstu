# 🎨 Mood Studio - Design Tokens Cheat Sheet
**Phiên bản:** v1.0 (Trích xuất từ `pages.css` & `components.css`)
**Mục đích:** SSOT (Single Source of Truth) cho CSS Classes. **TUYỆT ĐỐI KHÔNG** dùng Tailwind classes tĩnh (`px-4`, `rounded-xl`, `bg-*-500`) để tự chế các component cốt lõi dưới đây.

---

## 1. BUTTONS (Nút bấm)
Sử dụng chung với flex/grid alignment, không tự thêm padding/radius dọc ngang.
- `.btn`: Nút cơ bản (Base shape, gap, text-sm, rounded-sm).
- `.btn-primary`: Nút chính nổi bật (Nền nâu thương hiệu, shadow-sm).
- `.btn-interactive`: Nút CTA đặc biệt (Nền cam tương tác, bo tròn nhiều hơn `rounded-lg`). **Khuyên dùng cho nút "Thêm mới"**.
- `.btn-secondary`: Nút phụ (Nền trắng/xám, có viền `border`).
- `.btn-danger`: Nút thao tác nguy hiểm (Xóa, Hủy - Nền đỏ).
- `.btn-ghost`: Nút trong suốt, hover mới hiện nền xám (Dùng cho Cancel/Back).
- `.btn-cta`: Nút kêu gọi hành động full-width 100% (Dành cho Mobile bottom action).
- `.btn-outline`: Nút có viền màu nhạt (Dùng cho Sửa, In ấn).

## 2. ICONS & TOGGLES (Nút biểu tượng & Tool)
- `.btn-icon`: Nút bấm chỉ chứa Icon (Hình tròn 40x40, dùng cho Header/Search Mobile). **LƯU Ý Lesson #57:** Nó mang `display: inline-flex`, hãy cẩn thận khi dùng kèm Tailwind `lg:hidden` (phải bọc `div` cha).
- `.icon-box`: Hộp chứa icon trong Card (Hover sẽ phóng to 1.1).
- `.tab-pill`: Nút chọn bộ lọc (Apple HIG style). Đi kèm `.tab-pill-active` hoặc `.tab-pill-inactive`.
- `.tab-pill-compact`: Nút tab nhỏ gọn (Dùng cho Header Merge bar).

## 3. CARDS & LAYOUTS (Thẻ & Khung)
- `.card-base`: Thẻ tiêu chuẩn (bo góc md, nền card, shadow sm).
- `.card-interactive`: Thẻ bấm được (hover nảy lên, shadow to hơn).
- `.stats-card`: Thẻ chỉ số (Dành riêng cho cụm thống kê tổng).
- `.accent-card`: Thẻ có viền sọc màu bên trái (phân rã bằng `.accent-card-rose`, `.accent-card-sky`, `.accent-card-gold`).
- `.main-container`: Khung layout chính của trang (Responsive padding chuẩn 1024px).

## 4. BAGE (Nhãn trạng thái)
Dạng chữ hoa (`uppercase`), tracking rộng, bo góc nhỏ.
- **Nền trong suốt nhẹ:** `.badge`, `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info`, `.badge-neutral`, `.badge-primary`, `.badge-accent`.
- **Nền Solid (Đặc):** `.badge-solid-[color]` (Phù hợp để nổi bật trên ảnh).

## 5. FORMS & TYPOGRAPHY
- `.section-search-inline`: Khung search input có sẵn padding, flex và viền (Dành cho list header).
- `.section-title`: Tiêu đề các block nội dung trong form/trang chi tiết.
- `.table-header`: Quy chuẩn header cho bảng (Grid/List).

## 6. SHARED UI COMPONENTS (Reusable across modules)

> **Quy tắc:** Mọi module (Contracts, Services, Employees…) PHẢI dùng shared components dưới đây thay vì tự code.

| Component | Import | Mô tả | Variant |
|-----------|--------|-------|---------|
| `<TabsFilter>` | `@/components/ui/tabs-filter` | Filter tabs cho danh sách | `"tabs"` (segmented, desktop) · `"pills"` (inline scroll, mobile) |
| `<SelectPill>` | `@/components/ui/select/SelectPill` | Dropdown filter pill (Radix-based) | — |
| `<FAB>` | `@/components/ui/fab` | Floating Action Button, mobile-only | — |
| `<StatsBar>` | `@/components/ui/stats-bar` | Compact stats row, horizontal scroll mobile | — |
| `<EmptyState>` | `@/components/ui/ux-states` | Empty placeholder (no data) | — |
| `<Pagination>` | `@/components/ui/pagination` | Shared pagination controls | — |
| `<UnifiedModal>` | `@/components/ui/unified-modal` | Modal chuẩn cho form CRUD | — |
| `<ComboboxSearch>` | `@/components/ui/combobox-search` | Searchable dropdown autocomplete | — |

### ⚠️ CSS Specificity Gotcha (Lesson Phase 2):
Khi dùng `.section-search-inline` (có `display: flex` cứng trong CSS) kết hợp với Tailwind `lg:hidden`:
- ❌ SAI: `<div className="lg:hidden section-search-inline">` — CSS custom ghi đè Tailwind utility
- ✅ ĐÚNG: `<div className="lg:hidden"><div className="section-search-inline">…</div></div>` — tách visibility wrapper

---

## 7. SERVICES MODULE — V2 Token Migration Reference

> **Đã hoàn tất:** Phase 1-4 (2026-03-30) | **Parity:** Contracts module Gold Standard

### Button Token Mapping (Services)

| Component | Vị trí | Token áp dụng |
|-----------|--------|---------------|
| `service-table.tsx` | Action buttons (Báo giá, Sửa) | `.btn-icon` |
| `form/index.tsx` | Save (3 chỗ: mobile inline, desktop sidebar, mobile sticky) | `.btn-primary` |
| `form/index.tsx` | Cancel/Back | `.btn-secondary` |
| `form/index.tsx` | Delete (2 chỗ) | `.btn-ghost text-danger` |
| `quote/quote-view.tsx` | Toolbar "In/PDF" | `.btn-secondary` |
| `quote/quote-view.tsx` | Toolbar "Chỉnh sửa" | `.btn-ghost text-primary` |
| `quote/quote-view.tsx` | Sidebar "Tải báo giá PDF" | `.btn-primary` |
| `quote/quote-view.tsx` | Sidebar "Chỉnh sửa dịch vụ" | `.btn-secondary` |
| `quote/quote-view.tsx` | Mobile sticky "In/PDF" | `.btn-primary` |
| `builder/BuilderMode.tsx` | "Thêm tất cả" warning | `.btn-ghost text-state-warning` |
| `builder/BuilderMode.tsx` | "QUY TẮC GIÁ" | `.btn-secondary` |
| `builder/BuilderMode.tsx` | "XEM BÁO GIÁ" | `.btn-primary` |

### Shared Utility Consolidation

| Trước (local) | Sau (SSOT) | Files affected |
|--------------|-----------|----------------|
| `formatPrice()` (local fn) | `formatCurrency()` from `@/lib/utils` | `service-grid.tsx`, `service-table.tsx`, `service-mobile-list.tsx` |

### ⛔ Deprecated / Ghost Tokens

| Token | Trạng thái | Thay thế |
|-------|-----------|----------|
| `icon-btn-sm` | ❌ KHÔNG TỒN TẠI trong CSS | → `.btn-icon` |

### 🟡 Known Debt (Ngoài scope migration)

- `ServiceBundleSection.tsx`: 5 chỗ dùng `material-symbols-outlined` → nên đổi sang `lucide-react`
- `ServiceBundleSection.tsx` L177: `toLocaleString()` → nên đổi sang `formatCurrency()`
- `service-filters.tsx`: Props `search`/`onSearchChange` unused (giữ cho compatibility)

---
### ⚠️ LỆNH CHO AI (AGENT INSTRUCTIONS):
Mỗi khi khởi tạo hoặc chỉnh sửa element `<button>`, `<div>` tạo hình dạng thẻ, form: **Phải truy vấn file này trước** và chọn Token phù hợp. Nếu đã có token, **vô hiệu hóa** việc xài Tailwind. Mọi vi phạm đều là phá hoại SSOT!


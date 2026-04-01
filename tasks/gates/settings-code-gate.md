# 🔒 SETTINGS MODULE — CODE GATE (Anti-Inline Enforcement)

> **MỤC ĐÍCH:** Ngăn chặn pattern lặp lại: inline style, hardcode hex, tự viết component thay vì dùng SSOT.
> **RULE:** Đọc file này TRƯỚC MỖI file component. Tick checklist TRƯỚC KHI viết code.
> **CẬP NHẬT:** 2026-04-01 — Synced với Phase 03 CSS Architecture Restructure (16 modular files)

---

## CSS ARCHITECTURE (SSOT — Phase 03)

```
globals.css                  ← @theme tokens (colors, shadows, radius, spacing, fonts, z-index)
  └─ @import design-system.css  ← INDEX file, chỉ chứa @import
       ├─ Layer 1 — Foundation
       │  ├─ styles/theme.css       (layout tokens: header heights, z-header)
       │  └─ styles/base.css        (element resets)
       ├─ Layer 2 — Typography
       │  └─ styles/typography.css  (.text-display/h1/h2/h3/body/caption/label/overline/amount)
       ├─ Layer 3 — Components
       │  ├─ styles/layout.css      (.main-container, .detail-grid/main/sidebar, .icon-box, .link-base)
       │  ├─ styles/cards.css       (.card-base, .card-interactive, .stats-card, .accent-card-*)
       │  ├─ styles/buttons.css     (.btn-cta/primary/secondary/danger/ghost/icon/outline/interactive)
       │  ├─ styles/badges.css      (.badge + variants, .badge-solid-*, .tag-badge)
       │  ├─ styles/tabs.css        (.tab-pill + active/inactive/compact)
       │  ├─ styles/modals.css      (.modal-overlay/card/header/body/footer/close-btn/drag-handle)
       │  ├─ styles/dropdowns.css   (portal, inline, grouped, search)
       │  ├─ styles/breadcrumb.css  (breadcrumb nav)
       │  ├─ styles/tables.css      (.section-title, .table-header)
       │  └─ styles/animations.css  (keyframes, entrance, stagger, skeleton)
       ├─ Layer 4 — Forms
       │  ├─ styles/forms.css       (@layer base: .input-base, .label-base, .error-text, .form-grid-2col)
       │  └─ styles/select.css      (Radix Select tokens)
       └─ Layer 5 — Utilities
          └─ styles/utilities.css   (.no-scrollbar, .modal-backdrop, .text-interactive, indicators)
```

---

## GATE A: LOOKUP TABLE (Tra cứu TRƯỚC khi viết)

### A1. Layout & Container

| Tôi muốn viết... | ❌ SAI (inline) | ✅ ĐÚNG (SSOT) | Source |
|---|---|---|---|
| Page wrapper | `className="px-4 py-6 max-w-2xl mx-auto"` | `className="main-container"` | `layout.css` |
| 2-col detail page | `className="grid grid-cols-12 gap-6"` | `className="detail-grid"` + `.detail-main` + `.detail-sidebar` | `layout.css` |
| Icon container (40x40) | `className="w-10 h-10 rounded flex items-center justify-center"` | `className="icon-box"` | `layout.css` |

### A2. Cards

| Tôi muốn viết... | ❌ SAI | ✅ ĐÚNG | Source |
|---|---|---|---|
| Card/section | `className="bg-white rounded-xl shadow-md p-4"` | `className="card-base"` | `cards.css` |
| Clickable card | `className="bg-white rounded-xl shadow hover:shadow-lg cursor-pointer"` | `className="card-interactive"` | `cards.css` |
| Stats card | `className="bg-white p-4 rounded-xl shadow"` | `className="stats-card"` | `cards.css` |
| Card with accent bar | `className="border-l-4 border-green-500 p-5 bg-white"` | `className="accent-card accent-card-green"` | `cards.css` |

### A3. Typography (KHÔNG chứa color — color riêng)

| Tôi muốn viết... | ❌ SAI | ✅ ĐÚNG | Source |
|---|---|---|---|
| Page title | `className="text-2xl font-bold"` | `className="text-h1"` | `typography.css` |
| Section title | `className="text-lg font-semibold"` | `className="text-h3"` | `typography.css` |
| Body text | `className="text-sm"` | `className="text-body-sm"` | `typography.css` |
| Caption | `className="text-xs"` | `className="text-caption"` | `typography.css` |
| Label text (không phải form label) | `className="text-xs font-medium"` | `className="text-label"` | `typography.css` |
| Overline (uppercase) | `className="text-xs uppercase tracking-wider"` | `className="text-overline"` | `typography.css` |
| Money amount | `className="text-3xl font-bold"` | `className="text-amount"` | `typography.css` |
| Section with gold bar | `className="border-l-4 pl-4 mb-5"` | `className="section-header-gold"` | `typography.css` |
| Section sub-heading | `className="text-sm font-semibold"` | `className="section-heading"` | `typography.css` |

### A4. Forms

| Tôi muốn viết... | ❌ SAI | ✅ ĐÚNG | Source |
|---|---|---|---|
| Text input | `className="w-full px-3 py-2 border rounded-lg text-sm"` | `className="input-base"` | `forms.css @layer base` |
| Label trên input | `className="text-xs font-medium text-gray-500 mb-1"` | `className="label-base"` | `forms.css` |
| Error message | `className="text-sm text-red-500 mt-1"` | `className="error-text"` | `forms.css` |
| Warning message | `className="text-xs text-amber-500"` | `className="warning-text"` | `forms.css` |
| 2-column form | inline `grid grid-cols-2 gap-4` | `className="form-grid-2col"` | `forms.css` |
| Modal footer buttons | `className="flex justify-end gap-3 pt-2"` | `className="form-actions"` | `forms.css` |
| Form section heading | `className="text-lg font-bold text-gray-900"` | `className="form-section-heading"` | `forms.css` |
| Input validation error | `className="border-red-500"` | thêm `className="input-error"` | `forms.css` |
| Input with search icon | `className="w-full h-10 bg-gray-100 rounded-lg pl-10"` | `className="search-input"` + pl override | `forms.css` |

### A5. Buttons

| Tôi muốn viết... | ❌ SAI | ✅ ĐÚNG | Source |
|---|---|---|---|
| Full-width CTA | `className="w-full bg-[#8B5E3C] text-white py-3 rounded"` | `className="btn-cta"` | `buttons.css` |
| Primary button | `className="bg-primary text-white px-4 py-2 font-bold rounded"` | `className="btn-primary"` | `buttons.css` |
| Secondary button | `className="border border-gray-200 px-4 py-2 rounded"` | `className="btn-secondary"` | `buttons.css` |
| Danger button | `className="bg-red-500 text-white px-4 py-2"` | `className="btn-danger"` | `buttons.css` |
| Ghost button | `className="text-gray-500 hover:bg-gray-100"` | `className="btn-ghost"` | `buttons.css` |
| Icon button (circle) | `className="w-10 h-10 rounded-full flex items-center..."` | `className="btn-icon"` | `buttons.css` |
| Outline button | `className="border border-gray-200 px-3 py-1"` | `className="btn-outline"` | `buttons.css` |
| Interactive CTA (orange) | `className="bg-orange-600 text-white rounded-xl"` | `className="btn-interactive"` | `buttons.css` |

### A6. Badges

| Tôi muốn viết... | ❌ SAI | ✅ ĐÚNG | Source |
|---|---|---|---|
| Status badge | `className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700"` | `className="badge badge-success"` | `badges.css` |
| Warning badge | `className="bg-amber-100 text-amber-800"` | `className="badge badge-warning"` | `badges.css` |
| Error badge | `className="bg-red-100 text-red-700"` | `className="badge badge-error"` | `badges.css` |
| Info badge | `className="bg-blue-100 text-blue-700"` | `className="badge badge-info"` | `badges.css` |
| Primary badge | `className="bg-primary/10 text-primary"` | `className="badge badge-primary"` | `badges.css` |
| Tag label | `className="text-[9px] bg-amber-100/30"` | `className="tag-badge"` | `badges.css` |

### A7. Modals

| Tôi muốn viết... | ❌ SAI | ✅ ĐÚNG | Source |
|---|---|---|---|
| Modal backdrop | `<div className="fixed inset-0 bg-black/50 z-50">` | `className="modal-overlay"` | `modals.css` |
| Modal panel | `<div className="bg-white rounded-xl p-6 max-w-lg">` | `className="modal-card"` | `modals.css` |
| Modal title row | `<div className="flex justify-between p-6">` | `className="modal-header"` | `modals.css` |
| Modal content | `<div className="p-6 overflow-y-auto">` | `className="modal-body"` | `modals.css` |
| Modal footer | `<div className="flex justify-end p-4 border-t">` | `className="modal-footer"` (NO border) | `modals.css` |
| Close button | `<button className="p-2 rounded-full">` | `className="modal-close-btn"` | `modals.css` |
| Drag handle (mobile) | `<div className="w-10 h-1 bg-gray-300 rounded">` | `className="modal-drag-handle"` | `modals.css` |
| Open a modal | Self-manage `useState` + backdrop | `openModal()` system | Lesson #81 |

### A8. Colors & Misc

| Tôi muốn viết... | ❌ SAI | ✅ ĐÚNG | Source |
|---|---|---|---|
| Primary color | `#8B5E3C` hoặc `text-[#8B5E3C]` | `text-primary` (TW4) hoặc `var(--color-primary)` | `globals.css @theme` |
| Text main color | `text-gray-900` hoặc `text-[#3d2b1f]` | `text-text-primary` (TW4) | `globals.css @theme` |
| Text secondary | `text-gray-500` | `text-text-secondary` (TW4) | `globals.css @theme` |
| Text muted | `text-gray-400` | `text-text-muted` (TW4) | `globals.css @theme` |
| Background base | `bg-gray-50` | `bg-bg-base` (TW4) | `globals.css @theme` |
| Background card | `bg-white` | `bg-bg-card` (TW4) | `globals.css @theme` |
| Background hover | `bg-gray-100` | `bg-bg-hover` (TW4) | `globals.css @theme` |
| Border color | `border-gray-200` | **KHÔNG DÙNG BORDER** → dùng shadow | Lesson #64 |
| Interactive text | `text-orange-600` | `className="text-interactive"` | `utilities.css` |
| Icon | `<span className="material-symbols-outlined">` | `<IconName />` from `lucide-react` | Lesson #13 |
| z-index | `z-[9999]` | `var(--z-modal)` | `globals.css @theme` |
| Link | `className="text-primary underline"` | `className="link-base"` | `layout.css` |

### A9. Tabs

| Tôi muốn viết... | ❌ SAI | ✅ ĐÚNG | Source |
|---|---|---|---|
| Tab (active) | `className="bg-primary text-white px-4 py-2 rounded"` | `className="tab-pill tab-pill-active"` | `tabs.css` |
| Tab (inactive) | `className="bg-white text-gray-500 border px-4 py-2 rounded"` | `className="tab-pill tab-pill-inactive"` | `tabs.css` |

### A10. Animations & Skeletons

| Token | Mô tả | Source |
|---|---|---|
| `.animate-fade-in` | Fade in (opacity 0→1, translateY 8→0) | `animations.css` |
| `.animate-slide-up` | Slide up from bottom | `animations.css` |
| `.animate-scale-in` | Scale in (0.95→1) | `animations.css` |
| `.skeleton` | Pulse shimmer loading | `animations.css` |

---

## GATE B: PRE-WRITE CHECKLIST (Tick TRƯỚC KHI viết mỗi file)

```
Trước khi viết file: [_______________]

- [ ] Đã ĐỌC file SSOT tương ứng (forms.css / cards.css / buttons.css...)
- [ ] Đã liệt kê MỌI element UI sẽ viết trong file này (list ra)
- [ ] Đã tra GATE A cho TỪNG element → ghi Token sẽ dùng bên cạnh
- [ ] Nếu cần token CHƯA CÓ → DỪNG → xin phép tạo trong CSS file tương ứng
- [ ] KHÔNG có bất kỳ dòng nào chứa: hardcode hex, inline style, border class
- [ ] Typography class + Color class tách riêng (TWv4 prefix conflict — Lesson #95)
```

## GATE C: POST-WRITE VERIFICATION (Chạy SAU KHI viết xong mỗi file)

```powershell
# Chạy 6 lệnh grep SAU mỗi file — TẤT CẢ PHẢI = 0:
Select-String -Pattern 'style=\{\{' components/settings/[file].tsx
Select-String -Pattern '#[0-9a-fA-F]{3,8}' components/settings/[file].tsx
Select-String -Pattern 'border-(border|gray|slate|zinc)' components/settings/[file].tsx
Select-String -Pattern 'material-symbols' components/settings/[file].tsx
Select-String -Pattern 'text-\[#|bg-\[#|text-gray|text-slate|bg-gray|bg-slate' components/settings/[file].tsx
Select-String -Pattern 'divide-' components/settings/[file].tsx

# Nếu BẤT KỲ grep nào > 0 → DỪNG → SỬA → chạy lại cho đến khi = 0
```

## GATE D: COMPONENT SOURCE PRIORITY (Lesson #35)

```
Trước khi viết BẤT KỲ component nào:

1️⃣ Check components/ui/     → Badge, SelectForm, AvatarDisplay, TabsFilter...?
2️⃣ Check app/styles/*.css   → 16 files SSOT (see architecture above)
3️⃣ Check globals.css @theme → color/spacing/shadow/radius tokens
4️⃣ CHỈ KHI 1-3 KHÔNG CÓ    → Và đã APPROVE mới được tạo mới
```

## GATE E: FORBIDDEN PATTERNS (Auto-fail — REVERT nếu vi phạm)

```
❌ `className="bg-white"`           → `bg-bg-card` (TW4) hoặc `card-base`
❌ className="rounded-xl           → card-base (đã có radius)
❌ className="shadow-md            → card-base (đã có shadow)
❌ className="px-4 py-3 border     → input-base
❌ className="text-sm font-medium text-gray  → label-base
❌ className="text-red-500         → error-text
❌ style={{backgroundColor: ...}}  → CSS token
❌ style={{color: ...}}            → CSS variable (trừ TWv4 text-* conflict)
❌ <span className="material-symbols  → lucide-react
❌ border border-                   → shadow (Lesson #64)
❌ divide-border                    → gap spacing thay vì divider
❌ <select>                         → SelectForm / SelectPill
❌ `text-gray-*`                    → `text-text-primary` / `text-text-secondary` / `text-text-muted`
❌ `bg-gray-*`                      → `bg-bg-base` / `bg-bg-card` / `bg-bg-hover`
❌ `text-green-700 bg-green-100`    → `badge badge-success`
```

---

## Workflow mỗi file:

```
1. Đọc settings-code-gate.md (file này)
2. Tick GATE B (pre-write) — liệt kê elements + tra token
3. Viết code — CỨ MỖI ELEMENT tra GATE A
4. Chạy GATE C (6 lệnh grep) → tất cả PHẢI = 0
5. Check GATE E (forbidden patterns) → 0 vi phạm
6. Mới được báo done → next file
```

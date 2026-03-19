# Design Specifications — Mood Studio v2

**Style:** Apple HIG + Stripe • Modern Luxury • Earth Tone
**Updated:** 2026-03-15

---

## 🎨 Color Palette — Earth Tone (Nâu Đất)

### Light Mode
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-primary` | `#8B5E3C` | 139,94,60 | Buttons, accent, active states |
| `--color-primary-hover` | `#7A5235` | 122,82,53 | Button hover |
| `--color-primary-light` | `#A67C5B` | 166,124,91 | Subtle accent, tags |
| `--color-secondary` | `#C9A96E` | 201,169,110 | Gold accent, badges, highlights |
| `--color-bg` | `#FAF7F2` | 250,247,242 | Main background (warm white) |
| `--color-surface` | `#FFFFFF` | 255,255,255 | Cards, modals |
| `--color-surface-alt` | `#F5EFE6` | 245,239,230 | Sidebar, alternating rows |
| `--color-border` | `#E8DDD0` | 232,221,208 | Borders, dividers |
| `--color-text` | `#3D2B1F` | 61,43,31 | Primary text (dark brown) |
| `--color-text-secondary` | `#8B7355` | 139,115,85 | Muted text |
| `--color-text-tertiary` | `#B09E88` | 176,158,136 | Placeholder, caption |
| `--color-success` | `#5B8C5A` | 91,140,90 | Trạng thái tốt |
| `--color-warning` | `#D4A843` | 212,168,67 | Cảnh báo |
| `--color-danger` | `#C75B5B` | 199,91,91 | Lỗi, huỷ |
| `--color-info` | `#5B7E9E` | 91,126,158 | Thông tin |

### Dark Mode
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--color-primary` | `#C9A96E` | 201,169,110 | Gold accent trong dark |
| `--color-primary-hover` | `#D4B87A` | 212,184,122 | Hover |
| `--color-bg` | `#1A1410` | 26,20,16 | Main dark background |
| `--color-surface` | `#2A2118` | 42,33,24 | Cards (dark brown) |
| `--color-surface-alt` | `#342A20` | 52,42,32 | Sidebar |
| `--color-border` | `#4A3C2E` | 74,60,46 | Borders |
| `--color-text` | `#F5EFE6` | 245,239,230 | Primary text (cream) |
| `--color-text-secondary` | `#B09E88` | 176,158,136 | Muted text |
| `--color-text-tertiary` | `#8B7355` | 139,115,85 | Placeholder |

---

## 📝 Typography — Inter (Sans-Serif Hiện Đại)

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| Display | Inter | 36px | 700 (Bold) | 1.1 | -0.02em |
| H1 | Inter | 28px | 600 (Semi) | 1.2 | -0.01em |
| H2 | Inter | 22px | 600 | 1.3 | -0.01em |
| H3 | Inter | 18px | 600 | 1.4 | 0 |
| Body | Inter | 16px | 400 | 1.5 | 0 |
| Body Small | Inter | 14px | 400 | 1.4 | 0 |
| Caption | Inter | 12px | 400 | 1.3 | 0 |
| Label | Inter | 13px | 500 | 1.2 | 0 |

**Font Stack:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
**Google Fonts:** `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`

### Quy tắc Viết hoa (Text Casing) — QUAN TRỌNG!

| Loại | Cách viết | Ví dụ đúng | Ví dụ SAI |
|------|-----------|-----------|-----------|
| **Heading (H1-H3)** | Sentence case | `Danh sách hợp đồng` | `DANH SÁCH HỢP ĐỒNG` |
| **Label (form)** | Sentence case | `Email`, `Mật khẩu` | `EMAIL`, `MẬT KHẨU` |
| **Button** | Sentence case | `Đăng nhập`, `Tạo mới` | `ĐĂNG NHẬP` |
| **Tab/Filter** | Sentence case | `Tất cả`, `Đang xử lý` | `TẤT CẢ` |
| **Badge** | Sentence case | `Đã cọc`, `Hoàn thành` | `ĐÃ CỌC` |
| **Menu/Sidebar** | Sentence case | `Hợp đồng`, `Khách hàng` | `HỢP ĐỒNG` |
| **Breadcrumb** | Sentence case | `Dashboard > Hợp đồng` | `DASHBOARD > HỢP ĐỒNG` |
| **Footer/Caption** | Sentence case | `© 2026 Mood Studio` | — |

### ❌ KHÔNG BAO GIỜ dùng `text-transform: uppercase` trừ:
- Logo text "Mood Studio" (tuỳ design)
- Contract code: `MS-2026-001` (mã hệ thống, ok)

### ❌ KHÔNG dùng `letter-spacing: 0.03em+` cho labels — v1 bị font chân + spacious = cũ kỹ



---

## 📐 Spacing System (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon gaps, tight |
| `--space-2` | 8px | Compact spacing |
| `--space-3` | 12px | Inner padding small |
| `--space-4` | 16px | Default padding |
| `--space-5` | 20px | Card padding |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Large sections |
| `--space-10` | 40px | Page sections |
| `--space-12` | 48px | Page margins |

---

## 🔲 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Buttons, inputs |
| `--radius-md` | 10px | Cards, tags |
| `--radius-lg` | 14px | Modals, panels |
| `--radius-xl` | 20px | Large containers |
| `--radius-full` | 9999px | Avatars, pills |

---

## 🌫️ Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(61,43,31,0.05)` | Subtle lift |
| `--shadow-sm` | `0 2px 4px rgba(61,43,31,0.08)` | Cards hover |
| `--shadow-md` | `0 4px 12px rgba(61,43,31,0.10)` | Cards default |
| `--shadow-lg` | `0 8px 24px rgba(61,43,31,0.12)` | Modals |
| `--shadow-xl` | `0 16px 48px rgba(61,43,31,0.16)` | Floating panels |

---

## 📱 Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Mobile | 375px | 1 column, bottom nav, FAB |
| Tablet | 768px | 2 columns, compact sidebar |
| Desktop | 1280px | 12-col grid, full sidebar |
| Wide | 1440px | Centered container, max-width |

---

## ✨ Animations

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `--transition-fast` | 150ms | ease-out | Button hover, focus |
| `--transition-base` | 250ms | cubic-bezier(0.4, 0, 0.2, 1) | Tabs, toggles |
| `--transition-slow` | 350ms | ease-in-out | Modal open/close |
| `--transition-modal` | 300ms | cubic-bezier(0.16, 1, 0.3, 1) | Slide-up mobile |

---

## 🎯 Design Principles

1. **Warm Luxury** — Nâu đất tạo cảm giác sang trọng, ấm áp cho studio cưới
2. **Breathing Space** — Generous whitespace (24-32px gaps minimum)
3. **Subtle Depth** — Nhẹ nhàng shadow, không quá nặng
4. **Gold Accents** — `#C9A96E` cho highlights, badges premium
5. **Consistent Corners** — 10px radius cho cards, 6px cho buttons
6. **Micro-animations** — Hover effects mượt 150ms, transitions 250ms

---

## 🧱 Shared Component Inventory

### Folder Structure (CHỐT — không thêm bớt tự ý!)

```
components/
├── layout/                     ← Layout shell (3 files MAX)
│   ├── AppShell.tsx                ← Sidebar + Header + Content (responsive)
│   ├── BottomNav.tsx               ← Mobile 5 tabs (fixed bottom)
│   └── Breadcrumb.tsx              ← Desktop breadcrumb
│
├── ui/                         ← Atomic UI components
│   ├── Button.tsx                  ← Primary/Secondary/Ghost/Danger variants
│   ├── Badge.tsx                   ← Status badges (ENUM → color map)
│   ├── Input.tsx                   ← Text input (label, error, icon)
│   ├── CurrencyInput.tsx           ← VND format (từ Coffee, 79 lines)
│   ├── Select.tsx                  ← Dropdown select
│   ├── DatePicker.tsx              ← Date picker
│   ├── SearchBar.tsx               ← 1 component responsive (mobile + desktop)
│   ├── TabsFilter.tsx              ← 1 DUY NHẤT cho filter tabs (pill style)
│   ├── Modal.tsx                   ← Simple shell (< 80 lines, slide-up/scale-in)
│   ├── ConfirmDialog.tsx           ← Extends Modal (xoá, huỷ, confirm)
│   ├── Skeleton.tsx                ← Loading skeleton shimmer
│   ├── EmptyState.tsx              ← No data (icon + text + CTA)
│   ├── Avatar.tsx                  ← User/customer avatar (fallback initials)
│   ├── Card.tsx                    ← Base card container
│   ├── KPICard.tsx                 ← Dashboard stat card (icon + value + trend)
│   └── Timeline.tsx                ← Vertical timeline (contract lifecycle)
│
├── data/                       ← Data display
│   ├── DataTable.tsx               ← Desktop=table, Mobile=card list
│   └── Pagination.tsx              ← Page navigator
│
└── feedback/                   ← User feedback
    ├── Toast.tsx                   ← Sonner wrapper (success/error/info)
    └── FABButton.tsx               ← Mobile floating action button
```

### Component Specs

| Component | Max Lines | Props (max) | Responsive | Notes |
|-----------|----------|-------------|------------|-------|
| AppShell | 200 | 3 | ✅ Mobile/Tablet/Desktop | Sidebar auto collapse |
| BottomNav | 60 | 0 | Mobile only | 5 tabs: Dashboard/HĐ/KH/Kho/More |
| Button | 80 | 8 | ✅ | size: sm/md/lg, variant: primary/secondary/ghost/danger |
| Badge | 40 | 3 | ✅ | Pill shape, auto color from ENUM |
| Input | 60 | 10 | ✅ | Label, error, icon left/right |
| CurrencyInput | 80 | 5 | ✅ | Copy từ Coffee, vi-VN format |
| SearchBar | 60 | 4 | ✅ | 1 component, KHÔNG tách mobile/desktop |
| TabsFilter | 40 | 3 | ✅ | Horizontal scroll mobile, pill active |
| Modal | 80 | 8 | ✅ | Slide-up mobile, scale-in desktop |
| ConfirmDialog | 50 | 6 | ✅ | Extends Modal, danger variant |
| DataTable | 150 | 6 | ✅ | Desktop=<table>, Mobile=<div> cards |
| KPICard | 40 | 5 | ✅ | Icon, value, label, trend (↑↓), color |

---

## 🏷️ Status Badge Colors (THỐNG NHẤT — ENUM → Color Map)

### Contract Status → Badge (UNIFIED — Earth-tone only, NO purple/orange)

| ENUM Value | Label VN | Color Token | Tailwind (Light) | Tailwind (Dark) |
|------------|----------|-------------|------------------|-----------------|
| `draft` | Nháp | `stone` | `bg-stone-100 text-stone-700` | `bg-stone-800 text-stone-300` |
| `deposited` | Đã cọc | `amber` | `bg-amber-50 text-amber-800` | `bg-amber-900/30 text-amber-400` |
| `preparing` | Chuẩn bị | `sky` | `bg-sky-50 text-sky-700` | `bg-sky-900/30 text-sky-400` |
| `shooting` | Đang chụp | `primary` | `bg-primary/10 text-primary` | `bg-primary/20 text-primary-light` |
| `editing` | Hậu kỳ | `amber` | `bg-amber-100 text-amber-800` | `bg-amber-900/30 text-amber-300` |
| `reviewing` | Duyệt ảnh | `sky` | `bg-sky-100 text-sky-800` | `bg-sky-900/30 text-sky-300` |
| `delivering` | Đang giao | `amber` | `bg-amber-50 text-amber-800` | `bg-amber-900/30 text-amber-400` |
| `completed` | Hoàn thành | `emerald` | `bg-emerald-50 text-emerald-800` | `bg-emerald-900/30 text-emerald-400` |
| `cancelled` | Đã huỷ | `red` | `bg-red-50 text-red-800` | `bg-red-900/30 text-red-400` |

### Costume Status → Badge

| ENUM Value | Label VN | Color |
|------------|----------|-------|
| `available` | Sẵn sàng | `green` |
| `rented` | Đang thuê | `red` |
| `reserved` | Đã đặt | `gold` |
| `washing` | Đang giặt | `blue` |
| `repairing` | Đang sửa | `orange` |
| `retired` | Thanh lý | `gray` |

### Payment Status → Badge

| Status | Label | Color |
|--------|-------|-------|
| Chưa TT | Chưa thanh toán | `red` |
| Đang TT | Còn nợ | `gold` |
| Đã TT đủ | Đã thanh toán | `green` |

---

## 🖼️ Icon System

### ❌ KHÔNG dùng:
- Material Symbols (`material-symbols-outlined`) — 500KB+ font
- Emoji icons
- Custom SVG tự vẽ

### ✅ CHỈ dùng: `lucide-react`
- Tree-shakeable (~1KB/icon)
- Consistent stroke width (2px default)
- React component: `<Home size={20} />`

### Icon Mapping

| Feature | Icon Name | Usage |
|---------|-----------|-------|
| Dashboard | `LayoutDashboard` | Sidebar, Bottom nav |
| Contracts | `FileText` | Sidebar, Bottom nav |
| Customers | `Users` | Sidebar, Bottom nav |
| Payments | `Wallet` | Sidebar |
| Inventory | `Shirt` | Sidebar, Bottom nav |
| Settings | `Settings` | Sidebar |
| Search | `Search` | Header |
| Notifications | `Bell` | Header |
| Create | `Plus` | FAB, Buttons |
| Edit | `Pencil` | Actions |
| Delete | `Trash2` | Actions |
| Back | `ArrowLeft` | Header |
| Close | `X` | Modal |
| Calendar | `Calendar` | Date fields |
| Money | `Banknote` | Finance |
| Chart | `BarChart3` | Dashboard |
| Filter | `Filter` | Toolbar |
| Download | `Download` | Export |
| Eye | `Eye` / `EyeOff` | Password toggle |
| Check | `Check` | Success |
| Alert | `AlertCircle` | Warning |
| Info | `Info` | Info |
| Moon/Sun | `Moon` / `Sun` | Theme toggle |
| Menu | `Menu` | Hamburger |
| More | `MoreHorizontal` | Bottom nav "More" |

---

## 📐 Layout Patterns (Responsive)

### Mobile (375px)

```
┌─────────────────────────┐
│ [≡]  Mood Studio   [🔔][👤]│  ← Header (h-14, sticky)
├─────────────────────────┤
│                         │
│   Content (1 col)       │  ← padding: 16px
│   Cards stacked         │
│   DataTable → Card list │
│                         │
├─────────────────────────┤
│ 🏠   📋   👥   👗   •••  │  ← Bottom Nav (h-16, fixed)
└─────────────────────────┘
                    [+]     ← FAB (bottom-right, 56px)
```

### Tablet (768px)

```
┌───┬──────────────────────────┐
│ 🏠│ Search...        [🔔] [👤]│  ← Header (h-14)
│ 📋├──────────────────────────┤
│ 👥│                          │
│ 💰│   Content (2 cols)       │
│ 👗│   Grid 2x cards          │
│   │   DataTable responsive   │
│ ──│                          │
│ ⚙️│                          │
└───┴──────────────────────────┘
 ↑ Mini sidebar (w-16, icons only)
```

### Desktop (1280px+)

```
┌──────────┬────────────────────────────────────┐
│          │ Dashboard > Hợp đồng   [🔍]  🔔  👤 │ ← Header (h-16) + Breadcrumb
│  Mood    ├────────────────────────────────────┤
│  Studio  │                                    │
│          │   Content (max-w-[1400px], centered)│
│ 🏠 Dashboard │                                │
│ 📋 Hợp đồng  │   12-col grid                 │
│ 👥 Khách hàng │   DataTable full width        │
│ 💰 Thanh toán │   Charts + Cards              │
│ 👗 Kho váy    │                               │
│          │                                    │
│ ─────────│                                    │
│ ⚙️ Cài đặt   │                               │
└──────────┴────────────────────────────────────┘
 ↑ Full sidebar (w-60, text + icon)
```

---

## 🚫 V1 UI Sai Lầm — LUẬT CỨNG CHO V2

| # | Sai lầm V1 | Luật V2 |
|---|-----------|---------|
| 1 | Header contrast sai (Tailwind default ≠ custom palette) | Dùng CSS variable `--color-*`, KHÔNG hardcode Tailwind color |
| 2 | Filter bar có card wrapper thừa | TabsFilter standalone, KHÔNG wrap thêm container |
| 3 | 3 tab components trùng (ClientTabs + ClientFilterPills + FilterChips) | CHỈ 1: `TabsFilter.tsx` |
| 4 | Icon hỗn tạp (Material Symbols + emoji + text) | CHỈ `lucide-react` |
| 5 | Modal 276 lines (quá lớn) | Modal < 80 lines + ConfirmDialog riêng |
| 6 | globals.css > 20K lines | Tailwind v4 `@theme` — globals.css < 100 lines |
| 7 | useScrollDirection custom hook phức tạp | CSS `position: sticky` đơn giản |
| 8 | 2 SearchInput riêng (mobile + desktop) | 1 SearchBar responsive |
| 9 | Material Symbols font 500KB+ | lucide-react tree-shake (~1KB/icon) |
| 10 | PageLayout 15 props | AppShell max 3-5 props, dùng context/slots |
| 11 | Không thống nhất status badge color | ENUM → Color Map (bảng trên) |

---

*Tạo bởi AWF /visualize — Updated 2026-03-15*

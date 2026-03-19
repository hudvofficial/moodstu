# 🎨 STITCH MASTER BRIEF — Mood Studio V2

> **⚠️ ĐỌC FILE NÀY TRƯỚC MỖI LẦN GEN STITCH. KHÔNG ĐƯỢC SKIP.**
> **Mục đích:** Đảm bảo mọi screen gen ra đều nhất quán — dù qua bao nhiêu session.

**Stitch Project ID:** `3342062284752503492`
**Last updated:** 2026-03-15T19:33+07:00
**Source of truth:** Extracted from P04 Contract List HTML (`37b29e12`) — verified, not from memory.

---

## 1. DESIGN SYSTEM — EXTRACTED TỪ P04 HTML (GOLD STANDARD)

> ⚠️ Palette này được extract trực tiếp từ Tailwind config trong file HTML của
> screen P04 Contract List (`37b29e12`). KHÔNG ĐƯỢC thay đổi trừ khi anh duyệt.

### 1.1 Stitch Project Settings
```
customColor: "#8b5e3c"
colorMode: LIGHT
font: INTER
roundness: ROUND_EIGHT (8px)
saturation: 3
```

### 1.2 Color Palette — Tailwind Config từ P04 HTML

#### Core Tokens (extracted from P04 `tailwind.config`)
| Token | Hex | Nguồn | Dùng cho |
|-------|-----|-------|----------|
| **primary** | `#8b5e3c` | P04 config | Buttons, active tabs, links, titles, mã HĐ |
| **accent** | `#c9a96e` | P04 config | Gold — "Đã thu" amounts, premium highlights |
| **neutral-brown** | `#8b7355` | P04 config | Text secondary, labels, captions, table headers |
| **sidebar-bg** | `#f5efe6` | P04 config | Sidebar background — **WARM CREAM, KHÔNG PHẢI XANH ĐẬM** |
| **background-light** | `#f7f7f6` | P04 config | Page background, table header bg, content area |
| **background-dark** | `#1d1815` | P04 config | Dark mode page background |

#### Semantic Colors (extracted from P04 class usage)
| Token | Tailwind Class | Hex approx | Dùng cho |
|-------|---------------|------------|----------|
| **Success** | `emerald-100/800` | `#d1fae5` bg + `#065f46` text | "Đã cọc", "Hoàn thành" badges |
| **Success text** | `emerald-600` | `#059669` | "Đã thu đủ" amount text |
| **Danger** | `red-700/80` | `#b91c1c` | "Còn nợ" amount text |
| **Danger badge** | `red-500` | `#ef4444` | Notification dot |
| **Warning** | `amber-100/800` | `#fef3c7` bg + `#92400e` text | "Chờ duyệt", "Đang chuẩn bị" |
| **Info/Active** | `blue-100/800` | `#dbeafe` bg + `#1e40af` text | "Đang thực hiện", "Đang chụp" |
| **Neutral badge** | `slate-100/700` | `#f1f5f9` bg + `#334155` text | "Nháp" |
| **Post-production** | `amber-100/800` | same as warning | "Hậu kỳ" |
| **Bride** | `pink-500` | `#ec4899` | Cô dâu label |
| **Groom** | `blue-500` | `#3b82f6` | Chú rể label |

#### UI Surface Colors (extracted from P04 classes)
| Element | Tailwind Class | Mô tả |
|---------|---------------|-------|
| **Sidebar** | `bg-sidebar-bg` (`#f5efe6`) | Warm cream, border-r `border-primary/10` |
| **Header** | `bg-white` | 80px height, `border-b border-primary/5` |
| **Content area** | `bg-background-light` (`#f7f7f6`) | Padding 32px (p-8) |
| **Cards** | `bg-white` | `rounded-xl border border-primary/5 shadow-sm` |
| **Table** | `bg-white` | `rounded-[10px] shadow-sm border border-primary/5` |
| **Table header row** | `bg-background-light` | Text `neutral-brown uppercase tracking-wider` |
| **Table row hover** | `hover:bg-primary/5` | Subtle brown tint |
| **Active filter pill** | `bg-primary text-white` | `rounded-full` |
| **Inactive filter pill** | `bg-white text-neutral-brown` | `border border-primary/5 rounded-full` |
| **Pagination active** | `bg-primary text-white` | `rounded-lg` |
| **Dividers** | `border-primary/5` or `border-primary/10` | Very subtle brown tint |

### 🚫 FORBIDDEN COLORS — CẬP NHẬT
- ❌ `purple` / `violet` — P04 đang dùng cho "Đang chụp" → **PHẢI ĐỔI thành `blue-100/800`**
- ❌ `orange` — P04 đang dùng cho "Hậu kỳ" → **PHẢI ĐỔI thành `amber-100/800`**
- ❌ `teal`, `cyan`, `neon green`, `coral` — NEVER
- ❌ `indigo`, `lavender` — NEVER
- ❌ Dark green sidebar (`#1E3D2E`) — **NEVER EXISTED, em bịa ra**
- ✅ Chỉ dùng: primary/accent/neutral-brown + emerald/red/amber/blue/slate/pink

### 1.3 Status Badge Map (CẬP NHẬT — earth-tone compliant)

| Status | Vietnamese | Tailwind Classes |
|--------|-----------|-----------------|
| `draft` | Nháp | `bg-slate-100 text-slate-700` |
| `deposited` | Đã cọc | `bg-emerald-100 text-emerald-800` |
| `preparing` | Đang chuẩn bị | `bg-amber-100 text-amber-800` |
| `in_progress` | Đang chụp | `bg-blue-100 text-blue-800` |
| `post_production` | Hậu kỳ | `bg-amber-100 text-amber-800` |
| `payment_complete` | Đã thanh toán đủ | `bg-emerald-100 text-emerald-800` |
| `delivered` | Đã giao | `bg-emerald-100 text-emerald-800` |
| `completed` | Hoàn thành | `bg-emerald-100 text-emerald-800` |
| `cancelled` | Đã huỷ | `bg-red-100 text-red-800` |

> ⚠️ P04 HTML hiện có 2 violations: "Đang chụp" dùng `purple`, "Hậu kỳ" dùng `orange`.
> Khi code, dùng bảng trên. Khi gen Stitch mới, include bảng này trong prompt.

### 1.4 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 (page title) | Inter | 24px | Bold (700) |
| H2 (section title) | Inter | 20px | Semibold (600) |
| H3 (card title) | Inter | 16px | Semibold (600) |
| Body | Inter | 14px | Regular (400) |
| Caption | Inter | 12px | Medium (500) |
| Case | — | — | Sentence case always |

### 1.5 Spacing & Shape

| Property | Value |
|----------|-------|
| Spacing scale | 4 – 8 – 12 – 16 – 24 – 32 |
| Border radius | 8px (rounded-lg) or 12px (rounded-xl) |
| Card shadow | Subtle, 0 1px 3px rgba(0,0,0,0.08) |
| Divider | `border-primary/5` or `border-primary/10` (subtle brown tint) |

### 1.6 Breakpoints (BẮT BUỘC 3 SCREENS MỖI MÀN HÌNH)

| Device | Width | Layout | Navigation |
|--------|-------|--------|------------|
| **Desktop** | 1440px | Sidebar visible (240px) + Content area | Sidebar left |
| **Tablet** | 768px | No sidebar, hamburger menu | Top header + hamburger |
| **Mobile** | 375px | Single column, card-based | Bottom nav bar (5 items) |

---

## 2. LAYOUT RULES

### 2.1 Desktop (1440px)
- **Sidebar:** 240px fixed left, bg `#f5efe6` (warm cream), border-r `border-primary/10`, logo + studio name in primary color
- **Header:** 60px height, bg `#FFFFFF`, search input + notification bell + user avatar
- **Content:** Padding 24px, max-width content area
- **Grid:** 12-column grid for content

### 2.2 Tablet (768px)
- **NO sidebar** — hamburger menu top-left
- **Header:** 56px, simplified
- **Content:** Padding 16px, 2-column grid where appropriate
- **Lists:** Compact rows instead of wide tables

### 2.3 Mobile (375px)
- **NO sidebar, NO hamburger** — bottom navigation bar
- **Bottom nav:** 5 icons (Dashboard, Contracts, Customers, Inventory, More)
- **Header:** 48px, simplified, back arrow for detail pages
- **Content:** Single column, card-based lists
- **FAB:** Floating action button for "Create" actions
- **Forms:** Full-screen bottom sheet (slide up)

---

## 3. COMPONENT PATTERNS

### 3.1 List Pages
- **Desktop:** Data table with columns, sortable headers
- **Tablet:** Compact table or card list
- **Mobile:** Card-based list, each card = 1 row of data
- **Filters:** Horizontal pill tabs (Active chip style)
- **Search:** Input with search icon, always visible on desktop, collapse on mobile
- **Empty state:** Illustration + message + CTA button
- **FAB (mobile only):** Bottom-right, primary color, "+" icon

### 3.2 Detail Pages
- **Desktop:** 2-column layout (left = main info, right = sidebar/meta)
- **Tablet:** Single column, sections stacked
- **Mobile:** Single column, tabbed sections
- **Back navigation:** Breadcrumb (desktop), back arrow (mobile/tablet)
- **Status badge:** Colored pill based on status

### 3.3 Forms / Modals
- **Desktop:** Center modal, max-width 640px, scale-in animation
- **Tablet:** Center modal, slightly narrower
- **Mobile:** Full-screen bottom sheet, slide-up animation
- **CurrencyInput:** VND format (25.000, 1.500.000)
- **Buttons:** Primary = `#8B5E3C` bg, white text. Secondary = outline

### 3.4 Status Badges (Contract Lifecycle) — from Section 1.3
| Status | Tailwind Classes |
|--------|-----------------|
| draft | `bg-slate-100 text-slate-700` |
| deposited | `bg-emerald-100 text-emerald-800` |
| preparing | `bg-amber-100 text-amber-800` |
| in_progress | `bg-blue-100 text-blue-800` |
| post_production | `bg-amber-100 text-amber-800` |
| payment_complete | `bg-emerald-100 text-emerald-800` |
| delivered | `bg-emerald-100 text-emerald-800` |
| completed | `bg-emerald-100 text-emerald-800` |
| cancelled | `bg-red-100 text-red-800` |

---

## 4. PHASE-BY-PHASE SCREEN TRACKER

### Naming Convention
```
Title format: "Mood Studio [Page Name]"
Mobile title: "Mood Studio Mobile [Page Name]"  
Tablet title: "Mood Studio Tablet [Page Name]"
```

### P01: Login
| Screen | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Login page | ✅ `a1fe5ee1` (v2 luxury) | ⬜ NEEDED | ✅ `04285807` (v2 luxury) |

### P03: Customers
| Screen | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Customer List | ✅ `a691f8a2` | ⬜ NEEDED | ✅ `30876d5e` |
| Customer Detail | ✅ `56f4db2e` | ⬜ NEEDED | ✅ `33de258b` |

**Also visible (chưa quyết định giữ/ẩn):**
- `30153e25` CRM Nerve Center (D) + `bc3119cd` Mobile CRM Nerve Center (M)
- `21e3a83f` Lead Detail View (D) + `661028a8` Mobile Lead Detail View (M)

### P04: Contracts
| Screen | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Contract List | ✅ `37b29e12` | ⬜ NEEDED | ✅ `ca6942ab` |
| Contract Detail | ✅ `9e95bc24` | ⬜ NEEDED | ✅ `16c286be` |
| Create Contract | ✅ `590edbd1` | ⬜ NEEDED | ✅ `dedc3e9d` |

### P05: Payments (Finance Hub)
| Screen | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Finance Hub | ⬜ NEEDED | ⬜ NEEDED | ⬜ NEEDED |
| Receipt List | ⬜ NEEDED | ⬜ NEEDED | ⬜ NEEDED |
| Create Payment Modal | ⬜ NEEDED | ⬜ NEEDED | ⬜ NEEDED |

**Notes:** Tất cả P05 screens cũ đã bị ẩn. Cần gen lại hoàn toàn.
- Finance Hub = overview page: debt summary card + payment list + reminders
- Receipt = phiếu thu list view
- Create Payment = modal có CurrencyInput, method selector

### P06: Inventory
| Screen | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Inventory List | ⬜ NEEDED | ⬜ NEEDED | ⬜ NEEDED |
| Item Detail | ⬜ NEEDED | ⬜ NEEDED | ⬜ NEEDED |
| Create/Edit Item | ⬜ NEEDED | ⬜ NEEDED | ⬜ NEEDED |

**Notes:**
- List = grid/list toggle, filter by type (Váy/Áo dài/Vest), status badges
- Detail = ảnh lớn, info, availability calendar, lịch sử thuê
- 6 status: available, reserved, rented, cleaning, maintenance, retired

### P07: Dashboard
| Screen | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| Dashboard | ✅ `04dfec54` | ⬜ NEEDED | ✅ `3698f09c` |

**Notes:**
- 4 KPI cards (doanh thu, HĐ mới, công nợ, HĐ hoàn thành)
- Line chart doanh thu 6 tháng
- Pie chart doanh thu theo loại DV
- Upcoming events + Payment reminders

---

## 5. STITCH PROMPT TEMPLATE

Khi gen screen, LUÔN dùng format prompt này:

```
Design a [DEVICE] screen for "Mood Studio" — a luxury wedding studio management app.

**Screen:** [Screen name and purpose]
**Device:** [Desktop 1440px / Tablet 768px / Mobile 375px]

**Design System (from P04 gold standard):**
- Color Mode: Light
- Font: Inter (300-700 weights)
- Tailwind config colors:
  - primary: #8b5e3c (warm brown — buttons, active tabs, links)
  - accent: #c9a96e (gold — collected amounts, premium highlights)
  - neutral-brown: #8b7355 (secondary text, captions, labels)
  - sidebar-bg: #f5efe6 (warm cream — sidebar background) [Desktop only]
  - background-light: #f7f7f6 (page bg, content area)
- Cards: bg-white, rounded-xl, border border-primary/5, shadow-sm
- Borders/dividers: border-primary/5 or border-primary/10 (subtle brown tint)
- Border radius: 8px (default) or 12px (xl)

**Status badges (STRICT mapping):**
- Nháp: bg-slate-100 text-slate-700
- Đã cọc: bg-emerald-100 text-emerald-800
- Đang chuẩn bị: bg-amber-100 text-amber-800
- Đang chụp: bg-blue-100 text-blue-800 (NOT purple!)
- Hậu kỳ: bg-amber-100 text-amber-800 (NOT orange!)
- Hoàn thành: bg-emerald-100 text-emerald-800
- Đã huỷ: bg-red-100 text-red-800

**FORBIDDEN:** purple, violet, teal, cyan, neon, coral, indigo, dark green sidebar

**Layout:** [Describe specific layout for this device]

**Content:** [List all UI elements needed]

**Interactions:** [Hover states, active states, etc.]

**Reference:** This must visually match other screens in this project — same sidebar (#f5efe6 cream), header, color palette, spacing.
```

---

## 6. QUY TẮC KHI GEN (KHÔNG ĐƯỢC VI PHẠM)

1. **PHẢI đọc file này trước khi gen** — không dựa vào memory
2. **PHẢI gen 3 breakpoints** cho mỗi màn hình (D + T + M)
3. **PHẢI include đầy đủ design tokens** trong prompt
4. **PHẢI check screen đã tồn tại** trước khi gen (tránh duplicate)
5. **KHÔNG gen nhiều hơn 3 screens/lần** — gen xong, kiểm tra, rồi gen tiếp
6. **KHÔNG sáng tạo màu** — chỉ dùng palette ở Section 1
7. **KHÔNG đổi layout convention** — sidebar desktop, bottom nav mobile
8. **PHẢI update tracker** (Section 4) sau mỗi lần gen thành công
9. **Brief → Anh duyệt → Gen** — không skip bước duyệt
10. **Stitch = layout reference** — khi code, dùng design tokens làm SSOT cho colors

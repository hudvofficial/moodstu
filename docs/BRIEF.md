# 💡 BRIEF: Mood Studio V2

**Ngày tạo:** 2026-03-15
**Cập nhật:** 2026-03-16 (Post-Foundation Audit)
**Loại sản phẩm:** Web App (Next.js 14 + Supabase)
**Mô hình:** Single-tenant (1 studio dùng riêng)

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

Studio Mood (áo cưới + chụp ảnh đa dịch vụ) đang gặp các vấn đề vận hành:

- **Quên thu tiền đợt 2/3** → mất doanh thu, phải nhắc thủ công
- **Không biết váy nào đang trống** → hẹn khách rồi mới biết váy đang cho thuê
- **Đụng lịch chụp** → 2 thợ chụp cùng slot, hoặc cùng 1 bộ váy
- **Cuối tháng không biết lời lỗ** → thu chi ghi tay/Excel, thiếu sót
- **Chăm sóc khách hàng kém** → không nhớ lịch sử, quên follow-up
- **Quản lý nhân viên thủ công** → chấm công tay, tính lương sai
- **Team Media chia việc qua Zalo** → quên task, không ai track tiến độ, đụng lịch
- **Dịch vụ đa dạng nhưng quản lý chung** → cưới, baby, concept lẫn lộn, khó thống kê

## 2. GIẢI PHÁP ĐỀ XUẤT

Web app quản lý toàn diện cho Mood Studio, tập trung vào:
- **Hợp đồng** là trung tâm (mọi thứ xoay quanh hợp đồng)
- **Tự động nhắc thanh toán** theo milestone
- **Kho váy real-time** (biết ngay váy nào trống/đang thuê/đang giặt)
- **Lịch chụp không đụng** (check conflict tự động)
- **Báo cáo tài chính tức thì** (dashboard doanh thu, chi phí, lãi lỗ)
- **Quản lý Team Media** (lịch làm việc, chia task, theo dõi tiến độ)
- **Dịch vụ đa dạng** (cưới, baby, concept — mỗi loại có quy trình riêng)

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Primary:** Chủ studio / Quản lý (xem tổng quan, báo cáo, quyết định)
- **Secondary:**
  - Sale/Tư vấn (tạo hợp đồng, chăm sóc khách)
  - Team Media — Photographer, Videographer, Editor (xem lịch, nhận task)
  - Makeup Artist (xem lịch assign)
  - Kế toán (thu chi, phiếu thu, báo cáo)

---

## 4. TECH STACK (Chốt — không đổi)

| Layer | Technology | Lý do |
|-------|-----------|-------|
| **Framework** | Next.js 14 (App Router) | SSR + Server Actions |
| **Language** | TypeScript (strict, no `any`) | Type safety |
| **Styling** | Tailwind CSS v4 (@theme tokens) | Design tokens |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Storage) | All-in-one |
| **Data Fetching** | SWR (client only) | Lightweight cache |
| **Icons** | lucide-react | Tree-shake ~1KB/icon |
| **Charts** | recharts | React-native charting |
| **Toast** | sonner | Minimal toast lib |
| **Font** | Inter (Google Fonts) | Vietnamese support |
| **Deploy** | Vercel + Supabase Cloud | Auto-scaling |

### ❌ KHÔNG DÙNG:
- ~~Shadcn/ui~~ → Custom components theo Coffee pattern
- ~~React Query~~ → SWR only (1 cache system)
- ~~Material Symbols~~ → lucide-react only
- ~~Font Serif / Italic~~ → Inter sans-serif only

---

## 5. DESIGN SYSTEM (Chốt — SSOT)

### 5.1 Architecture — 3 tầng

```
Tầng 1: @theme tokens (globals.css)         ← Giá trị gốc
Tầng 2: CSS utility classes (design-system.css) ← Classes dùng tokens
Tầng 3: Components (.tsx)                    ← Chỉ dùng class names
```

### 5.2 Color Palette — Earth-Tone (60-30-10 rule)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#8B5E3C` | 10% — Actions, brand |
| `--color-primary-dark` | `#3D2B1F` | Headings |
| `--color-accent` | `#C9A96E` | Gold highlights |
| `--color-bg-base` | `#FAF7F2` | 60% — Page background |
| `--color-bg-card` | `#FFFFFF` | 30% — Cards |
| `--color-bg-sidebar` | `#F5EFE6` | Sidebar |
| `--color-text-primary` | `#3D2B1F` | Main text |
| `--color-text-secondary` | `#8B7355` | Secondary text |
| `--color-text-muted` | `#B8A898` | Placeholder, captions |

### 5.3 Typography — Inter (7 cấp + responsive)

| Class | Size | Weight | Responsive |
|-------|------|--------|-----------|
| `.text-display` | 36px | 700 | clamp(28px, 4vw, 36px) |
| `.text-h1` | 28px | 600 | clamp(22px, 3vw, 28px) |
| `.text-h2` | 22px | 600 | clamp(18px, 2.5vw, 22px) |
| `.text-h3` | 18px | 600 | — |
| `.text-body` | 16px | 400 | — |
| `.text-body-sm` | 14px | 400 | — |
| `.text-caption` | 12px | 400 | — |
| `.text-label` | 13px | 500 | — |

**Quy tắc:** Sentence case ONLY. KHÔNG uppercase labels. Ref: `docs/css-classes.md`

### 5.4 Shared CSS Classes (design-system.css)

| Category | Classes |
|----------|---------|
| Typography | `.text-display` → `.text-label`, `.text-page-title`, `.text-page-subtitle` |
| Layout | `.main-container`, `.section-title` |
| Forms | `.label-base`, `.input-base` |
| Cards | `.card-base`, `.card-interactive`, `.stats-card` |
| Buttons | `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost` |
| Badges | `.badge`, `.badge-success/warning/error/info/neutral/primary/accent` |
| Animation | `.entrance` + delays, `.stagger-item`, `.card-entrance` |
| Loading | `.skeleton`, `.skeleton-text`, `.skeleton-title`, `.skeleton-card` |
| Interaction | `.icon-box`, `.link-base`, `.disabled` |
| Utilities | `.scrollbar-hide`, `.modal-backdrop` |
| Dark Mode | Commented prep — uncomment khi cần |

---

## 6. SHARED PATTERNS (Carry-over từ V1/Coffee)

### ✅ Đã implement:

| Pattern | Source | File | Lines |
|---------|--------|------|-------|
| Modal (slide-up / scale-in) | Coffee | `components/ui/unified-modal.tsx` | ~150 |
| Modal Provider (Linear pattern) | Custom | `lib/context/modal-context.tsx` | — |
| CurrencyInput (vi-VN) | Coffee | `components/ui/currency-input.tsx` | ~80 |
| Button component | Custom | `components/ui/button.tsx` | — |
| Input component | Custom | `components/ui/input.tsx` | — |
| Select component | Custom | `components/ui/select.tsx` | — |
| Table component | Custom | `components/ui/table.tsx` | — |
| UX States (Empty + Loading) | Custom | `components/ui/ux-states.tsx` | — |
| Navigation SSOT | Custom | `lib/navigation.ts` | — |
| Responsive hook | Custom | `hooks/use-mobile.ts` | — |
| Design System CSS | Custom | `app/design-system.css` | ~350 |

### ✅ Bổ sung (2026-03-16 — Phase 01b):

| Pattern | Source | File | Lines |
|---------|--------|------|-------|
| SWR Cache Keys | Coffee | `lib/swr.ts` | 78 |
| TabsFilter | Coffee | `components/ui/tabs-filter.tsx` | 40 |
| SearchBar | Coffee | `components/ui/search-bar.tsx` | 30 |
| Badge + ENUM→Color | Custom | `components/ui/badge.tsx` | 65 |
| Toast (Sonner) | — | `app/(protected)/layout.tsx` | +10 |
| useRealtime (SWR) | V1→SWR | `hooks/use-realtime.ts` | 135 |
| cachedQuery (server) | V1 | `lib/cache.ts` | 140 |
| Skeleton component | Custom | `components/ui/skeleton.tsx` | 55 |
| useInfiniteScroll | Coffee | `hooks/use-infinite-scroll.ts` | 40 |
| Avatar | Custom | `components/ui/avatar.tsx` | 60 |
| DatePicker | Custom | `components/ui/date-picker.tsx` | 38 |
| Pagination | Custom | `components/ui/pagination.tsx` | 68 |
| KPICard | Custom | `components/ui/kpi-card.tsx` | 45 |

---

## 7. LAYOUT SHELL (Chốt)

```
┌─────────────────────────────────────────────────────────┐
│ 📱 MOBILE (< 768px)                                     │
│                                                         │
│ ┌─────────────────────────────────────────────────┐     │
│ │ Header (module name + description + search)     │     │
│ ├─────────────────────────────────────────────────┤     │
│ │                                                 │     │
│ │              Page Content                       │     │
│ │              (full width)                       │     │
│ │                                                 │     │
│ ├─────────────────────────────────────────────────┤     │
│ │ Bottom Nav (5 tabs: Dashboard/HĐ/KH/Kho/More)  │     │
│ └─────────────────────────────────────────────────┘     │
│                                                         │
│ 🖥️ DESKTOP (≥ 1024px)                                   │
│                                                         │
│ ┌──────┬──────────────────────────────────────────┐     │
│ │      │ Header (module name + desc + search)     │     │
│ │ Side │──────────────────────────────────────────│     │
│ │ bar  │                                          │     │
│ │      │          Page Content                    │     │
│ │ (w56)│          (max-w-1600px)                  │     │
│ │      │                                          │     │
│ └──────┴──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 8. BUSINESS LOGIC TÓM TẮT

### Quy trình hợp đồng (9 bước):
```
Lead → Tạo HĐ → Đặt cọc → Chuẩn bị → Thực hiện → Hậu kỳ → TT đợt 2 → Giao SP → Chăm sóc sau
```

### Loại dịch vụ (6 loại):
- 💍 Cưới (Wedding) — phức tạp, nhiều bước, có trang phục
- 👶 Baby — ngắn gọn, 1-2 buổi
- 🎨 Concept — linh hoạt
- 🪪 Hình thẻ — walk-in, POS-like
- 🎨 In thiệp cưới — có deadline
- 👘 Cho thuê trang phục — standalone

### Vai trò (5):
- Admin → Xem/sửa tất cả
- Manager → Quản lý HĐ, team, tài chính (không xem lương)
- Sale → Tạo lead/HĐ/phiếu thu, chỉ xem HĐ mình
- Media → Xem lịch, nhận task, cập nhật tiến độ
- Viewer → Chỉ xem

### Logic tài chính:
- Phiếu thu liên kết HĐ, có milestone
- Phiếu chi phân loại, có duyệt
- Công nợ 2 chiều (khách nợ studio + studio nợ lab)
- Atomic RPC cho calculations (không client-side calc)

---

## 9. WAVES

### 🏗️ Wave 1 — MVP (7 phases, ~8 ngày):

| # | Phase | Scope | Status |
|---|-------|-------|--------|
| 01 | Foundation | Auth, layout, shared components | ✅ Done (cần bổ sung 5 patterns) |
| 02 | Database | 35 tables, ENUM, RLS | ✅ Done |
| 03 | CRM | KH + Leads + Pipeline + Kanban | 🎨 Designing |
| 04 | Contracts | HĐ CRUD, 12 loại DV, lifecycle | ⬜ Pending |
| 05 | Payments | Phiếu thu, công nợ, nhắc TT | ⬜ Pending |
| 06 | Inventory | Kho trang phục, conflict check | ⬜ Pending |
| 07 | Dashboard | KPIs, charts, role-based stats | ⬜ Pending |

### 🎁 Wave 2 — Full Features (15 phases, ~15 ngày):
- Vận hành: Team Media, Calendar, Services
- Tài chính: Expenses, Debts, Goals, Reports, Payment Plans
- Nhân sự: HR, Payroll
- In ấn: Labs, Wedding Cards
- Hệ thống: Quick POS, Audit Logs, Notifications, Settings

---

## 10. V1 SAI LẦM → V2 TRÁNH (53 lessons)

Xem đầy đủ: `tasks/lessons.md`

**Top 10 quan trọng nhất:**
1. ENUM, không VARCHAR cho status (lesson #1)
2. SWR only, không React Query (#5)
3. globals.css < 100 lines, tách design-system.css (#6)
4. Max 250 lines/file (#7)
5. Atomic RPC cho financial calc (#8)
6. getSession() không getUser() (#10)
7. 1 icon lib (lucide-react) (#13)
8. Modal < 80 lines (#15)
9. Inter only, không font-serif/italic (#50)
10. CSS classes SSOT, không hardcode Tailwind (#53)

---

## 11. BƯỚC TIẾP THEO

1. ⚠️ Bổ sung 5 shared patterns còn thiếu (useRealtime, SWR, TabsFilter, SearchBar, Badge)
2. Update `plan.md` cho sync với BRIEF này (bỏ Shadcn/ui reference)
3. Tiếp tục Phase 03 (CRM) hoặc Phase 04 (Contracts)

---

## 12. FILES THAM KHẢO

| File | Mục đích |
|------|---------|
| `docs/design-specs.md` | Design system chi tiết (colors, typography, spacing, shadows, animations) |
| `docs/css-classes.md` | Cheat sheet CSS classes |
| `tasks/lessons.md` | 53 lessons learned |
| `tasks/pre-code-checklist.md` | 7 bước bắt buộc trước khi code |
| `plans/plan.md` | Project plan tổng (22 phases) |
| `plans/phase-01-foundation.md` | Phase 01 details |
| `docs/reference/` | 7 files gốc (onboarding, UI plan, wireframe, frontend, backend, API, test) |
| `lib/navigation.ts` | Navigation SSOT (modules, labels, icons) |
| `app/design-system.css` | CSS utility classes (10 sections) |
| `app/globals.css` | Design tokens (@theme) |

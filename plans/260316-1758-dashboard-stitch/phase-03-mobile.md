# Phase 03: Tối ưu UI Mobile Responsive
Status: ⬜ Pending
Dependencies: Phase 02 (UI Desktop)

## Objective
Tối ưu Dashboard cho mobile (375px) dựa trên patterns V1 + mcoffe.

## Research Findings

### V1 Dashboard Layout (0Moodstudio):
- **QuickLinks** grid 5 cột compact trên mobile (icon 52x52)
- **Stats** grid 2x2 trên mobile, 4 cột trên desktop
- **Lists** 1 cột dọc, `pb-10` cho safe area
- Không có back-to-top button (dùng BottomNav native)

### V2 App Shell (mood-studio):
- Main content đã có `pb-28 lg:pb-8` → safe padding BottomNav ✅
- Đã có `scroll-smooth` trên main container ✅
- Spacing: `px-4 py-6` mobile, `md:px-8 md:py-8` desktop ✅

### mcoffe:
- Không có ScrollToTop component
- Dùng `useInfiniteScroll` cho danh sách dài

## Tasks

### 3.1 Back-to-Top FAB (Component mới)
- [ ] Tạo `components/ui/scroll-to-top.tsx`
- [ ] Hiện khi scroll > 300px, ẩn khi ở đầu trang
- [ ] Vị trí: bottom-right, trên BottomNav (bottom-24 lg:bottom-8)
- [ ] Animation: fade-in + scale, icon ArrowUp
- [ ] Dùng `useScrollDirection` hook có sẵn

### 3.2 Dashboard Mobile Spacing
- [ ] KPI cards: giảm padding `p-3` trên mobile (hiện `p-4`)
- [ ] KPI text: `text-lg` mobile → `text-h2` desktop
- [ ] Charts section: gap nhỏ hơn `gap-3` mobile

### 3.3 Service Pie Chart Mobile
- [ ] Donut nhỏ hơn: `w-[100px] h-[100px]` mobile → `w-[140px]` desktop
- [ ] Legend text nhỏ hơn
- [ ] Layout `flex-col` mobile → `flex-row` desktop

### 3.4 Lists Mobile
- [ ] Item padding `p-2` mobile → `p-3` desktop
- [ ] Truncate text dài hơn trên mobile
- [ ] "Xem tất cả" button dễ tap hơn (min-h-[44px])

## Files to Create/Modify
- `+ components/ui/scroll-to-top.tsx` (MỚI)
- `~ components/layout/app-shell.tsx` (thêm ScrollToTop)
- `~ components/dashboard/revenue-chart.tsx` (responsive classes)
- `~ components/dashboard/service-pie-chart.tsx` (responsive classes)
- `~ components/dashboard/upcoming-events.tsx` (responsive classes)
- `~ components/dashboard/payment-reminders.tsx` (responsive classes)
- `~ components/ui/kpi-card.tsx` (responsive text/padding)

## Design System Rules
- Mobile padding: `p-3` (cards), `px-4` (sections)
- Touch target: min 44px height
- BottomNav safe area: `pb-28` (đã có sẵn trong app-shell)
- Breakpoints: mobile < 768 < tablet < 1024 < desktop

---
Next Phase: Phase 04 - Tích hợp & Render Data

# Phase 02: Dashboard — Quick Access Grid
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thêm grid shortcuts trên Dashboard mobile (kiểu V1) để user thấy tất cả modules ngay trên trang chủ.
Desktop → ẩn grid (sidebar đã có).

## Design

### Grid layout (mobile only — ẩn trên lg:)
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ icon │ │ icon │ │ icon │ │ icon │ │ icon │
│ name │ │ name │ │ name │ │ name │ │ name │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```
- Grid 5 cột, mỗi item = icon-box + label
- Icon trong rounded square (giống V1 screenshot)
- V1 có màu riêng cho mỗi icon → dùng `iconColor` từ một mapping
- Chỉ hiện trên mobile (lg:hidden)
- Đặt **trên KPI cards**, dưới greeting

### Modules hiển thị (tất cả MODULES từ navigation.ts)
- Loại bỏ "dashboard" (đã ở trang chủ rồi)

## Implementation Steps

### 1. Tạo component QuickAccessGrid
- [ ] File: `components/dashboard/quick-access-grid.tsx`
- [ ] Import MODULES từ navigation.ts
- [ ] Render grid 5 cột trên mobile
- [ ] Mỗi item: Link → module.href
- [ ] Icon trong rounded square background (dùng mapping màu)
- [ ] Label dưới icon (dùng shortLabel || label)
- [ ] Class: `lg:hidden` – ẩn trên desktop

### 2. Định nghĩa icon colors
- [ ] Tạo mapping `MODULE_COLORS` cho mỗi module id → bg color + text color
- [ ] Dùng semantic colors từ design tokens (primary, info, warning, success, accent)
- [ ] Đặt trong component hoặc navigation.ts

### 3. Cập nhật Dashboard page
- [ ] Import QuickAccessGrid
- [ ] Đặt trước KPI cards section
- [ ] Wrap trong container phù hợp responsive

## Files to Create/Modify
- `components/dashboard/quick-access-grid.tsx` — **NEW**
- `app/(protected)/dashboard/page.tsx` — thêm grid

## Test Criteria
- [ ] Mobile: Grid hiện 5 cột, tất cả modules
- [ ] Bấm module → navigate đúng
- [ ] Desktop: Grid ẩn hoàn toàn
- [ ] Icons có màu nền matching design system
- [ ] Labels gọn (dùng shortLabel)

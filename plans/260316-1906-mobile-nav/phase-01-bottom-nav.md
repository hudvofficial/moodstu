# Phase 01: Bottom Nav — Thay Menu bằng "Thêm" popup
Status: ⬜ Pending
Dependencies: None

## Objective
Thay nút Menu (hamburger) bằng nút "Thêm" (⋯) kiểu mcoffe.
Bấm → popup nhỏ hiện phía trên bottom nav, liệt kê các module không nằm trong bottom nav chính.

## Design

### Bottom Nav (5 items — bỏ Settings, bỏ Menu)
```
HOME  ·  HỢP ĐỒNG  ·  LỊCH  ·  CRM  ·  THÊM (⋯)
```

### "Thêm" popup (theo mcoffe style)
- Popup xuất hiện phía trên nút "Thêm"
- Background overlay mờ (click outside → đóng)
- Danh sách dọc: icon + tên module
- Active state nếu đang ở module đó
- Modules trong popup: Finance, Printing, Reports, Productivity, Services, Inventory, Dresses, Employees, Settings, Moodie

### Behavior
- Bấm "Thêm" → toggle popup
- Bấm module → navigate + đóng popup
- Bấm outside → đóng popup
- Nếu đang ở 1 module trong popup → nút "Thêm" cũng highlight

## Implementation Steps

### 1. Sửa bottom-nav.tsx
- [ ] Bỏ Settings khỏi `BOTTOM_NAV_IDS` (["contracts", "calendar", "crm"])
- [ ] Import `MoreHorizontal`, `X` từ lucide-react, bỏ `Menu`
- [ ] Bỏ prop `onMenuClick` (không cần drawer toggle nữa trên mobile)
- [ ] Thêm state `showMore` (useState)
- [ ] Tính `moreActive` = kiểm tra pathname có match module nào trong popup không
- [ ] Thêm `MORE_ITEMS` = MODULES lọc ra những module KHÔNG nằm trong NAV_ITEMS
- [ ] Thay nút Menu → nút "Thêm" (toggle showMore)
- [ ] Thêm popup overlay + danh sách module (render khi showMore=true)

### 2. Style popup (theo mcoffe)
- [ ] Fixed overlay: `fixed inset-0 z-50` + `bg-black/20` backdrop
- [ ] Popup container: `absolute bottom-20 right-2 bg-bg-card rounded-2xl shadow-xl border border-border p-2 w-48`
- [ ] Mỗi item: `flex items-center gap-3 px-3 py-2.5 rounded-xl`
- [ ] Active: `bg-primary/10 text-primary`
- [ ] Inactive: `text-text-secondary hover:bg-bg-hover`

## Files to Modify
- `components/layout/bottom-nav.tsx` — refactor toàn bộ

## Test Criteria
- [ ] Bottom nav hiện 5 items: Home, Hợp đồng, Lịch, CRM, Thêm
- [ ] Bấm "Thêm" → popup hiện danh sách modules còn lại
- [ ] Bấm module trong popup → navigate đúng + popup đóng
- [ ] Bấm outside popup → popup đóng
- [ ] Đang ở /finance → nút "Thêm" highlight primary
- [ ] Desktop → bottom nav ẩn (lg:hidden)

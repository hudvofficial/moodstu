/plan Tối ưu mobile UI cho trang Employee Detail (/employees/[id])

## VẤN ĐỀ HIỆN TẠI (2 bugs visual trên mobile)

### Bug 1: Card "Ghi chú" sát card thông tin — không có khoảng cách
- Mobile layout có 2 element: card thông tin (card-base p-4) và EmployeeNotes
- 2 element này nằm sát nhau vì wrapper div `lg:hidden` không có gap
- Cần thêm gap giữa 2 card

### Bug 2: Badges "Media" và "● Đang làm" xuống 2 hàng thay vì cùng 1 hàng
- Container badges hiện tại có class `flex-wrap` → badges tự wrap xuống dòng trên mobile
- 2 badges nhỏ hoàn toàn đủ chỗ nằm 1 hàng
- Cần bỏ `flex-wrap` để badges luôn inline

## FILE CẦN SỬA

Chỉ sửa 1 file: `components/employees/employee-detail-page.tsx`

### Fix 1 — Thêm gap cho mobile wrapper

Tìm:
```tsx
<div className="lg:hidden">
```

Đổi thành:
```tsx
<div className="lg:hidden flex flex-col gap-3">
```

### Fix 2 — Bỏ flex-wrap ở badges

Tìm:
```tsx
<div className="flex items-center gap-2 mt-1.5 flex-wrap">
```

Đổi thành:
```tsx
<div className="flex items-center gap-1.5 mt-1.5">
```

## QUY TẮC
- CHỈ sửa 2 dòng trên, KHÔNG thay đổi gì khác
- KHÔNG chạm desktop layout
- KHÔNG thay đổi logic hay imports
- Sau khi sửa, mở browser mobile (375px) verify: badges 1 hàng + gap giữa 2 card

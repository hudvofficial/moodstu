/code Fix 2 bugs mobile trên trang Employee Detail

## FILE: components/employees/employee-detail-page.tsx

## Fix 1 — Mobile wrapper thiếu gap (card info sát card Ghi chú)

Dòng 159, tìm:
```tsx
<div className="lg:hidden">
```

Đổi thành:
```tsx
<div className="lg:hidden flex flex-col gap-3">
```

## Fix 2 — Badges xuống 2 hàng thay vì cùng 1 hàng

Dòng 106, tìm:
```tsx
<div className="flex items-center gap-2 mt-1.5 flex-wrap">
```

Đổi thành:
```tsx
<div className="flex items-center gap-1.5 mt-1.5">
```

## QUY TẮC
- CHỈ sửa 2 dòng trên
- KHÔNG thay đổi gì khác
- KHÔNG chạm desktop layout
- KHÔNG thay đổi logic hay imports

## VERIFY
Mở browser mobile (375px) trang /employees/[id]:
1. Badges "Media" và "● Đang làm" phải nằm cùng 1 hàng
2. Giữa card thông tin và card "Ghi chú" phải có khoảng cách (gap-3 = 12px)

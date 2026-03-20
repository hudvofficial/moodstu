# Plan: Create Contract Page — Header Compact
Created: 2026-03-20 13:40
Status: 🟡 Planning

## Mục tiêu
Xóa block title + description thừa dưới breadcrumb ở trang `/contracts/create`.
Breadcrumb đã đủ context → title "Tạo hợp đồng" + desc "Điền thông tin..." là redundant.

## Hiện trạng (index.tsx line 151-159)
```tsx
{mode === "create" && (
  <div className="max-lg:hidden space-y-1">
    <h2 className="text-h2">Tạo hợp đồng</h2>
    <p className="text-body-sm text-text-secondary">
      Điền thông tin để tạo hợp đồng mới
    </p>
  </div>
)}
```

## Sau khi fix
- Xóa block trên (desktop title + desc)
- Form bắt đầu ngay sau breadcrumb
- Tiết kiệm ~80px dọc

## Files cần sửa
- `components/contracts/form/index.tsx` — xóa lines 151-159

## Phase: 1 task duy nhất
- [ ] Xóa block title+desc create mode ở desktop

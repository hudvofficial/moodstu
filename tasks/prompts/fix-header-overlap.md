@[/code] Fix header overlap /contracts/create mobile

## Bối cảnh

Sau refactor 4 phases (FullpageFormShell → HeaderSlotsContext), header /contracts/create mobile bị lỗi:
- Title "Tạo hợp đồng mới" chồng lên badge "HĐ-0009"
- NotificationBell vẫn hiện trên mobile form page

## Plan đã duyệt — CHỈ sửa 1 file: components/layout/header.tsx

### Fix 1: Ẩn NotificationBell khi có rightSlot trên mobile (L219)

```diff
  {/* Notification bell */}
- <NotificationBell />
+ <div className={cn(rightSlot && "max-lg:hidden")}>
+   <NotificationBell />
+ </div>
```

Lý do: Khi page set rightSlot (badge, actions), bell không cần trên mobile. Desktop vẫn hiện.

### Fix 2: Title center thêm max-width safe zone (L154)

```diff
- <div className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 lg:flex-1 lg:ml-2 flex flex-col min-w-0">
+ <div className="absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-160px)] lg:static lg:translate-x-0 lg:max-w-none lg:flex-1 lg:ml-2 flex flex-col min-w-0">
```

Lý do: 160px = ~80px mỗi bên cho left/right slots. Title sẽ truncate thay vì đè.

## Gate

1. Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md
2. Mở browser 375px /contracts/create TRƯỚC khi sửa

## Verify

1. npm run build — pass
2. Mobile 375px:
   - /contracts/create — title + badge KHÔNG chồng, bell ẩn, FormActions hiện
   - /dashboard — bell vẫn hiện (không có rightSlot)
   - /contracts — bell vẫn hiện
   - /contracts/[id] — bell ẩn mobile (có rightSlot), title truncate nếu dài
3. Desktop 1440px — /contracts/create header đúng, bell hiện

## KHÔNG ảnh hưởng

Dashboard, /contracts, /contracts/[id]/gallery — không có rightSlot → bell vẫn hiện, title không bị max-width trên desktop.

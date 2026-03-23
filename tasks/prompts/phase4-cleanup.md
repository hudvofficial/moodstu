/code Phase 4: Cleanup code thừa (header.tsx + utilities.css)

## Bối cảnh

Phase 1-3 đã xong: /contracts/create dùng system header qua HeaderSlotsContext. Giờ dọn code thừa.

## File 1: components/layout/header.tsx

### Thay đổi:
- Xóa biến isFullpageForm (khoảng L96): `const isFullpageForm = pathname.endsWith('/create');`
- Xóa mọi references đến isFullpageForm (class max-lg:hidden conditional)
- Lý do: app-shell.tsx đã xử lý — isFormPage ẩn BottomNav, Header luôn hiện. Logic isFullpageForm trong header.tsx là redundant.

## File 2: app/styles/utilities.css

### Thay đổi:
- Xóa .mobile-header-spacer class + media query (khoảng L51-58)
- Lý do: grep 0 kết quả trong TSX — dead code

```diff
- .mobile-header-spacer {
-   padding-top: var(--header-mobile-h);
- }
-
- @media (min-width: 1024px) {
-   .mobile-header-spacer {
-     padding-top: 0;
-   }
- }
```

## Gate

1. Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md

## Verify Phase 4 (Final)

1. npm run build — pass
2. Mobile 375px — test TẤT CẢ 5 trang:
   - /dashboard — header mặc định, spacing 16px ✅
   - /contracts — header mặc định, spacing 16px ✅
   - /contracts/create — system header + slots, BottomNav ẩn ✅
   - /contracts/[id] — HeaderSlots, sticky ✅
   - /contracts/[id]/gallery — HeaderSlots, flush ✅
3. Desktop 1440px — /contracts/create layout 2 cột ✅
4. Kill port 3000 + npm run dev lại

## CHỈ SỬA 2 FILES: header.tsx + utilities.css. KHÔNG đụng file khác.

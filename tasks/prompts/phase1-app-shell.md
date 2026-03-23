/code Phase 1: Tách FULLPAGE → FORM_PAGE pattern trong app-shell.tsx

## Bối cảnh

Refactor header system: /contracts/create cần dùng system header (HeaderSlotsContext) thay vì header riêng. Đây là Phase 1/4 — chỉ sửa app-shell.tsx.

## File sửa: components/layout/app-shell.tsx

### Thay đổi 1: Tách FULLPAGE_PATTERNS (L16-19)

```diff
- const FULLPAGE_PATTERNS = [
-   /^\/contracts\/create$/,
-   /^\/contracts\/[^/]+\/edit$/,
- ];
+ const FULLPAGE_PATTERNS: RegExp[] = [
+   // Reserved — no page currently needs to hide BOTH header + bottomnav
+ ];
+
+ // Form pages: HIỆN Header (dùng HeaderSlotsContext), ẨN BottomNav (form có footer riêng)
+ const FORM_PAGE_PATTERNS = [
+   /^\/contracts\/create$/,
+   /^\/contracts\/[^/]+\/edit$/,
+ ];
```

### Thay đổi 2: Thêm isFormPage (sau L40)

```diff
  const isFullpage = FULLPAGE_PATTERNS.some(p => p.test(pathname));
+ const isFormPage = FORM_PAGE_PATTERNS.some(p => p.test(pathname));
  const isNoPadding = NO_PADDING_PATTERNS.some(p => p.test(pathname));
```

### Thay đổi 3: BottomNav ẩn cho formPage (L106)

```diff
- {!isFullpage && <BottomNav />}
+ {!(isFullpage || isFormPage) && <BottomNav />}
```

### Thay đổi 4: Main padding thêm case isFormPage (L94-101)

```diff
  isFullpage
    ? ""
+   : isFormPage
+     ? "px-2 py-4 lg:px-6 lg:py-6"
    : isNoPadding
      ? "pb-28 lg:pb-6"
      : "px-2 py-4 md:px-6 md:py-6 lg:px-6 pb-28 lg:pb-6",
```

## Gate

1. Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md
2. Mở browser /contracts/create trước khi sửa

## Verify Phase 1

1. npm run build — pass không lỗi
2. Mở /contracts/create mobile 375px:
   - System header HIỆN (vì isFullpage giờ = false cho /create)
   - BottomNav ẨN (isFormPage = true)
   - FormActions footer vẫn hiện
   - LƯU Ý: header sẽ hiện nhưng chưa có slots (← Back, title) — đó là bình thường, Phase 2 sẽ thêm
3. Mở /dashboard, /contracts — KHÔNG bị ảnh hưởng

## CHỈ SỬA 1 FILE: app-shell.tsx. KHÔNG đụng file khác.

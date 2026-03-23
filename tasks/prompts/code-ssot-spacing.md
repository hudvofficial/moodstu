@[/code] SSOT spacing header → content

## Bối cảnh

Spacing header → content = 28px đúng visual nhưng CHƯA SSOT. Hiện hardcode 6 chỗ:

| # | File | Hardcode |
|---|---|---|
| 1 | app-shell.tsx L104 | `py-4` (16px) formPage |
| 2 | app-shell.tsx L107 | `py-4` (16px) default |
| 3 | contracts-list-client.tsx L152 | `pt-3!` (12px) |
| 4 | dashboard/page.tsx L16 | `pt-3!` (12px) |
| 5 | contract-detail-client.tsx L214 | `pt-3!` (12px) |
| 6 | fullpage-form-shell.tsx L33 | `pt-3` (12px) |

Gap = 2 lớp: main `py-4` (16px) + container `pt-3` (12px) = 28px

## Mục tiêu

Đổi giá trị 28px thành chuẩn 1 nơi (token), khi đổi token → TẤT CẢ trang đổi theo.

## Giải pháp: Token trong main-container

Vì tất cả trang (trừ formPage) đều dùng `main-container`, fix tại đây:

### Bước 1: Tạo token trong globals.css (section spacing)

```css
--spacing-main-y: 12px;  /* Gap bổ sung header→content (cộng với main py-4=16px → total 28px) */
```

### Bước 2: Cập nhật main-container (components.css L169-175)

```diff
  .main-container {
    width: 100%;
-   padding: var(--spacing-sm);
+   padding: var(--spacing-main-y) var(--spacing-sm) var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-base);
  }
```

### Bước 3: Xóa tất cả `pt-3!` override

```diff
# contracts-list-client.tsx L152
- <div className="main-container gap-3! pt-3!">
+ <div className="main-container gap-3!">

# dashboard/page.tsx L16
- <div className="main-container pt-3!">
+ <div className="main-container">

# contract-detail-client.tsx L214
- <div className="main-container max-lg:pb-24 pt-3!">
+ <div className="main-container max-lg:pb-24">
```

### Bước 4: FullpageFormShell dùng cùng token

FullpageFormShell KHÔNG dùng main-container → cần tham chiếu token trực tiếp:

```diff
# fullpage-form-shell.tsx L33
- <div className="pt-3 pb-24 lg:pb-6">
+ <div className="pb-24 lg:pb-6" style={{ paddingTop: 'var(--spacing-main-y)' }}>
```

Hoặc tạo utility class trong components.css:
```css
.form-shell-body {
  padding-top: var(--spacing-main-y);
  padding-bottom: 96px; /* pb-24 */
}
@media (min-width: 1024px) {
  .form-shell-body { padding-bottom: 24px; }
}
```

## Verify

1. npm run build — pass
2. Grep `pt-3!` → 0 kết quả (đã xóa hết)
3. Grep `spacing-main-y` → globals.css (define) + components.css (use) + fullpage-form-shell (use)
4. Mobile 375px 5 trang: gap đồng nhất
5. Thử đổi token `--spacing-main-y: 16px` → xác nhận TẤT CẢ trang thay đổi → rollback về 12px

## Gate

Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md

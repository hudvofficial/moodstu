@[/code] Chuẩn hóa spacing header → content = 28px (khớp /contracts)

## Bối cảnh

Audit sâu xác nhận: /contracts gap = 28px (main py-4=16px + container pt-3!=12px). Các trang khác chưa khớp.

| Trang | Hiện tại | Cần | Fix |
|---|---|---|---|
| /contracts (CHUẨN) | 28px ✅ | 28px | Giữ nguyên |
| /dashboard | 24px | 28px | +4px |
| /contracts/[id] | 24px | 28px | +4px |
| /contracts/create | 16px | 28px | +12px |
| /contracts/gallery | 0px | 0px | Giữ nguyên (cố ý) |

## CHỈ SỬA 3 FILES

### File 1: app/(protected)/dashboard/page.tsx (L16)

Dashboard dùng `main-container` (padding 8px) + main py-4 (16px) = 24px. Cần thêm 4px:

```diff
- <div className="main-container">
+ <div className="main-container pt-3!">
```

### File 2: components/contracts/detail/contract-detail-client.tsx (L214)

Detail dùng `main-container` (8px) + main py-4 (16px) = 24px. Cần thêm 4px:

```diff
- <div className="main-container max-lg:pb-24">
+ <div className="main-container max-lg:pb-24 pt-3!">
```

### File 3: components/layout/fullpage-form-shell.tsx (L33)

Create form: main py-4 (16px) + FullpageFormShell (0px) = 16px. Cần thêm 12px:

```diff
- <div className="pb-24 lg:pb-6">
+ <div className="pt-3 pb-24 lg:pb-6">
```

## LƯU Ý
- `pt-3!` dùng `!important` (khớp pattern contracts-list) để override `main-container` padding
- FullpageFormShell dùng `pt-3` (không !) vì không có main-container cần override
- Gallery giữ nguyên 0px — noPadding case, thiết kế cố ý

## Gate

1. Đọc tasks/pre-code-checklist.md + tasks/lessons.md + tasks/gates/before-edit.md
2. Mở browser 375px /dashboard + /contracts/create + /contracts/[id] TRƯỚC khi sửa

## Verify

1. npm run build — pass
2. Mobile 375px — 5 trang:
   - /contracts: 28px ✅ (không đổi)
   - /dashboard: 28px ✅ (thêm pt-3!)
   - /contracts/[id]: 28px ✅ (thêm pt-3!)
   - /contracts/create: 28px ✅ (thêm pt-3)
   - /contracts/gallery: 0px ✅ (không đổi)
3. Desktop 1440px — spot check /dashboard + /contracts không bị lỗi layout

## FUTURE: SSOT token

Sau khi fix xong, nếu muốn SSOT triệt để → tạo CSS token `--spacing-main-gap` và áp dụng vào `main-container` class. Nhưng đó là refactor riêng, không làm trong lần này.

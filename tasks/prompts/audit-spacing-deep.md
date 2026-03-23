@[/debug] Audit sâu spacing header → content (trace code + SSOT)

## Bối cảnh

Spacing header → content không thống nhất giữa các trang mobile. Có rủi ro **double padding** vì cấu trúc lồng nhau:
```
<main>          ← app-shell.tsx: py-4 / formPage py-4 / noPadding...
  <div class="main-container">  ← components.css: padding: var(--spacing-sm)
    <div class="pt-3!">         ← page-level override
      content
    </div>
  </div>
</main>
```

**CHUẨN: /contracts** — lấy gap visual trên trang này làm reference.

## Bước 1: Trace padding chain cho /contracts (CHUẨN)

Đọc code theo thứ tự:

1. **app-shell.tsx L96-107** — xác định /contracts match case nào (fullpage? formPage? noPadding? default?)
   - `/contracts` KHÔNG match FULLPAGE_PATTERNS, FORM_PAGE_PATTERNS — nên dùng **default case**
   - Default: `px-2 py-4 md:px-6 md:py-6 lg:px-6 pb-28 lg:pb-6`
   - → **main padding-top = py-4 = 16px**

2. **contracts-list-client.tsx L152** — `<div className="main-container gap-3! pt-3!">`
   - `main-container` (components.css L169): `padding: var(--spacing-sm)` = 8px all sides
   - `pt-3!` override: padding-top = 12px (overrides 8px)
   - → **container padding-top = 12px**

3. **Tổng gap visual** = main py-4 (16px) + container pt-3! (12px) = **~28px**

## Bước 2: Trace padding chain cho 4 trang còn lại

Làm tương tự bước 1 cho:

| Trang | File page component | Cần trace |
|---|---|---|
| /dashboard | app/(protected)/dashboard/page.tsx | Dùng main-container? Class gì? |
| /contracts/[id] | contract-detail-client.tsx L214 | `main-container max-lg:pb-24` |
| /contracts/[id]/gallery | gallery page component | Class gì? |
| /contracts/create | form/index.tsx → FullpageFormShell | formPage padding |

Cho mỗi trang ghi:
- main padding (từ app-shell case)
- container/wrapper class + padding
- Total gap = main + container

## Bước 3: So sánh bảng kết quả

```
| Trang              | main pt | container pt | Total gap | vs Chuẩn |
|---|---|---|---|---|
| /contracts (CHUẨN) | ?px     | ?px          | ?px       | ✅        |
| /dashboard          | ?px     | ?px          | ?px       | ?        |
| /contracts/[id]     | ?px     | ?px          | ?px       | ?        |
| /contracts/gallery  | ?px     | ?px          | ?px       | ?        |
| /contracts/create   | ?px     | ?px          | ?px       | ?        |
```

## Bước 4: Mở browser 375px verify visual

Mở 5 trang trên mobile 375px, screenshot header + content đầu tiên.
Confirm gap visual khớp với số đo từ code.

## Bước 5: Đề xuất SSOT fix

Dựa trên kết quả trace:
1. Gap nên kiểm soát ở **1 chỗ duy nhất** — app-shell.tsx HOẶC main-container, KHÔNG CẢ HAI
2. Tạo CSS token `--spacing-main-y` 
3. Xóa mọi hardcode `pt-3!`, `py-4` rải rác
4. **Chờ anh duyệt** trước khi code

## Files cần đọc

- components/layout/app-shell.tsx — L15-25 (patterns), L96-107 (padding logic)
- app/styles/components.css — L169-182 (main-container)
- components/contracts/contracts-list-client.tsx — L152 (pt-3!)
- components/contracts/detail/contract-detail-client.tsx — L214
- components/contracts/form/index.tsx — FullpageFormShell usage
- components/layout/fullpage-form-shell.tsx — internal padding
- app/(protected)/dashboard/page.tsx — wrapper class

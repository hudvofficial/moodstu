# Phase 01: Refactor UI Components (SSOT Compliance)
Status: ✅ Complete

## Objective
Thay thế dứt điểm thẻ HTML native và các class sai chuẩn bằng SSOT Component/Token trên 2 file cấu thành Form của module Services.

## Requirements
### Functional
- [x] Mọi Input/Select phải bind đúng `value` và `onChange` form hook.
- [x] Không làm bể giao diện Responsive hiện tại.

### Non-Functional (SSOT Compliance)
- [x] Tuyệt đối 0 thẻ `<select>`. Thay bằng `<SelectForm>`.
- [x] Tuyệt đối 0 `<input type="number">` cho tiền tệ. Thay bằng `<CurrencyInput>`.
- [x] Tuyệt đối không hardcode grid class cho form 2 cột. Thay bằng `.form-grid-2col`.
- [x] Tuyệt đối không dùng custom error class (`text-danger`). Thay bằng prop `error` có sẵn trong Component hoặc CSS Token `.error-text`.

## Implementation Steps
### 1. `ServiceInfoSection.tsx`
- [x] Khai báo import `<SelectForm>` và `<Input>`.
- [x] Component hóa Name Input: Chuyển class báo lỗi `${errors.name ? "border-danger" : ""}` thành `input-error` prop.
- [x] Refactor thẻ Div Grid: Chuyển `<div className="grid grid-cols-2 gap-3">` thành `<div className="form-grid-2col">`.
- [x] Refactor Dropdown `service_type` → `<SelectForm>`.
- [x] Refactor Dropdown `category_id` → `<SelectForm>`.

### 2. `ServicePriceSection.tsx`
- [x] Khai báo import `<SelectForm>` và `<CurrencyInput>`.
- [x] Refactor thẻ Div Grid: Chuyển `<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">` thành `<div className="form-grid-2col">`.
- [x] Refactor trường `selling_price` & `cost_price`: Thay `<input type="number">` bằng `<CurrencyInput>`, xóa sạch logic render format tiền lẻ tẻ bên dưới.
- [x] Dropdown `unit`, `status`, `fulfillment_type` → `<SelectForm>`.

## Files to Modify
- `components/services/form/ServiceInfoSection.tsx`
- `components/services/form/ServicePriceSection.tsx`

## Test Criteria
- [x] Lệnh quét compliance `grep -rn "<select\|type=\"number\""` trả về 0 kết quả tại 2 file này.
- [x] Focus ô giá bán tự động select all, gõ 'k' tự động thêm '000'.

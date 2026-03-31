# Phase 06D: Chuẩn hóa hiển thị Đơn vị tính (Service Units)
Status: ⬜ Pending
Dependencies: Bắt nguồn từ quá trình audit typography Phase 6C

## Objective
Khắc phục lỗi UI hiển thị raw key từ Database (ví dụ: "goi", "bo", "cuon") lên giao diện báo giá (Quote). Đồng thời nâng cấp typography field Unit để tăng khả năng đọc trên card preview.

## Requirements
### Functional
- [ ] Map toàn bộ các label `unit` từ dạng thô (`goi`, `bo`) sang dạng hiển thị có dấu (`Gói`, `Bộ`) sử dụng SSOT `SERVICE_UNIT_LABELS`.
- [ ] Ứng dụng trên toàn bộ 3 màn hình Quote: Preview Card, Modal View, và Full View.

### Non-Functional
- [ ] UI/UX: Tăng kích thước font chữ cho unit label trên `quote-preview.tsx` từ 10px (`text-tiny`) lên 12px (`text-caption`) để dễ đọc hơn.
- [ ] Safety: Fallback về raw string (`service.unit`) nếu key bị thiếu trong danh sách SSOT, tránh văng app.

## Implementation Steps
1. [ ] **Update quote-preview.tsx** - Import `SERVICE_UNIT_LABELS`. Tăng size `text-tiny` -> `text-caption`. Sửa logic binding `{unit || "Gói Dịch Vụ"}` thành expression sử dụng map array.
2. [ ] **Update quote-view.tsx** - Import `SERVICE_UNIT_LABELS`. Tùy chỉnh hai vị trí binding raw `service.unit` bằng label mapped.
3. [ ] **Update quote-modal.tsx** - Import `SERVICE_UNIT_LABELS`. Sửa một vị trí trong table summary hiển thị raw `unit`.

## Files to Modify
- `app/components/services/quote/quote-preview.tsx` - Binding & Typography.
- `app/components/services/quote/quote-view.tsx` - Binding.
- `app/components/services/quote/quote-modal.tsx` - Binding.

## Test Criteria
- [ ] View component `quote-preview`: text unit hiện là "Gói", "Bộ", KHÔNG phải chữ "goi" in thường. Size to hơn 1 chút.
- [ ] View components `quote-view`: danh sách dịch vụ in ra "Gói", không phải "goi".

---
Next Phase: `/code phase-06d-unit-display`

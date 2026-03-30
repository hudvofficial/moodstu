# Phase 05: Nâng cấp API Cấp Danh mục (Return Record)
Status: ✅ Complete

## Objective
Sửa đổi hành vi của server action `upsertCategory` để trả về đúng record vừa được xử lý thay vì `null`. Sửa dứt điểm nguyên nhân khiến Modal không biết ID danh mục mới tạo để báo về Form.

## Requirements
### Functional
- [x] Chỉnh sửa `upsertCategory` trong `app/actions/category-actions.ts`.
- [x] Nếu là `insert()`, xâu chuỗi `.select()` và lấy kết quả đầu tiên.
- [x] Tương tự với `update()`.
- [x] Nếu thành công, `return data` dưới dạng object `{ id, name, icon }` hoặc interface `ServiceCategory`.

## Implementation Steps
1. [x] Mở `app/actions/category-actions.ts`.
2. [x] Thêm chain `.select("id, name, icon").single()` hoặc `.select().single()` vào sau cả `.update()` và `.insert()`.
3. [x] Sửa lại kiểu trả về của function `upsertCategory` từ `Promise<null>` thành `Promise<ServiceCategory>`.

## Files to Modify
- `app/actions/category-actions.ts`

## Test Criteria
- [x] Typescript compile không gặp lỗi ở action.

---
Next Phase: [Phase 06: Modal UI Refactor & Optimistic State]

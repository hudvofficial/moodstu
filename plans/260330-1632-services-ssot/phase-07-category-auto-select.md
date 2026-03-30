# Phase 07: Event Sync Auto-Select ra Form
Status: ✅ Complete

## Objective
Cho phép Modal truyền Event (ID mới) ra Scope bên ngoài Component `ServiceForm`. Giao việc chọn Data cho tính năng Auto-Select. Cắt đứt hoàn toàn quy trình nhấp chuột chán nản.

## Requirements
### Modal Property
- [x] Bổ sung props type: `onCategoryCreated?: (newCategory: ServiceCategory) => void`.
- [x] Hàm `handleSave` sau khi chạy `upsertCategory` thành công và nhận API response `{ id, name }`, sẽ kích hoạt callback này (Nếu là CREATE chứ đéo phải UPDATE).
- [x] Tích hợp UX: Modal tự đóng sau khi gọi Callback tạo.

### ServiceForm Interceptor
- [x] Kéo `<CategoryManagerModal onCategoryCreated={...} />` vào và nhận func `handleOnCategoryCreated(newCat)`.
- [x] Function này trigger `handleChange('category_id', newCat.id)` điền thẳng value vào State Form, gán hiển thị luôn trên `<SelectForm>` của Danh mục.
- [x] `setShowCategoryManager(false)`.

## Implementation Steps
1. [x] Cập nhật Type Export/Props của Modal.
2. [x] Trigger Event on creation success.
3. [x] Bắt event trong form `index.tsx`.

## Test Criteria
- [x] Chạy Server dev, test tạo thử "Danh Mục Event Bơm Máu" báo OK -> Ngay lập tức Form chính tự động ghi đè Input `category_id` khớp với cái vừa tạo.

---
End of Task 3 Plan.

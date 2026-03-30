# Phase 06: Modal UI Refactor & Optimistic State
Status: ✅ Complete

## Objective
Thay đổi giao diện của CategoryManagerModal để đồng nhất với Design System. Triển khai kiến trúc Optimistic Updates nhằm giải quyết vấn đề User đợi khi Network yếu, tránh bị UI khóa đứng ở "Submit".

## Requirements
### UI Component Transition
- [x] Xóa bỏ `<input className="input-base">`.
- [x] Dùng component `<Input>` (từ `components/ui/input.tsx`) hoặc tương đương.
- [x] Thay `<button>` thường thành `<Button>` chuẩn để quản lý state `isLoading` tích hợp sẵn.

### Optimistic UI Patterns
- [x] Bổ sung state cục bộ `localCategories = useState<ServiceCategory[]>(categories)` bên trong modal, và thiết lập `useEffect` để update từ props khi có thay đổi thật từ cache revalidate (VD: sau lệnh xoá thành công).
- [x] Gỡ thuộc tính `disabled={isSubmitting}` khóa toàn bộ màn hình, thay vào đó hiển thị Loading status riêng tại button.
- [x] Action `handleSave`: Ngay khi chốt submit -> tự push `newCategory(ảo)` vào mảng `localCategories` rồi mới `await upsertCategory()`. Nếu lỗi thì phục hồi mảng `localCategories` (Rollback).

## Implementation Steps
1. [x] Cập nhật toàn bộ các import và React component cho Form `<CategoryManagerModal>`.
2. [x] Sửa lại logic state local để mock mảng data trước khi đợi Supabase response.

## Files to Modify
- `components/services/category-manager-modal.tsx`

## Test Criteria
- [x] Khi offline mạng, nhập category mới bấm Thêm -> List lập tức xuất hiện -> sau 1s báo lỗi "network fail" biến mất. Mượt mà, ko sập.

---
Next Phase: [Phase 07: Event Sync Auto-Select ra Form]

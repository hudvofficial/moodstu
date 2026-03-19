# Phase 02: UI Visibility Fix
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Làm cho nội dung detail hiện hình trên mọi thiết bị và chế độ xem.

## Tasks
1. [ ] Sửa màu nền: Đổi `bg-transparent` sang `bg-bg-card` trong `LeadDetail.tsx`.
2. [ ] Fix Z-index: Chỉnh Panel `z-index` lên ít nhất 100 và bọc trong một container an toàn.
3. [ ] Layout Page: Thêm `min-h-screen` và `bg-bg-base` cho trang chi tiết chuyên dụng.
4. [ ] Khắc phục lỗi `cn`: Import `cn` từ `@/lib/utils` vào các file đang thiếu.

## Files to Modify
- `components/crm/leads/LeadDetail.tsx`
- `app/(protected)/crm/leads/[id]/LeadDetailPageClient.tsx`

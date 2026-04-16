# Phase 04: Detail & Print Routes
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 03

## Objective
Dựng Route cho detail overview và in ấn cho phiếu chi.

## Implementation Steps
1. [x] `/finance/expenses/[id]` route: Dùng `getExpenseDetail(id)` từ server action, (active-only). Nếu deleted/not found phải trả về `notFound()`. Route tuyệt đối không tự gọi bảng direct qua Supabase client/server.
2. [x] `/finance/expenses/[id]/print` route: Dùng `getExpenseDetail(id)` (active-only). Active receipt render bình thường. Deleted/Not found phải `notFound()`. Không copy code direct Supabase hay pattern cũ Material UI từ V1, mà phải sử dụng SSOT print component (hoặc setup client in SSOT nếu có).

## Files to Create/Modify
- app/(protected)/finance/expenses/[id]/page.tsx
- app/(protected)/finance/expenses/[id]/print/page.tsx

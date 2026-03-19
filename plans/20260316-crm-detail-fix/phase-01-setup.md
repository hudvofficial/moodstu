# Phase 01: Setup & Investigation
Status: ⬜ Pending
Dependencies: None

## Objective
Xác minh nguyên nhân gốc rễ và chuẩn bị môi trường sạch để fix lỗi tàng hình.

## Tasks
1. [ ] Cấu trúc lại Import: Đảm bảo `@/lib/utils` và các types hoạt động ổn định trong route `[id]`.
2. [ ] Kiểm tra lỗi runtime: Chèn log vào `LeadListClient.tsx` để xem `selectedId` có được set đúng khi click không.
3. [ ] Verify Server Action: Chạy thử `getLeadById` để đảm bảo dữ liệu không bị null do lỗi RLS.

## Files to Modify
- `app/(protected)/crm/leads/[id]/page.tsx`
- `components/crm/leads/LeadListClient.tsx`

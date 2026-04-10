# Phase 01: Cập nhật Schema (`social_link`), CareLog & Realtime SWR
Status: ⬜ Pending

## Objective
Đảm bảo base dữ liệu hỗ trợ toàn toàn các tính năng ghi nhận tương tác khách hàng của CRM V1, đồng thời khôi phục Flow Realtime mượt mà, nhưng không mang React Context cũ nề từ V1.

## Requirements
- [ ] Tái tạo luồng ghi Log Interaction History (CareLog): Nếu CSDL V1 dùng parser trên `history` string (`[Call]...`), tôn trọng Flow này nhưng refactor code parse/render dựa trên Utilities chuẩn.
- [ ] Thêm input `social_link` trên form `lead-form-modal.tsx`.
- [ ] Import `lib/swr.ts`, gọi `mutate()` lắng nghe Channel Supabase realtime trên Page.

## Implementation Steps
1. [ ] Bổ sung trường `social_link` (nếu có ở V1) vào Form.
2. [ ] Render lại Care Log dạng Timeline từ Data cũ (Parse `[Gọi điện]` hoặc theo Schema). Dùng `components/ui/badge.tsx` để render tag.
3. [ ] Đấu nối luồng `subscribe` từ channel `crm_leads` với `revalidate` từ `lib/swr.ts`.

## Files to Modify
- `types/crm.ts`
- `components/crm/lead-form-modal.tsx`
- `components/crm/lead-care-log.tsx`
- `app/(protected)/crm/leads/page.tsx`

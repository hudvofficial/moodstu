# Phase 01: Smart Sync Logic

## Objective
Đảm bảo khi có ID trên URL, hệ thống phải lấy được dữ liệu Lead từ Server nếu dữ liệu cục bộ không có.

## Implementation Steps
1. [ ] Cập nhật Action `getLeadById` trong `app/actions/crm.ts` để trả về đúng cấu trúc `{ success: true, data: result }`.
2. [ ] Sửa `LeadListClient.tsx`:
    - Thay thế `useMemo` bằng `useState` + `useEffect`.
    - Thêm cơ chế: Nếu `initialLeads` không có `selectedId`, thực hiện fetch từ `getLeadById`.

## Files to Modify
- `app/actions/crm.ts`
- `components/crm/leads/LeadListClient.tsx`

## Test Criteria
- [ ] Truy cập trực tiếp link `.../leads?id=[mạng_ID_cũ]` -> Detail phải hiện.
- [ ] Không có lỗi console về `undefined` data.

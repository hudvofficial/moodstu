# Phase 01: Database Stats (RPC)
Status: ✅ Complete
Dependencies: None

## Objective
Chuyển logic đếm số lượng thống kê từ Node.js xuống Database RPC. Tối ưu quá trình xử lý backend giúp trả dữ liệu ổn định khi lượng records lớn.

## Requirements
### Functional
- [x] Database có function mới `get_crm_lead_stats()`.
- [x] Hàm sẽ xử lý gom nhóm dữ liệu lead theo các trạng thái (để thay cho đếm bằng for.Each trong JS).
- [x] Trả về schema chung: `{ total: number, active: number, closed: number, conversionRate: number, byStatus: record<string, number> }`.
- [x] Hàm `getLeadStats` trong `lead-actions.ts` kết nối thành công tới RPC.

## Implementation Steps
1. [x] Viết file script `.sql` vào trong `supabase/migrations`.
2. [x] Thực thi script lên DB để khởi tạo RPC.
3. [x] Cập nhật gọi `supabase.rpc` và ép kiểu cho `getLeadStats` thay cho truy vấn query table `crm_leads`.

## Files to Create/Modify
- `supabase/migrations/[timestamp]_crm_lead_stats_rpc.sql`
- `app/actions/lead-actions.ts`

---
Next Phase: phase-02-rbac-assign.md

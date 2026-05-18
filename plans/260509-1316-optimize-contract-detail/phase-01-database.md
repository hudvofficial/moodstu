# Phase 01: Database Schema (RPC)
Status: ✅ Done
Dependencies: None

## Objective
Viết hàm RPC `get_contract_detail_v2` gộp 8 bảng dữ liệu thành một khối JSON duy nhất, nhằm giảm số lượng request HTTP từ 8 xuống 1, xóa bỏ cổ chai kết nối.

## Requirements
### Functional
- [ ] Truy xuất được dữ liệu của contract + customers + contract_items
- [ ] Truy xuất danh sách: events, work_tasks (kèm employees), checklists, payments, reservations (kèm dresses), print_orders (kèm labs), payment_plans (kèm allocations)
- [ ] Gói toàn bộ vào 1 JSON object với cấu trúc y hệt kết quả của hàm `getContractDetail` cũ.

### Non-Functional
- [ ] Performance: Thời gian execute SQL < 50ms cho 1 contract.
- [ ] An toàn: Hàm RPC không xóa hay chỉnh sửa data (chỉ READ). Cấp quyền `SECURITY INVOKER`.

## Implementation Steps
1. [ ] Phân tích cấu trúc object JSON hiện tại đang trả về.
2. [ ] Viết hàm `get_contract_detail_v2(p_contract_id uuid)` sử dụng `jsonb_build_object` và `jsonb_agg`.
3. [ ] Tạo file migration `.sql` và apply lên Supabase.
4. [ ] Test nhanh RPC trên Supabase SQL Editor.

## Files to Create/Modify
- `supabase/migrations/XXX_create_rpc_get_contract_detail_v2.sql` - [Tạo RPC]

---
Next Phase: Phase 02

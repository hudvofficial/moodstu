# Phase 02: Backend API (Action)
Status: ✅ Done
Dependencies: Phase 01

## Objective
Tích hợp RPC `get_contract_detail_v2` vào hàm `getContractDetail` trong Server Action `contract-queries.ts`. 

## Requirements
### Functional
- [ ] Hàm `getContractDetail` gọi RPC.
- [ ] Nếu RPC thành công, map data sang đúng type TypeScript (giữ nguyên hàm `mapPaymentPlans` nếu cần).
- [ ] Nếu RPC thất bại, tự động Fallback về code 8 queries song song cũ (đảm bảo an toàn không sập app).
- [ ] Đảm bảo TypeScript không báo lỗi khi return payload.

### Non-Functional
- [ ] Không làm gãy giao diện đang sử dụng `getContractDetail`.

## Implementation Steps
1. [ ] Sửa `app/actions/contract-queries.ts`.
2. [ ] Viết khối try-catch bọc quanh lệnh gọi RPC. 
3. [ ] Xử lý mapping kết quả JSONB trả về từ Postgres sang mảng dữ liệu.
4. [ ] Sửa tương tự cho `getContractDrawerExtra` nếu có thể (hoặc làm 1 RPC riêng/dùng chung RPC).

## Files to Modify
- `app/actions/contract-queries.ts` - [Tích hợp RPC và fallback]

---
Next Phase: Phase 03

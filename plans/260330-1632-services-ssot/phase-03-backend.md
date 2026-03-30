# Phase 03: Backend API & Types Update
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Cập nhật TypeScript definitions (`database.types.ts` và Models) để khớp 100% với cấu trúc Database mới (sau khi ABC Framework Migration).

## Requirements
### Functional
- [ ] Xóa bỏ tham chiếu `service_type_enum` ở `database.types.ts`.
- [ ] Bổ sung các trường `unit`, `fulfillment_type`, `created_by`, `updated_by`, `deleted_at` vào Types.

## Implementation Steps
1. [x] Sửa file `types/database.types.ts`: Tìm `services` -> Đổi `service_type` sang `string`. Set các optional types cho unit, fulfillment_type, deleted_at...
2. [x] Đảm bảo `app/actions/service-mutations.ts` nhận biết các field này khi lưu form (kiểm tra Object keys).

## Files to Create/Modify
- `types/database.types.ts`
- `app/actions/service-mutations.ts`

## Test Criteria
- [x] Chạy `npm run build` không lỗi TypeScript.

---
Next Phase: [Phase 04: Verify & Test]

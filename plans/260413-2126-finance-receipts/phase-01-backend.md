# Phase 01: Backend Core Hardening
Status: ⬜ Pending
Dependencies: None

## Objective
Gia cố nền tảng Backend vững chắc cho module Receipts qua Zod validation, Optimistic Locking, Soft Delete, và Audit Logs. Đảm bảo triệt để Rule #1 của Mood Studio V2.

## Requirements
### Functional
- [ ] G1: `updateReceipt()` có mặt trên `receipt-actions.ts`.
- [ ] G2: Thêm `expectedUpdatedAt` trong payload bằng schema `updateReceiptWithLockSchema`. Hỗ trợ Check Concurrency Version.
- [ ] G8: Áp dụng Soft Delete vào thao tác xóa (`receipt-actions.ts`). Update query SWR tương ứng để không kéo row đã bị xóa.
- [ ] G9: Bọc 100% Mutation vào Audit Trail với source `'server_action'`.

### Non-Functional
- [ ] Security: Server Action phải check `withAuth` / `withAdmin`.
- [ ] Data Logic: Gọi RPC `checkPeriodLock` để ngăn chỉnh sửa trong kỳ kết toán đã chốt sổ.

## Implementation Steps
1. [ ] Step 1 - Cập nhật `finance.schema.ts` với `updateReceiptWithLockSchema`.
2. [ ] Step 2 - Viết method `updateReceipt(id, payload)` trong `receipt-actions.ts`.
3. [ ] Step 3 - Cập nhật method `deleteReceipt(id)` trong `receipt-actions.ts` sang Soft Delete (gán `deleted_at`).
4. [ ] Step 4 - Bổ sung tham số filter `deleted_at: null` và param phân trang mới trong `finance-operations-queries.ts`.
5. [ ] Step 5 - Audit lại Mutation. Đảm bảo mọi mutation (CREATE, UPDATE, DELETE) đều gọi `writeAuditLog` có flag `source: "server_action"`.

## Files to Modify
- `lib/validations/finance.schema.ts` - Gắn Locking field.
- `app/actions/receipt-actions.ts` - Refactor mutations.
- `app/actions/finance-operations-queries.ts` - Cập nhật get param để trỏ đúng Record cần lấy.

## Test Criteria
- [ ] Gọi thử `updateReceipt` và ném Error Validation từ Zod nếu sai cấu trúc.
- [ ] Check RPC trả về Exception nếu cập nhật trễ Timestamp.
- [ ] Khi Xóa: Query Record check bằng pgAdmin, cột `deleted_at` phải có giá trị Date hiện thời.

---
Next Phase: [Phase 02: Frontend Crud Flow](phase-02-frontend.md)

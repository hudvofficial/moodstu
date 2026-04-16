# Phase 01: Server Action & Query Hardening
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: None

## Objective
Kiểm soát nghiêm ngặt Server Actions của Expenses với Optimistic Locking, Soft Delete, và Zero-row detection.

## Implementation Steps
1. [x] Tạo/Export `getExpenseDetail(id)` trong `finance-operations-queries.ts`:
   - `select` exact fields cho detail/print.
   - Filter `deleted_at IS NULL`.
   - Bắt buộc return null khi not found/deleted.
   - (Routes /finance/expenses/[id] và /print chỉ dùng query này, không gọi direct Supabase trong route).
2. [x] Thiết lập Policy Phiếu Đã Duyệt (Enforce trong Mutation Predicate):
   - Server block bằng query: thêm `.is("deleted_at", null).is("approved_by", null).select("id")` vào thẳng tất cả update/delete mutation.
   - Đồng bộ UI: Phiếu đã duyệt hide/disable Approve/Edit/Delete. View/Print vẫn cho phép.
3. [x] Cập nhật `approveExpense`:
   - Fetch active expense để check period lock nếu cần.
   - Update mutation phải có `.eq("id", id).is("deleted_at", null).is("approved_by", null).select("id")`. Nếu `length === 0` -> throw error (phiếu không tồn tại, đã xóa, hoặc đã duyệt).
4. [x] Cập nhật `deleteExpense`:
   - Soft-delete update mutation phải có `.eq("id", id).is("deleted_at", null).is("approved_by", null).select("id")`. Nếu `length === 0` -> throw error.
5. [x] Cập nhật `updateExpense`: 
   - Optimistic update mutation check: `.eq("id", id).is("deleted_at", null).is("approved_by", null)`.
   - Nếu có `expectedUpdatedAt`, thêm trực tiếp `.eq("updated_at", expectedUpdatedAt)` vào mutation.
   - Kèm `.select("id")`. Nếu `length === 0` -> throw lỗi conflict/đã duyệt/đã xóa.
6. [x] Cập nhật create/update/delete/approve audit đều có `source: "server_action"`.

## Files to Create/Modify
- app/actions/expense-actions.ts
- app/actions/finance-operations-queries.ts

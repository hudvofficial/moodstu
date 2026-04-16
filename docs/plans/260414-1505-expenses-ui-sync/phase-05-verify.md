# Phase 05: Polish & Code verification
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 04

## Objective
Thẩm định và xác thực độ sạch của Build & Typing.

## Implementation Steps
1. [x] Lệnh 1: `npx tsc --noEmit --incremental false --pretty false`
2. [x] Lệnh 2: `npx eslint "components/finance/expenses" "app/(protected)/finance/expenses" "app/actions/expense-actions.ts" "app/actions/finance-operations-queries.ts" --max-warnings=0`
3. [x] Manual checklist test:
    - [x] Create mới hoạt động
    - [x] Edit lưu được thay đổi
    - [x] Approve thành công
    - [x] Approve again bị block (cả UI lẫn Server)
    - [x] Edit/Delete phiếu đã approve bị block (cả UI lẫn Server)
    - [x] Delete (soft delete) thành công với phiếu chưa duyệt
    - [x] Detail/Print trả về 404/notFound sau khi bị xóa hoặc ID không tồn tại
    - [x] UI Action Buttons đáp ứng SSOT token compliance (btn-icon, colors chuẩn, ko hardcode config CSS)
    - [x] Desktop/Mobile icons không vỡ layout, table actions rộng chuẩn 56 (w-56)

## Files to Create/Modify
- (No specific file targets)

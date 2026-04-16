# Phase 01: Backend API (Stats Fetching)
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: None

## Objective
Bổ sung hàm truy vấn để lấy dữ liệu thống kê tổng quát của Phiếu chi, phục vụ cho render StatsBar.

## Requirements
### Functional
- [ ] Bổ sung Type `ExpenseStats`
- [ ] Implement `fetchExpenseStats(month, year)` trong file actions
- [ ] Trả về tổng phiếu chi, tổng tiền, chờ duyệt, và đã duyệt

### Non-Functional
- [ ] Performance: Cần query index hoặc Supabase count tối ưu

## Implementation Steps
1. [ ] Mở file `types/finance-operations.ts` để thêm `ExpenseStats` Interface.
2. [ ] Mở file `app/actions/finance-operations-queries.ts` để code hàm fetch gọi từ Database.

## Files to Create/Modify
- `types/finance-operations.ts` - Bổ sung Interface.
- `app/actions/finance-operations-queries.ts` - Logic API Server.

## Notes
Khớp format với `ReceiptStats` để sync token.

---
Next Phase: Phase 02

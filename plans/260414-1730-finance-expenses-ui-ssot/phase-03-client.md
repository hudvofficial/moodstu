# Phase 03: Refactor Expenses Client Container
Status: ✅ Complete
Dependencies: Phase 02

## Objective
Lắp ráp lại layout tổng của phân hệ Phiếu chi (expenses-client) theo chuẩn Layout SSOT mới đã được chuẩn hóa ở Phiếu thu.

## Requirements
### Functional
- [x] Bổ sung key `financeExpenseStats` vào hệ thống cache `lib/swr.ts`.
- [x] Thay đổi thẻ Fragment wrapper thành `main-container gap-4!`.
- [x] Thay Breadcrumbs thay cho h1 tĩnh
- [x] Nhúng component `ExpenseStatsBar` vào chung block với Action Add (khối `entrance-0`).
- [x] Nhúng `<ExpenseFilters>` kết hợp với `<SelectPill>` Tháng/Năm vào khối `entrance-1`.
- [x] Bổ sung FAB mobile ở cuối file.
- [x] Thêm SWR hook fetch `stats` (ExpenseStats) và truyền xuống các sub-component.
- [x] Update function `refresh()` gọi mutate key stats để update số realtime.

## Implementation Steps
1. [x] Sửa `lib/swr.ts`:
   - Tạo phương thức `financeExpenseStats: (month?: number, year?: number) => ...`
2. [x] Sửa `expenses-client.tsx`:
   - Import `fetchExpenseStats`, `Breadcrumb`, `FAB`, `SelectPill`, `ExpenseStatsBar`, `ExpenseFilters`.
   - Implement `useSWR` lấy stats.
   - Refactor Layout CSS `entrance-*`.

## Files to Create/Modify
- `lib/swr.ts` - Thêm Caching key mới
- `components/finance/expenses/expenses-client.tsx` - Đồng bộ UI 

---
Next Phase: N/A - Deployment

# Phase 02: Dashboards & Reports
Status: ⬜ Pending
Dependencies: phase-01-shared-hooks.md

## Objective
Sửa lỗi truyền trực tiếp `onChange` và `.map` trong các View Dashboard, Báo cáo Tổng quan.

## Requirements
### Functional
- [ ] Import `useFinanceFilters` để thay thế inline arrays.
- [ ] Memoize các event handlers bằng `useCallback`.

### Non-Functional
- [ ] Performance: Giảm số lượng component con re-render khi ấn đổi tháng/năm.

## Implementation Steps
1. [ ] Check `finance-dashboard-client.tsx`, di chuyển inline arrow functions thành useCallback.
2. [ ] Sửa `salaries-client.tsx`
3. [ ] Sửa `receipts-client.tsx`
4. [ ] Sửa `expenses-client.tsx`
5. [ ] Sửa `closes-client.tsx`
6. [ ] Sửa `budget-client.tsx`
7. [ ] Sửa `ledger-client.tsx`

## Test Criteria
- [ ] Lượng Render Console.log nhảy không quá 1 khi đổi bộ lọc.

---
Next Phase: phase-03-modals.md

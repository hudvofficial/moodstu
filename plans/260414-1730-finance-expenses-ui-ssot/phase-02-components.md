# Phase 02: Bổ sung Sub-components
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Tách và tạo mới các UI components cho Phiếu chi dựa trên chuẩn hóa của Phiếu thu.

## Requirements
### Functional
- [x] Tạo `ExpenseStatsBar`
- [x] Tạo `ExpenseFilters`

### Non-Functional
- [x] Tái sử dụng `StatsBar` component core
- [x] Tái sử dụng `TabsFilter` component core

## Implementation Steps
1. [x] Soạn `components/finance/expenses/expense-stats-bar.tsx`
2. [x] Soạn `components/finance/expenses/expense-filters.tsx` (all, pending, approved)

## Files to Create/Modify
- `components/finance/expenses/expense-stats-bar.tsx` - Layout ngang cho 4 chỉ số tĩnh
- `components/finance/expenses/expense-filters.tsx` - Các pill shape filter

---
Next Phase: Phase 03

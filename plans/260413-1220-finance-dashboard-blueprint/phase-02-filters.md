# Phase 02: Chuẩn hóa Bộ lọc (Filters)
Status: ✅ Complete
Dependencies: phase-01

## Objective
Thay thế cụm `SimpleSelect` (đang render full block sai quy tắc lưới) thành chuẩn `<SelectPill>` theo Block 3 của Blueprint.

## Requirements
### Functional
- [x] Tạo file mới `components/finance/dashboard/finance-filters.tsx`.
- [x] Sử dụng Layout theo chuẩn Mobile (Cuộn ngang) và Desktop (justify-end / justify-between).
- [x] Tích hợp `<SelectPill>` cho Tháng và Năm cùng các options tương ứng.

## Implementation Steps
1. [x] Khởi tạo `finance-filters.tsx`.
2. [x] Ráp layout `hidden lg:flex` cho Desktop và `lg:hidden flex-nowrap` cho Mobile.
3. [x] Xóa logic render select cũ trong `finance-dashboard-client.tsx`.
4. [x] Mount `<FinanceFilters>` lên đầu View.

## Files to Create/Modify
- `components/finance/dashboard/finance-filters.tsx` - Mới.
- `components/finance/dashboard/finance-dashboard-client.tsx` - Clean up.

## Test Criteria
- [ ] Giao diện Dropdown nhỏ gọn vừa vặn bên góc phải, scroll mượt trên iPhone.

---
Next Phase: `phase-03-stats.md`

# Phase 01: Shared Context & Hooks
Status: ⬜ Pending
Dependencies: None

## Objective
Tạo các Hooks dùng chung để quản lý cấu trúc dữ liệu tĩnh (như tháng, năm) nhằm loại bỏ việc mapping mảng mới trong mỗi chu kỳ Render của Component.

## Requirements
### Functional
- [x] Centralize mảng `months` và `years`.
- [x] Export các mảng memoized để tái sử dụng.

### Non-Functional
- [x] Performance: Khởi tạo dữ liệu 1 lần duy nhất trong toàn bộ lifecycle của App.

## Implementation Steps
1. [ ] Cấu trúc thư mục - Tạo thư mục hooks nếu chưa có hoặc thêm file `hooks/use-finance-filters.ts`
2. [ ] Viết Logic - Sử dụng React Hook để memoize các bộ lọc `useMemo(() => [...], [])`.
3. [ ] Xuất bản (Export) - Cung cấp hàm `useFinanceFilters` có tính trọn gói.

## Files to Create/Modify
- `hooks/use-finance-filters.ts` - Tách biệt logic mapping filter các tháng.

## Test Criteria
- [ ] Import hook thử ở 1 component bất kỳ đảm bảo không báo lỗi TypeScript.

---
Next Phase: phase-02-dashboards.md

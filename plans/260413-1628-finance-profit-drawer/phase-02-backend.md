# Phase 02: Backend API & RPC Actions
Status: ✅ Complete
Dependencies: phase-01-database.md

## Objective
Trang bị các Server Actions cần thiết. Map đúng cột Discount và các mảng doanh thu để Table & Drawer sử dụng.

## Implementation Steps
1. [ ] Cập nhật Action `getContractProfitReport`:
   - Map thêm `package_revenue`, `addon_revenue` và `discount` từ RPC sang Model frontend.
   - Cập nhật logic `getContractProfitReportFallback` (JS Fallback tự join data nến RPC bị error).
2. [ ] Tạo Action `getContractDetailsForDrawer` (Hoặc thêm chung vào file data tĩnh tuỳ kiến trúc V2):
   - Viết action nhận vào `contractId`.
   - Fetch 4 dữ liệu gốc nguyên bản: `contract_details`, `work_tasks`, `printing_orders`, `expenses`.
   - Lưu ý Expense: check loại trừ ký hiệu `[Auto-Print]` (Logic mới của V2 so với thanh toán in ấn của V1).

## Files to Create/Modify
- `app/actions/finance-dashboard-queries.ts`

---
Next Phase: phase-03-frontend.md

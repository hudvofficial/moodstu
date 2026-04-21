# Phase 06: Cross-Module Finance SSOT Sync
Status: ✅ Complete

## Objective
Đồng bộ công thức finance sau khi dashboard production-ready để `/reports`, `/finance/goals`, và `/finance/closes` không tự tính lệch nhau.

## SSOT Contract
- [x] Realized inflow = `payments.amount` + standalone `receipts.receipt_amount` (`contract_id IS NULL`), đều lọc `deleted_at IS NULL`.
- [x] Cash/burn outflow = operating `expenses.amount` + `monthly_salaries.total_salary` + active `fixed_costs.monthly_amount`.
- [x] Month window dùng `[start, end)` cho truy vấn tháng, tránh lệch ngày cuối tháng.
- [x] Close snapshot lưu lại cùng contract tại `finance_monthly_closes.snapshot_metrics`.

## Implementation
1. [x] `/reports`
   - `finance-reports-queries.ts` dùng realized inflow cho `totalRevenue`.
   - `finance-cashflow-timeline.ts` thêm salary + fixed costs vào outflow chart.
2. [x] `/finance/goals`
   - `fetchGoalsCashflow()` thêm `fixedCostComponent`.
   - Overview và template burn-rate tính đủ expenses + salary + fixed costs.
3. [x] `/finance/closes`
   - `createMonthlyClose()` ghi snapshot ngay khi tạo kỳ.
   - `advanceCloseTask()` chuẩn hóa `dang_lam` -> `dang_thuc_hien`, theo đúng workflow RPC.
   - Khi hoàn tất bước 8, snapshot được refresh cả nhánh RPC production và fallback.
   - Close detail hiển thị snapshot SSOT và action button theo state machine.

## Verification
- [x] Targeted eslint cho reports/goals/closes finance files.
- [x] `npm.cmd run build` pass.
- [ ] Manual UI verify: chạy thử một kỳ close đầy đủ 8 bước trên dữ liệu thật.

# Phase 04: Compact Stats Bar (Gold Standard)
Status: ✅ Complete
Dependencies: Phase 03

## Objective
Thay thế 6 KPI cards cồng kềnh bằng 1 thanh `FinanceCompactBar` siêu mỏng nhẹ, chuẩn Apple HIG & Stripe. Xóa bỏ các dòng text thừa trên Header.

## Requirements

### Functional
- [x] Xóa bỏ text subtitle vô dụng ở `/finance`.
- [x] Unmount `Tổng quan Vận hành` (6 thẻ KPIs) vì quá tốn diện tích dọc.
- [x] Viết component `FinanceCompactBar` nhận metrics từ `/api/finance/intelligence` (SWR tái sử dụng).

### Design Standard (Apple HIG / UI SSOT)
- **Mobile (375px):** Horizontal scroll `overflow-x-auto no-scrollbar`, vuốt ngang mượt mà. Layout 1 cột an toàn.
- **Desktop (1440px):** Layout `flex-between`, dàn ngang 12 cột.
- Font: Inter (thừa kế hệ thống).
- Kích thước & Hierarchy: Nhãn `text-body-sm text-text-secondary`, Số liệu `text-h3 font-semibold`.
- Icon Box: Nền `bg-{semantic}/10`, chữ `text-{semantic}` (success, error, primary, info).
- Quard Metrics: Thu, Chi, Tồn Quỹ, Phải Thu.

## Expected Files to Modify
- `components/finance/dashboard/finance-dashboard-client.tsx`
- `components/finance/dashboard/finance-compact-bar.tsx` (Tạo mới)

---
**Next Step:** Type `/code phase-04` to begin implementation.

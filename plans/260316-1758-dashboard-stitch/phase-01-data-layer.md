# Phase 01: Dữ liệu (Backend RPCs)
Status: ✅ Complete
Dependencies: None

## Objective
Xây dựng các API, RPCs để lấy dữ liệu số tổng quan, biểu đồ cho Dashboard. Đảm bảo fetch từ Server (RSC) cho KPI cards.

## Requirements
### Functional
- [x] `getDashboardKPIs()`: Tổng doanh thu tháng, số HĐ mới, tổng công nợ, số HĐ hoàn thành. Tính `% change` so với tháng trước.
- [x] `getRevenueChart(months: 6)`: Dữ liệu cho Line Chart.
- [x] `getServiceBreakdown()`: Dữ liệu doanh thu theo loại dịch vụ (Cưới, Baby, v.v.).
- [x] `getUpcomingEvents()`: Lấy lịch chụp 7 ngày tới.
- [x] `getPaymentReminders()`: Phiếu thu sắp đến hạn or HĐ chưa đóng tiền.

### Non-Functional
- [x] Hiệu năng (Performance): Các truy vấn phải chạy cực nhanh (< 200ms) dùng Atomic RPCs. Tránh N+1.

## Implementation Steps
1. [x] Viết RPC Function trong Supabase cho `getDashboardKPIs` nếu phức tạp, hoặc dùng JS aggregate.
2. [x] Tạo Server Action / Database Queries cho các API trên.
3. [x] Khai báo Types rành mạch trong `types/dashboard.ts`.

## Files to Create/Modify
- `lib/api/dashboard.ts` - Functions lấy dữ liệu.
- `types/dashboard.ts` - Định nghĩa loại trả về.

## Test Criteria
- [ ] Data trả về đúng type, đủ trường thời gian và % change.
- [ ] Không chập chờn khi số liệu null (fallback = 0).

---
Next Phase: [Phase 02](phase-02-ui-desktop.md)

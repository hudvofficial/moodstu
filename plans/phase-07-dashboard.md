# Phase 07: Dashboard

**Status:** ⬜ Pending
**Dependencies:** Phase 04, 05, 06
**Est.:** 1 day

## Objective

Dashboard tổng quan cho chủ studio. KPI cards, biểu đồ doanh thu, công nợ, HĐ mới, phân theo loại DV.

## Implementation Steps

### Server-Side Data
- [ ] `getDashboardStats()` — RPC tổng hợp:
  - Doanh thu tháng này (Σ phiếu thu)
  - Số HĐ mới tháng này
  - Tổng công nợ (Σ còn nợ across all HĐ)
  - HĐ sắp đến hạn (cần thu tiền)
  - So sánh vs tháng trước (% tăng/giảm)
- [ ] `getRevenueChart()` — doanh thu 6 tháng (line chart)
- [ ] `getServiceTypeBreakdown()` — doanh thu theo loại DV (pie chart)
- [ ] `getUpcomingEvents()` — HĐ sắp chụp (3 ngày tới)
- [ ] `getPaymentReminders()` — HĐ cần nhắc thanh toán

### UI Components
- [ ] KPI Cards row (4 cards: doanh thu, HĐ mới, công nợ, HĐ hoàn thành)
  - Mỗi card: số liệu + % change vs tháng trước
  - Color-coded (green up, red down)
- [ ] Revenue chart (Recharts line chart, 6 months)
- [ ] Service type breakdown (Recharts pie/donut chart)
- [ ] Upcoming schedule list (ngày + HĐ + loại DV)
- [ ] Payment reminders list (khách + số tiền + ngày đến hạn)
- [ ] Quick stats by role:
  - Admin: tất cả
  - Sale: chỉ HĐ của mình
  - Media: chỉ jobs sắp tới (placeholder cho Wave 2)

### Patterns Applied
- [ ] Server-side data fetching (RSC) cho KPIs
- [ ] SWR client-side cho charts (auto refresh 30s)
- [ ] Skeleton loaders cho mỗi card
- [ ] Dashboard cache TTL: 30s
- [ ] Responsive: 4 cols desktop → 2 cols tablet → 1 col mobile

## Test Criteria
- [ ] KPI numbers đúng so với data
- [ ] Charts render đúng
- [ ] Responsive layout OK
- [ ] Dashboard load < 2s
- [ ] Role-based: sale chỉ thấy stats của mình

---
**MVP COMPLETE! 🎉**
**Next:** Wave 2 starts with Phase 08 (Team Media)

# Phase 13: Reports

**Status:** 🟡 Stitch Done (2/2 screens)
**Dependencies:** Phase 05, 11, 12 (Finance data)
**Est.:** 1 day

## Objective

Báo cáo tài chính đầy đủ. Lãi/lỗ, cashflow, doanh thu theo loại DV, công nợ aging.

## Implementation Steps

- [ ] Revenue report: doanh thu theo tháng/quý/năm
- [ ] Doanh thu theo loại DV (pie chart: Cưới 40%, Baby 25%...)
- [ ] Báo cáo lãi/lỗ: Thu - Chi - Chi phí cố định = Lợi nhuận
- [ ] Cashflow report: tiền vào/ra theo tháng (bar chart)
- [ ] Công nợ aging: aging buckets (0-30, 31-60, 61-90, 90+ ngày)
- [ ] Export Excel (exceljs — từ Coffee)
- [ ] Date range picker cho filter
- [ ] Role-based: chỉ Admin/Manager xem finance reports

## V1 Carry-over
- DB Views: `monthly_revenue_summary` → copy + adapt
- lib/exportExcel.ts từ Coffee

## Test Criteria
- [ ] Lãi/lỗ tính đúng: Thu - Chi - Fixed = Net
- [ ] Chart data match với raw numbers
- [ ] Excel export có đúng data
- [ ] Role check: Sale/Media không xem được

---
**Next Phase:** → Phase 14 (Payment Plans)

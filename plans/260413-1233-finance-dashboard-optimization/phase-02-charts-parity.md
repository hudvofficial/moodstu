# Phase 02: Đồng bộ Khối Đồ thị (Charts Parity)
Status: ⬜ Pending
Dependencies: Phase 01

## 2026-04-21 Audit Addendum

Chart parity must include data parity and performance:

- [ ] Revenue chart RPC must filter soft-deleted receipts and use the same revenue SSOT as metrics.
- [ ] Add expense/outflow context where the chart is used for profit/cashflow decisions; revenue-only is not enough for finance intelligence.
- [ ] Keep chart components as dynamic islands; do not hydrate the entire page only for Recharts.
- [ ] Chart colors must use CSS variables such as `var(--color-primary)`, `var(--color-success)`, `var(--color-error)`, and `var(--color-warning)`.
- [ ] Prefer one server/RPC snapshot per chart zone, then pass stable data to client chart islands.

## Objective
Tất cả các Charts phải dùng chung 1 chuẩn Card Wrapper duy nhất (Ví dụ: `.card-base`), tiêu đề chuẩn h5, padding không được lệch.

## Implementation Steps
1. [ ] Rà soát `revenue-bar-chart.tsx`.
2. [ ] Rà soát `expense-donut-chart.tsx` & `service-donut-chart.tsx`.
3. [ ] Rà soát `aging-bars-chart.tsx` & `forecast-chart.tsx`.
4. [ ] Xóa các class tiện tay như `mb-4`, `p-5`, `p-6`, thay toàn bộ bằng chuẩn `p-4 bg-bg-card rounded-xl border border-border shadow-sm`.

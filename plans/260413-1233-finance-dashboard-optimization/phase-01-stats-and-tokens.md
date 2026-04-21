# Phase 01: Chuẩn hóa Tokens & Stats Container
Status: ⬜ Pending

## 2026-04-21 Audit Addendum

Before polishing stats UI, lock the finance metric contract:

- [ ] Define revenue SSOT once: dashboard metrics, intelligence, charts, goals, reports, and close must not mix `payments + standalone receipts` with `receipts only`.
- [ ] Define outflow SSOT once: decide when `expenses`, `monthly_salaries`, fixed costs, budgets, and payables are included.
- [ ] Fix `finance_dashboard_metrics` receipt filters to respect `deleted_at IS NULL`.
- [ ] Make top stats explain the same values used by health score and runway; no conflicting numbers across sections.
- [ ] Use `StatsBar`, `stats-card`, `icon-box`, `tabular-nums`, and shared currency formatter only.

## Objective
Xóa sổ inline pixel trong CSS, gom Filters và Thống kê thành một Card hoàn chỉnh tuân thủ 100% token hệ thống.

## Implementation Steps
1. [ ] Cập nhật `app/styles/select.css` để loại bỏ px cứng, áp dụng token `h-8 px-3 gap-1`.
2. [ ] Tạo `finance-stats-container.tsx` bọc `FinanceFilters` và `StatsBar`.
3. [ ] Layout `finance-stats-container`: Trái là tiêu đề, Phải là Filters. Phía dưới là `StatsBar`.
4. [ ] Xóa `finance-compact-bar.tsx` cũ nếu đã gộp xong.
5. [ ] Cập nhật root `finance-dashboard-client.tsx` để hiển thị Card mới thay vì thả nổi.

# Phase 04: Stats Upgrade + Aging Breakdown

Status: ⬜ Pending
Dependencies: Phase 03 (cần biết Tab Thu/Trả)

## Objective

Nâng cấp `debt-stats-bar.tsx` + thêm Aging Breakdown (5 nhóm tuổi nợ) — V1 có 4 stat cards premium + aging 5 cột, V2 cần port theo SSOT design system.

## Tính năng

### DebtStatsBar Upgrade (4 metrics)
- [ ] **Phải thu**: Tổng nợ phải thu (chưa TT)
- [ ] **Phải trả**: Tổng nợ phải trả (chưa TT)
- [ ] **Quá hạn**: Tổng tiền quá hạn + count khoản
- [ ] **Hiển thị**: Số khoản đang xem (sau filter)
- [ ] V2 style: dùng chuẩn `SalaryStatsBar` / `ReceiptStatsBar` pattern (compact inline)

### Aging Breakdown (Desktop only)
- [ ] Port `debtAging.ts` từ V1 → V2 utility
- [ ] 5 nhóm: Chưa đến hạn | 1-30 ngày | 31-60 ngày | 61-90 ngày | >90 ngày
- [ ] V2 style: `card-base` nhỏ, border-bottom màu gradient (xanh → đỏ)
- [ ] Hiển thị: tổng tiền + count hồ sơ mỗi nhóm
- [ ] Hoạt động cho CẢ tab Thu lẫn tab Trả

### Progress Bar cho Khoản Trả Góp
- [ ] Trên row Desktop / Mobile card: hiển thị "5/12 kỳ" + progress bar
- [ ] V2 style: `progress-track` + `progress-fill` CSS classes

## Files to Create/Modify

- `components/finance/debts/debt-stats-bar.tsx` — Refactor
- `lib/analytics/debt-aging.ts` — **[NEW]** Port từ V1
- `components/finance/debts/debt-desktop-table.tsx` — Thêm progress bar
- `components/finance/debts/debt-mobile-list.tsx` — Thêm progress bar
- `app/actions/finance-operations-queries.ts` — Cập nhật `fetchDebtStats()` trả aging data

## Test Criteria

- [ ] Stats bar hiển thị 4 metrics đúng giá trị
- [ ] Aging breakdown: 5 nhóm đúng phân loại
- [ ] Progress bar trả góp: hiển thị đúng tỉ lệ paid/total
- [ ] Responsive: aging ẩn trên mobile

---
Next Phase: [phase-05](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/plans/260416-0655-debts-v2-upgrade/phase-05-row-actions.md)

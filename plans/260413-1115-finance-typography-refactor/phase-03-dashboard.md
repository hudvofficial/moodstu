# Phase 03: Refactor Dashboard Components
Status: ✅ Complete

## Objective
Kiểm soát typography tokens trên các thẻ và component Dashboard để loại bỏ hardcode và tăng chất lượng render trên Desktop/Mobile.

## Implementation Steps
1. [x] Sửa file `components/finance/dashboard/smart-dashboard-banner.tsx`: Sửa các class mixin `text-h2 font-bold text-white`... bằng CSS Token chuẩn.
2. [x] Kiểm tra nhanh `health-score-card.tsx` và `cashflow-runway-card.tsx` (nếu có hardcode giá trị số tài chính, map về token `.text-amount`).

## Files to Modify
- `components/finance/dashboard/smart-dashboard-banner.tsx`
- Các thẻ card khác trong dashboard nếu dính lỗi typography inline.

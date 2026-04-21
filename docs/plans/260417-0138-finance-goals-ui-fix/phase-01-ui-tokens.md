# Phase 01: Cập nhật SSOT UI Tokens
Status: ✅ Complete (lint + tsc pass; nên verify UI thủ công)

## Objective
Sửa lỗi về UI System Token trong module mục tiêu tài chính (finance/goals) để đảm bảo đồng bộ với Gold Standard của ứng dụng (Apple/Stripe-style).

## Requirements
### Functional
- [x] Giao diện hoạt động bình thường trên cả mobile và desktop.

### Non-Functional
- [x] Tính nhất quán (SSOT): Sử dụng đúng Token cho Badge, Button, Progress, Empty/Confirm states giống như các Finance modules khác.

## Implementation Steps
1. [x] Cập nhật `components/finance/goals/goals-client.tsx`
   - Header chuẩn Finance: `<GoalsStatsBar>` (SSOT `StatsBar`) + action button trong unified container.
   - Filter row chuẩn: `<GoalsFilters>` (SSOT `TabsFilter`) + `SelectPill` (sort).
   - Dùng `<EmptyState>` cho empty view, `<ConfirmDialog>` cho delete flow.
   - Dùng `.progress-track` + `.progress-fill-*` cho progress bar (SSOT).
2. [x] Kiểm tra và cập nhật `goal-contribution-modal.tsx`
   - Form fields dùng shared inputs (`CurrencyInput`, `Textarea`) + `UnifiedModal`.
3. [x] Kiểm tra và cập nhật `goal-form-modal.tsx`
   - Form fields dùng shared inputs (`Input`, `CurrencyInput`, `DatePicker`, `Textarea`) + `UnifiedModal`.

## Files to Modify
- `components/finance/goals/goals-client.tsx`
- `components/finance/goals/goal-contribution-modal.tsx`
- `components/finance/goals/goal-form-modal.tsx`

## Test Criteria
- [x] `tsc --noEmit` chạy OK.
- [x] Targeted eslint chạy OK cho các file đã sửa.
- [ ] Chạy Dev server và verify UI (mobile/desktop): header + tabs + sort + list cards + modals.

---
Next Phase: N/A

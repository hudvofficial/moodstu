# Phase 03: Khôi phục Funnel Analytics & Source Chart
Status: ⬜ Pending

## Objective
Báo cáo phân tích (Funnel / Sources) là điểm sáng của CRM V1, bắt buộc phải trả lại cho người dùng, và làm cho nó mượt mà hơn bằng UI component chia sẻ của V2: `stats-bar.tsx`.

## Requirements
- [ ] Phục hồi Chuyển đổi Phễu dựa trên `PipelineStats`.
- [ ] Phục hồi Nguồn khách (SourceChart) nhưng thay vì tạo ra logic render Pie quá dầy, dùng class `@theme` của V2 và code JSX đơn giản.

## Implementation Steps
1. [ ] Gọi component `components/ui/stats-bar.tsx` trên Mobile/Desktop view đầu trang.
2. [ ] Map các API stats từ V1 để tái sử dụng.
3. [ ] Xây dựng lại `SourceChart` bằng layout V2 (Card) nhưng giữ nguyên tính năng.

## Files to Modify
- `components/crm/crm-analytics-board.tsx`
- `app/actions/crm-stats.ts`

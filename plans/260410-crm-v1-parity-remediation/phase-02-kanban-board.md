# Phase 02: Khôi phục Kanban Desktop & Swipe Mobile
Status: ⬜ Pending

## Objective
Luân chuyển view giữa List, Grid, và Kanban của V1 một cách trơn tru, không bỏ rơi swipe action mobile.

## Requirements
- [ ] Dựng `components/crm/kanban-board.tsx` giống 100% logic logic Kanban và pipeline Dnd của V1. Render trên Desktop.
- [ ] Giữ nguyên thao tác Swipe Left/Right tại Mobile (Vuốt để Chuyển trạng thái, Gọi điện).

## Implementation Steps
1. [ ] Sử dụng `TabsFilter` (components/ui/tabs-filter.tsx) để Switch view (List / Kanban).
2. [ ] Dựng Kanban board map các `PipelineValue` ngang sang nhau.
3. [ ] Wrap Mobile Item Card với `framer-motion` pan handlers hoặc CSS scroll snap để tạo action swipe theo V1.

## Files to Modify
- `components/crm/lead-list-page.tsx`
- `components/crm/kanban-board.tsx`

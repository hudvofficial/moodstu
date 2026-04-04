# Phase 04: Desktop Grid Component

Status: ⬜ Pending

## Objective

Giao diện Calendar (Tháng) cho dải kích thước màn hình PC (>=1024px).

## Requirements

### Functional

- [ ] Lưới lịch (CSS Grid 7 cột chuẩn xác, ko dùng Flex).
- [ ] Appply `dnd-kit` framework.
  - Thẻ cha là `<DndContext>`. Ô ngày là `<Droppable>`. Event block là `<Draggable>`.
  - Disable kéo Droppable nếu `event.draggable === false` (Sự kiện hợp đồng chính, Google Event).

## Implementation Steps

1. [ ] Khai báo `components/calendar/views/month-grid.tsx`.
2. [ ] Inject SortableContext của `dnd-kit` hoặc làm basic `useDraggable`.
3. [ ] Nối event kéo thả để chạy action `updateDragDropDate` từ Phase 02. Chạy `mutate(key)` ngay lập tức SWR lúc xong.

## Files to Create/Modify

- `components/calendar/views/month-grid.tsx`

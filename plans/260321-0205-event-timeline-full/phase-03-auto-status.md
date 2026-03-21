# Phase 03: Auto Status + checkAndCompleteEvent Integration
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Gắn `checkAndCompleteEvent` vào các điểm trigger:
1. Sau khi thêm task (addTask) → event status PENDING → IN_PROGRESS
2. Sau khi toggle task status → tất cả hoàn thành → event COMPLETED
3. Sau khi xóa task → nếu 0 tasks → event PENDING

V1 ref: EventTaskModal.tsx L240-277

## V2 Tối ưu so với V1

| Điểm | V1 | V2 tối ưu |
|------|------|------|
| Call point | Client-side, trực tiếp trong component | Server action, clean separation |
| Error handling | `.catch(() => {})` bỏ qua | Log error, không block UI |
| Revert logic | Client query `count` rồi update | Server action atomic check |

## Implementation Steps

1. [ ] Trong `work-task-actions.ts` → `addTask()`:
   - Sau insert thành công → call `checkAndCompleteEvent(eventId)`
   - Event tự đổi PENDING → IN_PROGRESS (có tasks)
2. [ ] Trong `work-task-actions.ts` → `deleteTask()`:
   - Sau delete → check remaining tasks count
   - 0 tasks → `updateContractEvent(eventId, { status: 'cho' })`
   - >0 tasks → `checkAndCompleteEvent(eventId)` (recalc)
3. [ ] Trong `event-task-modal.tsx` → toggle status:
   - Sau toggle → call `checkAndCompleteEvent(eventId)` (non-blocking)
   - Logic: tất cả tasks = "hoan_thanh" → event = "hoan_thanh"
4. [ ] Trong `event-timeline.tsx` → inline toggle:
   - Tương tự, call `checkAndCompleteEvent` sau toggle

## Files
- `app/actions/work-task-actions.ts` (MODIFY — thêm calls)
- `components/contracts/detail/event-task-modal.tsx` (MODIFY — thêm calls)
- `components/contracts/detail/event-timeline.tsx` (MODIFY — thêm calls)

## Test Criteria
- [ ] Thêm task đầu tiên → event badge đổi "Chờ" → "Đang làm"
- [ ] Toggle tất cả tasks "Hoàn thành" → event badge đổi "Xong"
- [ ] Xóa hết tasks → event badge revert "Chờ"

---
Next Phase: phase-04-verify.md

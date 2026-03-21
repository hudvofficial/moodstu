# Phase 02: Modal Header — DatePicker + Info Pills
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thêm DatePicker + info pills vào EventTaskModal header.
V1 ref: EventTaskModal.tsx L289-345.

## V1 Logic → V2 Implementation

### DatePicker (CRITICAL)
V1 L299-318: `<DatePicker compact value={...} onChange={updateContractEvent(...)}/>`

V2:
- Dùng `components/ui/date-picker.tsx` (đã có, hỗ trợ `compact` mode)
- On change:
  - On-set: `await updateContractEvent(eventId, { event_date: dateStr })`
  - Hậu kỳ: `await updateContractEvent(eventId, { deadline: dateStr, is_manual_date: true })`
- Toast: "Đã cập nhật ngày!"
- Call `onSaved()` để refresh parent

### Info Pills (V1 L319-343)
V1 hiện 3 pills sau DatePicker:
1. ⏰ Time pill — `start_time - end_time` (on-set only)
2. 📍 Location pill — `event.location`
3. 🏷️ Type pill — "On-set" / "Hậu kỳ" / "Giao SP"

V2 tối ưu:
- Dùng V2 tokens: `.text-caption`, `bg-interactive-light`, `text-primary`
- Lucide icons: `Clock`, `MapPin`, `CalendarDays`
- Pills = flex-wrap trong modal description area

## Implementation Steps

1. [ ] Import `DatePicker` + `updateContractEvent` vào `event-task-modal.tsx`
2. [ ] Thêm props: pass `event.start_time`, `event.end_time`, `event.location` vào modal
3. [ ] Render DatePicker compact + pills trong modal title area (trước description)
4. [ ] Xử lý onChange: call server action, toast, onSaved
5. [ ] Ensure DatePicker portal z-index > UnifiedModal overlay

## Files
- `components/contracts/detail/event-task-modal.tsx` (MODIFY)

## Test Criteria
- [ ] DatePicker hiện trong modal header, hiển thị ngày hiện tại
- [ ] Click DatePicker → chọn ngày → update DB → refresh
- [ ] Time pill hiện giờ BĐ/KT (on-set only)
- [ ] Location pill hiện địa điểm

---
Next Phase: phase-03-auto-status.md

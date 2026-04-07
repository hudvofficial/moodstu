# Phase M3: Google Sync Button + Source Badge

Status: ⬜ Pending
Dependencies: Phase M1

## Objective

Thêm nút Google Sync trên toolbar (V1 parity) và badge "G" trên event card khi `source === 'google'`.

## V1 Reference

- Toolbar có icon 🔄 (refresh/sync) để đồng bộ thủ công với Google Calendar
- Event card từ Google có badge "G" nhỏ ở góc → phân biệt nguồn

## Implementation Steps

### 1. Google Sync Button trên toolbar

- [ ] Thêm icon button `RefreshCw` (lucide) cạnh filters
- [ ] Desktop: icon + text "Sync"
- [ ] Mobile: icon only
- [ ] onClick → gọi `mutate()` để refresh SWR cache
- [ ] Loading state: icon spin animation
- [ ] Chỉ hiện khi `isGoogleConnected === true`

### 2. Source Badge "G" trên CalendarEventCard

- [ ] Khi `event.source === 'google'` → hiện badge nhỏ "G"
- [ ] Badge style: `bg-green-100 text-green-700 text-[10px] font-bold px-1 rounded`
- [ ] Vị trí: góc phải trên của event card

### 3. Source Badge trên DraggableEvent (desktop grid)

- [ ] Tương tự badge "G" cho desktop month/week grid events

## Files to Modify

- `components/calendar/calendar-toolbar.tsx` — add sync button
- `components/calendar/calendar-event-card.tsx` — add "G" badge
- `components/calendar/views/draggable-event.tsx` — add "G" badge

## Props Changes

- `CalendarToolbar` cần nhận thêm: `onSync: () => void`, `isGoogleConnected: boolean`
- Truyền từ `calendar-wrapper.tsx`

## Test Criteria

- [ ] Google sync button visible khi connected
- [ ] Click sync → data refreshes
- [ ] Badge "G" hiện trên Google-sourced events
- [ ] Badge KHÔNG hiện trên internal events
- [ ] Desktop + Mobile đều hiển thị đúng
- [ ] Build passes

---

✅ Plan complete

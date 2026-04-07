# Phase 04: UX Polish + Performance

Status: ⬜ Pending
Dependencies: Phase 02 (views), Phase 03 (drawer)

## Mục tiêu

Polish trải nghiệm: Lunar calendar, Google badge, today highlight, keyboard shortcuts, animations, EmployeePicker.

---

## 4.1 Lunar Calendar Integration

**V1 (screenshot-confirmed):** Ngày âm nhỏ cạnh ngày dương (VD: `1` `14`). Mùng 1 ÂL highlight đỏ (`17 1/3`)
**V2 đã có:** `lib/lunarCalendar.ts` (lib tồn tại nhưng chưa import)

### Tối ưu V2:

- Import `getLunarDate()` từ lib existing
- MonthGrid/WeekGrid: ngày âm nhỏ (text-[9px] text-text-muted) bên cạnh ngày dương
- Highlight mùng 1 âm lịch (đỏ) — quan trọng cho industry cưới
- DayView header: show "DD/MM ÂL" compact
- Converter modal đầy đủ → DEFER

### Files:

- **[MODIFY]** `components/calendar/views/month-grid.tsx` — Import lunar, render ngày âm
- **[MODIFY]** `components/calendar/views/week-grid.tsx` — Render ngày âm
- **[MODIFY]** `components/calendar/views/day-view.tsx` — Header ngày âm

---

## 4.2 Google Badge trên Event Cards

**V1 (screenshot-confirmed):** Badge chữ "GOOGLE" xanh trên event detail + badge "G" trên month cell
**V2 hiện tại:** Không phân biệt source events

### Tối ưu V2:

- Thêm small badge trên `CalendarEventCard` khi `source === "google"`
- Desktop: badge text "Google" nhỏ
- Mobile: badge icon 📅 compact
- Dùng SSOT `badges.css` token

### Files:

- **[MODIFY]** `components/calendar/calendar-event-card.tsx` — Thêm Google badge

---

## 4.3 Today Highlight Enhancement

**V1 (screenshot-confirmed):** Số ngày hôm nay = vòng tròn xanh lá filled nổi bật
**V2:** Có highlight nhưng yếu

### Tối ưu V2:

- Today cell: `bg-primary text-white rounded-full` (filled circle)
- Consistent trên MonthGrid + WeekGrid + DayView

### Files:

- **[MODIFY]** `components/calendar/views/month-grid.tsx` — Stronger today highlight

---

## 4.4 Keyboard Shortcuts

**V1:** Google Calendar-style (T/N/P/M/W/D/C keys)
**V2 tối ưu:** Custom hook `useCalendarKeyboard()` — tách riêng (SRP)

- Skip khi focus input/textarea/modal open
- Keys: `T` (Today), `←/→` (Navigate), `M/W/D` (View mode), `C` (Create)

### Files:

- **[NEW]** `hooks/use-calendar-keyboard.ts` — Max 60L
- **[MODIFY]** `components/calendar/calendar-wrapper.tsx` — Import hook

---

## 4.5 Slide Animation

- State `slideDirection: 'left' | 'right' | null` trong `use-calendar-data.ts`
- Class `.slide-left`, `.slide-right` trong `animations.css`

### Files:

- **[MODIFY]** `app/styles/animations.css` — Thêm slide keyframes
- **[MODIFY]** `hooks/use-calendar-data.ts` — Thêm `slideDirection` state
- **[MODIFY]** `components/calendar/views/month-grid.tsx` — Apply slide class

---

## 4.6 EmployeePicker Upgrade

**V1:** Searchable dropdown, initials, role badges (196L)
**V2 tối ưu:** Upgrade to ComboboxPicker — reusable across ALL modules

### Files:

- **[NEW]** `components/ui/combobox-picker.tsx` — Reusable searchable dropdown, max 150L
- **[MODIFY]** `components/calendar/drawers/event-form-drawer.tsx` — Dùng ComboboxPicker

---

## 4.7 MonthGrid Performance

- Direct `eventsByDate` Map.get() (O(1))
- `memo()` wrap: `CalendarEventCard`, `DroppableDay`

### Files:

- **[MODIFY]** `components/calendar/views/month-grid.tsx` — memo DroppableDay
- **[MODIFY]** `components/calendar/calendar-event-card.tsx` — Wrap memo()

---

## 4.8 Board View (DEFER)

**V1 (screenshot):** Kanban 4 cột: Chờ làm / Đang làm / Chờ duyệt / Hoàn thành
**V2:** Đã có Productivity module riêng

**Quyết định:** DEFER — Calendar Board view sẽ deep link tới `/productivity`.
Nếu user yêu cầu → Phase 05 riêng.

---

## Test Criteria

- [ ] Lunar dates hiển thị đúng trên MonthGrid/WeekGrid
- [ ] Mùng 1 âm highlight đỏ (match V1: `1/3` đỏ)
- [ ] Google badge hiển thị trên event cards từ Google
- [ ] Today highlight nổi bật (filled circle xanh lá)
- [ ] Keyboard: T → today, ←→ → navigate, M/W/D → view mode, C → create
- [ ] Slide animation mượt khi chuyển tháng
- [ ] ComboboxPicker search hoạt động, hiển thị initials + role
- [ ] Performance: MonthGrid render <16ms
- [ ] SSOT: animations dùng `animations.css`, picker dùng `select.css`

---

End of Plan.

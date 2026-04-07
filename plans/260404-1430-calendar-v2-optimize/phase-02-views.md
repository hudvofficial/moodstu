# Phase 02: Views + Grid Fix + Click Flow

Status: ⬜ Pending
Dependencies: Phase 01 (eventsByDate, viewMode)

## Mục tiêu

Thêm 2 view modes mới + fix grid overflow + tận dụng DnD + SSOT tokens + eventsByDate từ Phase 01.

---

## 2.1 Week View — Grid 7 cột

**V1 (screenshot):** Grid 7 cột, header "30/3 – 5/4", events compact, DnD không có
**V2 tối ưu:**

- **Reuse** `DroppableDay` + `DraggableEvent` từ MonthGrid → DnD miễn phí
- **Reuse** `CalendarEventCard` → consistent styling
- Ô cao hơn MonthGrid → show 5 events + "+N more"
- Responsive: Desktop 7 cột, Mobile ẩn (chuyển về MonthGrid)
- Dùng `eventsByDate` Map từ hook (O(1) lookup per cell)

### Files:

- **[NEW]** `components/calendar/views/week-grid.tsx` — Max 200L

---

## 2.2 Day View — Section layout

**V1 (screenshot):** Timeline có trục giờ dọc (06:00 sáng), all-day section, event details
**V2 tối ưu:**

- **Section-based**: All-day → AM (6-12) → PM (12-18) → Evening (18-22)
- Compact hơn V1 (3 sections thay vì 17 slots)
- Live time indicator (red line)
- Events dùng `CalendarEventCard` component (SSOT)
- Empty state CTA "Thêm lịch"

### Files:

- **[NEW]** `components/calendar/views/day-view.tsx` — Max 200L

---

## 2.3 Toolbar — View Switcher + DatePicker

**V1 (screenshot):** Tabs `Hôm nay | Ngày | Tuần | Tháng | Board` (underline active)
**V2 hiện tại:** Chỉ có SelectPill filters

### Tối ưu V2:

- **ViewMode segmented control** (Ngày | Tuần | Tháng) — dùng SSOT `tabs.css`
- **"Hôm nay" button** — navigate về ngày hiện tại (V1 pattern)
- **DatePicker popover** (click title → month/year grid) — dùng SSOT `dropdowns.css`
- Board tab → deep link `/productivity` (DEFER, không build riêng)

### Files:

- **[MODIFY]** `components/calendar/calendar-toolbar.tsx` — Thêm ViewMode switcher
- Nếu vượt 250L → Split:
  - `calendar-toolbar.tsx` (nav + filters)
  - `calendar-date-picker.tsx` (month/year grid popover)

---

## 2.4 Grid Overflow Fix — "+N more" (CRITICAL 🔴)

**Vấn đề thực tế (screenshot V2):** Ngày 01/04 có 8 events → ô giãn gần 1/2 màn hình, vỡ grid
**V1 (screenshot):** Events compact, max 2-3 per cell, không bị vỡ

### Tối ưu V2:

- MonthGrid cell: max **3 events** visible + "+N more" text button
- WeekGrid cell: max **5 events** + "+N more"
- Click "+N more" → mở DayDrawer (reuse existing, 0 code mới)
- CSS: `max-height` cố định + `overflow: hidden` cho event container

### Files:

- **[MODIFY]** `components/calendar/views/month-grid.tsx` — Max 3 events + "+N more"
- **[MODIFY]** `components/calendar/views/week-grid.tsx` — Max 5 events + "+N more"

---

## 2.5 Calendar Wrapper Update

- **[MODIFY]** `components/calendar/calendar-wrapper.tsx` — Conditional render Week/Day/Month views

---

## Test Criteria

- [ ] WeekView render 7 cột đúng ngày
- [ ] DnD hoạt động trên WeekView
- [ ] DayView hiển thị events theo sections (AM/PM/Evening)
- [ ] Live time indicator hiển thị ở section đúng
- [ ] ViewMode switcher chuyển view đúng (Month ↔ Week ↔ Day)
- [ ] "Hôm nay" button navigate về today
- [ ] DatePicker navigate đến tháng/năm đã chọn
- [ ] **"+N more" hiển thị khi ô >3 events, click mở DayDrawer**
- [ ] **Grid KHÔNG bị vỡ chiều cao khi cell có nhiều events**
- [ ] Mobile: ẩn WeekView
- [ ] SSOT: Tất cả styles dùng CSS tokens, không inline

---

Next Phase: `phase-03-event-drawer.md`

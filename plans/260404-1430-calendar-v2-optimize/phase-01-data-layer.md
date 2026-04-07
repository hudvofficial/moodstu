# Phase 01: Data Layer + Server Actions

Status: ⬜ Pending
Dependencies: None

## Mục tiêu

Bổ sung logic nghiệp vụ backend mà V2 đang thiếu so V1, tận dụng architecture V2 đã có (SWR, withAuth, RBAC, UnifiedCalendarEvent).

---

## 1.1 Group Tasks by Contract — Client-side grouping

**V1:** `formatScheduleData.ts` → `groupTasksByContract()` (100 lines server-side)
**V2 đã có:** `generateCalendarGroupKey()` sinh `groupKey` mỗi event, `groupLabel` từ server query
**V2 thiếu:** UI logic gom events có cùng `groupKey` → 1 card

### Tối ưu V2 (KHÔNG copy V1):

- V2 ĐÃ CÓ `groupKey` trên mỗi event → chỉ cần **client-side groupBy** trong `use-calendar-data.ts`
- Thêm computed `eventsByGroupKey: Map<string, UnifiedCalendarEvent[]>` vào hook return
- MonthGrid dùng groupBy để render 1 card với badge count thay vì N cards riêng

#### Files cần sửa:

- **[MODIFY]** `hooks/use-calendar-data.ts` — Thêm `useMemo` tạo `groupedByKey` Map

---

## 1.2 eventsByDate Map — Performance O(1)

**V1:** `eventsByDate = Map<string, Event[]>` built trong ScheduleManager, truyền vào Views
**V2 thiếu:** Mỗi view tự filter `events[]` → O(n) mỗi cell render

### Tối ưu V2:

- Thêm `eventsByDate` computed vào `use-calendar-data.ts` (useMemo)
- Trả về từ hook → views consume trực tiếp
- Dùng `YYYY-MM-DD` key format

#### Files cần sửa:

- **[MODIFY]** `hooks/use-calendar-data.ts` — Thêm `eventsByDate` useMemo
- **[MODIFY]** `components/calendar/calendar-wrapper.tsx` — Truyền `eventsByDate` xuống views

---

## 1.3 Server Actions — Nghiệp vụ thiếu

### 1.3a assignTask (Giao việc nhanh)

- **[MODIFY]** `app/actions/calendar-mutations.ts` — Thêm `assignCalendarTask()`

### 1.3b checkEmployeeAvailability (Check trùng lịch)

- **[MODIFY]** `app/actions/calendar-queries.ts` — Thêm `checkEmployeeAvailability()`

### 1.3c updateTaskDetails + Auto-Print

- **[MODIFY]** `app/actions/calendar-mutations.ts` — Thêm `updateCalendarTaskDetails()`

---

## 1.4 View Mode State

- Thêm `viewMode` state + URL sync vào `use-calendar-data.ts`
- URL: `?view=week` (replaceState)

#### Files:

- **[MODIFY]** `hooks/use-calendar-data.ts` — Thêm `viewMode` state + setter

---

## 1.5 Work Type Label Mapping (Browser Finding 🔴)

**Vấn đề:** V2 hiển thị raw snake_case từ DB (`chup_anh`, `retouch`, `dung_phim`)
**V1:** Dùng `getWorkTypeLabel()` chuyển → "Chụp ảnh", "Retouch", "Dựng phim"

### Tối ưu V2:

- V2 ĐÃ CÓ `getWorkTypeLabel()` trong constants
- Map trong `calendar-queries.ts` khi build `UnifiedCalendarEvent.title`
- HOẶC map ở client trong `CalendarEventCard` component

#### Files:

- **[MODIFY]** `app/actions/calendar-queries.ts` — Map `work_type` qua `getWorkTypeLabel()`

---

## 1.6 Click Flow Fix (Browser Finding 🔴)

**Vấn đề:** V2 click ô ngày → mở thẳng EventFormDrawer (Create)
**V1:** Click ô ngày → DayDrawer (list events + CTAs). Click ô trống → KHÔNG phản hồi.

### Tối ưu V2:

- Click ô ngày → mở DayDrawer (xem events ngày đó + CTAs)
- Click event card → mở EventFormDrawer (detail/edit)
- Click ô ngày TRỐNG → mở DayDrawer empty state + CTA "Thêm lịch"

#### Files:

- **[MODIFY]** `components/calendar/views/month-grid.tsx` — Click ô → DayDrawer
- **[MODIFY]** `components/calendar/drawers/day-drawer.tsx` — Thêm CTAs + empty state

---

## Test Criteria

- [ ] `eventsByDate` Map trả về đúng events per date key
- [ ] `groupedByKey` gom đúng tasks cùng contract+ngày
- [ ] `assignCalendarTask()` update DB + RBAC check
- [ ] `checkEmployeeAvailability()` trả về conflicts chính xác
- [ ] `updateCalendarTaskDetails()` trigger auto-print khi post-production hoàn thành
- [ ] `viewMode` state persist qua URL
- [ ] Event titles hiển thị label đẹp ("Chụp ảnh" thay vì "chup_anh")
- [ ] Click ô ngày → DayDrawer (không phải EventFormDrawer)

---

Next Phase: `phase-02-views.md`

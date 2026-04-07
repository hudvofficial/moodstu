# 🔬 Deep Audit: Calendar V1 vs V2 — Logic & Data Flow Analysis

**Date:** 2026-04-04 | **Scope:** Code-level, line-by-line | **Files Read:** 23 files, ~4900 lines

---

## 1. DATA FLOW — Kiến trúc dữ liệu

### V1: Server Props → Client Shadow → Google Polling

```
Server Component (page.tsx)
  ↓ formatScheduleData() — merge 3 sources + groupTasksByContract
  ↓ Props: events[], employees[], currentDate, rangeStart/End
ScheduleManager (Client)
  ├─ clientEvents state (shadow server props khi navigate)
  ├─ Google API polling 30s + retry 3x + abort controller
  ├─ Merge: [...dbEvents, ...googleEvents]
  ├─ Filter: status + employee
  ├─ eventsByDate = Map<string, Event[]> (O(1) lookup)
  └─ Views consume eventsByDate
```

### V2: SWR + Server Actions

```
useCalendarData() hook (Client)
  ├─ SWR(fetchCalendarEvents) — server action return UnifiedCalendarEvent[]
  ├─ SWR(fetchCalendarFilterEmployees) — separate query
  ├─ SWR(checkGoogleCalendarStatus) — boolean
  ├─ Client-side filter: selectedEmployees[] + selectedStatuses[]
  └─ CalendarWrapper consumes events[]
```

### Phân tích:

- ✅ **V2 SWR tốt hơn:** Auto-revalidate, dedup, cache key, cleaner separation
- ✅ **V2 RBAC tốt hơn:** Application-level auth ở server action, `editable`/`draggable` per event
- ✅ **V2 Google sync server-side:** Fetch trong server action (không expose API route cho client)
- ❌ **V2 thiếu `eventsByDate` Map:** CalendarWrapper phải tự build hoặc views tự filter → performance issue khi events nhiều
- ❌ **V2 thiếu `groupTasksByContract`:** V1 merge 5 tasks cùng HD+ngày → 1 event → giảm clutter. V2 hiển thị rời rạc

---

## 2. SERVER ACTIONS — Nghiệp vụ Backend

### V1: `app/actions/schedules.ts` (509 lines, 6 functions)

| Function                    | Chức năng                                                                                             | V2 Có?                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------ |
| `createSchedule`            | Tạo event + Google sync + audit log                                                                   | ✅ `createCalendarEvent` |
| `updateSchedule`            | Sửa event + Google sync + audit log                                                                   | ✅ `updateCalendarEvent` |
| `deleteSchedule`            | Xóa event + Google sync + audit log                                                                   | ✅ `deleteCalendarEvent` |
| `assignTask`                | Giao task → NV + cost + đổi status "Đang làm"                                                         | ❌ **THIẾU**             |
| `updateTaskDetails`         | Sửa task (assignee, deadline, status) + **auto-create printing order** khi hoàn thành post-production | ❌ **THIẾU**             |
| `checkEmployeeAvailability` | Kiểm tra NV có bị trùng lịch ngày X không (cross-contract)                                            | ❌ **THIẾU**             |

### Phát hiện quan trọng:

- 🔴 **`updateTaskDetails`** có logic `auto-create printing order`: Khi task hậu kỳ hoàn thành → tự tạo đơn in ấn. Đây là business logic cross-module (Calendar → Printing). V2 **chưa có**.
- 🔴 **`checkEmployeeAvailability`** check trùng lịch = query work_progress cùng employee + cùng ngày. V2 không có → giao việc trùng lịch mà không biết.
- 🔴 **`assignTask`** cho phép giao/sửa cost + auto đổi status. V2 chưa có giao việc từ Calendar.

---

## 3. COMPONENT UI — So sánh logic nội bộ

### 3.1 ScheduleManager (V1 Orchestrator, 549L) vs CalendarWrapper (V2, 121L)

V1 có mà V2 thiếu:

- **Keyboard shortcuts** (T/N/P/M/W/D/C keys) — Google Calendar-style
- **Slide animation** state (`slideDirection: 'left' | 'right'`)
- **Client-side navigation** (fetch API thay vì router.push → instant transition)
- **Realtime subscribe** 3 tables: `schedules`, `work_progress`, `contract_events`
- **Google sync status indicator** (synced/retrying/disconnected)
- **Dynamic import** cho modals (lazy load)

### 3.2 CalendarHeader (V1 482L) vs calendar-toolbar (V2 82L)

V1 có mà V2 thiếu:

- **DatePicker modal** (click title → month/year grid selector, headless UI transitions)
- **SolarLunarConverter** button (desktop only, ≥xl)
- **View mode switcher** (day/week/month/board) — cả mobile và desktop
- **Mobile-specific header** (responsive riêng biệt, không dùng chung desktop)
- **Filter dropdown** mobile (portal popover)

### 3.3 EventDetailModal (V1 539L) vs event-form-drawer (V2 243L)

V1 có mà V2 thiếu:

- **3-type event handling:** Schedule/Task/Google — mỗi loại form riêng, logic save riêng
- **Dirty-field PATCH cho Google:** Chỉ gửi fields thay đổi (title, dates, colorId) → tránh overwrite
- **Google Color Picker** (11 colors, toggle select)
- **ReceiptModal tích hợp:** Nếu event có contract nợ → nút "Thu tiền" → mở ReceiptModal ngay
- **Contract link builder:** `buildContractUrl()` smart prefill (customer_name, work_date, notes)
- **Edit/View mode toggle** — 2 giao diện riêng biệt
- **Delete confirm** inline (không phải window.confirm)

### 3.4 EmployeePicker (V1 196L) vs V2 SelectPill

V1 EmployeePicker:

- Searchable dropdown (auto-focus search, keyboard)
- Memo-ized component
- Initials avatar (`getInitials()`)
- Role badge colors (`getRoleColor()`)
- "Bỏ chọn" clear option
- Outside-click close
- Show search only khi >4 employees

V2: Plain SelectPill dropdown → không tìm kiếm, không avatar, không role badge

### 3.5 DayView (V1 239L) — V2 không có

Chi tiết logic:

- **eventsByHour Map:** Group events theo giờ (clamp 6-22)
- **Live time indicator:** Red line theo % minute hiện tại
- **All-day section** riêng biệt
- **Lunar details** header: ngày âm, Can Chi, Tháng Can Chi
- **Empty state** CTA "Thêm công việc"
- **Google backgroundColor** custom border-left

### 3.6 formatScheduleData (V1 282L) — V2 không có

**groupTasksByContract algorithm:**

```
1. Separate events by type (schedule/task/google)
2. Group tasks: Map<"contractCode__YYYY-MM-DD", Task[]>
3. If group has 1 task → keep as-is
4. If group has N>1 tasks → merge:
   - Title = eventName + customerName
   - Status = priority(Đang làm > Chưa làm > Hoàn thành)
   - Start = earliest, End = latest
   - SubTasks[] for detail view
5. Return [...schedules, ...grouped, ...ungrouped, ...google]
```

V2 KHÔNG có grouping → contract "HD001" có 5 tasks (Photo/Makeup/Edit...) cùng ngày → calendar cell hiện 5 cards riêng → clutter. V1 hiện 1 grouped card "HD001 — Nguyễn Văn A" với badge "5 việc".

---

## 4. UTILITIES — Logic ẩn

### ScheduleUtils (V1 233L)

V2 cần port:

- `GOOGLE_COLORS[]` (11 colors with Vietnamese labels)
- `getCategoryIcon()` — 8 category patterns mapping to icon/color/border
- `getStatusColor()` — 4 statuses → color classes
- `getInitials()` — extract name initials
- `getRoleColor()` — role → badge color
- `hasTimeOverlap()` — check 2 time ranges overlap
- `formatTimeRange()` — "09:00-11:00" display

V2 hiện dùng `calendar-utils.ts` nhưng chỉ có `generateCalendarGroupKey` + `getEventColorToken` — thiếu phần lớn mapping functions.

---

## 5. KẾT LUẬN — V2 cần gì THẬT SỰ?

### Tier 1: Business Logic Gaps (MẤT NGHIỆP VỤ)

| #   | Gap                                                                         | Mức độ | Effort |
| --- | --------------------------------------------------------------------------- | ------ | ------ |
| 1   | `groupTasksByContract` — Calendar bị clutter                                | 🔴     | Medium |
| 2   | `assignTask` + `checkEmployeeAvailability` — Giao việc + check trùng lịch   | 🔴     | Medium |
| 3   | `updateTaskDetails` + auto-create printing order                            | 🔴     | Medium |
| 4   | EventFormDrawer: 3-type handling (schedule/task/google) + dirty-field PATCH | 🔴     | Large  |
| 5   | ReceiptModal integration (thu tiền nợ từ Calendar event)                    | 🟡     | Small  |
| 6   | Contract link builder (smart prefill `/contracts/create?...`)               | 🟡     | Small  |

### Tier 2: View/UI Gaps (MẤT TÍNH NĂNG HIỂN THỊ)

| #   | Gap                                                                 | Mức độ | Effort |
| --- | ------------------------------------------------------------------- | ------ | ------ |
| 7   | Week View (7-col grid, taller cells, DnD shared)                    | 🔴     | Large  |
| 8   | Day View (timeline 6AM-10PM, eventsByHour, live indicator)          | 🔴     | Large  |
| 9   | View Mode Switcher trên Toolbar (day/week/month) + DatePicker modal | 🟡     | Medium |
| 10  | Lunar calendar integration (ngày âm trên grid cells)                | 🟡     | Small  |
| 11  | EmployeePicker (searchable + avatar + role) — upgrade SelectPill    | 🟡     | Medium |

### Tier 3: UX Polish (MẤT CẢM GIÁC)

| #   | Gap                                                   | Mức độ |
| --- | ----------------------------------------------------- | ------ |
| 12  | Keyboard shortcuts (T/N/P/M/W/D/C)                    | 🟢     |
| 13  | Slide animation chuyển tháng                          | 🟢     |
| 14  | "+N more" overflow handling trên MonthGrid            | 🟡     |
| 15  | Google Color Picker (11 colors) trong EventFormDrawer | 🟡     |
| 16  | Mobile Quick Actions (tạo HĐ từ DayDrawer)            | 🟢     |
| 17  | Edit/View mode toggle trong EventFormDrawer           | 🟡     |

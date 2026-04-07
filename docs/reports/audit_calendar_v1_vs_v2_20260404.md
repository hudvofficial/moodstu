# 🔍 Audit Report: Calendar Module V1 vs V2

**Date:** 2026-04-04 | **Scope:** Full Module Comparison | **Severity Analysis**

---

## Summary

| Metric               | V1                            | V2                                     |
| -------------------- | ----------------------------- | -------------------------------------- |
| Tổng files component | 19                            | 9                                      |
| Tổng code (~KB)      | ~170 KB                       | ~35 KB                                 |
| View modes           | 4 (Day/Week/Month/Kanban)     | 1 (Month only)                         |
| Mobile experience    | Rich (Drawer + Quick Actions) | Basic (Dot indicators + simple drawer) |

- 🔴 **Critical Issues (V2 thiếu hoàn toàn):** 7
- 🟡 **Warnings (V2 có nhưng yếu hơn V1):** 5
- 🟢 **V2 làm tốt hơn V1:** 3

---

## 🔴 Critical — V2 Thiếu Hoàn Toàn (Phải bổ sung)

### 1. Week View — Xem theo tuần

**V1:** `WeekView.tsx` (146 lines) — Grid 7 cột, hiển thị Lunar date, double-click tạo event, visual riêng cho T7/CN (đỏ), responsive day names (T2 ↔ Thứ 2).

**V2:** ❌ Không có. `CalendarViewMode` type có khai báo `"week"` nhưng không có component nào implement.

**Tác động:** User không xem được lịch tuần — workflow quan trọng nhất của studio (lên kế hoạch tuần cho nhân viên).

---

### 2. Day View — Xem theo ngày (Timeline)

**V1:** `DayView.tsx` (239 lines) — Timeline 6AM–10PM, hiển thị event theo time-slot, Lunar calendar chi tiết (Can Chi, Tiết khí, Ngũ Hành), click vào slot trống để tạo event.

**V2:** ❌ Không có.

**Tác động:** Không xem chi tiết lịch ngày, đặc biệt cần khi có 5+ sự kiện trong ngày.

---

### 3. Kanban Board — Bảng quản lý tiến độ theo cột

**V1:** `KanbanBoard.tsx` (574 lines) — 4 cột (Chờ làm / Đang làm / Chờ duyệt / Hoàn thành), nhóm event theo Contract, hiển thị progress bar per contract, overdue detection + cảnh báo, đếm tasks completed/total, tự động phân loại status → column.

**V2:** ❌ Không có.

**Tác động:** Quản lý tiến độ công việc — tính năng core của studio quản lý workflow hợp đồng. Thiếu hoàn toàn = không biết công việc nào đang chờ, đang làm, hay đang quá hạn.

---

### 4. Progress View — Bảng theo dõi đầu việc

**V1:** `ProgressView.tsx` (164 lines) — Table view với filter (Retouch / Chờ duyệt / Đang In), hiển thị Customer → Contract Code → Service → Work Type → Status Badge → Deadline (đỏ nháy nếu quá hạn), link nhanh đến Contract.

**V2:** ❌ Không có.

**Tác động:** Không xem tổng quan các đầu việc đang xử lý, đặc biệt quan trọng cho Retouch / In ấn.

---

### 5. Solar-Lunar Converter (Âm Dương Lịch)

**V1:** `SolarLunarConverter.tsx` (352 lines) — Modal chuyển đổi Dương ↔ Âm lịch, hiển thị Can Chi / Tiết khí / Ngũ Hành, navigate ngay đến ngày đã chọn trên calendar. `lunarCalendar.ts` lib tích hợp sâu vào MonthView + WeekView + DayView (hiển thị ngày âm nhỏ bên cạnh ngày dương).

**V2:** ❌ Không có — Không import `lunarCalendar.ts`, không hiển thị ngày âm trên grid.

**Tác động:** Với studio áo cưới VN, âm lịch rất quan trọng (chọn ngày cưới, ngày tốt). Thiếu = mất context quan trọng cho nghiệp vụ.

---

### 6. Quick Assign Modal — Giao việc nhanh

**V1:** `QuickAssignModal.tsx` (137 lines) — Modal giao việc nhanh: chọn nhân viên (EmployeePicker dialog), nhập chi phí (CurrencyInput), gán trực tiếp từ Calendar/Kanban mà không cần mở Contract.

**V2:** ❌ Không có.

**Tác động:** Không giao việc nhanh từ Calendar, phải mở Contract detail → tạo event mới, mất 3–5 bước thay vì 1 click.

---

### 7. Realtime Status Indicator

**V1:** `RealtimeStatus.tsx` (52 lines) — Hiển thị trạng thái kết nối realtime (Live sync / Offline / Đang kết nối), dùng Supabase Realtime để auto-refresh khi có thay đổi từ user khác.

**V2:** ❌ Không có.

**Tác động:** Nhiều nhân viên cùng xem Calendar không biết data có up-to-date không. V1 hiển thị 🟢 Live sync.

---

## 🟡 Warning — V2 Có Nhưng Yếu Hơn V1

### 8. Event Detail / Edit Modal

**V1:** `EventDetailModal.tsx` (539 lines) — Hiển thị chi tiết đầy đủ: Event type tabs, Status update dropdown, Assignee change (EmployeePicker), Date + Time editing, Google Calendar color picker (11 màu), Link đến Contract detail, Delete event confirm, Notes editing, Contract URL builder thông minh.

**V2:** `event-form-drawer.tsx` (243 lines) — Drawer thay vì Modal, có CRUD cơ bản + RBAC + Google sync toggle, NHƯNG thiếu:

- ❌ Google Calendar Color Picker (11 màu)
- ❌ Contract link navigation
- ❌ Status tabs/dropdown riêng
- ❌ Notes view/edit riêng

---

### 9. Mobile Day Experience

**V1:** `MobileDayDrawer.tsx` (179 lines) — Bottom sheet drawer đầy đủ: Event cards với icon loại (schedule/task/google), Status badge, Assignee, Quick Actions: **Nút tạo Hợp đồng nhanh** (`/contracts/create?work_date=...`) + Nút thêm sự kiện, Empty state đẹp với CTA.

**V2:** `day-drawer.tsx` (46 lines) — Chỉ list events, không có Quick Actions, không có nút tạo Contract, không có empty state CTA.

---

### 10. Add Event / Create Form

**V1:** `AddEventModal.tsx` (279 lines) — Modal tạo event: Event Type selector (nhiều loại), Google Calendar Color Picker, EmployeePicker dialog (search + filter), Custom DatePicker, Time input start/end, Notes textarea.

**V2:** `event-form-drawer.tsx` (243 lines) — Drawer tạo event: Category select, Date/Time input, Employee select (plain dropdown, không phải dialog), Google Sync toggle, NHƯNG thiếu:

- ❌ Color Picker (Google Calendar colors)
- ❌ Rich EmployeePicker (V1 có search/filter dialog)

---

### 11. Employee Picker

**V1:** `EmployeePicker.tsx` (203 lines\*) — Dialog modal với search input, filter theo role/status, avatar display, selected state highlight.

**V2:** Plain `<select>` dropdown — không có search, không có avatar, không có filter.

---

### 12. Month Grid — Animations & Popover

**V1:** `MonthView.tsx` (341 lines) — Slide animation khi chuyển tháng (`slideDirection`), "+N more" popover (DayEventsPopover) khi ngày có nhiều events, Lunar date hiển thị trên mỗi ô, Scroll debounce cho mobile.

**V2:** `month-grid.tsx` (175 lines) — Có DnD (tốt hơn V1), nhưng thiếu:

- ❌ Slide animation chuyển tháng
- ❌ "+N more" popover khi events tràn ô
- ❌ Lunar date trên mỗi ô
- ❌ Scroll gesture navigation

---

## 🟢 V2 Làm Tốt Hơn V1

### ✅ 1. Drag & Drop (DnD) trên Month Grid

V2 implement `@dnd-kit/core` với `DraggableEvent` + `DroppableDay`, drag overlay animation, RBAC-aware dragging (`draggable: boolean` từ server). V1 không có DnD trên Month Grid.

### ✅ 2. RBAC Integration

V2 có strict Role-Based Access Control: `editable`/`draggable` flags per event, server-side ownership validation trước khi update, userRole prop xuyên suốt. V1 loose hơn (chỉ check employee vs admin ở action level).

### ✅ 3. Google Calendar Best-Effort Sync Architecture

V2 có kiến trúc sync Google Calendar tốt hơn: Best-effort push (không block CRUD nội bộ), warning feedback qua toast, SWR-based connection check trước khi show toggle. V1 cũng có Google sync nhưng error handling kém hơn.

---

## 📊 Feature Matrix

| Feature                   | V1  | V2  | Gap                                |
| ------------------------- | :-: | :-: | ---------------------------------- |
| Month Grid                | ✅  | ✅  | V2 thiếu Lunar, animation, popover |
| Week View                 | ✅  | ❌  | **Critical**                       |
| Day View (Timeline)       | ✅  | ❌  | **Critical**                       |
| Kanban Board              | ✅  | ❌  | **Critical**                       |
| Progress Tracker          | ✅  | ❌  | **Critical**                       |
| Solar-Lunar Calendar      | ✅  | ❌  | **Critical**                       |
| Drag & Drop               | ❌  | ✅  | V2 tốt hơn                         |
| RBAC                      | ⚠️  | ✅  | V2 tốt hơn                         |
| Google Sync               | ✅  | ✅  | V2 architecture tốt hơn            |
| Google Color Picker       | ✅  | ❌  | Warning                            |
| Employee Picker (Dialog)  | ✅  | ⚠️  | V2 chỉ là dropdown                 |
| Quick Assign              | ✅  | ❌  | **Critical**                       |
| Realtime Status           | ✅  | ❌  | **Critical**                       |
| Mobile Day Drawer         | ✅  | ⚠️  | V2 thiếu Quick Actions             |
| Quick Contract Create     | ✅  | ❌  | Warning                            |
| Keyboard Shortcuts        | ✅  | ❌  | Warning                            |
| Slide Animations          | ✅  | ❌  | Warning                            |
| "+N more" Popover         | ✅  | ❌  | Warning                            |
| Event Grouping (SubTasks) | ✅  | ❌  | Warning                            |

---

## 📋 Next Steps (Đề xuất ưu tiên)

### Phase 1 — Core Views (Highest Impact)

1. **Week View** — Cần nhất cho workflow tuần
2. **Day View (Timeline)** — Xem chi tiết ngày đông lịch

### Phase 2 — Workflow Management

3. **Kanban Board** — Quản lý tiến độ nghiệp vụ core
4. **Progress Tracker** — Theo dõi Retouch/In ấn

### Phase 3 — Vietnamese Business Context

5. **Solar-Lunar Calendar** — Âm lịch cho industry cưới hỏi
6. **Quick Assign Modal** — Giao việc 1-click

### Phase 4 — Polish & UX

7. **Month Grid improvements** — Popover, Lunar dates, animations
8. **Mobile Quick Actions** — Contract creation from day drawer
9. **EmployeePicker upgrade** — Dialog with search
10. **Google Color Picker**
11. **Realtime Status**
12. **Keyboard Shortcuts**

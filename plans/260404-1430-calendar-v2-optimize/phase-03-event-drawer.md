# Phase 03: EventFormDrawer + Detail Drawer

Status: ⬜ Pending
Dependencies: Phase 01 (server actions)

## Mục tiêu

Nâng cấp EventFormDrawer xử lý đúng 3 loại event + tích hợp nghiệp vụ + match V1 UX flow.

---

## 3.1 Three-type Event Handling

**V1 (screenshot):** Click event → bottom sheet chi tiết: title + badge GOOGLE + time + customer + notes
**V2 hiện tại:** `event-form-drawer.tsx` (243L) — Chỉ handle schedule

### Tối ưu V2:

- Detect `event.source` ("schedule" | "task" | "google")
- **Schedule:** Full edit (title, date, time, employee, status, notes)
- **Task:** Limited edit (deadline, assignee, status) — title readonly
- **Google:** Read-only view + color picker + source badge
- Mỗi type render form fields khác nhau → conditional sections, KHÔNG 3 components riêng

### Files:

- **[MODIFY]** `components/calendar/drawers/event-form-drawer.tsx` — 3-type conditional rendering

---

## 3.2 Event Detail CTAs (V1-exact, screenshot-confirmed)

**V1 Event Detail Drawer có đúng 4 CTAs:**

1. `🔗 GOOGLE CALENDAR` — Link mở event trong Google Calendar (htmlLink)
2. `📄 TẠO HỢP ĐỒNG TỪ LỊCH NÀY` — Deep link `/contracts/create?date=...&customer=...`
3. `✏️ SỬA` — Chuyển sang edit mode
4. `🗑️ XÓA` — Delete confirm inline

### Tối ưu V2:

- Nếu `source === "google"` → Show CTA #1
- Nếu KHÔNG có `contractId` → Show CTA #2
- Nếu có `contractId` → Show deep link `/contracts/{id}` + ReceiptModal nếu debt > 0
- CTA #3 (Sửa) = toggle edit mode
- CTA #4 (Xóa) = inline confirm dùng `ConfirmDialog` SSOT
- ReceiptModal: import dynamic (lazy), dùng `openModal()` pattern (Lesson #81)

### Files:

- **[MODIFY]** `components/calendar/drawers/event-form-drawer.tsx` — 4 CTAs
- Nếu vượt 250L → Split:
  - `event-form-drawer.tsx` (form logic)
  - `event-detail-section.tsx` (read-only view sections)

---

## 3.3 Dirty-field PATCH cho Google Events

### Tối ưu V2:

- Dirty-field tracking: compare current values vs original event
- Gọi `updateGoogleCalendarEvent()` qua server action
- Best-effort pattern (Lesson #98): warning toast nếu Google API fail

### Files:

- **[MODIFY]** `app/actions/calendar-mutations.ts` — Thêm `updateGoogleEvent()` server action
- **[MODIFY]** `components/calendar/drawers/event-form-drawer.tsx` — Dirty-field logic

---

## 3.4 Google Color Picker

- `GOOGLE_COLORS` array centralize trong `calendar-utils.ts` (với Vietnamese labels)
- Render flex-wrap dots, dùng SSOT `forms.css`
- Gate: chỉ show khi `isGoogleConnected === true` (Lesson #99)

### Files:

- **[MODIFY]** `lib/utils/calendar-utils.ts` — Thêm `GOOGLE_COLORS` array
- **[MODIFY]** `components/calendar/drawers/event-form-drawer.tsx` — Render color dots

---

## 3.5 DayDrawer Enhancement (V1-exact, screenshot-confirmed)

**V1 (screenshot):** Bottom sheet "Thứ Bảy, 04/04/2026 — 1 sự kiện" + 3 FAB buttons:

- 📄HĐ (Tạo hợp đồng)
- ➕ (Thêm lịch mới)
- ✕ (Đóng)

**V2 hiện tại:** `day-drawer.tsx` (46L) — Chỉ list events, không có FABs

### Tối ưu V2:

- Header: "Thứ [X], DD/MM/YYYY — N sự kiện"
- 3 FAB buttons (📄HĐ + ➕ + ✕) dùng SSOT `buttons.css`
- Empty state: icon + "Không có lịch" + CTA "Thêm lịch"
- Show grouped events (cùng groupKey → 1 card)

### Files:

- **[MODIFY]** `components/calendar/drawers/day-drawer.tsx` — FABs + header + empty state

---

## Test Criteria

- [ ] Schedule event: full edit → save → data updated
- [ ] Task event: limited edit (deadline, assignee, status) → save → data updated
- [ ] Google event: color picker + dirty-field PATCH → Google Calendar updated
- [ ] Google toggle chỉ show khi `isGoogleConnected === true`
- [ ] CTA "Google Calendar" mở link đúng
- [ ] CTA "Tạo HĐ từ lịch này" prefill đúng date + customer
- [ ] CTA "Sửa" toggle edit mode
- [ ] CTA "Xóa" confirm trước khi delete
- [ ] DayDrawer có 3 FAB buttons (V1-exact)
- [ ] DayDrawer empty state hiển thị CTA
- [ ] SSOT: badges dùng `badges.css`, forms dùng `forms.css`

---

Next Phase: `phase-04-ux-polish.md`

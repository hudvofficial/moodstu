# Plan: EventTaskModal — FIX ALL (v2)
Created: 2026-03-21T01:01:00+07:00
Updated: 2026-03-21T01:44:00+07:00
Status: 🟡 In Progress

## Context

> **v1 plan** hoàn thành nhưng THIẾU nghiệp vụ cốt lõi.
> Deep audit phát hiện V2 chỉ port **53% V1** (9/17 features).
> Plan v2 = fix tất cả lỗi dựa trên nghiệp vụ thực tế.

## Nghiệp vụ cốt lõi (confirmed với anh)

> **Wedding Studio = AI làm GÌ, từ MẤY GIỜ đến MẤY GIỜ, BAO NHIÊU TIỀN**
>
> On-set: Có `start_time/end_time` → Photographer làm ca sáng xong nhận ca chiều = HỢP LỆ
> Hậu kỳ: Chỉ có `deadline`, KHÔNG CÓ GIỜ → Conflict = cross-contract cùng deadline (WARNING)
> Conflict check = TIME OVERLAP (startA < endB && endA > startB), KHÔNG chỉ cùng ngày

## V1 Reference
- `EventTaskModal.tsx` (689L) — UI + logic đầy đủ
- `EventSection.tsx` (119L) — Wrapper: contractCode, initialTasks, refreshKey
- `contract-events/validation.ts` (203L) — checkEmployeeTimeOverlap + DeadlineOverlap
- `contract-events/crud.ts` (555L) — checkAndCompleteEvent, updateTaskStatus
- `plans/260303-1905-unify-event-task/plan.md` — Kiến trúc Event-Task

## V2 Hiện trạng (đã có từ plan v1)
- ✅ `work_tasks` table (14 cols) — nhưng ❌ THIẾU `start_time`, `end_time`
- ✅ `employees` table (17 cols)
- ✅ Server Actions `work-task-actions.ts` (199L) — nhưng ❌ thiếu time, conflict sai
- ✅ `event-task-modal.tsx` (441L) — nhưng ❌ thiếu time pickers, CurrencyInput, SSOT violations
- ✅ `event-timeline.tsx` (314L) — nhưng ⚠️ SSOT violations nhỏ

---

## Phases

| Phase | Name | Scope | Status |
|-------|------|-------|--------|
| 01 | DB: Thêm start_time/end_time columns | migration | ⬜ Pending |
| 02 | Server Actions: Fix conflict + time fields | work-task-actions.ts | ⬜ Pending |
| 03 | UI: Time pickers + CurrencyInput + disable logic | event-task-modal.tsx | ⬜ Pending |
| 04 | UI: Task row time display + SSOT fixes | event-task-modal.tsx | ⬜ Pending |
| 05 | UI: Timeline SSOT fixes | event-timeline.tsx | ⬜ Pending |
| 06 | Data + Verify | SQL + browser | ⬜ Pending |

---

## Phase 01: DB — Thêm start_time/end_time

### Lý do
- V1 `work_progress` có `start_time TEXT` + `end_time TEXT` lưu giờ ca on-set
- V2 `work_tasks` KHÔNG CÓ 2 columns này → mất data cốt lõi
- Không có time fields = conflict check vô nghĩa

### Migration
```sql
ALTER TABLE work_tasks
  ADD COLUMN start_time TEXT,  -- "09:00" (on-set giờ BĐ)
  ADD COLUMN end_time TEXT;    -- "17:00" (on-set giờ KT)

COMMENT ON COLUMN work_tasks.start_time IS 'Giờ bắt đầu ca on-set (HH:MM format)';
COMMENT ON COLUMN work_tasks.end_time IS 'Giờ kết thúc ca on-set (HH:MM format)';
```

### Files
- DB migration only

---

## Phase 02: Server Actions — Fix conflict + time fields

### File: `app/actions/work-task-actions.ts` (MODIFY)

#### 2A. `addTask()` — Thêm startTime/endTime params

V1 ref (L220-234):
```
insertData.start_time = newTask.start_time;  // CHỈ khi isOnSet
insertData.end_time = newTask.end_time;
insertData.deadline = isOnSet ? event.event_date : event.deadline;
```

V2 fix:
- Accept thêm `startTime?: string`, `endTime?: string` trong input
- Insert vào `start_time`/`end_time` nếu có
- Set `deadline = event_date` cho on-set, `deadline = event.deadline` cho hậu kỳ

#### 2B. `getTasksByEvent()` — Select thêm start_time, end_time

Thêm vào `.select()`:
```
"..., start_time, end_time, ..."
```

#### 2C. `checkEmployeeConflict()` → Đổi thành `checkEmployeeTimeOverlap()`

Port V1 validation.ts L13-117:
```
checkEmployeeTimeOverlap(employeeId, targetDate, targetStartTime, targetEndTime, excludeTaskId?)
  1. Query work_tasks WHERE assigned_to = emp
     AND event_id IN (contract_events WHERE event_date = targetDate AND isOnSet)
     AND start_time IS NOT NULL AND end_time IS NOT NULL
     AND status != 'da_huy'
  2. Filter: task.start_time < targetEndTime && task.end_time > targetStartTime
  3. Return { hasConflict, conflicts[{id, work_type, start_time, end_time, event_title}] }
```

**Key rule:** CHỈ check on-set events. Hậu kỳ KHÔNG check time overlap.

### Rules
- `withAuth()` + `revalidatePath` (giữ nguyên)
- TypeScript types cập nhật cho WorkTask interface

---

## Phase 03: UI — Time pickers + CurrencyInput + disable

### File: `event-task-modal.tsx` (MODIFY)

#### 3A. Form state — Thêm start_time/end_time

V1 ref (L119-125):
```tsx
const [newTask, setNewTask] = useState({
  work_type: isOnSet ? "PHOTO" : "POST_RETOUCH",
  assigned_to: "",
  cost: 0,
  start_time: event.start_time?.slice(0,5) || "",  // inherit from event
  end_time: event.end_time?.slice(0,5) || "",       // inherit from event
});
```

V2 fix: Thêm `start_time` + `end_time` vào form state, default = event time

#### 3B. Time pickers — CHỈ hiện cho on-set events

V1 ref (L574-639):
```
Row 2: grid-cols-3 khi on-set (cost + giờ BĐ + giờ KT)
       grid-cols-1 khi hậu kỳ (chỉ cost)
```

V2 fix:
- `{isOnSetEvent(event.event_type) && (<> time inputs </>)}`
- `<input type="time" className="input-base" />`
- Mỗi khi đổi time → trigger `checkEmployeeTimeOverlap()`

#### 3C. CurrencyInput thay raw number

V1 ref (L583-590): `<CurrencyInput className="w-full text-red-600 h-9" />`

V2 fix:
- Check V2 có sẵn CurrencyInput component không
- Nếu có → import + dùng
- Nếu chưa → tạo minimal CurrencyInput hoặc dùng Intl.NumberFormat

#### 3D. Disable button khi chưa chọn NV

V1 ref (L667): `disabled={submitting || !newTask.assigned_to}`

V2 fix: `disabled={submitting || !form.assigned_to}`

#### 3E. Conflict warning UI

V1 ref (L643-661):
```tsx
<div className="bg-red-50 border border-red-200 rounded-xl">
  ⚠️ {empName}: Trùng {event_name} {start_time}-{end_time} ({contract_code})
</div>
```

V2 fix: Thêm conflict state + hiển thị warning dưới form

### Files
- `event-task-modal.tsx` — Major changes
- Possibly `components/ui/currency-input.tsx` — nếu cần tạo mới

---

## Phase 04: UI — Task row time display + SSOT fixes

### File: `event-task-modal.tsx` (MODIFY)

#### 4A. Task row hiện giờ (on-set)

V1 ref (L408-413):
```tsx
{isOnSet && task.start_time && task.end_time && (
  <span className="text-[10px] text-blue-500 font-medium">
    {task.start_time.slice(0,5)} - {task.end_time.slice(0,5)}
  </span>
)}
```

V2 fix: Hiện time range trên mỗi task row, chỉ khi on-set + có time data

#### 4B. SSOT class fixes (từ audit)

| Line | Hiện tại | Sửa thành |
|------|----------|-----------|
| ~283 | inline font-semibold uppercase tracking-wide | `.text-overline` |
| ~343 | inline font-semibold uppercase tracking-wide | `.text-overline` |
| ~255 | inline text-caption text-text-muted | `.text-overline` |
| ~293 | text-body-sm font-semibold override | `.text-label` |
| ~300 | inline text-caption override | SSOT amount pattern |

### Files
- `event-task-modal.tsx` only

---

## Phase 05: UI — Timeline SSOT fixes

### File: `event-timeline.tsx` (MODIFY)

| Issue | Hiện tại | Sửa thành |
|-------|----------|-----------|
| W4 L103 | `border-b border-border-primary/30` | `bg-border-primary/30 h-px` (divider, no border) |
| W5 L199 | `border border-primary/30` active card | `shadow-sm` hoặc `ring-1 ring-primary/30` |
| Employee name L85 | inline font-semibold override | `.text-label` |

### Files
- `event-timeline.tsx` only

---

## Phase 06: Data + Verify

### SQL
- Update mock tasks with `start_time`/`end_time` cho on-set events
  ```sql
  UPDATE work_tasks
  SET start_time = '09:00', end_time = '12:00'
  WHERE event_id IN (SELECT id FROM contract_events WHERE event_type IN ('chup_studio','ngay_cuoi','chup_ngoai_canh'))
  AND start_time IS NULL;
  ```

### Browser verify
1. Mở contract HĐ-0003 → timeline → click on-set event
2. Modal mở → thấy time display trên task rows (09:00 - 12:00)
3. Form có 3 cột: Chi phí + Giờ BĐ + Giờ KT (on-set)
4. Chọn NV → conflict check tự trigger
5. Click hậu kỳ event → form CHỈ CÓ chi phí (1 cột, không có giờ)
6. Button disabled khi chưa chọn NV
7. Thử gán NV trùng giờ → warning hiện ra

---

## Constraints
- Max 250 lines/file (#7)
- SSOT classes: `.input-base`, `.label-base`, `.btn-primary`, `.text-overline`, `.text-label` (#53, #54, #67)
- Không border, chỉ shadow (#64)
- Lucide icons (#13)
- Server Actions `withAuth()` (#59)
- V2 enum snake_case (#65)
- V2 table names: `work_tasks` (#66)
- V-GATE: Mở browser + so sánh trước khi fix

## V1 → V2 Mapping (sau khi fix xong)

| V1 Feature | V2 Status |
|------------|-----------|
| Task CRUD | ✅ Phase 02 fix |
| Time pickers (on-set) | ✅ Phase 03A-B |
| CurrencyInput | ✅ Phase 03C |
| Disable button | ✅ Phase 03D |
| Time overlap conflict | ✅ Phase 02C + 03E |
| Task row time display | ✅ Phase 04A |
| Auto-complete event | ✅ (đã có) |
| Optimistic toggle | ✅ (đã có) |
| Status cycle | ✅ (đã có) |
| SSOT compliance | ✅ Phase 04B + 05 |

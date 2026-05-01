# Calendar Google-Like Event Create Max Score Plan

**Scope:** Calendar `Tao lich trinh` drawer/form.
**Reference behavior:** Google Calendar quick create + more options flow.
**Product filter:** Only implement the Google Calendar logic that fits Mood Studio operations.
**Target score:** 9.8/10.
**Current implemented score:** 9.7/10 after local verification; 9.8/10 requires authenticated browser smoke on desktop/mobile.
**Stretch score:** 9.9/10 after browser E2E and validated Google Meet/attendee sync.

## Product Goal

Make `Tao lich trinh` feel as fast as Google Calendar while staying aligned with Mood Studio business rules:

- Create quickly with title + date/time + owner.
- Default values are smart.
- More details are optional, not blocking.
- Mobile works like a compact bottom-sheet workflow.
- Google sync is explicit and safe.

## Included Google-Like Logic

- Title/summary.
- Start/end date and time.
- All-day toggle.
- Basic repeat concept.
- Owner/assignee.
- Location.
- Description/notes.
- Google sync toggle.
- Google Meet/conference option when sync is available.
- Reminder concept where supported by storage/API.
- Busy/free concept as optional display/status.

## Explicitly Out of Scope For This Pass

- Full custom RRULE editor.
- Find-a-time across calendars.
- Room/resource booking.
- Guest permission matrix.
- Email invite/RSVP lifecycle.
- Multiple Google calendar target selection.
- Timezone picker.
- Google Drive attachment upload.

## Score Model

| Area | Target |
| --- | --- |
| Quick create UX | 10/10 |
| Mood business rules | 9.8/10 |
| Google sync safety | 9.6/10 phase 1, 9.8 with Meet/reminder payload |
| Mobile UX | 9.8/10 |
| Data correctness | 9.8/10 |
| Maintainability | 9.8/10 |
| Verification | 9.8/10 |

## Phase Order

1. Phase 00 - Contract Freeze and Current Form Audit - Complete
2. Phase 01 - Data Contract and Date-Time Rules - Complete
3. Phase 02 - Quick Create UI Shell - Complete
4. Phase 03 - Date-Time Interaction and All-Day Logic - Complete
5. Phase 04 - More Options and Mood Business Fields - Complete for supported fields
6. Phase 05 - Google Sync, Meet, Reminder Safe Wiring - Complete for sync/all-day/location/notes; Meet/reminder deferred because backend support is absent
7. Phase 06 - Mobile, Accessibility, Performance, SSOT Polish - Complete; browser visual pending
8. Phase 07 - Verification, Final Score, Deploy - Local verification complete; deploy pending

## Phase 00 - Contract Freeze and Current Form Audit

**Status:** Complete
**Priority:** P0
**Target impact:** 6.5 -> 7.2

### Tasks

- [ ] Audit current files:
  - `components/calendar/drawers/event-form-drawer.tsx`
  - `app/actions/calendar-mutations.ts`
  - `app/actions/calendar-task-actions.ts`
  - `types/calendar.types.ts`
- [ ] Separate three modes:
  - create schedule
  - edit schedule
  - edit task deadline/details
- [ ] Define first-pass product contract:
  - quick create is for new schedule
  - task editing keeps task-specific UI
  - Google events remain read-only unless current code supports edits
- [ ] Freeze required fields:
  - title
  - start date/time or all-day date
  - owner/employee
- [ ] Confirm role behavior:
  - admin/manager can choose owner
  - limited user defaults to current user if required

### Acceptance Criteria

- Scope does not break existing schedule/task/google event flows.
- Create/edit/task modes are intentionally handled, not mixed accidentally.

## Phase 01 - Data Contract and Date-Time Rules

**Status:** Complete
**Priority:** P0
**Target impact:** 7.2 -> 8.0

### Tasks

- [ ] Define local UI state:
  - `title`
  - `startDate`
  - `startTime`
  - `endDate`
  - `endTime`
  - `allDay`
  - `hasExplicitTime`
  - `repeat`
  - `employeeId`
  - `location`
  - `description`
  - `syncToGoogle`
  - `createMeet`
  - `reminder`
- [ ] Date-time rules:
  - default start = selected date + current rounded time or 09:00
  - default end = start + 1 hour
  - all-day uses date-only behavior where backend supports it
  - end must not be before start
  - changing start after end auto-adjusts end
- [ ] Add pure helpers if needed:
  - round time to next 15 minutes
  - combine local date/time
  - add minutes
  - validate start/end

### Acceptance Criteria

- No timezone `toISOString().split("T")[0]` bug.
- End date/time validation is deterministic.
- Submit payload remains compatible with existing server action.

## Phase 02 - Quick Create UI Shell

**Status:** Complete
**Priority:** P0
**Target impact:** 8.0 -> 8.8

### Goal

Make create mode fast and Google-like.

### UI Structure

- Header: `Tạo lịch trình`, close.
- Large title input, autofocus.
- Segmented tabs:
  - `Sự kiện`
  - `Việc cần làm` as UI affordance if task creation is supported later; otherwise disabled/hidden with no fake behavior.
- Compact rows:
  - time row with clock icon
  - owner row
  - Google sync row if connected
- Footer:
  - `Tùy chọn khác`
  - `Lưu`

### Tasks

- [ ] Refactor create UI without changing edit mode yet.
- [ ] Make title the first focus target.
- [ ] Show minimum fields by default.
- [ ] Keep `Save` disabled until required fields are valid.
- [ ] Preserve existing error display pattern.

### Acceptance Criteria

- User can create with title + date/time + owner quickly.
- UI is visibly lighter than current form.
- No card-inside-card layout.

## Phase 03 - Date-Time Interaction and All-Day Logic

**Status:** Complete
**Priority:** P0
**Target impact:** 8.8 -> 9.2

### Tasks

- [ ] Add compact Google-like time row:
  - collapsed: date range + `Thêm thời gian`
  - expanded: start date/time, end date/time
- [ ] Add `Cả ngày` toggle.
- [ ] Add `Không lặp lại` selector as basic repeat placeholder.
- [ ] Validate end after start.
- [ ] For all-day:
  - hide time inputs
  - keep date range visible
  - submit date in backend-compatible form
- [ ] If repeat is not persisted yet:
  - keep selector disabled or `Không lặp lại` only
  - do not pretend recurrence is saved.

### Acceptance Criteria

- Date/time behavior matches user expectation.
- All-day does not save malformed times.
- Repeat UI does not lie about unsupported recurrence.

## Phase 04 - More Options and Mood Business Fields

**Status:** Complete for supported fields
**Priority:** P1
**Target impact:** 9.2 -> 9.45

### Tasks

- [ ] Add `Tùy chọn khác` expandable section.
- [ ] Add supported fields:
  - location
  - description/note
  - color/calendar color if current payload supports it
  - linked customer/contract if already available in context
- [ ] Keep unsupported Google fields out of UI.
- [ ] For task source edit:
  - keep task deadline/owner behavior separate
  - avoid showing irrelevant Google event controls.

### Acceptance Criteria

- Core create form stays compact.
- More options are discoverable but not noisy.
- Mood-specific fields are not hidden behind Google-only language.

## Phase 05 - Google Sync, Meet, Reminder Safe Wiring

**Status:** Complete for supported sync; Meet/reminder deferred
**Priority:** P1
**Target impact:** 9.45 -> 9.65

### Tasks

- [ ] Keep `sync_to_google` toggle only when `isGoogleConnected`.
- [ ] Add `Google Meet` option only if server action can create conference data.
- [ ] If server cannot create Meet yet:
  - show no Meet toggle in production UI
  - add plan note for future action support.
- [ ] Add reminder UI only if storage/server payload supports it.
- [ ] Ensure submit payload does not include unsupported fields.
- [ ] Show clear copy when Google sync is enabled.

### Acceptance Criteria

- Google sync cannot silently pretend to create unsupported data.
- Existing Google sync behavior remains compatible.
- No unsupported form field is submitted.

## Phase 06 - Mobile, Accessibility, Performance, SSOT Polish

**Status:** Complete; browser visual pending
**Priority:** P1
**Target impact:** 9.65 -> 9.8

### Mobile Checklist

- [ ] Bottom sheet content does not overflow on 360/375/390px.
- [ ] Footer buttons are always reachable.
- [ ] Inputs/toggles have 44px-friendly touch targets.
- [ ] No text clipping in title/time rows.
- [ ] Keyboard opening does not hide primary action.

### Accessibility and SSOT

- [ ] Use shared `Drawer`, `Button`, `Input`, `DatePicker`, `Switch`, `SimpleSelect`.
- [ ] No arbitrary Tailwind values.
- [ ] No inline colors.
- [ ] Labels and aria labels for icon-only controls.
- [ ] Escape/focus behavior remains from shared drawer.

### Performance

- [ ] No data fetch on drawer open.
- [ ] Dynamic import remains lazy.
- [ ] Derived state stays local and cheap.

### Acceptance Criteria

- Form feels fast.
- Mobile layout is production-usable.
- Lint has no new warnings/errors.

## Phase 07 - Verification, Final Score, Deploy

**Status:** Local verification complete; browser visual/deploy pending
**Priority:** P0
**Target impact:** 9.8 proof

### Commands

```bash
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

### Manual Smoke Matrix

- [ ] Create schedule with title/date/owner.
- [ ] Create with explicit time.
- [ ] Create all-day event.
- [ ] End before start is blocked or auto-corrected.
- [ ] Google sync toggle still works when connected.
- [ ] Google sync controls are hidden/disabled when disconnected.
- [ ] Edit existing schedule still works.
- [ ] View Google event remains read-only.
- [ ] Edit task deadline/owner still works.
- [ ] Mobile create flow has no overflow.
- [ ] Footer is not covered by keyboard or bottom nav.

### Deploy

- [ ] Deploy from clean snapshot if unrelated dirty files exist.
- [ ] Verify protected `/calendar` redirects to `/login` unauthenticated.

## Risk Register

| Risk | Mitigation |
| --- | --- |
| Over-copying Google makes Mood form bloated | Quick create first; more options collapsed |
| Unsupported recurrence/Meet/reminders become fake UI | Hide unsupported controls until server supports them |
| Task edit flow breaks | Keep task-specific branch separate |
| Mobile drawer footer overlap | Verify 360/375/390px and use drawer-safe layout |
| Timezone/date bugs | Use local date helpers, no ISO split for local date |

## Score Ceiling Notes

- 9.8/10 is realistic after phases 00-07.
- 9.9/10 requires:
  - seeded browser E2E for create/edit/task/google-readonly
  - authenticated Google sync smoke
  - recurrence/Meet/reminder backend support if those controls are enabled

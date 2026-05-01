# Calendar Month-Year Picker Max Score Plan

**Scope:** `/calendar` toolbar title navigation only.
**Reference:** V1 `webapp/components/schedules/CalendarHeader.tsx` has a clickable title that opens a month/year picker modal. We will port the behavior, not the old UI.
**Out of scope:** Mini calendar sidebar.
**Target score:** 9.8/10.
**Current implemented score:** 9.7/10 after local verification; 9.8/10 requires browser visual smoke on authenticated desktop/mobile.
**Stretch score:** 9.9/10 after browser visual smoke on desktop/mobile and keyboard coverage.

## Product Goal

Make the calendar title actionable:

- User clicks `Tháng 5, 2026` on desktop or `T5, 2026` on mobile.
- User can quickly select month and year.
- Calendar jumps to that month/year without repeated next/prev clicks.
- UI is native to V2 tokens and works on mobile.

## V1 Findings to Keep

- Click title opens a date picker.
- Picker has month mode and year mode.
- Year stepper changes year by 1 in month mode, by 12 in year mode.
- Month grid uses 12 compact buttons.
- `Today` shortcut exists.

## V1 Findings to Improve

- Do not use `router.push` directly from picker; V2 should call `onDateChange` so SWR/URL sync remains centralized.
- Do not force month view unless product explicitly requires it. V2 should preserve current view and clamp the day when needed.
- Do not copy V1 material icons, arbitrary sizes, or palette.
- Mobile should use V2 modal/bottom-sheet behavior, not a desktop modal squeezed onto mobile.

## Score Model

| Area | Target |
| --- | --- |
| Navigation UX | 10/10: quick month/year jump |
| Data flow | 9.8/10: uses existing V2 `onDateChange` and URL sync |
| Mobile UX | 9.8/10: tap-safe bottom modal, no overflow |
| SSOT | 9.8/10: no inline colors/arbitrary classes |
| Accessibility | 9.6/10: keyboard close, labels, focus via modal/popup primitive |
| Verification | 9.8/10: tsc/lint/build + smoke matrix |

## Phase Order

1. Phase 00 - Contract Freeze and V1 Diff - Complete
2. Phase 01 - Date Math Helper and State Contract - Complete
3. Phase 02 - Picker UI Component - Complete
4. Phase 03 - Toolbar Integration - Complete
5. Phase 04 - Mobile and Responsive Polish - Complete; browser visual pending
6. Phase 05 - Accessibility, Performance, and SSOT Scan - Complete
7. Phase 06 - Verification, Final Score, Deploy - Local verification complete; deploy pending

## Phase 00 - Contract Freeze and V1 Diff

**Status:** Complete
**Priority:** P0
**Target impact:** 8.0 -> 8.5

### Tasks

- [ ] Document V1 behavior from `CalendarHeader.tsx`.
- [ ] Confirm no mini calendar sidebar in scope.
- [ ] Define V2 behavior:
  - click title opens picker
  - month select applies immediately
  - year click toggles year grid
  - today applies immediately
- [ ] Decide view preservation:
  - `month`: selected date becomes day 1
  - `week/day`: preserve day when possible, clamp to month end

### Acceptance Criteria

- Scope is small and isolated to toolbar navigation.
- No unrelated calendar data/query changes.

## Phase 01 - Date Math Helper and State Contract

**Status:** Complete
**Priority:** P0
**Target impact:** 8.5 -> 9.0

### Tasks

- [ ] Add local helper:
  - `getDaysInMonth(year, monthIndex)`
  - `buildDateForMonthYear(currentDate, year, monthIndex, viewMode)`
- [ ] Rules:
  - month view returns first day of selected month
  - week/day returns clamped current day
  - time part is not important; normalize to local midnight
- [ ] Keep URL sync inside existing `useCalendarData.setCurrentDate`.

### Acceptance Criteria

- Selecting February from day 31 clamps correctly.
- No timezone ISO split issue.

## Phase 02 - Picker UI Component

**Status:** Complete
**Priority:** P0
**Target impact:** 9.0 -> 9.4

### Proposed File

- `components/calendar/calendar-month-year-picker.tsx`

### Props

```ts
interface CalendarMonthYearPickerProps {
  open: boolean;
  currentDate: Date;
  viewMode: CalendarViewMode;
  onOpenChange: (open: boolean) => void;
  onSelectDate: (date: Date) => void;
}
```

### UI

- Header:
  - previous year / previous 12 years
  - year button toggles month/year mode
  - next year / next 12 years
- Month mode:
  - 12 month buttons, `T1` to `T12`
  - active selected month highlighted
  - current real month outlined/subtle
- Year mode:
  - 12-year grid around `pickerYear`
  - clicking a year returns to month mode
- Footer:
  - `Hôm nay`
  - `Đóng`

### SSOT Rules

- Use `Button` where possible.
- Use token classes:
  - `bg-bg-card`
  - `bg-bg-hover`
  - `border-border`
  - `text-primary`
  - `text-text-muted`
- No arbitrary Tailwind values.
- No inline color.

### Acceptance Criteria

- Component is isolated and reusable.
- It does not fetch data.
- It does not know about router.

## Phase 03 - Toolbar Integration

**Status:** Complete
**Priority:** P0
**Target impact:** 9.4 -> 9.6

### Tasks

- [ ] Replace static desktop heading with button-like title.
- [ ] Replace mobile date title button handler to open picker.
- [ ] Keep prev/next/today behavior unchanged.
- [ ] Pass:
  - `currentDate`
  - `viewMode`
  - `onDateChange`
- [ ] Closing picker should not alter date.

### Acceptance Criteria

- Desktop click `Tháng X, YYYY` opens picker.
- Mobile click `T X, YYYY` opens picker.
- Existing next/prev and today still work.

## Phase 04 - Mobile and Responsive Polish

**Status:** Complete
**Priority:** P1
**Target impact:** 9.6 -> 9.75

### Tasks

- [ ] Use V2 modal/bottom-sheet primitive for mobile-safe display.
- [ ] 12 month buttons have touch-safe height.
- [ ] Year grid does not overflow on 360/375/390px widths.
- [ ] Footer buttons stack or fit cleanly on narrow screens.
- [ ] Picker z-index does not conflict with calendar drawer/converter.

### Acceptance Criteria

- No horizontal overflow on mobile.
- Text fits in all month/year buttons.
- Picker feels quick and compact.

## Phase 05 - Accessibility, Performance, and SSOT Scan

**Status:** Complete
**Priority:** P1
**Target impact:** 9.75 -> 9.8

### Tasks

- [ ] Add `aria-label` to title buttons.
- [ ] Add `aria-label` to prev/next year controls.
- [ ] Escape closes picker through shared modal/popup behavior.
- [ ] No server requests until date is selected.
- [ ] Scan lint for SSOT violations.
- [ ] Keep render work tiny: fixed 12 months / 12 years.

### Acceptance Criteria

- Keyboard close works.
- No lint SSOT errors.
- Date selection remains instant.

## Phase 06 - Verification, Final Score, Deploy

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

- [ ] Desktop title opens picker.
- [ ] Desktop select T1/T12 applies correct date.
- [ ] Desktop year prev/next works.
- [ ] Desktop year grid select works.
- [ ] Desktop today works.
- [ ] Mobile title opens bottom-safe picker.
- [ ] Mobile month/year select has no overflow.
- [ ] Day 31 -> February clamps correctly.
- [ ] Week/day view preserves view and clamps day.
- [ ] Closing picker changes nothing.

### Deploy

- [ ] If unrelated dirty files exist, deploy from clean snapshot.
- [ ] Verify protected `/calendar` returns expected redirect when unauthenticated.

## Risk Register

| Risk | Mitigation |
| --- | --- |
| Picker mutates URL incorrectly | Only call `onDateChange`; existing hook syncs URL |
| Mobile overflow | Use modal body scroll and touch-safe grid |
| SSOT violation | Avoid arbitrary classes and inline color |
| Day 31 invalid month | Clamp helper |
| Toolbar gets visually noisy | Title stays heading-like, not a heavy button |

## Score Ceiling Notes

- 9.8/10 is realistic once phase 00-06 pass.
- 9.9/10 should wait for browser screenshots on desktop/mobile plus keyboard automation.

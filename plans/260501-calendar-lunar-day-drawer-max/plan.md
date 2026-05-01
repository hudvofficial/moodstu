# Calendar Lunar Day Drawer Max Score Plan

**Scope:** `/calendar` Am/Duong converter + new Lunar Day Drawer.
**Baseline:** Converter can calculate basic solar/lunar data, but `Xem lich ngay nay` currently navigates instead of showing a true day almanac experience.
**Target score:** 9.8/10.
**Current implemented score:** 9.7/10 after local verification; 9.8/10 requires browser visual smoke on desktop/mobile.
**Stretch score:** 9.9/10 after seeded browser E2E on desktop/mobile and validated full cat-hung/rating data rules.

## Product Goal

Turn the Am/Duong converter into a real "Tra cuu ngay" feature:

- User converts a date.
- User clicks `Xem lich ngay nay`.
- Converter closes.
- A drawer opens with rich day details using Mood Studio SSOT tokens.
- Drawer works well on desktop and mobile.
- From drawer, user can create a schedule or jump to the calendar date.

## Score Model

| Area | Target |
| --- | --- |
| Correct flow | 10/10: converter -> drawer -> optional calendar/create action |
| Data accuracy | 9/10 phase 1, 9.5+ after validated extra almanac helpers |
| UI/SSOT | 9.8/10: no copied foreign palette, token-based layout |
| Mobile UX | 9.8/10: bottom drawer, scroll-safe, touch-friendly |
| Performance | 9.8/10: no network call for local lunar data, memoized derivation |
| Maintainability | 9.8/10: isolated helpers/components, typed contracts |
| Verification | 9.8/10: tsc/lint/build + browser screenshots if possible |

## Phase Order

1. Phase 00 - Contract Freeze and Current Regression Cleanup - Complete
2. Phase 01 - Lunar Domain Model and Trusted Helpers - Complete
3. Phase 02 - Lunar Day Drawer UI Shell - Complete, browser mobile visual pending
4. Phase 03 - Converter Flow Integration - Complete
5. Phase 04 - Calendar Actions and Mobile UX - Complete
6. Phase 05 - Performance, Accessibility, and SSOT Polish - Complete, browser keyboard smoke pending
7. Phase 06 - Verification, Report, Deploy - Local verification complete; deploy pending

## Phase 00 - Contract Freeze and Current Regression Cleanup

**Status:** Complete
**Priority:** P0
**Target impact:** 4.0 -> 6.5

### Objectives

- Freeze expected behavior before coding deeper.
- Keep the useful new idea from the previous implementation, but change its destination.
- Avoid a feature that only navigates and feels dead.

### Tasks

- [ ] Audit current files:
  - `components/calendar/solar-lunar-converter.tsx`
  - `components/calendar/calendar-toolbar.tsx`
  - `components/calendar/calendar-wrapper.tsx`
  - `lib/lunar-calendar.ts`
- [ ] Define one typed output for selected day:
  - `solarDate: Date`
  - `lunarDay/month/year/leap`
  - `weekday`
  - `canChiDay/month/year`
- [ ] Decide final button behavior:
  - primary in converter: `Xem lich ngay nay` opens Lunar Day Drawer
  - secondary in drawer: `Di toi lich`
  - secondary in drawer: `Tao lich trinh`
- [ ] Remove any direct "jump to day view" behavior from converter primary action.

### Acceptance Criteria

- Converter primary action opens day detail drawer, not calendar view directly.
- No regression to month/week/day navigation.
- Existing converter calculation still works.

## Phase 01 - Lunar Domain Model and Trusted Helpers

**Status:** Complete
**Priority:** P0
**Target impact:** 6.5 -> 7.8

### Objectives

Centralize lunar day data so UI does not duplicate calendar calculations.

### Tasks

- [ ] Add a typed helper in `lib/lunar-calendar.ts` or a new focused file:
  - `getLunarDaySummary(date: Date): LunarDaySummary`
- [ ] Include reliable fields already supported:
  - solar day/month/year
  - lunar day/month/year/leap
  - weekday
  - can chi day/month/year
- [ ] Add deterministic helpers if implementation can be validated:
  - gio hoang dao by day chi
  - tiet khi
  - gio display ranges
- [ ] Mark unsupported/uncertain fields as `null` instead of fake data:
  - huong hy than
  - huong tai than
  - tuoi xung
  - activity rating/cat hung
- [ ] Add unit-like smoke checks for known dates if there is an existing test runner; otherwise add internal deterministic sample notes in report.

### Acceptance Criteria

- No mock cat-hung data is shown as fact.
- Drawer can render useful data with only phase-1 fields.
- Helper is pure, sync, and network-free.

## Phase 02 - Lunar Day Drawer UI Shell

**Status:** Complete
**Priority:** P0
**Target impact:** 7.8 -> 8.8

### Objectives

Create a premium day detail drawer that borrows the information hierarchy from the references but uses Mood Studio tokens.

### Proposed Files

- `components/calendar/lunar-day-drawer.tsx`
- Optional: `components/calendar/lunar-day-summary-card.tsx`
- Optional: `components/calendar/lunar-day-info-grid.tsx`

### UI Structure

- Header:
  - `Thang X, YYYY`
  - close button
  - compact selected date context
- Hero:
  - large solar day
  - weekday
  - lunar date badge
  - can chi day highlight
- Detail grid:
  - lunar month/year
  - can chi day/month/year
  - tiet khi
  - gio hoang dao
- Optional almanac blocks:
  - `Nen lam`
  - `Can nhac`
  - only if backed by trusted rule data
- Footer actions:
  - `Tao lich trinh`
  - `Di toi lich`

### SSOT Rules

- Use `UnifiedModal`/existing drawer pattern if available; otherwise match existing calendar drawer behavior.
- Use `Button`, token colors, token backgrounds:
  - `bg-bg-card`
  - `bg-bg-hover`
  - `text-primary`
  - `text-text-primary`
  - `text-text-muted`
  - `border-border`
- Do not copy the red/pink sample palette directly.
- No hardcoded decorative gradients/orbs.
- No oversized text inside compact blocks.

### Acceptance Criteria

- Drawer looks native to Mood Studio.
- No overlapping text on 375px mobile.
- Content scrolls inside drawer body, footer remains reachable.
- Empty/unknown optional fields are hidden or shown as "Chua co du lieu", not fake.

## Phase 03 - Converter Flow Integration

**Status:** Complete
**Priority:** P0
**Target impact:** 8.8 -> 9.2

### Objectives

Make the converter and drawer feel like one product flow.

### Tasks

- [ ] Add `onOpenDayDetail(date: Date)` prop to converter or toolbar integration.
- [ ] On click `Xem lich ngay nay`:
  - validate result exists
  - close converter
  - open Lunar Day Drawer with `result.originalDate`
- [ ] Preserve fallback behavior if converter is used outside `/calendar`:
  - router push to `/calendar?date=YYYY-MM-DD&drawer=lunar` if needed
- [ ] Keep selected date in wrapper state:
  - `selectedLunarDate: Date | null`
- [ ] Ensure opening drawer does not mutate calendar view unless user clicks `Di toi lich`.

### Acceptance Criteria

- User click has visible immediate result: drawer opens.
- Calendar month/week/day state is not unexpectedly changed by viewing details.
- Browser back/URL behavior is not broken.

## Phase 04 - Calendar Actions and Mobile UX

**Status:** Complete
**Priority:** P1
**Target impact:** 9.2 -> 9.5

### Objectives

Add practical actions and make mobile first-class.

### Tasks

- [ ] `Di toi lich` action:
  - desktop: set date and switch to `day` view
  - mobile/tablet: set date and open existing day drawer
- [ ] `Tao lich trinh` action:
  - close lunar drawer or keep it behind safely
  - open existing event form drawer
  - pass selected date as default
- [ ] Mobile drawer rules:
  - bottom sheet style
  - large tap targets
  - no horizontal overflow
  - footer buttons stacked if narrow
- [ ] Desktop drawer rules:
  - right-side panel or centered drawer depending existing pattern
  - max width not too wide
  - detail grid uses two columns where space allows

### Acceptance Criteria

- Mobile 360/375/390px viewports are usable.
- Buttons are reachable without awkward scrolling.
- Creating an event from lunar drawer pre-fills correct date.
- Jump-to-calendar action clearly changes the calendar context.

## Phase 05 - Performance, Accessibility, and SSOT Polish

**Status:** Complete
**Priority:** P1
**Target impact:** 9.5 -> 9.7

### Objectives

Raise the implementation from "works" to production-polished.

### Tasks

- [ ] Memoize day summary by selected date key.
- [ ] Keep all lunar calculations synchronous and local.
- [ ] Add ARIA labels for drawer title, close, primary actions.
- [ ] Ensure focus returns logically after closing drawer.
- [ ] Check keyboard path:
  - open converter
  - change values
  - submit/view day
  - close drawer
- [ ] Scan for hardcoded colors/classes that bypass SSOT.
- [ ] Fix any text mojibake touched in these files if safe and scoped.

### Acceptance Criteria

- No extra server calls for opening Lunar Day Drawer.
- No layout shift caused by drawer content loading.
- No inline non-token colors in new UI.
- Keyboard and screen-reader basics are covered.

## Phase 06 - Verification, Report, Deploy

**Status:** Local verification complete; browser visual/deploy pending
**Priority:** P0
**Target impact:** 9.7 -> 9.8

### Commands

Run before final score:

```bash
npx tsc --noEmit --pretty false
npm run lint
npm run build
```

If browser automation is available:

```bash
# manual/browser smoke target
/calendar
```

### Manual Smoke Matrix

- [ ] Desktop: open converter -> solar to lunar -> view day drawer.
- [ ] Desktop: lunar to solar -> view day drawer.
- [ ] Desktop: drawer `Di toi lich` -> switches to day view on the selected date.
- [ ] Desktop: drawer `Tao lich trinh` -> opens event form with selected date.
- [ ] Mobile: open converter -> view day drawer -> no overflow.
- [ ] Mobile: drawer `Di toi lich` -> opens existing calendar day drawer.
- [ ] Mobile: drawer `Tao lich trinh` -> opens event form with selected date.
- [ ] Invalid date input does not open drawer.
- [ ] Optional unknown almanac fields are not presented as confirmed data.

### Final Report

- [ ] Record changed files.
- [ ] Record before/after behavior.
- [ ] Record verification commands.
- [ ] Record final score and remaining risks.
- [ ] Deploy using a clean snapshot if there are unrelated dirty files.

## Risk Register

| Risk | Mitigation |
| --- | --- |
| Almanac/cat-hung rules can be inaccurate | Only show validated deterministic data in core phase; keep rich ratings as stretch |
| Mobile drawer can overflow | Design bottom sheet with internal scroll and footer-safe actions |
| Converter primary action surprises users | Keep clear button label and drawer title |
| Existing calendar state gets mutated unexpectedly | Viewing details should not change calendar view until user chooses `Di toi lich` |
| Mojibake in existing files causes UI copy drift | Fix only touched strings or isolate new clean-copy components |

## Score Ceiling Notes

- 9.8/10 is realistic after Phase 00-06 with verified drawer flow, mobile UI, no fake data, and clean build.
- 9.9/10 should wait for:
  - validated full almanac rule dataset
  - seeded browser E2E
  - visual regression screenshots for desktop/mobile
  - cross-role verification if calendar access differs by role

# Plan: Calendar Audit Fix and Max Optimization
**Created:** 2026-04-29
**Status:** In Progress
**Audit source:** `docs/reports/calendar_audit_2026_04_29.md`
**Current score after Phase 04/partial Phase 06:** 9.7/10
**Target score:** 9.8/10
**Stretch score:** 9.9/10 after seeded cross-role browser E2E and realtime proof run against a production-like Supabase project

## Overview

Raise `/calendar` from the current audited state to a high-confidence production module:

1. Lock in the current display-label, validation, availability, and index fixes.
2. Centralize calendar RBAC and server invariants for every read/write action.
3. Add realtime/client freshness for cross-user schedule and task changes.
4. Split Google Calendar from the critical internal month-load path.
5. Optimize query shape, filters, and date-window semantics.
6. Remove localization/mojibake drift and finish mobile/calendar UX polish.
7. Prove the score with DB verification, role smoke, browser smoke, build, and chunk gates.

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | Baseline Fixes and Migration Push | Completed | P0 | 8.1 -> 8.7 |
| 01 | RBAC, Server Invariants, and Action Contracts | Completed | P0 | 8.7 -> 9.1 |
| 02 | Realtime Freshness and SWR Cache Correctness | Completed | P1 | 9.1 -> 9.3 |
| 03 | Google Calendar Load Split and Failure Isolation | Completed | P1 | 9.3 -> 9.5 |
| 04 | Query Shape, Time Windows, and Performance | Completed | P1 | 9.5 -> 9.6 |
| 05 | UX, Localization, Mobile, and Accessibility Polish | In Progress | P2 | 9.6 -> 9.7 |
| 06 | Verification, Smoke, Browser E2E, Final Score | In Progress | P2 | 9.7 -> 9.8 |

## Dependency Order

1. Phase 00 is complete and locks in the immediate visible/status/date/index fixes.
2. Phase 01 must land before broader smoke because the admin-client action surface needs one calendar policy.
3. Phase 02 can land after action contracts are stable so realtime refreshes canonical data.
4. Phase 03 should follow freshness work because Google events need their own cache boundary.
5. Phase 04 optimizes only after correctness and cache boundaries are settled.
6. Phase 05 cleans UX/localization drift after data behavior is stable.
7. Phase 06 proves the final score and records residual risk.

## Global Guardrails

- Do not revert unrelated dirty worktree changes.
- Calendar server actions use the admin Supabase client through `withAuth`; every action must enforce app-level calendar permission and ownership rules.
- Preserve the product rule from `docs/specs/calendar.md`: sale/media can read studio calendar to avoid conflicts, but can only mutate their own schedules and assigned tasks.
- Imported Google events remain read-only inside Mood Studio.
- Internal calendar DB data must render even if Google API is slow, unavailable, or rate-limited.
- Date handling must avoid timezone boundary drift. Calendar cells use local `YYYY-MM-DD`; timestamp rows must be compared by day ranges.
- UI display labels must never expose raw DB enum strings when a Vietnamese business label exists.

## Verification Baseline

Run after implementation phases:

```powershell
npx eslint "app/(protected)/calendar" app/actions/calendar-queries.ts app/actions/calendar-mutations.ts app/actions/calendar-task-actions.ts components/calendar hooks/use-calendar-data.ts hooks/use-calendar-keyboard.ts lib/utils/calendar-utils.ts types/calendar.types.ts
npx tsc --noEmit --pretty false
npm run perf:audit
npx supabase db push --dry-run
npm run build
npm run perf:chunks
```

Run after security/smoke phases:

```powershell
npm run verify:calendar
npm run smoke:calendar
```

Targeted checks:

```powershell
rg -n "charAt\\(0\\).*replace\\(/_|Hoan thanh|Dang lam|Chua lam|Published|L[aA].*\\xbb|Th[Aa].*\\xba" app/(protected)/calendar components/calendar hooks/use-calendar-data.ts app/actions/calendar-*.ts lib/utils/calendar-utils.ts
rg -n "ROLE_PERMISSIONS|requireCalendar|withAuth|employee_id|assigned_to|google_event_id|revalidatePath\\(\"/calendar\"|useRealtime|subscribe" app/actions components/calendar hooks lib
```

## Completion Definition

- Status filters and calendar cards display business labels with correct Vietnamese accents.
- All calendar read/write actions use a shared calendar access helper and explicit owner/global-admin checks.
- Sale/media cannot mutate another employee schedule or task through direct server-action calls.
- Viewer cannot access `/calendar` route or calendar server actions.
- Invalid schedule date order is rejected server-side.
- Employee availability checks detect timestamped same-day conflicts.
- Internal DB events render without waiting for Google API.
- Google imported events are read-only and do not block internal calendar load.
- Calendar open in another browser refreshes after `schedules` or `work_tasks` changes.
- Month/week/day query windows are index-backed and timezone-safe.
- Mobile view behavior is intentional and no controls suggest unavailable views.
- TypeScript, scoped lint, perf audit, DB push/dry-run, build, chunk budget, `verify:calendar`, and `smoke:calendar` pass.
- Final report records before/after score, exact commands, remote migration status, residual risk, and no open P0/P1 findings.

## 2026-04-29 Phase 00 Evidence

- Added status label SSOT in `lib/utils/calendar-utils.ts`.
- Updated `hooks/use-calendar-data.ts` to use mapped labels instead of raw enum title-casing.
- Added server-side `end_date >= event_date` validation in `app/actions/calendar-mutations.ts`.
- Restricted calendar task status updates to known task statuses in `app/actions/calendar-task-actions.ts`.
- Fixed availability checks to compare same-day ranges rather than exact timestamp equality.
- Added and pushed `supabase/migrations/20260429190000_calendar_audit_fix.sql`.
- Verification passed: targeted ESLint, `npx tsc --noEmit --pretty false`, `npx supabase db push --dry-run`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`.

## 2026-04-29 Phase 01-04/06 Evidence

- Added `lib/calendar-auth.ts` with shared calendar access, target-employee, schedule-owner, task-owner, and task-assignment guards.
- Refactored `calendar-queries`, `calendar-mutations`, and `calendar-task-actions` to use the shared helpers instead of duplicating role logic.
- Preserved policy from `docs/specs/calendar.md`: sale/media can read studio calendar but only mutate own schedules and assigned tasks.
- Added active target-employee validation before schedule create/update and task assignment/transfer.
- Converted schedule/task action ownership checks to deterministic not-found/permission errors.
- Split Google events into `fetchCalendarGoogleEvents` and `cacheKeys.calendarGoogle`, so internal calendar events no longer wait for Google API.
- Added `useRealtime("schedules")` and `useRealtime("work_tasks")` invalidation for calendar SWR caches.
- Added `scripts/verify-calendar.mjs`, `scripts/smoke-calendar.mjs`, `npm run verify:calendar`, and `npm run smoke:calendar`.
- `smoke:calendar` seeds and cleans a timestamped schedule against remote Supabase and verifies same-day range behavior.
- Verification passed: `npm run verify:calendar`, `npm run smoke:calendar`, targeted ESLint, `npx tsc --noEmit --pretty false`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`, `npx supabase db push --dry-run`, `npx supabase db push`.

Remaining:

- Full browser E2E across admin/manager/sale/media/viewer is still required for 9.8/10.
- Phase 05 broader UI/mojibake/accessibility pass remains partially open beyond the fixed status-filter labels.

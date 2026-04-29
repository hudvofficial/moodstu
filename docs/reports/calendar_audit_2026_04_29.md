# Calendar Module Audit - 2026-04-29

Scope: `/calendar` route, calendar views, event drawer, calendar server actions, task calendar actions, SWR data hook, Google Calendar integration path, time-load, performance, RBAC/security, and display-label correctness.

## Remediation Status - 2026-04-29

- Status: Phase 00-04 and script-level verification are implemented.
- Remote migrations applied: `20260429190000_calendar_audit_fix.sql`.
- Shared calendar action RBAC now lives in `lib/calendar-auth.ts`.
- Google Calendar events now load through a separate SWR key and no longer block internal schedule/task rendering.
- Realtime invalidation is enabled for `schedules` and `work_tasks`.
- `verify:calendar` and `smoke:calendar` are implemented and passing.
- Remaining score ceiling: 9.8 requires seeded browser E2E across admin/manager/sale/media/viewer plus a two-client realtime proof.

## Score

- Pre-pass score: 8.1/10.
- Post Phase 00 score: 8.7/10.
- Post Phase 04/script-verification score: 9.7/10.
- Score ceiling: 9.8/10 without seeded cross-role browser E2E and explicit two-client realtime proof.

## Fixes Applied

- Fixed status filter labels by mapping DB statuses to Vietnamese display labels instead of title-casing raw enum values.
  - `chua_lam` -> `Chưa làm`
  - `dang_lam` -> `Đang làm`
  - `hoan_thanh` -> `Hoàn thành`
  - `published` -> `Google Calendar`
- Added server-side schedule date-order validation so `end_date` cannot be before `event_date`.
- Tightened task status updates to the known task status set: `chua_lam`, `dang_lam`, `hoan_thanh`, `da_huy`.
- Fixed employee availability checks to compare a full local-day range instead of exact timestamp equality.
- Added local DB migration `20260429190000_calendar_audit_fix.sql` with indexes for schedule month fetch and employee availability/task checks.
- Refactored calendar reads/writes to shared server-side calendar RBAC helpers.
- Added realtime SWR invalidation for schedule/task changes.
- Split Google Calendar events from internal DB calendar events.
- Added `scripts/verify-calendar.mjs` and `scripts/smoke-calendar.mjs`.

## Findings

### No Open P0

No open P0 security or correctness blockers were found after this pass. `/calendar` is route-gated and all calendar mutations re-check calendar module access server-side while using the admin Supabase client.

### Fixed: Google Fetch Was In The Critical Load Path

`fetchCalendarEvents` now returns internal DB schedules/tasks only. Google events load separately through `fetchCalendarGoogleEvents` and `cacheKeys.calendarGoogle`, so Google API latency does not block the internal month payload.

Remaining improvement: cache Google events/server metadata with a short TTL if API latency remains noticeable.

### Improved: Realtime Cross-User Freshness

The calendar data hook now subscribes to `schedules` and `work_tasks` and invalidates the calendar SWR namespace with debounce.

Remaining improvement: browser E2E should prove two-client freshness with seeded users.

### P2: Browser Role Smoke Is Missing

There is now script-level `verify:calendar` and `smoke:calendar`. Browser E2E remains missing for admin/manager/sale/media/viewer behavior.

Recommended next fix: add seeded browser smoke for:

- admin/manager can view all and create/edit/delete any schedule.
- sale/media can view all but only mutate own schedules/tasks assigned to them.
- viewer is blocked from `/calendar`.
- Google imported events remain read-only.

### P2: Client-Side Filters Fetch The Whole Month Window

The module intentionally loads the month window then filters employees/statuses client-side. This is acceptable for current scale and matches the "sale/media can see all to avoid conflicts" spec, but it should move filters server-side if month payloads grow.

## Security Notes

- `withAuth` uses the admin Supabase client, so the server-action permission checks are required and currently present.
- Sale/media global read access is not treated as a bug because `docs/specs/calendar.md` explicitly says these roles can see the studio calendar to avoid conflicts.
- Mutations still enforce owner/global-admin boundaries for schedule create/edit/delete and drag/drop.
- Imported Google events are read-only in the UI/action flow.

## Verification Run

```powershell
npx eslint "app/(protected)/calendar" app/actions/calendar-queries.ts app/actions/calendar-mutations.ts app/actions/calendar-task-actions.ts components/calendar hooks/use-calendar-data.ts hooks/use-calendar-keyboard.ts lib/utils/calendar-utils.ts types/calendar.types.ts
npx tsc --noEmit --pretty false
npx supabase db push --dry-run
npx supabase db push
npm run verify:calendar
npm run smoke:calendar
npm run perf:audit
npm run build
npm run perf:chunks
```

Results:

- Targeted ESLint: passed.
- TypeScript: passed.
- Supabase dry-run: passed; would push `20260429190000_calendar_audit_fix.sql`.
- Supabase push: passed; remote database is up to date after push.
- `verify:calendar`: passed.
- `smoke:calendar`: passed.
- Performance audit: passed.
- Production build: passed.
- Chunk budget: passed; `/calendar` app route chunk is 54.1KB and no app route is over 80KB.

## Release Recommendation

The module is production-usable after this pass. It is close to the contracts confidence tier, but final 9.8 sign-off should wait for seeded browser E2E across roles and explicit two-client realtime proof.

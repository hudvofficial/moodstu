# Phase 03 - RPC and Query Hardening

Status: Planned  
Risk: Medium  
Goal: Keep the speed gain while making the data path policy-aware, observable, and easier to validate.

## Work

1. Replace or extend `calendar_month_events`:
   - Accept exclusive start/end dates or compute them safely inside SQL.
   - Accept access-scope inputs if Phase 01 requires role-based filtering.
   - Include employee display names if it removes a fragile client-side join.
2. Improve ordering:
   - Sort by `coalesce(event_date::date, deadline, start_date)`.
   - Keep source/type secondary ordering stable.
3. Keep fallback path temporarily:
   - REST fallback remains until production smoke passes after deploy.
   - Fallback must match RPC semantics exactly.
4. Add query profiling:
   - `CALENDAR_PROFILE=1` logs auth, employee filter, RPC/fallback, Google linked IDs, and Google fetch timing.
   - Logs must avoid leaking private event data.
5. Add migration verification:
   - Function exists.
   - Boundary rows are included.
   - Task deadline/start-date rows are included.

## Files Likely Touched

- `supabase/migrations/*calendar_month_events*.sql`
- `app/actions/calendar-queries.ts`
- `scripts/verify-calendar.mjs`
- `scripts/smoke-calendar.mjs`

## Exit Gate

- RPC and fallback return equivalent rows for the same fixtures.
- Warm month fetch remains within the target timing budget.


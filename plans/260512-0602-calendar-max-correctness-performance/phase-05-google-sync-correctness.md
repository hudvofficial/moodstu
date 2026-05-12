# Phase 05 - Google Sync Correctness

Status: Planned  
Risk: High  
Goal: Make internal calendar and Google Calendar divergence visible, recoverable, and tested.

## Work

1. Define sync mode:
   - Best-effort with visible warning.
   - Transactional where possible.
   - Retry/orphan-cleanup queue for failures.
2. Create path:
   - If Google create succeeds but DB link fails, rollback Google event or record a cleanup job.
   - If DB create succeeds but Google create fails, return an explicit warning state.
3. Update path:
   - If internal update succeeds but Google update fails, preserve enough state for retry.
   - Avoid showing the event as fully synced when Google failed.
4. Delete path:
   - Decide delete order and orphan policy.
   - Avoid silently leaving Google events behind when user expects full deletion.
5. Tests:
   - Mock or controlled Google failure cases.
   - Existing connected-user path still loads without blocking internal calendar.

## Files Likely Touched

- `app/actions/calendar-mutations.ts`
- `app/actions/calendar-queries.ts`
- Google calendar helper modules
- `scripts/smoke-calendar.mjs`

## Exit Gate

- Every Google failure mode has a visible result and a recovery path.
- Internal calendar remains usable when Google is disconnected or slow.


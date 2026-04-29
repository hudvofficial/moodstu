# Phase 02: Atomic Booking and Lifecycle RPCs
**Status:** Completed
**Priority:** P0
**Target score impact:** 7.7 -> 8.6

## Goal

Remove race-prone check-then-insert booking flows and centralize lifecycle/status transitions so active rentals, cleaning, maintenance, retired, and deleted states cannot be corrupted.

## Work Items

1. Add DB-backed atomic RPCs with `SET search_path = public` and service-role-only grants:
   - `create_dress_contract_reservation_atomic`
   - `create_standalone_dress_rental_atomic`
   - `start_dress_rental_atomic`
   - `return_dress_rental_atomic`
   - `cancel_dress_rental_atomic`
   - `mark_dress_cleaned_atomic`
   - `refresh_dress_status_atomic`
2. Inside mutation RPCs:
   - Lock the target dress row with `FOR UPDATE`.
   - Check soft delete and protected statuses.
   - Check cross-source overlap using Phase 01 availability.
   - Insert/update booking records and dress status in one transaction.
3. Replace action-level check-then-insert logic in:
   - `app/actions/dress-mutations.ts`
   - `app/actions/rental-mutations.ts`
4. Fix delete/retire semantics:
   - Block hard/soft delete for active bookings from both sources.
   - Prefer `retired` for dresses with history.
   - Never allow delete to erase active operational state.
5. Make `refreshDressStatus` consider:
   - active contract reservations
   - active standalone rentals
   - cleaning state
   - maintenance/retired/deleted protection.

## Acceptance Criteria

- Two concurrent overlapping booking requests cannot both succeed.
- Status refresh cannot overwrite `maintenance`, `retired`, or soft-deleted rows.
- A dress with an active standalone rental cannot be deleted.
- Returning a dress moves it to the correct cleaning/available state only when no other active booking exists.
- `mark cleaned` only succeeds for valid cleaning states.
- App actions expose clean business errors, not raw DB exception text.

## Verification

```powershell
npm run verify:dresses
npx tsc --noEmit --pretty false
npm run lint
rg -n "create_dress_contract_reservation_atomic|create_standalone_dress_rental_atomic|refresh_dress_status_atomic|FOR UPDATE" app supabase
```

## Notes

- This is the most important correctness phase after security.
- Keep UI behavior stable where possible; the main change should be that invalid/conflicting operations now fail reliably.

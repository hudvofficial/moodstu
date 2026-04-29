# Phase 01: Canonical Booking Availability Contract
**Status:** Completed
**Priority:** P0
**Target score impact:** 7.0 -> 7.7

## Goal

Define one source of truth for dress availability so contract reservations and standalone rentals cannot disagree.

## Work Items

1. Define active booking states:
   - `dress_reservations`: active statuses such as `reserved`, `in_use`, `rented`.
   - `dress_rentals`: active statuses such as `reserved`, `renting`, `overdue`.
2. Add a database-backed availability contract, either:
   - `is_dress_available(p_dress_id, p_start_date, p_end_date, p_exclude_reservation_id, p_exclude_rental_id)`, or
   - a `dress_active_bookings` view plus focused RPCs.
3. Make the contract check both `dress_reservations` and `dress_rentals`.
4. Exclude soft-deleted/cancelled/returned rows from active conflict checks.
5. Protect non-bookable dress states:
   - `maintenance`
   - `retired`
   - soft-deleted rows
6. Update app reads:
   - `getDressAvailability`
   - available item picker/list helpers
   - detail drawer availability summary
7. Add server-side validation for rental/list filters:
   - page/pageSize caps
   - enum status/category/sort values
   - sanitized search
   - date order validation.

## Acceptance Criteria

- A dress reserved through a contract cannot be booked as a standalone rental for overlapping dates.
- A standalone rental blocks contract reservation for overlapping dates.
- Availability returns the same answer across list, detail, and mutation pre-checks.
- Invalid date ranges are rejected server-side even if a client bypasses the UI.
- Cancelled/returned history does not block future availability.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
rg -n "is_dress_available|dress_active_bookings|getDressAvailability|getAvailable" app lib supabase
```

## Notes

- This phase can still use app-side mutations temporarily, but every later mutation must call the same DB availability contract.
- Avoid introducing a second definition of active statuses in TypeScript only; DB and app constants must stay aligned.

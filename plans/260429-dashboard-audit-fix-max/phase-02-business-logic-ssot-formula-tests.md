# Phase 02 - Business Logic SSOT and Formula Tests

## Objective

Make every dashboard number defensible, documented, and tested.

## Tasks

1. Define revenue formula and align it with finance SSOT.
2. Define debt formula and overdue reminder rules.
3. Define date windows:
   - current month
   - previous month comparison
   - upcoming event horizon
   - payment reminder horizon
4. Define soft-delete handling for each source table.
5. Define timezone handling for date filters.
6. Add unit or script-level verification for formulas.
7. Add seeded edge cases:
   - no data
   - partial payments
   - cancelled/deleted contracts
   - overdue payments
   - future schedules

## Acceptance Criteria

- Each dashboard metric maps to a documented formula.
- Formula tests cover positive, empty, and edge cases.
- Month-over-month deltas cannot divide by zero or show misleading percentages.
- Soft-deleted or cancelled records do not inflate dashboard totals.

## Status

Completed.

Revenue uses contract payments plus standalone receipts. Contract counts, completion counts, debt, service distribution, upcoming events, and payment reminders now have explicit query sources.

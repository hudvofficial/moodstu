# Phase 03 - Collections Reminder SSOT

## Objective

Make “Cần thu tiền” match the real collection workflow.

## Tasks

1. Use `payment_plans` as the primary reminder source.
2. Include unpaid or partially unpaid stages with `due_date`.
3. Prioritize:
   - overdue stages
   - due soon stages
   - contracts with remaining debt but no payment plan
4. Keep `contracts.remaining_amount` as fallback debt visibility.
5. Exclude:
   - deleted contracts
   - cancelled contracts
   - paid payment-plan stages
6. Display:
   - customer name
   - contract code
   - stage name
   - due date
   - amount due or remaining amount
7. Keep finance data restricted to admin/manager.

## Acceptance Criteria

- A contract with an overdue unpaid payment plan appears before generic debt.
- A fully paid payment plan does not appear.
- A contract with debt but no payment plan still appears as fallback.
- Admin/manager see reminders; sale/media/viewer do not receive financial amounts.

## Status

Completed.

Implementation:

- `lib/api/dashboard.ts` now uses `payment_plans` as the primary collection-reminder source.
- Paid stages and cancelled/deleted contracts are excluded.
- Contract remaining debt remains as fallback only when no payment-plan reminder already represents that contract.
- `components/dashboard/payment-reminders.tsx` shows stage name, due date, and overdue state.

Verification:

- `npm run smoke:dashboard` seeds and verifies a `payment_plans` reminder.
- `npm run verify:dashboard` checks payment-plan priority coverage.

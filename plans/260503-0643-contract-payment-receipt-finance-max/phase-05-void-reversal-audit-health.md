# Phase 05: Void/Reversal, Audit, Health Checks

Status: Implemented locally
Risk: Medium
Estimate: 2.5h

## Goal

Make mistakes recoverable without corrupting finance history.

## Business Rules

- Do not hard-delete contract payments.
- If a payment is wrong before period close, allow void with reason.
- If period is locked, use reversal in an open period, not mutation of locked data.
- Void/reversal must update contract paid/remaining and payment plan state atomically.
- Every financial mutation writes an audit log with before/after data and reason.

## Tasks

- [ ] Add server action/RPC for voiding a contract payment.
- [ ] Add period-lock checks for void/reversal.
- [ ] Decide reversal model:
  - `deleted_at` + recalculated contract totals for open periods.
  - negative payment row for locked periods.
- [ ] Update payment plan status if linked payment is voided.
- [ ] Add health checks:
  - active payment without `receipt_code`.
  - payment shown pending but already applied to contract.
  - `paid_amount > total_amount` without explicit overpayment status.
  - `remaining_amount < 0`.
  - paid payment plan with missing/voided receipt id.
  - contract fully paid but open plans remain.
- [ ] Add admin-only action entry point in UI if needed.

## Files

- `app/actions/payment-actions.ts`
- `app/actions/finance-intelligence-queries.ts` or integrity scan RPC area
- `supabase/migrations/<new>_contract_payment_void_health.sql`
- `components/contracts/detail/financial-dashboard.tsx`
- `components/finance/receipts/receipt-row-actions.tsx`

## Acceptance Criteria

- Payment can be voided only with reason and correct permission.
- Locked period cannot be mutated directly.
- Voiding linked payment reopens the payment plan or marks it consistently.
- Health check detects seeded bad states.
- Audit log contains enough data to explain the financial change.

## Tests

- [ ] Void current-period contract payment.
- [ ] Attempt void in locked period: blocked or reversal required.
- [ ] Linked payment plan reopens correctly.
- [ ] Health check returns expected counts on seeded bad data.

# Phase 01: DB Payment Invariants + Receipt Code

Status: Implemented locally
Risk: High
Estimate: 2h

## Goal

Make the database reject invalid contract payment writes before UX/report changes. This is the safety phase.

## Required Rules

- `p_amount > 0`.
- Contract must exist and not be cancelled/deleted.
- Normal collection cannot exceed current `remaining_amount`.
- If contract is fully paid, only `phat_sinh`/adjustment mode is allowed.
- `receipt_code` must be generated for every new contract payment.
- Contract payment should be confirmed immediately by setting `approved_by = p_created_by` or equivalent confirmed status.
- Payment plan must be locked and rejected if already paid/cancelled.
- Non-atomic fallback path must not run in production.

## Tasks

- [ ] Add migration replacing `process_contract_payment_v2`.
- [ ] Compute `v_current_remaining = total_amount - paid_amount` from locked contract row.
- [ ] Reject `p_amount > v_current_remaining` unless explicit `p_update_total = true` or explicit overpayment mode exists.
- [ ] Generate stable `receipt_code`, for example `PT-YYMM-####`.
- [ ] Insert `approved_by = p_created_by` for immediate-confirmed receipts if no approval workflow exists.
- [ ] Return `receipt_code`, `new_paid`, `new_remaining`, `payment_status`.
- [ ] Remove or production-disable `processContractPaymentFallback` in `app/actions/payment-actions.ts`.
- [ ] Add backfill for existing active payments missing `receipt_code`.
- [ ] Add indexes if needed:
  - `payments(receipt_code)`
  - `payments(payment_date, created_at) WHERE deleted_at IS NULL`

## Files

- `app/actions/payment-actions.ts`
- `lib/validations/finance.schema.ts`
- `supabase/migrations/<new>_contract_payment_invariants.sql`
- `types/database.types.ts` after Supabase type refresh if available

## Acceptance Criteria

- Concurrent payment attempts on same contract cannot over-collect.
- Contract payment appears confirmed in ledger status.
- Existing active payments have non-null `receipt_code`.
- Missing RPC errors fail loudly in production.
- No trigger is introduced that also updates contract financials.

## Tests

- [ ] Pay exact remaining amount.
- [ ] Pay more than remaining in normal mode: rejected.
- [ ] Pay on cancelled contract: rejected.
- [ ] Pay already paid plan: rejected.
- [ ] Existing payment code backfill is idempotent.

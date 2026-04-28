# Phase 02: Accounting Flow Hardening
**Status:** Complete
**Priority:** P1
**Dependencies:** Phase 01
**Audit issues:** Warning 1, Warning 2, Warning 4

## Objective

Make mutation flows accounting-safe: payment authorization is explicit, installment updates cannot overrun, and salary payments cannot overpay.

## Target Files

- `app/actions/payment-actions.ts`
- `app/actions/debt-actions.ts`
- `app/actions/salary-actions.ts`
- `lib/validations/finance.schema.ts`
- `types/roles.ts` only if adding a narrow permission concept
- `supabase/migrations/*` if moving installment logic into an RPC

## Implementation Steps

1. Decide payment-recording permission.
   - If only finance/admin/manager can record payments: replace `requireContractAccess` with `requireFinanceAccess` in `createPaymentReceipt`.
   - If sale can collect contract payments: add explicit helper such as `requirePaymentRecordAccess` and document why sale is allowed.
   - Keep `process_contract_payment_v2` service-role only.

2. Harden `getTransactionCategories`.
   - It currently uses contract access.
   - If it serves finance forms, require finance access.
   - If it serves contract payment UI for sale, return only the narrow categories needed for payment recording.

3. Harden installment payment.
   - Add validation for debt id.
   - Fetch debt with `.is("deleted_at", null)`.
   - Check period lock against the due/payment date.
   - Reject if already closed or `installment_paid >= installment_total`.
   - Update `installment_paid`, `paid_amount`, `remaining`, `status`, and `payment_date` consistently.
   - Prefer an atomic RPC with row lock if concurrent clicks are possible.

4. Harden salary payment.
   - Fetch salary row and compute remaining.
   - Reject `amount > remaining_amount` unless overpayment is an explicit supported case.
   - Update status if salary table supports it; otherwise keep monetary totals consistent and audit the payment.
   - Add optimistic lock or guarded predicate if the UI passes `updated_at`.

5. Audit logs.
   - Ensure mutation logs include enough old/new monetary state to reconstruct what changed.

## Acceptance Criteria

- Payment creation permission behavior is explicit and matches business policy.
- Installment count cannot exceed total.
- Installment payment updates monetary totals.
- Salary payment cannot silently overpay.
- Locked accounting periods block these mutations.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
```

---
Next Phase: [Phase 03 - Time-load and RPC Optimization](./phase-03-performance-rpc.md)

## 2026-04-28 Implementation Update

Completed:
- Added explicit `requirePaymentRecordAccess` policy: admin/manager/finance plus sale can record contract payments; other roles are blocked.
- `createPaymentReceipt` and `getTransactionCategories` now use the explicit payment-recording gate.
- Hardened debt installment payment against deleted/closed/over-complete debts.
- Installment payment now updates `installment_paid`, `paid_amount`, `remaining`, and status.
- Added salary overpayment guard.

Still open:
- None for this phase. A row-locking RPC for installment clicks can still be considered later if concurrent double-submit telemetry appears.

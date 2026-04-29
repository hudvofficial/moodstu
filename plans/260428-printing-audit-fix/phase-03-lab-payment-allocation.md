# Phase 03: Lab Payment Allocation
**Status:** Done
**Priority:** P0
**Dependencies:** Phase 00, Phase 01
**Audit issues:** Critical 3

## Objective

Replace the current "one payment closes all unpaid lab orders" behavior with explicit, atomic allocation.

Current risk: `recordLabPayment` inserts one payment row, then marks every unpaid order for the lab as paid regardless of payment amount.

## Target Files

- `app/actions/lab-mutations.ts`
- `app/actions/printing-reference-queries.ts`
- `app/actions/finance-operations-queries.ts`
- `components/printing/labs/lab-list-page.tsx`
- `components/finance/lab-debts/lab-debts-client.tsx`
- `lib/validations/lab.schema.ts`
- `supabase/migrations/*`
- `types/database.types.ts`

## Implementation Steps

1. Define allocation model.
   - Preferred: add `lab_payment_allocations(payment_id, printing_order_id, amount)`.
   - Keep `lab_payments` as payment header.
   - Add unique allocation per payment/order and indexes by lab/order.

2. Add atomic payment RPC.
   - `record_lab_payment_atomic(lab_id uuid, amount numeric, method text, note text, allocations jsonb, actor uuid)`.
   - Lock relevant unpaid orders.
   - Validate order lab matches payment lab.
   - Validate allocation sum equals payment amount unless explicit overpayment policy is supported.
   - Mark only fully covered orders as `da_thanh_toan`.
   - Support partial allocation if desired by keeping order unpaid until covered.

3. Update server action.
   - Replace direct insert/update logic in `recordLabPayment`.
   - Validate input with Zod: lab ID, positive amount, selected order IDs/allocations.
   - Preserve audit logging after RPC success.

4. Update UI flow.
   - On lab debt screens, let user select orders to pay or choose "pay oldest first" with preview.
   - Show total selected, payment amount, difference, and validation message.
   - Do not expose one-click close-all unless amount exactly matches all selected unpaid orders.

5. Fix finance debt summary semantics.
   - Prefer SQL/RPC calculation from unpaid orders minus allocations, or from order payment status if status is now trustworthy.
   - Remove app fallback that subtracts global `lab_payments` from unpaid orders without allocation context.

6. Add reconciliation query.
   - Find paid printing orders without full allocation.
   - Find lab payments with no allocation.
   - Find allocations exceeding order total.

## Acceptance Criteria

- Partial payment cannot close all unpaid lab orders.
- Payment insert and order status updates are atomic.
- Finance lab debt matches allocated payments.
- UI prevents invalid payment amount/allocation.
- TypeScript and perf audit pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
rg -n 'recordLabPayment|lab_payment_allocations|record_lab_payment_atomic|payment_status' app/actions components supabase/migrations types/database.types.ts
```

## Manual Checks

- Pay one selected order and confirm only that order closes.
- Try underpaying selected orders and confirm rejection or partial state per policy.
- Try concurrent payment attempts and confirm one fails safely.
- Confirm `/finance/lab-debts` and `/printing/labs` show matching debt.

---
Next Phase: [Phase 04 - Time-load and Query Optimization](./phase-04-time-load-query-optimization.md)

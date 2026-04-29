# Phase 02: Printing Expense Accounting Sync
**Status:** Done
**Priority:** P0
**Dependencies:** Phase 00, Phase 01
**Audit issues:** Critical 2

## Objective

Make printing order create/update/delete and related finance expense changes accounting-safe, linked, and reversible.

Current behavior inserts `printing_orders` first, then separately inserts an `expenses` row. Updates/deletes of print orders do not update/reverse the expense.

## Target Files

- `app/actions/printing-mutations.ts`
- `app/actions/expense-actions.ts` only if shared helpers are needed
- `lib/validations/printing.schema.ts`
- `supabase/migrations/*`
- `types/database.types.ts`
- `docs/reports/printing_audit_2026_04_28.md` only for closeout notes after implementation

## Implementation Steps

1. Decide the durable link.
   - Preferred: add `expenses.printing_order_id uuid null references printing_orders(id)`.
   - Alternative: create `printing_expense_links(printing_order_id, expense_id)`.
   - Add index on the link.

2. Replace fuzzy category lookup.
   - Add a system setting or config key for printing expense category ID.
   - If no setting exists, use an exact category code/name with validation and fail visibly.
   - Remove `.ilike("name", "%in an%")` as the normal path.

3. Add atomic create/update/delete RPCs.
   - `create_printing_order_atomic(payload jsonb, actor uuid)` inserts order and expense in one transaction.
   - `update_printing_order_atomic(order_id uuid, payload jsonb, expected_updated_at timestamptz, actor uuid)` updates order and linked expense.
   - `delete_printing_order_atomic(order_id uuid, actor uuid)` soft-deletes order and reverses/soft-deletes linked expense according to finance policy.

4. Enforce period lock.
   - Check the accounting date used by the expense, likely `expense_date` or order date.
   - Reject create/update/delete that would mutate a locked period.

5. Keep optimistic concurrency.
   - Preserve `expectedUpdatedAt` behavior from current `updatePrintingOrder`.
   - Move the compare/update into the RPC so it is atomic.

6. Add data repair query.
   - Identify orders with active expenses but changed amount.
   - Identify deleted/cancelled orders with active expenses.
   - Identify active orders with no linked expense.
   - Do not auto-repair production data without an explicit reviewed migration/script.

## Acceptance Criteria

- Creating a print order either creates both order and expense or neither.
- Updating amount/lab/items updates the linked expense consistently.
- Deleting/cancelling a print order reverses or soft-deletes the linked expense consistently.
- Locked accounting periods cannot be changed through printing flows.
- Category assignment is deterministic.
- TypeScript and perf audit pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run perf:audit
rg -n 'autoCreatePrintingExpense|printing_order_id|create_printing_order_atomic|update_printing_order_atomic|delete_printing_order_atomic' app/actions supabase/migrations types/database.types.ts
```

## Manual Checks

- Create print order from `/printing`.
- Create print order from contract detail.
- Edit print order amount and confirm finance expense follows.
- Delete print order and confirm finance expense policy is applied.
- Try editing an order whose expense belongs to a locked period and confirm rejection.

---
Next Phase: [Phase 03 - Lab Payment Allocation](./phase-03-lab-payment-allocation.md)

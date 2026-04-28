# Phase 04: Delete Semantics and Final Verification
**Status:** Complete
**Priority:** P2
**Dependencies:** Phase 03
**Audit issues:** Warning 5 and final QA

## Objective

Normalize finance master-data delete behavior and perform a final security/performance verification pass.

## Target Files

- `app/actions/fixed-cost-actions.ts`
- `app/actions/investment-actions.ts`
- `app/actions/debt-actions.ts`
- `app/actions/finance-operations-queries.ts`
- `supabase/migrations/*` if tables need `deleted_at` or indexes
- `docs/reports/finance_audit_2026_04_28.md` only if adding completion notes

## Implementation Steps

1. Inventory delete-capable finance tables.
   - `fixed_costs`
   - `investments`
   - `credit_cards`
   - `financial_goals`
   - `budgets`
   - Existing transaction tables: receipts, expenses, debts, payments

2. Decide per-table delete semantics.
   - Transactional and audit-relevant records should soft delete.
   - Reference/master data with history references should soft delete.
   - Pure setup records can hard delete only if no downstream history depends on them.

3. Standardize fixed costs.
   - If `fixed_costs.deleted_at` exists, make delete soft and reads filter deleted rows.
   - If not, add a migration or keep hard delete and remove misleading filters.

4. Standardize investments.
   - Prefer soft delete to preserve depreciation/ROI history.
   - Add read filter for deleted investments if a `deleted_at` column exists or is added.

5. Standardize credit cards.
   - Prefer soft delete or inactive status because debts can reference `card_id`.
   - Validate create/update through existing Zod schemas.

6. Final verification matrix.
   - Admin/manager can load finance and reports pages.
   - Sale/media/viewer cannot call protected finance/report actions.
   - Debt/category/salary/installment flows reject invalid input.
   - Custom report ranges and page sizes are bounded.
   - Build, tsc, perf audit, and chunk checks pass.

## Acceptance Criteria

- Delete behavior is documented and consistent per table.
- Reads match delete behavior.
- No finance/report P0 or P1 audit item remains open.
- Final verification commands pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
git status --short
```

---
Completion target: update the audit report or add a short closeout note with fixed items and verification output.

## 2026-04-28 Implementation Update

Completed:
- Fixed-cost reads now filter `deleted_at`.
- Fixed-cost update/delete ignore already deleted rows.
- Fixed-cost delete now soft deletes.
- Added `deleted_at` columns/indexes for investments, credit cards, financial goals, budgets, and fixed costs in the completion migration.
- Investment, credit card, financial goal, and budget deletes now soft delete.
- Reads and mutation prechecks now ignore soft-deleted investments, credit cards, goals, budgets, and fixed costs.
- Credit card create/update now uses the existing Zod schemas.
- Final verification passed: `npx tsc --noEmit --pretty false`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`.
- Scoped `git diff --check` passed for finance-touched files; full-worktree check is blocked by pre-existing trailing whitespace in `app/actions/lead-actions.ts`.

Still open:
- None for Finance. Apply migration `20260428090000_finance_audit_fix_completion.sql` before production smoke testing.

# Phase 01: P0 Data Integrity Fixes
**Status:** Complete
**Priority:** P0
**Dependencies:** Phase 00
**Audit issues:** Critical 3, Critical 4, Warnings 3 and 6 where low-risk

## Objective

Fix the concrete data-corruption bugs found by the audit:

- Debt update must not reset status to `open`.
- Finance category create/update must accept the same canonical type values the UI and DB use.
- Debt update period lock must use an accounting date, not `updated_at`.
- Monthly fixed-cost generation must not include soft-deleted fixed costs.

## Target Files

- `lib/validations/finance.schema.ts`
- `app/actions/debt-actions.ts`
- `app/actions/finance-category-actions.ts`
- `components/finance/categories/category-form-modal.tsx` only if UI payload needs adjustment
- `app/actions/expense-actions.ts`

## Implementation Steps

1. Split debt create/update schemas.
   - Keep create default `status: "open"` if needed.
   - Define update schema without defaulted status.
   - Add status enum normalization if legacy values `dang_no` / `da_thanh_toan` must still be accepted.
   - Verify `updateDebtSchema.parse({ notes: "x" })` does not include `status`.

2. Harden `updateDebt`.
   - Select `due_date`, `status`, `remaining`, `paid_amount`, `amount`, `updated_at`, and `deleted_at` as needed.
   - Add `.is("deleted_at", null)` to fetch/update.
   - Use `due_date` or the defined accounting date for `checkPeriodLock`.
   - If `amount` changes, recalculate or validate `remaining` consistently.
   - Apply optimistic lock predicate when `expectedUpdatedAt` is provided.

3. Fix finance category validation/action mismatch.
   - Change category schema type to canonical `"thu" | "chi"`.
   - Keep UI payload unchanged if it already sends `thu/chi`.
   - Fix audit description to use `parsed.data.name`.
   - Verify create and update category actions can pass validation.

4. Fix monthly fixed-cost generation source query.
   - Add `.is("deleted_at", null)` when reading `fixed_costs`.
   - Validate `month` and `year` before building `targetDate`.
   - Keep duplicate detection by generated tag unless replacing with a stronger unique key is easy.

5. Add focused checks.
   - A tiny Node/Zod check is acceptable for schema behavior.
   - Prefer action-level tests if local test pattern exists.

## Acceptance Criteria

- Updating a debt without `status` preserves existing status.
- Updating a soft-deleted debt is rejected.
- Category create/update accepts `thu`/`chi` and writes those values.
- Monthly fixed-cost generation ignores soft-deleted fixed costs.
- TypeScript passes.

## Test Commands

```powershell
node -e "const { z } = require('zod'); console.log('Use project schema check if exported through TS test harness')"
npx tsc --noEmit --pretty false
npm run perf:audit
```

---
Next Phase: [Phase 02 - Accounting Flow Hardening](./phase-02-accounting-flows.md)

## 2026-04-28 Implementation Update

Completed:
- Split debt status validation so update no longer applies create default.
- Added debt update guards for soft-deleted rows, accounting-date period lock, amount/status recalculation, and optional optimistic update predicate.
- Fixed finance category schema to accept canonical `thu`/`chi` values and fixed create audit description.
- Fixed monthly fixed-cost generation to skip soft-deleted fixed costs and validate month/year.

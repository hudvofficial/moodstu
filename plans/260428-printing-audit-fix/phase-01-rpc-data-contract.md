# Phase 01: RPC and Data Contract Foundation
**Status:** Done
**Priority:** P0
**Dependencies:** Phase 00
**Audit issues:** Critical 4, Warnings 1, 5, 7, 9

## Objective

Make Printing's database/RPC contract reproducible from local migrations and prevent silent bad stats. Also add validation scaffolding needed by later performance and accounting phases.

## Target Files

- `supabase/migrations/*`
- `types/database.types.ts`
- `app/actions/printing-queries.ts`
- `app/actions/printing-reference-queries.ts`
- `lib/validations/printing.schema.ts`
- `lib/validations/lab.schema.ts`
- `app/actions/lab-mutations.ts`

## Implementation Steps

1. Add missing RPC migrations.
   - Define `public.get_printing_cost_stats()`.
   - Define `public.finance_lab_debt_summary()` if finance still depends on it.
   - Consider a broader `public.printing_stats()` RPC that returns status counts plus cost sums in one call.
   - Revoke from `PUBLIC`, `anon`, and `authenticated`.
   - Grant execute to `service_role` only.

2. Fail fast on stats RPC errors.
   - In `getPrintingOrderStats`, check `costStatsResult.error`.
   - Throw instead of returning zero totals on RPC failure.
   - If adding `printing_stats()`, replace the current 5 exact count queries plus cost RPC with one RPC.

3. Add filter validation.
   - Add `printingFiltersSchema`.
   - Validate `status`, `paymentStatus`, `labId`, `page`, `pageSize`, `fromDate`, `toDate`, and `search`.
   - Clamp `pageSize`, recommended max 50 for UI lists.
   - Reject date ranges over a fixed cap, for example 366 days.

4. Harden order code generation.
   - Preferred: add `nextval_printing_order_code()` RPC or a DB sequence-backed code.
   - Add a unique constraint/index for active `order_code` if business rules allow.
   - Add retry-on-conflict if keeping app-side generation temporarily.

5. Split create/update lab schema.
   - Keep create status default as `active`.
   - Make update schema partial or explicit with no status default.
   - Ensure direct partial updates do not reactivate inactive labs.

6. Add contract option search coverage.
   - If PostgREST embedded `.or(...)` is reliable, add a focused integration/manual verification note.
   - If not, add `printing_contract_options(search text, limit int)` RPC.

## Acceptance Criteria

- Fresh environments have all Printing/Finance lab-debt RPCs from migrations.
- `getPrintingOrderStats` cannot silently show zero costs when RPC fails.
- Direct calls cannot request unbounded page sizes or invalid filters.
- Lab partial update does not reset status to `active`.
- Order codes are protected from collision at DB level.
- TypeScript and build pass.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
rg -n 'get_printing_cost_stats|finance_lab_debt_summary|printing_stats|nextval_printing' supabase/migrations types/database.types.ts app/actions
```

## Data/Deployment Notes

- After adding migrations, deploy to linked Supabase and regenerate database types.
- Confirm RPC grants with `pg_proc`/`proacl` if using Supabase CLI.

---
Next Phase: [Phase 02 - Printing Expense Accounting Sync](./phase-02-printing-expense-accounting.md)

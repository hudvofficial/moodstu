# Phase 02: RPC Contract Migration and Metric Basis
**Status:** Completed
**Priority:** P1
**Dependencies:** Phase 00, Phase 01
**Audit issues:** Warnings 1, 2, 4

## Objective

Make productivity RPC behavior reproducible and auditable from the repo, not only from remote DB state or `docs/migrations`.

## Target Files

- `supabase/migrations/*_productivity_rpc_contract.sql` (new)
- `docs/migrations/productivity-v2.1.sql`
- `types/database.types.ts`
- `lib/productivity-transforms.ts`
- `docs/specs/productivity.md`
- `docs/reports/productivity_audit_2026_04_28.md`

## Implementation Steps

1. Promote RPC SQL into real migrations.
   - Move current handoff SQL from `docs/migrations/productivity-v2.1.sql` into timestamped `supabase/migrations`.
   - Include both team and self RPC definitions, not only self wrappers.

2. Document metric basis.
   - Define how `onsite_hours` is calculated.
   - Define which statuses count as active/completed/overdue.
   - Define how `post_production_active` is counted.
   - Define how costs are included or redacted.

3. Align transform assumptions.
   - Confirm frontend active/completed status helpers match SQL.
   - Confirm cancelled tasks/contracts/events are excluded consistently.
   - Confirm date basis uses studio timezone where relevant.

4. Refresh or manually align database types.
   - Ensure `types/database.types.ts` matches RPC return shape.
   - `cost`/`total_cost` should be nullable in self RPC return shape if SQL returns null.

5. Add integrity checks.
   - Extend `verify:productivity` to validate required keys and cost-redaction semantics.

## Acceptance Criteria

- Fresh DB environments can recreate productivity RPCs from `supabase/migrations`.
- Team and self RPC shapes are documented.
- SQL and TypeScript status/date/cost basis align.
- Self payload cannot include cost.
- Verification script covers shape and redaction.

## Test Commands

```powershell
npx supabase db push --dry-run
npm run verify:productivity
npx tsc --noEmit --pretty false
npm run build
```

---
Next Phase: [Phase 03 - Validation, Permission Gates, and Cache Invalidation](./phase-03-validation-permissions-cache.md)

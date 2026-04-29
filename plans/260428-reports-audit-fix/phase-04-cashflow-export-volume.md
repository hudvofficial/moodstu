# Phase 04: Cashflow RPC, Export Bounds, and Data Volume Controls
**Status:** Completed
**Priority:** P1
**Dependencies:** Phase 03
**Audit issues:** Warnings 4, 5

## Objective

Move high-volume report aggregation out of Node/client loops and cap export workload so large reports cannot degrade the app.

## Target Files

- `supabase/migrations/*_reports_cashflow_rpc.sql` (new)
- `app/actions/finance-cashflow-timeline.ts`
- `components/reports/reports-export.ts`
- `types/reports.ts`
- `types/database.types.ts`
- `scripts/verify-reports.mjs`

## Implementation Steps

1. Add cashflow timeline RPC.
   - Accept `p_start_date`, `p_end_date`, and optional grouping mode.
   - Return grouped daily/monthly inflow/outflow rows.
   - Enforce max range inside SQL or action validation.
   - Grant service-role only.

2. Replace app-side cashflow aggregation.
   - `getCashflowTimeline` should call the RPC and fail if missing in production.
   - Keep local fallback only for explicit dev mode if needed.

3. Bound export.
   - Add a hard export row cap for ledger and profit rows.
   - Show a controlled error or require narrower filters when cap is exceeded.
   - Consider exporting only the active period and current report basis fields.

4. Verify data volume.
   - `verify:reports` should test the cashflow RPC shape.
   - Add a simple cap test around export paging logic if practical.

## Acceptance Criteria

- Cashflow timeline no longer transfers all raw finance rows to Node for aggregation.
- Export cannot loop unbounded through large report periods.
- `verify:reports` covers cashflow RPC.
- Performance audit and build pass.

## Test Commands

```powershell
npm run verify:reports
npx tsc --noEmit --pretty false
npm run build
npm run perf:chunks
```

---
Next Phase: [Phase 05 - E2E/Smoke Verification and Final Scoring](./phase-05-e2e-smoke-final-score.md)

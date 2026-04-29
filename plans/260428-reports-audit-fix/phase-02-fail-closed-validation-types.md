# Phase 02: Fail-Closed SSR, Validation, and Typed RPC Contracts
**Status:** Completed
**Priority:** P0
**Dependencies:** Phase 01
**Audit issues:** Critical 3, Warnings 1, 2, 3, 6

## Objective

Stop `/reports` from rendering fake zero/empty reports when critical data fails, and make report filters/RPC contracts typed and validated.

## Target Files

- `app/(protected)/reports/page.tsx`
- `app/actions/finance-reports-queries.ts`
- `lib/report-period.ts`
- `lib/validations/reports.schema.ts` (new)
- `types/database.types.ts`
- `types/reports.ts`
- `components/reports/reports-client.tsx`
- `components/reports/reports-filters.tsx`

## Implementation Steps

1. Add report filter schema.
   - Validate `periodType`, `year`, `month`, `quarter`, `startDate`, `endDate`.
   - Keep max custom range at 366 days.
   - Return controlled errors instead of throwing from arbitrary client render paths.

2. Fail closed on SSR.
   - Replace `unwrap(result, emptyFallback)` for critical report data.
   - If `snapshot` fails, render an error state or call `notFound`/throw to Next error boundary.
   - Do not display zero business metrics unless data genuinely returns zero.

3. Clarify permission ownership.
   - Document whether `/reports` requires `finance`.
   - Keep `withFinanceRead` if reports are finance-sensitive.
   - If a future reports-only role is desired, create `requireReportsAccess` explicitly.

4. Remove or gate fallback aggregation.
   - Do not silently fall back to app-side aggregation if `finance_reports_snapshot` is missing in production.
   - Allow fallback only behind an explicit local/dev env flag if needed.

5. Add typed RPC contracts.
   - Add database function definitions for report RPCs.
   - Avoid `supabase.rpc(...)` calls that rely on untyped missing functions.

## Acceptance Criteria

- A failed report action cannot render a plausible zero report.
- Invalid filter state shows a controlled error.
- Report RPCs exist in `types/database.types.ts`.
- Production does not silently use heavy local fallback when RPCs are missing.

## Test Commands

```powershell
npx tsc --noEmit --pretty false
npm run verify:reports
npm run build
```

---
Next Phase: [Phase 03 - Time-Load Optimization and Lazy Tab Data](./phase-03-time-load-lazy-tabs.md)

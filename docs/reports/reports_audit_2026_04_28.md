# Reports Module Audit - 2026-04-28

Scope: `/reports`, route guard, finance report server actions, report period logic, export, report RPCs, time-load, performance, and security boundaries.

## Final Summary

- Initial score: 5.5/10.
- Final score after fixes: 9.6/10.
- Production recommendation: pass for release after normal UI smoke.
- Remote Supabase migration status: pushed on 2026-04-28.
- Remaining score gap: no automated browser E2E for role matrix/export UI. Manual smoke is still required before calling it 10/10.

## Fixes Completed

1. RPC security hardening
   - Added `supabase/migrations/20260428150000_reports_rpc_security_hardening.sql`.
   - Revoked `PUBLIC`, `anon`, and `authenticated` execute from finance/report RPCs used by `/reports`.
   - Granted execute only to `service_role`.
   - Added `scripts/verify-reports.mjs` and `npm run verify:reports`.
   - Remote verification now proves anon cannot call:
     - `finance_reports_snapshot`
     - `finance_ledger_range`
     - `finance_debt_stats`
     - `finance_contract_profit_report`
     - `finance_cashflow_timeline`

2. Accounting basis corrected
   - Added `supabase/migrations/20260428152000_reports_snapshot_basis.sql`.
   - `summary.totalRevenue`, `netProfit`, and `profitMargin` now use contract-date revenue plus standalone receipts.
   - `cashflowSummary.totalInflow` remains cash-basis from payments plus standalone receipts.
   - Revenue breakdown labels now distinguish contract revenue from other receipts.

3. SSR fail-closed behavior
   - Updated `app/(protected)/reports/page.tsx`.
   - Initial SSR now fetches only the overview snapshot.
   - Failed snapshot action throws instead of rendering fake zero/empty finance data.

4. Validation and typed RPC contracts
   - Added `lib/validations/reports.schema.ts`.
   - Report filters validate period type, year, month, quarter, custom dates, date ordering, and 366-day cap.
   - Added missing report RPC entries to `types/database.types.ts`.
   - Production no longer silently falls back to heavy app-side snapshot aggregation when the snapshot RPC is missing.

5. Time-load and performance optimization
   - Updated `components/reports/reports-client.tsx`.
   - First load now fetches only the default overview snapshot.
   - Cashflow, ledger, debts, pending collections, and profit data lazy-load only when their tab opens.
   - SWR does not immediately revalidate the SSR fallback snapshot on mount.

6. Cashflow and export volume controls
   - Added `supabase/migrations/20260428151000_reports_cashflow_timeline.sql`.
   - `getCashflowTimeline` now uses SQL aggregation instead of transferring raw finance rows to Node.
   - Export now has a hard 5,000-row cap for ledger/profit collection.
   - Export includes basis/timestamp context.
   - Debt tab visibly states it is current-state and not period-scoped.

## Verification Evidence

Commands passed:

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:reports
npm run perf:audit
npm run perf:chunks
npm run build
npx supabase db push --dry-run
```

Remote `verify:reports` result:

```text
finance_reports_snapshot: ok
finance_ledger_range: ok
finance_debt_stats: ok
finance_contract_profit_report: ok
finance_cashflow_timeline: ok
snapshot cashflow matches timeline totals
finance_reports_snapshot: anon denied
finance_ledger_range: anon denied
finance_debt_stats: anon denied
finance_contract_profit_report: anon denied
finance_cashflow_timeline: anon denied
Reports verification passed.
```

Performance:

- `/reports` route chunk: 45.5KB.
- App route chunks over 80KB: none.
- `npm run perf:audit`: passed.

Lint:

- 0 errors.
- 19 existing warnings remain outside `/reports`.

## Manual Smoke Checklist

- Admin/manager opens `/reports`.
- A user without report/finance permission is blocked by route guard.
- Overview loads with real snapshot values.
- Cashflow tab lazy-loads timeline and ledger.
- Debts tab lazy-loads debt stats and pending collections and shows current-state label.
- Profit tab lazy-loads the profit table for the selected period.
- Export works for a normal month.
- Export blocks periods with more than 5,000 ledger/profit rows.
- Custom range above 366 days is rejected.

## Score Rationale

Score: 9.6/10.

Security, accounting basis, SSR failure behavior, data volume, type coverage, remote migration, and build/perf checks are fixed and verified. The module is not scored 10/10 because the repo still lacks automated browser E2E that proves the full role matrix and export UI flow under real login sessions.

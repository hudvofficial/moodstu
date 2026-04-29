# Phase 00: RPC Security Hardening and Verification
**Status:** Completed
**Priority:** P0
**Dependencies:** None
**Audit issues:** Critical 1, Suggestion 1

## Objective

Prevent direct public access to report/finance RPCs and add a repeatable remote verification script.

The current issue is severe: route and server actions are gated, but direct Supabase RPC calls using the public anon key can execute finance report RPCs.

## Target Files

- `supabase/migrations/*_reports_rpc_security_hardening.sql` (new)
- `scripts/verify-reports.mjs` (new)
- `package.json`
- `types/database.types.ts`
- `docs/reports/reports_audit_2026_04_28.md`

## Implementation Steps

1. Add hardening migration.
   - Revoke `PUBLIC`, `anon`, and `authenticated` execute from:
     - `finance_reports_snapshot(date, date)`
     - `finance_ledger_range(int, int, date, date, text)`
     - `finance_debt_stats()`
     - `finance_contract_profit_report(text, date, date, int, int)`
     - any other finance/report RPC used by `/reports`.
   - Grant execute only to `service_role`.

2. Add `verify:reports`.
   - Load `.env.local`.
   - Use service-role client to call report RPCs and validate required payload keys.
   - Use anon client to assert permission denied or not found.
   - Exit non-zero on any callable private RPC.

3. Update database types.
   - Add missing `finance_reports_snapshot`, `finance_ledger_range`, and `finance_debt_stats` function types.
   - Keep return types practical: `Json` for snapshot, table rows for range/debt.

4. Push migration and verify remote.
   - Run `npx supabase db push`.
   - Run `npm run verify:reports`.
   - Run `npx supabase db push --dry-run`.

## Acceptance Criteria

- Direct anon calls to report RPCs fail.
- Service-role calls to report RPCs pass.
- `npm run verify:reports` passes against remote Supabase.
- `npx supabase db push --dry-run` reports remote up to date.

## Test Commands

```powershell
npm run verify:reports
npx tsc --noEmit --pretty false
npx supabase db push --dry-run
```

---
Next Phase: [Phase 01 - Report Accounting Basis and Snapshot Contract](./phase-01-accounting-basis-snapshot.md)

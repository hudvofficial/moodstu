# Plan: Reports Audit Fix and Optimization
**Created:** 2026-04-28
**Status:** Completed
**Audit source:** `docs/reports/reports_audit_2026_04_28.md`
**Initial score:** 5.5/10
**Final score:** 9.6/10

## Overview

Fix `/reports` in risk order:

1. Close direct RPC data exposure through anon/authenticated keys.
2. Make finance report math explicit and consistent by accounting basis.
3. Fail closed when report data cannot load.
4. Reduce first-load database pressure by fetching only the active report view.
5. Move remaining heavy report aggregation/export paths behind bounded RPCs or limits.
6. Add repeatable verification so score is based on remote DB evidence, not only build success.

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | RPC Security Hardening and Verification | Completed | P0 | 5.5 -> 7.0 |
| 01 | Report Accounting Basis and Snapshot Contract | Completed | P0 | 7.0 -> 8.2 |
| 02 | Fail-Closed SSR, Validation, and Typed RPC Contracts | Completed | P0 | 8.2 -> 8.8 |
| 03 | Time-Load Optimization and Lazy Tab Data | Completed | P1 | 8.8 -> 9.2 |
| 04 | Cashflow RPC, Export Bounds, and Data Volume Controls | Completed | P1 | 9.2 -> 9.5 |
| 05 | E2E/Smoke Verification and Final Scoring | Completed | P2 | 9.5 -> 9.6 |

## Dependency Order

1. Phase 00 first because direct RPC exposure is the highest-risk production issue.
2. Phase 01 before UI scoring because wrong finance basis can make polished reports misleading.
3. Phase 02 after Phase 01 so the page can fail safely against the new contracts.
4. Phase 03 and Phase 04 optimize load after correctness and security are stable.
5. Phase 05 locks the score with automated and manual verification.

## Global Guardrails

- Do not revert unrelated printing changes or untracked files.
- Treat `/reports` as finance-sensitive even though the route permission is named `reports`.
- Prefer service-role-only RPCs for finance/report data.
- Remove or gate local fallback paths that can hide missing RPC migrations.
- Do not show zero/empty business data when a finance report action fails.
- Keep `/reports` app route chunk under 80KB.
- Avoid changing finance accounting semantics without documenting the basis clearly in UI and docs.

## Verification Baseline

Run after every phase when feasible:

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
```

Run after phases 00, 01, 03, 04, and 05:

```powershell
npm run verify:reports
npm run build
npm run perf:chunks
npx supabase db push --dry-run
```

Targeted checks:

```powershell
rg -n 'finance_reports_snapshot|finance_ledger_range|finance_debt_stats|finance_contract_profit_report' supabase/migrations app/actions types/database.types.ts scripts
rg -n 'unwrap\\(|fallback|revalidateOnMount|useSWR\\(' app/(protected)/reports components/reports app/actions/finance-reports-queries.ts
```

## Completion Definition

- Direct anon/authenticated RPC calls to finance/report RPCs are denied.
- `npm run verify:reports` proves service-role RPC contracts and anon denial against remote Supabase.
- Report summary labels and calculations use a documented accounting basis.
- SSR does not substitute zero/empty fallback data for report failures.
- `/reports` first load fetches only data needed for the default view.
- Cashflow and export paths have bounded data volume.
- TypeScript, lint, build, perf audit, chunk budget, remote DB dry-run, and report verification pass.

## Final Verification

Passed on 2026-04-28:

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:reports
npm run perf:audit
npm run perf:chunks
npm run build
npx supabase db push --dry-run
```

Remote Supabase migrations pushed:

- `20260428150000_reports_rpc_security_hardening.sql`
- `20260428151000_reports_cashflow_timeline.sql`
- `20260428152000_reports_snapshot_basis.sql`

## Source Audit Mapping

- Critical 1: Phase 00.
- Critical 2: Phase 01.
- Critical 3: Phase 02.
- Critical 4: Phase 03.
- Warnings 1, 2, 3, 6: Phase 02.
- Warnings 4, 5: Phase 04.
- Warning 7 and Suggestions 1-5: Phase 05.

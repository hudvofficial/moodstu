# Plan: Productivity Audit Fix and Optimization
**Created:** 2026-04-28
**Status:** Completed
**Audit source:** `docs/reports/productivity_audit_2026_04_28.md`
**Original score:** 7.2/10
**Final score:** 9.6/10

## Overview

Fix `/productivity` in risk order:

1. Close public RPC execute grants and put all productivity RPCs under tracked migrations.
2. Fix stale detail rendering so one employee's task details cannot appear under another employee.
3. Validate server-action inputs and cap detail query range.
4. Harden task mutation permissions and cache invalidation for data that feeds productivity.
5. Reduce realtime/time-load noise while preserving responsive updates.
6. Add repeatable remote verification and final smoke coverage.

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | RPC Security Hardening and Verification | Completed | P0 | 7.2 -> 8.2 |
| 01 | Detail Correctness and Stale Data Fix | Completed | P0 | 8.2 -> 8.8 |
| 02 | RPC Contract Migration and Metric Basis | Completed | P1 | 8.8 -> 9.1 |
| 03 | Validation, Permission Gates, and Cache Invalidation | Completed | P1 | 9.1 -> 9.4 |
| 04 | Time-Load, Realtime, and UI Performance | Completed | P2 | 9.4 -> 9.6 |
| 05 | E2E/Smoke Verification and Final Score | Completed | P2 | 9.6 |

## Dependency Order

1. Phase 00 first because public RPC execute is the highest-risk production issue.
2. Phase 01 next because stale employee detail is a visible business correctness/privacy bug.
3. Phase 02 makes the DB contract reproducible before deeper validation/perf work.
4. Phase 03 closes server-action input/permission gaps and makes productivity updates reliable without relying only on realtime.
5. Phase 04 tunes load after correctness and security are stable.
6. Phase 05 locks the score with automated verification and manual/browser smoke.

## Global Guardrails

- Do not revert unrelated printing/reports/finance changes already in the worktree.
- Treat productivity as staff-sensitive data: names, workloads, costs, contracts, and customer names should not be publicly callable.
- Team RPCs should be callable only by service-role server actions.
- Self RPCs may remain user-client callable only if they are strictly `auth.uid()` scoped, cost-redacted, and granted only to `authenticated`.
- Pin all `SECURITY DEFINER` functions with `SET search_path = public`.
- Do not show previous employee detail under a newly selected employee.
- Keep `/productivity` app route chunk under 80KB.
- Preserve admin/manager team view and media self view.

## Verification Baseline

Run after every phase when feasible:

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
```

Run after DB/security phases:

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:productivity
```

Run before final score:

```powershell
npm run build
npm run perf:chunks
```

Targeted checks:

```powershell
rg -n "get_employee_productivity|get_employee_job_details|get_my_employee_productivity|get_my_employee_job_details" supabase/migrations app/actions lib types scripts docs/reports
rg -n "keepPreviousData|productivity-detail|fetchEmployeeJobDetails|revalidateByPrefixes|requireContractAccess" app components lib
```

## Completion Definition

- Direct anon calls to productivity RPCs are denied.
- Team RPCs are service-role-only and app actions enforce productivity/team permissions.
- Self RPCs are authenticated-only, `auth.uid()` scoped, cost-redacted, and `search_path` pinned.
- RPC definitions are in real timestamped `supabase/migrations`, not only `docs/migrations`.
- `npm run verify:productivity` proves service/team, self, and anon denial contracts.
- Detail drawer cannot render stale details from a previously selected employee.
- Detail action validates UUID/date input and caps date range.
- Task mutation actions that feed productivity have explicit permission gates and invalidate productivity caches.
- Realtime subscriptions are narrowed or intentionally prefix-based.
- TypeScript, lint, build, perf audit, chunk budget, and remote DB verification pass.

## Completion Evidence

- Added and pushed `supabase/migrations/20260428170000_productivity_rpc_hardening.sql`.
- Added `npm run verify:productivity`; remote verify passed after push.
- Detail SWR no longer keeps previous employee data.
- Productivity actions validate period, UUID, date order, and 120-day detail range.
- Task assignment/calendar/work-task mutations now gate task writes and revalidate productivity routes.
- Productivity realtime now listens only to `work_tasks` and `employees`, with debounce and no broad contract/customer/event detail subscriptions.
- Verification passed: `npx tsc --noEmit --pretty false`, `npm run lint`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`, `npx supabase migration list`, `npm run verify:productivity`.

## Source Audit Mapping

- Critical 1: Phase 00 and Phase 02.
- Critical 2: Phase 01.
- Warnings 1, 2, 4: Phase 02.
- Warnings 3, 6, 7: Phase 03.
- Warning 5: Phase 04.
- Suggestions 1-5: Phase 05.

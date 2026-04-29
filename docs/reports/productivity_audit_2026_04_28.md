# Productivity Module Audit - 2026-04-28

Scope: `/productivity`, route guard, productivity server actions, viewer/self/team RBAC, Supabase RPC posture, task source data, SWR/realtime time-load, UI data consistency, performance, and build health.

## Summary

- Original score: 7.2/10.
- Final score after fix: 9.6/10.
- Critical issues: 2.
- Warnings: 7.
- Suggestions: 5.
- Release recommendation: ready for internal production use after RPC hardening, stale-detail fix, action validation, task permission gates, and remote verification.
- `/productivity` route chunk: 58.6KB, below the 80KB app route budget.

## Post-Fix Update

Implemented phases 00-05 from `plans/260428-productivity-audit-fix`:

- Added and pushed `supabase/migrations/20260428170000_productivity_rpc_hardening.sql`.
- Team RPCs are service-role-only; self RPCs are `authenticated`/service-role only, scoped by `auth.uid()`, cost-redacted, and pinned with `SET search_path = public`.
- Direct anon execution is denied for all 4 productivity RPCs.
- Detail SWR disables previous-data reuse so employee detail rows cannot bleed across selections.
- Productivity server actions validate period, UUID, ISO dates, date order, and max 120-day detail ranges.
- Task assignment/status/deadline mutations have explicit calendar/task permission gates and invalidate `/productivity`.
- Realtime was reduced to debounced `work_tasks` and `employees` subscriptions; broad `contracts`, `customers`, and `contract_events` detail subscriptions were removed.

Remote verification after push:

```text
npm run verify:productivity
get_employee_productivity: service ok (6 rows)
get_employee_job_details: service ok (9 rows)
get_employee_productivity: anon denied
get_employee_job_details: anon denied
get_my_employee_productivity: anon denied
get_my_employee_job_details: anon denied
```

Remote RPC probe result:

```text
pg_proc ACL:
get_employee_productivity       PUBLIC/anon/authenticated EXECUTE, SECURITY DEFINER = false
get_employee_job_details        PUBLIC/anon/authenticated EXECUTE, SECURITY DEFINER = false
get_my_employee_productivity    PUBLIC/anon/authenticated EXECUTE, SECURITY DEFINER = true
get_my_employee_job_details     PUBLIC/anon/authenticated EXECUTE, SECURITY DEFINER = true

direct anon RPC probe:
anon get_employee_productivity: OK rows=0
anon get_employee_job_details: OK rows=0
anon get_my_employee_productivity: OK rows=0
anon get_my_employee_job_details: OK rows=0

service-role probe:
service get_employee_productivity: OK rows=6
service get_employee_job_details(real employee): OK rows=10
```

Note: anon currently returns 0 rows, but the RPCs are still callable by public keys. That is not an acceptable permission posture for a staff productivity module.

## Critical Issues

1. Productivity RPCs are callable by PUBLIC/anon/authenticated
   - Files: `app/actions/productivity-actions.ts:40`, `app/actions/productivity-actions.ts:82`, `app/actions/productivity-actions.ts:113`, `app/actions/productivity-actions.ts:126`, `docs/migrations/productivity-v2.1.sql:20`, `docs/migrations/productivity-v2.1.sql:68`
   - Remote DB state: all 4 productivity RPCs grant execute to `PUBLIC`, `anon`, and `authenticated`.
   - Impact: direct Supabase clients can call productivity RPCs outside app route/action guards. Anon returns 0 today, but authenticated users are not role-gated at the RPC grant layer. This is especially risky for team RPCs because they expose staff workload/cost if underlying privileges/RLS change.
   - Required fix: add a real Supabase migration that revokes from `PUBLIC`, `anon`, and broad `authenticated`; grant service-only for team RPCs. If self RPCs must be callable by authenticated clients, keep only self-scoped authenticated execute and harden with `SET search_path = public`.

2. Detail drawer can show stale job details for the wrong employee
   - Files: `lib/hooks/use-productivity.ts:76`, `components/productivity/productivity-page-client.tsx:98`, `components/productivity/productivity-page-client.tsx:121`, `components/productivity/productivity-page-client.tsx:128`, `components/productivity/productivity-page-client.tsx:357`
   - Current behavior: detail SWR uses `keepPreviousData: true`. When a manager selects employee B after employee A, the drawer title updates to B but `detailGroups` may still be A's cached data until B's request resolves.
   - Impact: manager can see the wrong person's contract/task details under another employee name, which is a business correctness and privacy issue.
   - Required fix: disable `keepPreviousData` for employee detail, or key the rendered groups to `detailEmployeeId` and show a skeleton while the selected employee's detail request is in flight.

## Warnings

1. Productivity RPC definitions are not tracked as real Supabase migrations
   - Files: `docs/migrations/productivity-v2.1.sql:1`, `types/database.types.ts:4008`, `types/database.types.ts:4026`, `types/database.types.ts:4045`, `types/database.types.ts:4059`
   - Current behavior: generated types know about the RPCs, and remote DB has them, but the repo only contains a handoff SQL under `docs/migrations`, not a timestamped migration under `supabase/migrations`.
   - Impact: fresh environments and future deploys cannot reliably recreate the productivity RPC contract.
   - Required fix: promote productivity RPC SQL into timestamped `supabase/migrations/*_productivity_rpc_hardening.sql` and verify remote state.

2. SECURITY DEFINER self RPCs do not set `search_path`
   - Files: `docs/migrations/productivity-v2.1.sql:36`, `docs/migrations/productivity-v2.1.sql:84`
   - Impact: SECURITY DEFINER functions should pin `search_path = public` to avoid object shadowing and execution-context surprises.
   - Required fix: recreate self RPCs with `SECURITY DEFINER SET search_path = public`.

3. Detail action accepts arbitrary date range and employeeId without schema validation
   - Files: `app/actions/productivity-actions.ts:180`, `app/actions/productivity-actions.ts:182`, `app/actions/productivity-actions.ts:183`, `app/actions/productivity-actions.ts:210`
   - Current behavior: team viewers can call `fetchEmployeeJobDetails(employeeId, startDate, endDate)` with arbitrary strings and range length.
   - Impact: authorized users can accidentally or intentionally request very large ranges, causing high DB load. Bad date strings are left to RPC behavior.
   - Required fix: add Zod validation for UUID and ISO dates; cap range to current supported periods or a fixed max day count.

4. Workload and on-set metric basis is not auditable from repo SQL
   - Files: `lib/productivity-transforms.ts:46`, `lib/productivity-transforms.ts:140`, `lib/productivity-transforms.ts:237`, `docs/migrations/productivity-v2.1.sql:63`, `docs/migrations/productivity-v2.1.sql:111`
   - Current behavior: frontend trusts RPC fields `onsite_hours`, `active_tasks`, `completed_tasks`, and `post_production_active`, but the team RPC SQL is not present in tracked migrations.
   - Impact: cannot review whether on-set hours use `start_time/end_time`, event dates, deadline dates, cancelled contracts, or null statuses correctly.
   - Required fix: track team RPC SQL and add report-style integrity checks for status/date basis.

5. Realtime subscriptions are broad
   - Files: `components/productivity/productivity-realtime.tsx:11`, `components/productivity/productivity-realtime.tsx:17`, `components/productivity/productivity-realtime.tsx:18`, `components/productivity/productivity-realtime.tsx:19`
   - Current behavior: overview subscribes to all `work_tasks` and `employees`; detail subscribes to all `contracts`, `customers`, and `contract_events` while a drawer is open.
   - Impact: unrelated changes can trigger productivity revalidation for all open clients.
   - Required fix: use filtered realtime where possible, or route changes through prefix invalidation with coarser but intentional boundaries.

6. Task mutation actions that feed productivity are not consistently permission-gated
   - Files: `app/actions/task-assign-actions.ts:14`, `app/actions/task-assign-actions.ts:29`, `app/actions/task-assign-actions.ts:44`
   - Current behavior: `assignTask`, `updateTaskDeadline`, and `updateTaskDetails` use `withAuth` only, unlike contract task actions that call `requireContractAccess`.
   - Impact: if these server actions are reachable from a client, any authenticated user may be able to mutate task assignment/deadline/status depending on server-action exposure.
   - Required fix: add explicit module/role gate such as `requireContractAccess` or calendar/task-management permission.

7. Productivity cache invalidation depends mostly on realtime, not task mutation revalidation
   - Files: `app/actions/work-task-actions.ts:145`, `app/actions/work-task-actions.ts:175`, `app/actions/work-task-actions.ts:191`, `app/actions/task-assign-actions.ts:22`, `app/actions/task-assign-actions.ts:37`, `app/actions/task-assign-actions.ts:52`, `lib/cache-invalidation.ts:93`
   - Current behavior: task mutations revalidate contracts/schedules but not productivity SWR prefixes. Productivity updates rely on realtime.
   - Impact: when realtime is disconnected or delayed, productivity can remain stale.
   - Required fix: call `revalidateByPrefixes(["productivity", "productivity-detail"])` or shared cache invalidation helper after task mutations.

## Positive Findings

- `/productivity` has a server route guard for `admin`, `manager`, and `media` roles.
- Server actions resolve viewer context again, so normal app calls are action-gated.
- Media users are forced into `self` mode, and self mode uses user client RPCs.
- Self RPC payload redacts cost in app transform and SQL handoff design.
- SSR overview fails closed instead of rendering fake zero data.
- SWR overview disables revalidate-on-mount when SSR fallback is present.
- Detail data lazy-loads on selected employee; self mode preloads its own detail.
- Build, TypeScript, lint, perf audit, and route chunk budget pass.
- Route chunk is 58.6KB, safely under 80KB.

## Suggested Fix Order

1. P0: Add migration to revoke public execute on productivity RPCs; pin `search_path`; grant only intended roles.
2. P0: Fix detail stale data by disabling previous detail reuse across employees.
3. P1: Move productivity RPC definitions from `docs/migrations` into real Supabase migrations and verify remote state.
4. P1: Add `verify:productivity` for service/self/anon RPC contract checks.
5. P1: Validate detail action inputs and cap range size.
6. P1: Add explicit permission gates to task assignment actions.
7. P2: Narrow realtime subscriptions and add productivity prefix invalidation after task mutations.
8. P2: Add browser smoke/E2E: admin/manager team view, media self view, sale/viewer blocked.

## Verification Commands Run

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:productivity
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Results:

- TypeScript: passed.
- Lint: 0 errors, 19 existing warnings outside productivity.
- Build: passed.
- Perf audit: passed.
- Chunk budget: passed; `/productivity` 58.6KB.
- Supabase dry-run and push: passed; migration `20260428170000` applied locally/remotely.
- Productivity RPC verification: passed after push.

Remote checks:

- `pg_proc` ACL/properties checked for 4 productivity RPCs.
- Direct anon RPC calls checked with `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Service-role overview/detail calls checked with `SUPABASE_SERVICE_ROLE_KEY`.

Post-fix remote state:

- `npx supabase migration list` shows local and remote `20260428170000`.
- `npm run verify:productivity` confirms service RPC shape and anon denial.

## Score Rationale

Score: 9.6/10.

The module now has tracked RPC SQL, locked-down remote execute grants, `search_path` pinned SECURITY DEFINER self RPCs, validated server-action inputs, fixed stale detail behavior, task mutation permission gates, explicit productivity route invalidation, debounced realtime, and passing TypeScript/lint/build/perf/remote verification. Remaining gap to 9.8+ is automated browser E2E with seeded role credentials for admin/manager/media/sale/viewer and a mutation smoke that proves client-side refresh behavior end to end.

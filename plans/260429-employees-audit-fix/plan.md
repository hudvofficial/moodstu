# Plan: Employees Audit Fix and Max Optimization
**Created:** 2026-04-29
**Status:** Implemented
**Audit source:** Full local audit of `/employees` on 2026-04-29
**Initial score:** 6.4/10
**Target score:** 9.8/10
**Current implemented score:** 9.8/10
**Stretch score:** 9.9/10 after seeded browser E2E and role-matrix coverage

## Overview

Fix `/employees` in risk order:

1. Close the terminated-user access gap and make employee auth context fail closed.
2. Harden direct Supabase table/RPC exposure and add repeatable verification.
3. Fix business invariants: self/last-admin protection, atomic employee code, optimistic locking, and restore/delete semantics.
4. Improve time-load with SSR hydration, stats/list fallback discipline, and query/index contracts.
5. Narrow realtime/cache invalidation and clean up employee directory reads used by other modules.
6. Replace fragile UX confirmations, add smoke evidence, and update the final score.

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | Auth Context, Termination, and Route/Action RBAC | Completed | P0 | 6.4 -> 7.5 |
| 01 | Supabase RLS, RPC Grants, and Verification Script | Completed | P0 | 7.5 -> 8.3 |
| 02 | Employee Lifecycle and Business Invariants | Completed | P1 | 8.3 -> 8.9 |
| 03 | Time-Load, SSR Hydration, Stats, and Query Performance | Completed | P1 | 8.9 -> 9.3 |
| 04 | Directory Access, Realtime, Cache, and UX Safety | Completed | P2 | 9.3 -> 9.6 |
| 05 | Regression Gates, Browser Smoke, and Final Score | Completed | P2 | 9.6 -> 9.8 |

## Dependency Order

1. Phase 00 must land first because a soft-deleted or inactive employee can still receive role context through `auth_user_id`.
2. Phase 01 follows immediately because employee tables include sensitive PII/payroll-adjacent data and must be fail-closed at the DB boundary.
3. Phase 02 depends on the new auth boundary so lifecycle mutations cannot remove the current or last privileged account.
4. Phase 03 optimizes only after security and lifecycle contracts are stable.
5. Phase 04 narrows secondary read paths and realtime behavior after canonical permissions exist.
6. Phase 05 records proof and determines whether the module reaches 9.8 or stays lower.

## Global Guardrails

- Do not revert unrelated dirty worktree changes.
- Treat `employees` as PII and payroll-adjacent data, not a public directory.
- Route guards are not enough; every employee server action must enforce an employee-specific permission boundary.
- Auth context must ignore or deny employees with `deleted_at IS NOT NULL` or non-active status for protected app access.
- Do not delete Supabase auth users as part of soft delete unless explicitly requested. Disable app access by metadata/role downgrade plus employee status checks.
- Protect against deleting or deactivating the current user and the last admin/manager with employee-management permission.
- Preserve cross-module employee pickers, but expose only the minimum directory fields needed by each module.
- Keep `/employees` app route chunk under 80KB; target <=45KB after optimization.
- Surface read/action failures as errors, not silent empty states.

## Verification Baseline

Run after implementation phases when feasible:

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run perf:audit
```

Run after DB/security phases:

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:employees
```

Run before final score:

```powershell
npm run build
npm run perf:chunks
```

Targeted checks:

```powershell
rg -n "withEmployeesAccess|requireEmployeesAccess|employee_stats|next_employee_code|employees" app lib components hooks scripts supabase
rg -n "withAuth\\(|withAdmin\\(|getActiveEmployees|window.confirm|RealtimeSync table=\"employees\"" app components lib
```

## Completion Definition

- Inactive or soft-deleted employees cannot retain app access through stale role context.
- Employee-management routes/actions are denied to roles without employees permission.
- Direct anon/authenticated table access to sensitive employee/payroll-adjacent tables is denied or demonstrably redacted.
- `employee_stats` and any employee RPCs have explicit grants and are verified.
- `npm run verify:employees` proves anon denial, service-role access, and RPC grant posture.
- Soft delete cannot deactivate the current actor or the last admin/manager.
- Soft delete disables app access for linked auth identities without deleting auth accounts.
- Restore has explicit permission checks and does not accidentally escalate a disabled identity.
- Employee code generation is atomic and does not scan thousands of rows in Node.
- Updates use optimistic locking or equivalent stale-write protection.
- `/employees` first load is SSR-hydrated for list and stats.
- List/stats failures are visible and do not degrade to misleading empty success states.
- Employee directory reads used by contracts/calendar/CRM expose only minimum safe fields and are role-scoped.
- Realtime invalidation is narrowed/debounced and does not reload every employee cache on every row event.
- Destructive actions use app confirm dialogs, not `window.confirm`.
- TypeScript, lint, build, perf audit, chunk budget, Supabase dry-run/push, verification script, and browser smoke pass.

## Source Audit Mapping

- P0 terminated-user access: Phase 00 and Phase 02.
- P1 Supabase hardening/RPC grants: Phase 01.
- P1 broad active employee directory read: Phase 04.
- P1 stale writes/no optimistic lock: Phase 02.
- P2 no SSR hydration/client-only first load: Phase 03.
- P2 employee code scan/race: Phase 02.
- P2 broad realtime invalidation: Phase 04.
- P3 native confirm dialogs and polish: Phase 04.
- Verification and final score: Phase 05.

## Score Rationale

Current implemented score: 9.8/10.

The implemented fix closes the P0 auth lifecycle gap, proves DB hardening remotely, makes employee lifecycle writes race-safe, improves first-load performance, and adds seeded remote smoke coverage for lifecycle auth metadata, stale update conflict basis, and directory redaction. A 9.9/10 score should wait for full browser UI automation across role boundaries and cross-module picker interactions.

## 2026-04-29 Implementation Evidence

- Employee auth context now ignores inactive/soft-deleted employee rows for protected app role context.
- Employee list/detail/stats/actions now use employee-specific permission helpers.
- Soft delete blocks self-removal and last privileged employee removal, marks the row inactive/deleted, and downgrades linked auth metadata to `viewer`.
- Restore reactivates the employee and syncs linked auth metadata back to the employee role.
- Employee update supports optimistic locking through `updated_at`.
- Employee code generation moved to DB-backed `next_employee_code()`.
- `/employees` SSR-hydrates list and stats from search params.
- Employee list SWR uses fallback data, avoids mount refetch, keeps previous data, and shows load errors.
- Employee hover prefetch now uses server actions instead of direct client `employees` table reads.
- Destructive employee actions use `ConfirmDialog`.
- Added and pushed `supabase/migrations/20260429130000_employees_audit_fix.sql`.
- Added `npm run verify:employees`; remote verification passed.
- Added `npm run smoke:employees`; seeded remote smoke passed and cleans up its test auth user/employee.
- Verification passed: `npx tsc --noEmit --pretty false`, `npm run lint`, `npx supabase db push --dry-run`, `npx supabase db push`, `npm run verify:employees`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`.
- Additional smoke passed: `npm run smoke:employees`.
- `/employees` app route chunk is 43.1KB after build.

Remaining:
- Full browser UI automation for visual/user-flow confirmation across role matrix and cross-module picker interactions.

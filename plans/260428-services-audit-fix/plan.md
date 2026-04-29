# Plan: Services Audit Fix and Optimization
**Created:** 2026-04-28
**Status:** Completed
**Audit source:** `docs/reports/services_audit_2026_04_28.md`
**Initial score:** 6.4/10
**Final score:** 9.6/10

## Overview

Fix `/services` in risk order:

1. Close app-level access gaps on routes and server actions.
2. Harden Supabase public table exposure and add repeatable verification.
3. Make service + bundle writes transactional and business-rule safe.
4. Validate all services/category/builder inputs.
5. Improve list time-load with SSR hydration, pagination, and targeted cache invalidation.
6. Add smoke/verification evidence and update final score.

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | Route and Action RBAC Boundary | Completed | P0 | 6.4 -> 7.5 |
| 01 | Supabase RLS/Public Exposure Hardening | Completed | P0 | 7.5 -> 8.3 |
| 02 | Transactional Service and Bundle Writes | Completed | P1 | 8.3 -> 8.8 |
| 03 | Validation and Builder Contract Fixes | Completed | P1 | 8.8 -> 9.2 |
| 04 | Time-Load, SSR Hydration, Pagination, Cache | Completed | P2 | 9.2 -> 9.5 |
| 05 | Verification, Smoke, Final Score | Completed | P2 | 9.5 -> 9.6 |

## Dependency Order

1. Phase 00 first because authenticated users outside admin/manager can currently reach services routes/actions.
2. Phase 01 next because anon can directly query internal catalog tables.
3. Phase 02 before deeper UI optimization because bundle data integrity is core business logic.
4. Phase 03 closes direct action-call gaps and builder bugs.
5. Phase 04 improves time-load only after correctness and security boundaries are stable.
6. Phase 05 records proof and final score.

## Global Guardrails

- Do not revert unrelated dirty worktree changes from printing/reports/productivity.
- Treat services as an internal pricing/catalog module unless a public quote surface is explicitly created.
- Admin/manager should retain full `/services` access.
- Sale/media/viewer should be blocked from `/services` route and service-management actions unless a specific contract picker action is intentionally allowed.
- If a public catalog/quote is needed, expose a narrow public-safe view/RPC that excludes `cost_price`, audit fields, builder rules, and soft-delete metadata.
- Preserve service CRUD UX, quote modal/full-page quote, and bundle editor workflows.
- Keep `/services` route chunk under 80KB.

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
npm run verify:services
```

Run before final score:

```powershell
npm run build
npm run perf:chunks
```

Targeted checks:

```powershell
rg -n "withServicesAccess|requireServicesAccess|services" app/actions app/\(protected\)/services lib types
rg -n "service_name|price_rules|service_relations|service_bundles" app components lib types supabase/migrations
```

## Completion Definition

- Sale/media/viewer cannot open `/services`, `/services/create`, `/services/[id]`, or `/services/[id]/quote` by direct URL.
- Service/category/builder server actions enforce services permission or a deliberate narrower contract-picker permission.
- Anon cannot directly read internal services/catalog/builder tables.
- Any public quote/catalog read path is narrow and redacted.
- Service + bundle writes are atomic.
- Bundle children are active, non-deleted, `single`, and not self-referential.
- Builder relation query uses real DB columns and no longer swallows failures silently.
- Filters/category/quick-create/relation/rule payloads are schema-validated.
- `/services` initial data is SSR-hydrated.
- List handles more than 50 services without silent truncation.
- TypeScript, lint, build, perf audit, chunk budget, Supabase dry-run/push, and `verify:services` pass.

## Source Audit Mapping

- Critical 1: Phase 00.
- Critical 2: Phase 00 and Phase 03.
- Critical 3: Phase 01.
- Critical 4: Phase 02.
- Warnings 1, 2, 5, 6, 7: Phase 03.
- Warnings 3, 4: Phase 04.
- Verification and score update: Phase 05.

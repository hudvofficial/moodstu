# Phase 05: Smoke, Final Score, and Report Update
**Status:** Completed
**Priority:** P2
**Target score impact:** 9.6

## Goal

Lock the module score with repeatable verification and a concise final score report.

## Work Items

1. Run full local verification:
   - TypeScript.
   - Lint.
   - Inventory verification script.
   - Perf audit.
   - Production build.
   - Chunk audit.
2. Run Supabase verification:
   - `npx supabase db push --dry-run`
   - `npx supabase db push`
   - `npm run verify:inventory`
3. Manual/browser smoke checklist:
   - Admin opens `/inventory`, list loads with SSR data.
   - Manager opens `/inventory`, list/actions work.
   - Sale/media/viewer direct URL is blocked.
   - Create item auto-generates code.
   - Update item detects stale `updated_at`.
   - Stock in active item works.
   - Stock out active item works and cannot go negative.
   - Discontinued item stock actions are blocked.
   - Delete with stock/history is blocked.
   - Search and low/out-stock filters work.
4. Update:
   - `docs/reports/inventory_audit_2026_04_28.md`
   - Optional `docs/reports/inventory_score_2026_04_28.md`

## Acceptance Criteria

- All verification commands pass.
- Remote anon RPC/table probes pass expected denial contract.
- Score can be honestly raised to 9.6/10.
- Remaining gap to 10/10 is only automated browser E2E with seeded role accounts and production-like stock scenarios.

## Verification

```powershell
npx tsc --noEmit --pretty false
npm run lint
npm run verify:inventory
npm run perf:audit
npm run build
npm run perf:chunks
npx supabase db push --dry-run
npx supabase db push
```

## Notes

- Do not claim 10/10 without automated role-matrix E2E and seeded create/update/delete/stock browser tests.

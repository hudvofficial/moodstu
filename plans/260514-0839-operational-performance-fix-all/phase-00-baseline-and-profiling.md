# Phase 00: Baseline and Profiling
Status: Completed
Priority: P0

## Objective
Capture actionable before-timings for the exact business flows before making fixes.

## Scope
- Contract list open
- Contract detail cold and warm open
- Add task
- Toggle task status
- Add/delete contract event
- Create payment receipt
- Create/edit contract with dress and addon items
- Dashboard realtime refresh after contract/payment changes

## Tasks
1. Run `git status --short` and record unrelated dirty files.
2. Enable `ACTION_PROFILE=1`, `AUTH_CONTEXT_PROFILE=1`, and module-specific profiles where available.
3. Add temporary local-only probe script if needed under `tmp/` to time:
   - `get_contract_detail_v2`
   - `get_contract_list_v2`
   - `contract_stats`
   - fallback detail query group
4. Capture browser-perceived timings for modal actions: start click, first UI state change, final reconciliation.
5. Save findings in this phase file or a dated report under `docs/reports/`.

## Acceptance Criteria
- Baseline has concrete timings, not only subjective notes.
- Each following phase can compare before/after.
- No production code changed in this phase except optional profiling hooks guarded by env vars.

## Result
Added `scripts/perf-operational-probe.mjs` and package script `npm run perf:operational`.

Latest sample on 2026-05-14:
- `contract_detail_rpc`: 466ms.
- `contract_detail_fallback_group`: 692ms.
- `contract_list_rpc`: 214ms.
- `contract_stats_rpc`: 138ms.

Remote probe is read-only and uses `.env.local` Supabase service-role credentials.

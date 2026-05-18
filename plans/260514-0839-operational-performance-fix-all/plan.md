# Plan: Operational Performance Fix All
Created: 2026-05-14 08:39 +07
Status: Completed

## Implementation Notes
Batch 1 completed on 2026-05-14:
- Repaired and deployed `get_contract_detail_v2` so contract detail uses the single RPC again.
- Disabled duplicate mount revalidation for `/contracts/[id]` when SSR fallback data exists.
- Made task add feel immediate with optimistic modal UI and a shorter assigned-task server fast path.
- Removed dashboard realtime broad `router.refresh()`; realtime now invalidates dashboard cache without rerendering the whole route.
- Gates passed: `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run verify:contracts`, `npm run smoke:contracts`, `npm run verify:dashboard`, `npm run perf:audit`.

Batch 2 completed on 2026-05-14:
- Added reusable operational timing probe: `npm run perf:operational`.
- Added smoke coverage for `get_contract_detail_v2` with a real `printing_orders -> labs` nested payload.
- Scoped contract/payment/task/event/printing/dress/lifecycle cache invalidation through named server helpers.
- Patched contract detail realtime for checklist, event, and task payloads when enough row data is present.
- Made add/delete event patch the visible timeline immediately, with background reconciliation.
- Split contract save into core commit, required dress sync only when reservation fingerprint changes, and `after()` background work for Google sync/addon history.
- Moved contract lifecycle Google cleanup/sync into `after()` background tasks.
- Reduced repeated CRM/Moodie/Finance role lookup overhead by routing gates through cached `resolveActiveUserRole`.
- Gates passed: `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm run verify:contracts`, `npm run smoke:contracts`, `npm run verify:dashboard`, `npm run smoke:dashboard`, `npm run perf:audit`, `npm run verify:performance-release`.

Latest operational probe:
- `contract_detail_rpc`: 466ms on sampled remote contract `HĐ-2026-0002`.
- `contract_detail_fallback_group`: 692ms for the 8-query fallback group.
- `contract_list_rpc`: 214ms.
- `contract_stats_rpc`: 138ms.

Residual boundary:
- This plan is complete for contracts-centered operational performance and the shared invalidation/realtime/auth mechanisms it touched.
- It does not certify every independent module-specific workflow, such as standalone POS/inventory or deep CRM bulk operations, beyond the shared overhead and invalidation fixes applied here.

## Goal
Make operational business actions feel fast and predictable across contracts, payments, schedules, tasks, and dashboard refreshes.

Target behavior:
1. Contract detail cold load uses the single detail RPC, not RPC-fail-plus-8-query fallback.
2. Pages with SSR fallback data do not immediately refetch the same payload on mount.
3. Small actions such as task/event updates return quickly and patch UI optimistically.
4. Mutations invalidate only the smallest safe cache scope.
5. Realtime updates patch or refresh section-level data, not full detail/dashboard by default.
6. Heavy post-save automation does not block the user after the core transaction has committed.
7. Auth/action timing is measurable and repeated work is reduced where safe.

## Current Evidence
- `get_contract_detail_v2` currently fails on remote with `column l.name does not exist`.
- Because of that failure, `getContractDetail()` falls back to 8 parallel REST queries.
- Fallback detail timings observed locally against remote: about 996ms cold, then 225ms and 674ms warm.
- `useContractDetail()` uses `fallbackData` but does not disable mount revalidation, unlike list/stats hooks.
- Contract mutations revalidate many cross-module routes after each write.
- Contract detail subscribes to 9 realtime table streams and refreshes full detail for most changes.
- `npm run perf:audit` currently fails on dashboard broad `router.refresh()`.

## Coverage Matrix
| Area | Covered By | Confidence | Notes |
| --- | --- | --- | --- |
| Contract detail load | Phase 01, 02, 08 | High | Direct failing RPC evidence exists. |
| Contract list/stats | Phase 00, 04, 08 | Medium | List RPC appears healthy, but list refresh behavior still needs timing. |
| Task/event operations | Phase 03, 05, 08 | High | Frequent workflow with clear extra refetch/realtime paths. |
| Contract create/edit | Phase 04, 06, 08 | High | Heavy post-save work and broad invalidation are visible in code. |
| Contract payments | Phase 04, 05, 08 | Medium | Atomic RPC exists; remaining risk is invalidation/realtime fanout. |
| Dashboard after writes | Phase 05, 08 | Medium | `perf:audit` flags broad refresh; section correctness must be rechecked. |
| Dresses/rentals affected by contracts | Phase 04, 06, 08 | Medium | Contract-side reservation sync is covered; standalone rentals need baseline before claiming full coverage. |
| Printing affected by contracts | Phase 04, 05, 08 | Medium | Contract-side invalidation covered; printing module action latency not fully audited. |
| Finance operations outside contract payments | Phase 04, 08 | Low | Broad invalidations are visible, but receipts/expenses/debts action timings need a separate baseline. |
| CRM/customer operations | Phase 07, 08 | Low | Auth/action overhead applies globally, but CRM query/action perf was not deeply audited. |
| Inventory/POS operations | Phase 04, 08 | Low | Cross-module invalidation included; operation-specific bottlenecks need separate probes. |
| Auth/action overhead | Phase 07, 08 | Medium | Known fixed overhead exists; optimization must stay conservative. |

## Coverage Boundary
This plan is enough to fix the confirmed P0/P1 performance regressions in the contracts-centered operational flow. It is not enough to certify every module in the app as fast until Phase 00 captures timings for the lower-confidence areas above.

If Phase 00 shows finance, dresses, printing, CRM, or inventory have independent hot spots beyond cache invalidation/auth overhead, create follow-up module-specific phases before marking "fix all" complete.

## Non-Goals
- No visual redesign.
- No broad data model rewrite.
- No weakening permission checks or audit logging.
- No long-lived stale cache for finance/contract operational data.
- No staging unrelated dirty files.

## Dirty Worktree Guard
Known unrelated/unreviewed files at planning time:
- `docs/PROJECT_REVIEW_Contracts_Module_260509.md`
- `plans/260509-1316-optimize-contract-detail/`
- `plans/260509-1406-optimize-checklist-ux/`
- `supabase/migrations/20260509140000_contract_detail_v2_rpc.sql`

Before implementation, run `git status --short` and only edit files owned by the active phase.

## Phases
| Phase | Name | Priority | Outcome |
| --- | --- | --- | --- |
| 00 | Baseline and Profiling | P0 | Capture current timings and prevent regression ambiguity. |
| 01 | Repair Contract Detail RPC | P0 | Detail RPC works, no fallback on healthy DB. |
| 02 | Stop Duplicate Initial Fetches | P0 | SSR fallback data is not fetched again on mount. |
| 03 | Fast Path for Task and Event Actions | P1 | Small operations patch UI optimistically and avoid full refetch chains. |
| 04 | Scope Cache Invalidation | P1 | Revalidate only affected detail/list/finance sections. |
| 05 | Realtime Refresh Budget | P1 | Realtime patches common payloads and batches unavoidable refreshes. |
| 06 | Decouple Heavy Post-Save Work | P1 | Create/edit contract returns after core commit; automation runs best-effort. |
| 07 | Auth and Action Overhead Reduction | P2 | Reuse role context and reduce repeated action auth work where safe. |
| 08 | Release Gate and Monitoring | P0 | Lint/type/build/smoke/perf gates pass with timing notes. |

## Definition of Done
- P0/P1 high-confidence areas have code fixes, deployed migrations, and before/after timing notes.
- Medium-confidence areas have at least one measured business-flow timing and no known broad refresh regression.
- Low-confidence areas are either measured and fixed, or explicitly moved into a follow-up plan with evidence.
- The final report says exactly which modules are certified and which remain residual risk.

## Verification Commands
Minimum gate per implementation batch:
- `npm run lint`
- `npx tsc --noEmit --pretty false`
- `npm run verify:contracts`
- `npm run smoke:contracts`
- `npm run perf:audit`

Performance profiling:
- `ACTION_PROFILE=1`
- `AUTH_CONTEXT_PROFILE=1`
- `DASHBOARD_PROFILE=1`

Target timing checks:
- `get_contract_detail_v2` warm: under 250ms on normal remote warm path.
- `/contracts/[id]` warm client navigation: no duplicate detail action call on mount.
- Task/event mutation visible UI response: under 300ms perceived, with background reconciliation.
- Dashboard realtime burst: one scoped refresh per burst, no broad route refresh unless section-level invalidation cannot apply.

## Phase Files
- `phase-00-baseline-and-profiling.md`
- `phase-01-repair-contract-detail-rpc.md`
- `phase-02-stop-duplicate-initial-fetches.md`
- `phase-03-task-event-fast-path.md`
- `phase-04-scope-cache-invalidation.md`
- `phase-05-realtime-refresh-budget.md`
- `phase-06-decouple-post-save-work.md`
- `phase-07-auth-action-overhead.md`
- `phase-08-release-gate-monitoring.md`

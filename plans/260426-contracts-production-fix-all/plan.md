# Plan: Contracts Production Fix-All
Created: 2026-04-26
Status: In Progress

## Goal
Chốt module `/contracts` đủ mức production-ready trước khi audit các module tiếp theo.

Scope gồm:
- `/contracts`
- `/contracts/create`
- `/contracts/[id]`
- `/contracts/[id]/edit`
- `/contracts/[id]/print`
- `/contracts/[id]/gallery`
- Server actions, SWR cache, realtime, drawer, detail UI, form flow.

Out of scope:
- Calendar, Printing/Labs, Finance module fixes, trừ khi là dependency trực tiếp của contract detail.

## Production Score Target
- Current audit score: 8.0/10
- Target: 9.2+/10
- Current verified score: 9.2/10 pending authenticated manual UI pass

## Phases

| Phase | Name | Status | Risk | Files |
| --- | --- | --- | --- | --- |
| 01 | Detail Query Error Hardening | Complete | High | `app/actions/contract-queries.ts` |
| 02 | Create/Edit Post-Save Consistency | Complete | High | `app/actions/contract-mutations.ts`, form warning toast |
| 03 | Realtime + SWR Invalidation Control | Complete | Medium | `components/contracts/contracts-list-client.tsx`, `lib/hooks/use-contracts.ts` |
| 04 | Responsive UI Polish Pass | In Progress | Medium | `components/contracts/**`, detail/list/drawer |
| 05 | Plan/Docs Sync | Pending | Low | `plans/260424-1852-contract-detail-instant/**`, this plan |
| 06 | Production Verification Gate | In Progress | High | build, browser, route checklist |
| 07 | Task/Event Business Flow Hardening | Complete | High | `app/actions/work-task-actions.ts`, `components/contracts/detail/event-task-modal.tsx`, `components/contracts/contracts-table.tsx` |

## Phase 01: Detail Query Error Hardening
Problem:
- `getContractDetail()` only checks `contractResult.error`.
- `paymentsResult`, `reservationsResult`, `printOrdersResult`, `auditLogsResult`, `paymentPlansResult` can fail and silently render empty arrays.
- `getContractDrawerExtra()` has the same risk pattern.

Fix:
- Add explicit error checks after `Promise.all`.
- Return actionable errors with source labels.
- Keep optional/non-critical data optional only if explicitly intended.

Acceptance:
- A failed payments/query result surfaces an error instead of showing empty data.
- Detail page shows existing error state instead of infinite skeleton.
- TypeScript passes.

## Phase 02: Create/Edit Post-Save Consistency
Problem:
- `save_contract_atomic` commits core contract first.
- Post-save tasks run after commit:
  - dress reservations
  - event/checklist/task automation
  - Google sync
  - addon history
- If required post-save work fails, user sees error while contract may already exist.

Fix:
- Classify post-save tasks:
  - Required: dress reservation consistency, internal events/tasks/checklists if business-critical.
  - Best-effort: Google sync, addon history.
- Required failures should be handled transactionally or with a clear recovery state.
- Best-effort failures should not fail the contract save; log/surface soft warning if needed.

Acceptance:
- Create/edit cannot leave an ambiguous "failed but saved" user state.
- Google sync failure does not block contract creation.
- Dress conflicts remain enforced before commit.

## Phase 03: Realtime + SWR Invalidation Control
Problem:
- Contract list subscribes globally to multiple tables and revalidates broad caches.
- Busy usage can cause refresh storms and unnecessary list/stat reloads.

Fix:
- Debounce list-level realtime refresh.
- Narrow invalidation:
  - list changes revalidate contract list keys.
  - detail-specific changes revalidate detail only when relevant.
  - stats refresh can be slower/deduped.
- Keep optimistic detail mutations from echo-refreshing immediately.

Acceptance:
- Realtime still updates list/detail after external changes.
- Local task/status changes do not flicker or repeatedly reload.
- No stale drawer/detail after common mutations.

## Phase 04: Responsive UI Polish Pass
Problem:
- Event timeline card grid recently regressed on real viewport.
- Need verify list, drawer, detail, form on desktop/tablet/mobile before production.

Fix:
- Audit `/contracts` list:
  - desktop table
  - mobile card list
  - filters
  - pagination/footer count
- Audit drawer:
  - header actions
  - lazy-loaded event/checklist/task sections
  - detail navigation prefetch
- Audit detail:
  - event timeline grid
  - workflow stepper
  - financial dashboard
  - quick actions
  - mobile tab nav/bottom bar
- Audit create/edit forms:
  - date order validation
  - dress selection
  - payment section
  - submit/draft/loading/error states

Acceptance:
- No overlapping badges/text at 375px, tablet, desktop.
- Event timeline keeps same-row layout when container has enough width.
- Buttons and cards do not jump/resize unexpectedly.

## Phase 05: Plan/Docs Sync
Problem:
- `plans/260424-1852-contract-detail-instant/plan.md` is marked complete, but phase files still contain unchecked tasks.

Fix:
- Update phase checklists to match actual implementation.
- Add verification notes and remaining known risks.

Acceptance:
- `/contracts` plan state is not misleading.
- Future audit can tell what is done vs pending.

## Phase 06: Production Verification Gate
Commands:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

Browser checks:
- `/contracts`
- `/contracts?status=dang_thuc_hien`
- `/contracts/create`
- `/contracts/[id]`
- `/contracts/[id]/edit`
- `/contracts/[id]/print`
- `/contracts/[id]/gallery`

Manual scenarios:
- Open list, search/filter/sort/page.
- Open drawer, then navigate to detail.
- Cold-load detail URL directly.
- Add/update event task status.
- Add payment.
- Create contract draft.
- Edit existing contract with stale `expectedUpdatedAt`.
- Cancel/reactivate contract.

Final acceptance:
- TypeScript pass.
- Build pass.
- No known critical/high findings.
- Production score >= 9.2/10.

## Phase 07: Task/Event Business Flow Hardening
Problem:
- Event status recalculation included cancelled tasks and ignored Supabase errors.
- Task modal optimistic status update did not rollback if the server action promise rejected.
- Task/employee load failures could silently render partial empty state.

Fix:
- Skip cancelled events and cancelled tasks when recalculating active event progress.
- Check and surface errors while reading tasks/events and updating event status.
- Roll back optimistic task status updates on both returned failure and rejected promise.
- Surface task/employee load failures with a toast.

Acceptance:
- Cancelled tasks do not incorrectly block or complete active event status.
- Failed task status update cannot leave the detail UI in a false optimistic state.
- TypeScript and production build pass.

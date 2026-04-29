# Plan: Contracts Audit Fix and Max Optimization
**Created:** 2026-04-29
**Status:** Completed
**Audit source:** `docs/reports/contracts_audit_2026_04_29.md`
**Initial score:** 7.0/10
**Target score:** 9.8/10
**Final score:** 9.8/10
**Stretch score:** 9.9/10 after seeded cross-role browser E2E is automated

## Overview

Fix `/contracts` in risk order:

1. Restore reliable `/contracts?q=...` search without unsafe PostgREST OR logic.
2. Lock public gallery mutations to verified gallery access and remove plaintext gallery passwords.
3. Harden contract write/destructive permissions and server-side data invariants.
4. Correct detail realtime so payment changes refresh from the `payments` table.
5. Reduce list/detail cold-load cost with DB-backed search, aggregates, indexes, and lazy detail sections.
6. Clean lint/stability drift and prove the final score with repeatable verification.

## Phases

| Phase | Name | Status | Priority | Target Score Impact |
|:-----:|------|:------:|:--------:|:-------------------:|
| 00 | Search and List Correctness | Completed | P0 | 7.0 -> 7.6 |
| 01 | Public Gallery Access Security | Completed | P0 | 7.6 -> 8.5 |
| 02 | Contract Write Gates and Data Integrity | Completed | P0 | 8.5 -> 9.0 |
| 03 | Realtime, SWR, and Payment Freshness | Completed | P1 | 9.0 -> 9.2 |
| 04 | Time-Load, Query Shape, and Index Performance | Completed | P1 | 9.2 -> 9.5 |
| 05 | Stability Cleanup and UX Consistency | Completed | P2 | 9.5 -> 9.6 |
| 06 | Verification, Smoke, and Final Score | Completed | P2 | 9.6 -> 9.8 |

## Dependency Order

1. Phase 00 lands first because authenticated search can currently fail the contracts list.
2. Phase 01 follows immediately because public gallery writes are the highest security exposure.
3. Phase 02 depends on the security posture decision so contract actions and gallery-adjacent actions share explicit role boundaries.
4. Phase 03 can land after data integrity because realtime should refresh stable canonical data.
5. Phase 04 optimizes after correctness contracts are stable, otherwise performance work can lock in the wrong payload shape.
6. Phase 05 removes drift after the behavioral work is complete.
7. Phase 06 records proof and determines the final score.

## Global Guardrails

- Do not revert unrelated dirty worktree changes.
- Treat contracts, payments, customer identity, gallery selection, and client notes as sensitive operational data.
- Route guards are not enough. Every server action that uses the admin client must enforce a contract-specific permission boundary or a verified public-gallery access boundary.
- Keep `sale` permissions explicit. Suggested policy:
  - `admin`, `manager`: full contract read/write/status/destructive access.
  - `sale`: contract read/create/update and payment recording if business policy allows it.
  - `sale`: no delete/cancel/reactivate/destructive lifecycle access unless explicitly approved.
  - `media`, `viewer`, unauthenticated users: no internal `/contracts` access.
- Public gallery visitors must prove access to a specific gallery before mutating selection or notes.
- Do not persist raw gallery passwords in localStorage, cookies, database rows, logs, or action responses.
- Search fixes must support contract code, customer name, customer code, phone, bride name, and groom name without PostgREST logic parse failures.
- List performance fixes must preserve progress and missing-info badges.
- Detail performance fixes must not hide payment, checklist, gallery, or task query failures as empty successful states.

## Verification Baseline

Run after implementation phases when feasible:

```powershell
npx tsc --noEmit --pretty false
npx eslint "app/(protected)/contracts" app/actions/contract-queries.ts app/actions/contract-mutations.ts app/actions/contract-lifecycle.ts app/actions/contract-event-actions.ts app/actions/payment-actions.ts app/actions/work-task-actions.ts app/actions/checklist-actions.ts components/contracts components/gallery lib/hooks/use-contracts.ts lib/hooks/use-contract-notes.ts hooks/useContractFilters.ts lib/validations/contract.schema.ts types/contract.ts types/contract-form.ts types/contract-constants.ts
npm run perf:audit
```

Run after DB/security phases:

```powershell
npx supabase db push --dry-run
npx supabase db push
npm run verify:contracts
```

Run before final score:

```powershell
npm run build
npm run perf:chunks
npm run smoke:contracts
```

Targeted checks:

```powershell
rg -n "contract_list|contract_search|withContract|requireContract|gallery_access|password_hash|payments" app lib components scripts supabase
rg -n "customers.full_name.ilike|useRealtime\\(\"receipts\"|toggleImageSelection\\(|updateClientNote\\(|localStorage.*gallery|event_date: isOnSet|deadline: !isOnSet" app components lib
```

## Completion Definition

- `/contracts?q=...` never emits the observed PostgREST logic parse error.
- Contract search returns expected rows for contract code and customer fields.
- Public gallery selection and client-note mutations require `accessUrl` plus valid signed access proof and verify image membership in that gallery.
- Gallery passwords are stored as hashes, existing plaintext values are migrated or invalidated with a documented reset path, and raw passwords are not persisted client-side.
- Contract destructive/status actions use explicit role gates.
- Server-side contract validation blocks invalid date order.
- Work-task mutations prove `eventId` belongs to `contractId` before insert/update/delete/status changes.
- Manual off-set/post-production events store `deadline` without creating a fake `event_date`.
- Contract detail subscribes to `payments`, not `receipts`, and external payment changes refresh the detail payment summary/history.
- List first page avoids full task/checklist embeds or replaces them with aggregate badge data.
- Detail cold load is split into above-the-fold data plus lazy/parallel secondary sections or equivalent optimized RPCs.
- Scoped lint warnings in the audit are resolved or explicitly documented as safe.
- TypeScript, scoped lint, perf audit, build, chunk budget, DB dry-run/push, `verify:contracts`, and `smoke:contracts` pass.
- Final report records before/after score, exact commands, remote timing, residual risk, and no open P0/P1 findings.

## Source Audit Mapping

- Critical 1, broken `/contracts` search: Phase 00 and Phase 04.
- Critical 2, public gallery mutation not bound to access: Phase 01 and Phase 06.
- Critical 3, detail realtime listens to `receipts`: Phase 03.
- Warning 1, plaintext gallery passwords: Phase 01.
- Warning 2, manual event date/deadline semantics: Phase 02.
- Warning 3, missing server date-order validation: Phase 02.
- Warning 4, work-task ownership gaps: Phase 02.
- Warning 5, heavy detail cold load: Phase 04.
- Warning 6, list task/checklist embeds and estimated count: Phase 04.
- Warning 7, broad destructive/status access: Phase 02.
- Warning 8, scoped lint stability warnings: Phase 05.
- Final score and proof: Phase 06.

## Score Rationale

Final score: 9.8/10.

The jump from 7.0 to 9.0 comes from closing the three high-risk correctness/security gaps plus server-side invariants. The move from 9.0 to 9.6 comes from realtime correctness, faster cold paths, narrower payloads, and cleanup of stability warnings. The final 9.8 is backed by repeatable security verification and seeded smoke coverage, especially for public gallery mutation abuse and remote DB guardrails. A 9.9 should wait for seeded cross-role browser E2E that can be rerun against a production-like Supabase project.

## 2026-04-29 Implementation Evidence

- Fixed `/contracts?q=...` by replacing embedded customer OR search with a safe customer-id subquery.
- Split list badge data out of the main contract list embed and fetches page-local task/checklist fields separately.
- Added `lib/gallery-access.ts` signed public-gallery access proof helpers.
- Added public gallery mutation binding to `access_url` plus signed token and image membership checks.
- Added `supabase/migrations/20260429170000_contracts_audit_fix_max.sql` for gallery password hashes, password RPCs, access-version invalidation, indexes, and contract date-order guardrail.
- Replaced raw password localStorage persistence with sessionStorage signed access proof.
- Added contract write/destructive permission helpers and applied them to contract lifecycle, status, event, task, and checklist writes.
- Added server-side date-order validation to `contractSubmissionSchema`.
- Fixed manual off-set event semantics so off-set manual events write `deadline` and `event_date = null`.
- Hardened work-task mutations with event/contract ownership checks.
- Changed contract detail realtime from `receipts` to `payments`.
- Cleared scoped lint warnings in the audited contract/gallery files.
- Added `scripts/verify-contracts.mjs` and `npm run verify:contracts`.
- Added `scripts/smoke-contracts.mjs` and `npm run smoke:contracts`.
- Added `supabase/migrations/20260429173500_contracts_gallery_rls_hardening.sql` after smoke found anon direct writes to `gallery_images`; direct anon/authenticated table writes are now denied by RLS and public writes go through signed server actions.
- Split contract detail events/tasks/checklists out of the base embedded contract row while preserving the returned client shape.
- Remote DB migrations applied and local/remote migration list is synced through `20260429173500`.
- Verification passed: targeted ESLint, `npx tsc --noEmit --pretty false`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`, `npm run verify:contracts`, `npm run smoke:contracts`, scoped `git diff --check`.
- Chunk budget passed after production build: `/contracts` 52.6KB, `/contracts/[id]` 72.5KB, `/contracts/[id]/gallery` 68.5KB, no app route chunk over 80KB.

Remaining:

- Seeded cross-role browser E2E is still a stretch item for 9.9/10.

# Contracts Module Audit - 2026-04-29

Scope: `/contracts` list, detail, create/edit, print, contract events, work tasks, payments, checklists, gallery/public selection flow, server actions, filters, realtime/SWR behavior, Supabase query shape, build health, and performance.

## Remediation Status - 2026-04-29

- Post-fix score: 9.8/10.
- Status: all audit P0/P1 findings are remediated and remote migrations are applied.
- Remote migrations applied: `20260429142000_settings_security_hardening.sql`, `20260429170000_contracts_audit_fix_max.sql`, `20260429173500_contracts_gallery_rls_hardening.sql`.
- Public gallery security is now server-action gated with signed access proof, hashed passwords, access-version invalidation, and DB RLS write denial for anon/authenticated direct table access.
- `/contracts?q=...` no longer uses embedded `customers.full_name` inside a PostgREST OR; customer-field search is resolved through a safe customer-id subquery.
- Contract detail realtime now listens to `payments`, and detail cold load no longer embeds events/tasks/checklists into the base contract row.
- Contract write/destructive actions now use explicit write/destructive gates; server-side date order, event semantics, and work-task ownership checks are enforced.
- Remaining score ceiling: 9.9 requires seeded cross-role browser E2E for manager/sale/viewer/public UI paths.

### Completion Evidence

Passed:

```powershell
npx supabase db push
npx supabase migration list
npm run verify:contracts
npm run smoke:contracts
npx eslint app/actions/contract-queries.ts app/actions/gallery-actions.ts app/actions/contract-mutations.ts app/actions/contract-lifecycle.ts app/actions/contract-event-actions.ts app/actions/work-task-actions.ts app/actions/checklist-actions.ts components/gallery/password-gate.tsx components/gallery/gallery-page-client.tsx components/gallery/public-gallery-client.tsx components/contracts/detail/contract-detail-client.tsx components/contracts/detail/checklist-manager.tsx components/contracts/gallery/gallery-image-grid.tsx components/contracts/form/hooks/useContractForm.ts components/contracts/gallery/use-gallery-data.ts lib/hooks/use-contracts.ts lib/auth_utils.ts lib/validations/contract.schema.ts scripts/verify-contracts.mjs scripts/smoke-contracts.mjs
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
git diff --check -- <contracts audit files>
```

Chunk evidence after production build:

- `/contracts`: 52.6KB.
- `/contracts/[id]`: 72.5KB.
- `/contracts/[id]/gallery`: 68.5KB.
- App route chunks over 80KB: none.

`git diff --check` returned no whitespace errors; it only reported existing LF/CRLF normalization warnings on touched files.

The original audit summary below is retained for traceability.

## Final Summary

- Score: 7.0/10.
- Production recommendation: usable for internal operations, but not yet "done 100%" because search, public gallery mutation security, realtime correctness, and data integrity gaps remain.
- Critical/high issues: 3.
- Warnings: 8.
- Positive findings: 9.
- Build health: TypeScript, scoped lint, and perf audit pass.
- Remote timing observed with service-role reads:
  - Contracts list first page: 1604ms, 8 rows.
  - Contracts stats RPC: 218ms.
  - Contract detail embedded contract query: 2879ms, 1 row.
  - Contracts search by code/customer: PostgREST logic parse error.

## Score Breakdown

| Area | Score |
|---|---:|
| Business logic | 7.2/10 |
| Data integrity | 6.8/10 |
| Time-load/performance | 6.7/10 |
| Security/privacy | 6.2/10 |
| UX consistency | 7.6/10 |
| Maintainability | 7.7/10 |
| Overall | 7.0/10 |

## Critical / High Issues

1. `/contracts` search is broken for `q`/search terms
   - File: `app/actions/contract-queries.ts:121-125`.
   - Current query: `contract_code.ilike...` OR `customers.full_name.ilike...`.
   - Observed result: PostgREST fails with `failed to parse logic tree`.
   - Impact: the global/header search now reaches the list again, but any logged-in `/contracts?q=...` can fail instead of returning filtered contracts.
   - Required fix: either use a search RPC/view that joins customer fields, or split the customer search into a safe subquery and filter contracts by `customer_id`.

2. Public gallery selection/note mutations are not bound to the gallery access context
   - Files:
     - `components/gallery/public-gallery-client.tsx:125` calls `toggleImageSelection(imageId, selected)`.
     - `components/gallery/public-gallery-client.tsx:162` calls `updateClientNote(imageId, note)`.
     - `app/actions/gallery-actions.ts:441-454` updates any `gallery_images` row by image ID.
     - `app/actions/gallery-actions.ts:467-478` updates any `gallery_images` row by image ID.
   - Impact: a public visitor with a leaked/guessed image UUID can mutate selection or notes for an image without proving they have access to that gallery/password.
   - Required fix: pass and verify `accessUrl` or a signed gallery access token, ensure image belongs to that gallery, enforce shared status/deadline/password/session before mutation.

3. Contract detail realtime listens to `receipts`, but payments are stored in `payments`
   - Files:
     - `components/contracts/detail/contract-detail-client.tsx:219`.
     - `app/actions/contract-queries.ts:323-329`.
     - `app/actions/payment-actions.ts` writes to `payments`.
   - Impact: multi-user payment changes can miss realtime refresh on contract detail, leaving paid/remaining/payment history stale until another refresh path runs.
   - Required fix: subscribe to `payments` for `contract_id=eq.${id}` and remove or justify the `receipts` subscription.

## Warnings

1. Gallery passwords are stored and compared as plaintext
   - Files:
     - `app/actions/gallery-actions.ts:330-333`.
     - `app/actions/gallery-actions.ts:420-427`.
   - Impact: DB exposure reveals client gallery passwords; password verification also returns the raw access state to the browser flow.
   - Required fix: store password hashes and issue short-lived signed access proof after verification. Do not persist raw gallery passwords in localStorage.

2. Manual non-on-set events store both `event_date` and `deadline`
   - File: `app/actions/contract-event-actions.ts:377-378`.
   - Intended model: on-set events use `event_date`; off-set/post-production events use `deadline`.
   - Impact: post-production/manual tasks may appear as events "today" and skew calendar/timeline logic.

3. Server-side contract validation misses date-order rules
   - Server schema: `lib/validations/contract.schema.ts:66-68`.
   - Client-only check: `components/contracts/form/hooks/useContractForm.ts:143-154`.
   - Impact: direct server action calls or stale clients can persist invalid date order even though the form blocks it.

4. Work-task mutations do not verify event/contract ownership
   - Files:
     - `app/actions/work-task-actions.ts:162-168`.
     - `app/actions/work-task-actions.ts:187`.
     - `app/actions/work-task-actions.ts:207`.
   - Impact: a malicious/stale client can insert a task with mismatched `eventId`/`contractId` or update task/event status across unrelated records because actions use admin client after a broad module access check.

5. Detail cold load remains heavy
   - File: `app/actions/contract-queries.ts:267-364`.
   - Observed embedded contract part alone: 2879ms.
   - Impact: direct URL/detail reload waits on a large fan-out query after client hydration. Existing SWR/prefetch helps repeat navigation, but cold path is still slow.

6. List query embeds task/checklist data and uses estimated count
   - File: `app/actions/contract-queries.ts:95-110`.
   - Impact: first page observed at 1604ms for 8 rows. `count: "estimated"` is faster, but pagination totals can become approximate as data grows.

7. Contract destructive/status actions only require broad contract-module access
   - Files:
     - `lib/auth_utils.ts:697`.
     - `types/roles.ts:40`.
     - `app/actions/contract-lifecycle.ts:80,115,149`.
   - Impact: `sale` has module access, so business policy must explicitly confirm whether sales should cancel/delete/reactivate/update status. If not, add separate write/destructive gates.

8. Scoped lint passes but contract module still has stability warnings
   - Examples:
     - `components/contracts/detail/checklist-manager.tsx`: unused import.
     - `components/contracts/detail/contract-detail-client.tsx`: array dependencies recreated per render.
     - `components/contracts/form/hooks/useContractForm.ts`: missing hook dependency.
     - `components/contracts/gallery/gallery-image-grid.tsx`: unused React imports.
   - Impact: no current build break, but it increases drift risk in an already realtime-heavy module.

## Positive Findings

- `/contracts` has a server route guard through `app/(protected)/contracts/layout.tsx:10-13`.
- Core create/update path uses Zod validation and an atomic `save_contract_atomic` RPC.
- Contract detail uses SWR fallback data and optimistic/cache mutation paths to reduce repeat loads.
- Stats are served by RPC and observed fast at 218ms.
- List/detail filters sanitize search input before query construction.
- Soft-delete and status lifecycle patterns are present.
- Payment creation performs amount/payment-method validation and path revalidation.
- Gallery upload path separates raw/selectable assets and uses server actions.
- TypeScript and scoped lint currently pass.

## Verification Commands Run

```powershell
npx eslint "app/(protected)/contracts" app/actions/contract-queries.ts app/actions/contract-mutations.ts app/actions/contract-lifecycle.ts app/actions/contract-event-actions.ts app/actions/payment-actions.ts app/actions/work-task-actions.ts app/actions/checklist-actions.ts components/contracts lib/hooks/use-contracts.ts lib/hooks/use-contract-notes.ts hooks/useContractFilters.ts lib/validations/contract.schema.ts types/contract.ts types/contract-form.ts types/contract-constants.ts
npx tsc --noEmit --pretty false
npm run perf:audit
git diff --check -- docs/reports/contracts_audit_2026_04_29.md
```

Results:

- Scoped ESLint: passed with 0 errors and 13 warnings.
- TypeScript: passed.
- Performance audit: passed.
- Report-file whitespace check: passed.
- Full-worktree `git diff --check` was not clean because the existing dirty worktree has many blank-line-at-EOF issues across route files; those pre-existing/unrelated files were not edited in this audit pass.

## Suggested Fix Phases

1. Phase 00 - Correctness regression
   - Fix `/contracts?q=...` search by moving customer-name search into a safe RPC/view/subquery.
   - Add a focused smoke/check for `/contracts` search.

2. Phase 01 - Security hardening
   - Bind public gallery selection/note mutations to verified gallery access.
   - Hash gallery passwords and replace local raw-password persistence with signed access proof.

3. Phase 02 - Realtime and data integrity
   - Change detail realtime from `receipts` to `payments`.
   - Add server-side date-order validation.
   - Verify `eventId` belongs to `contractId` for task mutations.
   - Fix manual off-set event date/deadline semantics.

4. Phase 03 - Load-time optimization
   - Split list query so first page does not embed all task/checklist rows.
   - Consider detail hydration with smaller above-the-fold payload plus lazy tabs.
   - Decide whether estimated count is acceptable or replace it with an exact/cached count contract.

# /contracts Verification And Regression Test Plan

Scope: verify the /contracts module as a normal signed-in employee would use it: list/search/filter, create/edit/cancel/print/detail, event timeline, task assignment, checklist, payments/payment plans, print orders, dress reservations, gallery links, realtime/optimistic updates, and mobile/detail performance.

## Findings From Inspection

- Package scripts: `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run test:e2e:contracts`, `npm run test:e2e:contracts-perf`, `npm run verify:contracts`, `npm run smoke:contracts`, `npm run build`, `npm run lint`.
- Existing contract unit tests: `tests/unit/contract-logic.test.ts` covers payment-plan normalization, labels, service/status helpers, form conditionals, and contract validation; `tests/unit/contract-perf.test.ts` covers optimistic mutation behavior and React Compiler opt-out guardrails.
- Existing contract E2E tests: `tests/e2e/contract-operational.spec.ts` seeds Supabase, logs in, opens a contract detail page, adds/deletes an event, and adds a task without full-page reload. `tests/e2e/contract-perf.spec.ts` checks detail-page hook errors, optimistic event add/delete timing, and avoids redundant fetches when opening an event modal. Additional specs exist for mobile detail perf and nav jank.
- Verification scripts: `scripts/verify-contracts.mjs` has local source guardrails and optional Supabase RPC checks when env is present. `scripts/smoke-contracts.mjs` requires Supabase service-role env and seeds contract/customer/lab/printing/gallery/payment data, validates RPC/search/security/date guardrails, then cleans up.
- Relevant app surface: `app/(protected)/contracts/**`, `components/contracts/**`, `app/actions/contract-*.ts`, `lib/contracts/payment-plans.ts`, `lib/hooks/use-contract-queries.ts`, `lib/validations/contract.schema.ts`, and `app/api/contracts/[id]/prefetch/route.ts`.
- Playwright config starts local Next dev server on `http://127.0.0.1:3100` unless `PLAYWRIGHT_BASE_URL` is set or `PLAYWRIGHT_SKIP_WEB_SERVER=1`. It loads `.env.local`.

## Priority 0: Fast Local Automated Checks, No External Services

Run these first on every contracts change because they do not need live Supabase/Vercel and catch most static, logic, and build regressions.

1. Contract unit logic
   - Command: `npm test -- tests/unit/contract-logic.test.ts`
   - Verifies: labels/constants, payment plans, form conditional logic, validation behavior.
   - Expected: all tests pass with no snapshot/update prompts.

2. Contract performance/guard unit checks
   - Command: `npm test -- tests/unit/contract-perf.test.ts`
   - Verifies: optimistic mutation ordering/rollback, React Compiler guard assumptions, known `use no memo` opt-outs.
   - Expected: all tests pass; any new `use no memo` file requires explicit review and test update.

3. Static contracts guardrails
   - Command: `npm run verify:contracts`
   - Local-only mode: if Supabase env vars are absent, this still checks source-level guardrails and prints a warning that remote Supabase checks were skipped.
   - Verifies: safe customer search shape, gallery public access/password handling markers, payments realtime subscription, date-order validation marker, task event/contract ownership guard, destructive access gate.
   - Expected: `Contracts verification passed.` If env vars are absent, warning about skipped remote checks is acceptable for local-only verification.

4. Type/build safety
   - Command: `npm run build`
   - Verifies: Next app compiles protected contracts routes, dynamic imports, server actions, API routes, and TypeScript/SWC integration.
   - Expected: build succeeds. Treat any /contracts route chunk/render error as release-blocking.

5. Lint safety
   - Command: `npm run lint`
   - Verifies: ESLint/Next lint rules across app and components.
   - Expected: no new lint errors. Existing unrelated warnings should be triaged separately, not hidden by contracts work.

## Priority 1: Automated Checks With Supabase Env/Services

These need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and usually `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Run against a disposable/staging Supabase project, not production, because tests seed and delete data.

1. Contracts smoke seed/RPC/security path
   - Command: `npm run smoke:contracts`
   - Verifies: create customer/contract/lab/printing order; `get_contract_detail_v2`; DB date-order guard; safe contract/customer search; gallery password hashing and public write boundary; payment insert/query path; cleanup.
   - Expected: `Contracts seeded smoke passed.` Confirm no `smoke-contracts-*` rows remain if interrupted.

2. Full contracts verification with remote checks
   - Command: `npm run verify:contracts`
   - Verifies: all local source guardrails plus gallery password RPC reachability and anon denial for `verify_gallery_password`/`set_gallery_password`.
   - Expected: `Contracts verification passed.` No permission-denied error for service-role RPC calls; anon RPC calls must be denied.

3. Operational employee E2E
   - Command: `npm run test:e2e:contracts`
   - Verifies: browser login, normal employee/admin navigation to contract detail, visible seeded event, add event, delete event, open event, add task, no full-page navigation away from detail.
   - Expected: passes in Chromium; add/delete/task interactions below the 15s dev interaction budget.

4. Contract perf E2E
   - Command: `npm run test:e2e:contracts-perf`
   - Verifies: no `Rendered more hooks` console error on detail, optimistic event add/delete timing, no redundant detail refetch when opening event modal.
   - Expected: passes in Chromium; console perf logs are informational.

5. Additional contract E2E specs not wired to package shortcuts
   - Command: `npx playwright test tests/e2e/contract-mobile-detail-perf.spec.ts tests/e2e/contract-nav-jank.spec.ts`
   - Verifies: mobile detail responsiveness/perf and navigation jank regressions.
   - Expected: passes or produces actionable Playwright trace/screenshot/video artifacts.

## Priority 2: Manual Normal Employee Regression Checklist

Run on local dev with staging data or on Vercel preview. Use a real non-service employee account with the same role/permissions expected in production. Avoid admin-only assumptions unless specifically validating admin boundaries.

1. Access and navigation
   - Log in as employee and open `/contracts`; confirm unauthorized users cannot access protected route.
   - Use sidebar/header/back navigation between dashboard, contracts list, contract detail, edit, gallery, and print pages.
   - Confirm loading/error states are understandable if the network is slow or a contract id is missing.

2. List, search, filters, and pagination
   - Search by contract code, customer full name, phone, bride/groom names, and strings containing `%`, `_`, commas, or parentheses.
   - Filter by status tabs, service type, date/time filters, advanced date range, and sort newest/oldest/amount asc/desc.
   - Verify stats counts and pagination update consistently with filters and do not show stale data after pull-to-refresh.

3. Create/edit contract flow
   - Create a standard studio/wedding contract with customer fields, couple fields, service items/addons, work date, wedding date, delivery date, payments/payment plan, and notes.
   - Validate required fields, invalid dates, negative/invalid money, missing customer, and duplicate/edge service items.
   - Edit the contract and confirm detail/list values update without stale cached data.

4. Detail page core work
   - Confirm summary, customer info, service details, workflow stepper, financial summary, checklist, timeline, notes, quick actions, and mobile bottom bar render correctly.
   - Add an event with a manual date; add an off-set/manual event if applicable; delete it; verify no fake `today` date appears for non-date events.
   - Open an event, assign a task to an employee, change task status, and confirm task remains tied to the current contract/event.
   - Toggle checklist items and confirm progress/list summary updates.

5. Payments, print orders, dress reservations, files/gallery
   - Add a payment receipt and verify paid/remaining/payment status calculations and realtime/list refresh.
   - Add a print order with lab data; verify status/payment state and print-order display.
   - Add and remove dress reservations; verify availability/conflict messaging if a dress is already reserved.
   - Open gallery/drive/link actions; verify password/share behavior only on staging-safe galleries.

6. Destructive/status actions
   - Try cancel/delete/destructive actions with a normal employee role; confirm allowed actions work and restricted actions are blocked with a clear message.
   - Confirm cancellation banner/status appears, edit restrictions are respected, and audit-sensitive actions do not silently fail.

7. Responsive and offline-ish behavior
   - Repeat list/detail/create basics on mobile viewport and tablet width.
   - Test slow 3G/network throttling: skeletons appear, buttons do not double-submit, optimistic changes rollback on failure.
   - Refresh the detail page after mutations to confirm persisted database state matches UI.

## Priority 3: Vercel/Production-Like Verification

Use a Vercel preview deployment connected to staging Supabase before production release.

1. Preview smoke
   - Command: `$env:PLAYWRIGHT_BASE_URL='https://<preview-url>'; $env:PLAYWRIGHT_SKIP_WEB_SERVER='1'; npm run test:e2e:contracts`
   - Then: `$env:PLAYWRIGHT_BASE_URL='https://<preview-url>'; $env:PLAYWRIGHT_SKIP_WEB_SERVER='1'; npm run test:e2e:contracts-perf`
   - Verifies: deployed auth/cookies/server actions, protected routes, and browser behavior match local.

2. Vercel build/runtime checks
   - Confirm Vercel build succeeds with no route compilation errors for `app/(protected)/contracts/**` or `app/api/contracts/**`.
   - Open Vercel function logs while exercising create/detail/mutations; verify no server-action exceptions, auth failures, or Supabase permission errors.

3. Supabase staging data checks
   - Confirm migrations/RPCs exist: especially `get_contract_detail_v2`, gallery password RPCs, date-order constraint, RLS policies, realtime publication for `contracts`, `contract_events`, `work_tasks`, `contract_checklists`, and `payments` as needed by the UI.
   - Run `npm run smoke:contracts` against staging env from a controlled machine, not production.

## Release Gate Recommendation

- Minimum local gate: Priority 0 all green.
- Minimum staging gate: Priority 1 smoke + operational E2E green, plus manual checks for the exact changed area.
- Full release gate for broad /contracts changes: Priority 0, Priority 1, core Priority 2 manual checklist, and Vercel preview verification.
- Never run service-role smoke/E2E seed scripts against production unless explicitly approved and a cleanup plan is documented.

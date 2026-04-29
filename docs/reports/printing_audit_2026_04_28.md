# Printing Module Audit - 2026-04-28

Scope: `/printing`, `/printing/labs`, printing/lab server actions, contract-detail printing entry points, finance lab-debt integration, validation schemas, time-load/performance, and security boundaries.

## Summary
- Critical issues: 4
- Warnings: 9
- Suggestions: 5
- Final score after remediation: 9.7/10.
- Verification: `npx tsc --noEmit --pretty false`, `npm run lint`, `npm run verify:printing`, `npm run build`, `npm run perf:audit`, and `npm run perf:chunks` passed.
- Current chunk status after fresh build: `/printing` 40.5KB, `/printing/labs` 47.6KB. No app route chunk over 80KB.
- Release recommendation after remediation: Printing/Labs is production-ready for the audited scope. Remaining score gap is browser E2E/manual role smoke coverage, not a known module defect.

## Implementation Follow-up

The first fix pass has been implemented in this branch:

- Added `/printing` route/action access gates with `withPrintingAccess`.
- Added atomic RPCs/migration for printing order create/update/delete, expense sync, printing stats, lab debt summary, lab overview, and lab payment allocation.
- Added filter validation/clamping and moved heavy lab/list stats to SQL-backed RPCs.
- Completed Phase 05 cleanup: clarified `da_nhan` as received from lab, lazy-loaded write-heavy printing/lab UI, removed dress mutation bridging from printing actions, and documented ownership/integrity queries.
- Added `printing_integrity_report()` plus `npm run verify:printing` to verify remote RPC contracts, anon execution denial, and zero accounting/allocation drift.
- Repaired legacy remote data drift found by verification: missing linked printing expenses and paid orders without allocation are now clean.
- Verification after implementation: `npx tsc --noEmit --pretty false`, `npm run lint`, `npm run verify:printing`, `npm run perf:audit`, `npm run build`, `npm run perf:chunks`, and `npx supabase db push` passed. A follow-up `npx supabase db push --dry-run` reported the remote database is up to date.

## Critical Issues

1. Printing routes and actions bypass module permission while using the admin Supabase client
   - Files: `app/(protected)/layout.tsx:11`, `types/roles.ts:18`, `types/roles.ts:34`, `types/roles.ts:40`, `types/roles.ts:41`, `types/roles.ts:42`, `app/(protected)/printing/page.tsx:42`, `app/(protected)/printing/labs/page.tsx:12`, `lib/auth_utils.ts:268`, `lib/auth_utils.ts:278`, `app/actions/printing-queries.ts:137`, `app/actions/printing-queries.ts:197`, `app/actions/printing-queries.ts:247`, `app/actions/printing-reference-queries.ts:27`, `app/actions/printing-reference-queries.ts:86`, `app/actions/printing-mutations.ts:96`, `app/actions/printing-mutations.ts:167`, `app/actions/printing-mutations.ts:235`, `app/actions/printing-mutations.ts:297`, `app/actions/lab-queries.ts:80`, `app/actions/lab-queries.ts:133`, `app/actions/lab-queries.ts:192`, `app/actions/lab-queries.ts:209`, `app/actions/lab-mutations.ts:30`, `app/actions/lab-mutations.ts:88`, `app/actions/lab-mutations.ts:118`, `app/actions/lab-mutations.ts:171`, `app/actions/lab-mutations.ts:211`, `app/actions/lab-mutations.ts:248`, `app/actions/lab-mutations.ts:277`, `app/actions/lab-mutations.ts:308`
   - Current behavior: the protected shell only checks login, there is no `app/(protected)/printing/layout.tsx`, and printing/lab actions use bare `withAuth`. `withAuth` then passes `createAdminClient()` into the action.
   - Impact: authenticated roles without `printing` permission, for example `sale`, `media`, or `viewer`, can directly open `/printing` or call server actions to read/create/update/delete printing orders, labs, lab services, and lab payments.
   - Required fix: add `requirePrintingAccess` and `withPrintingAccess` in `lib/auth_utils.ts`, wrap every printing/lab read and mutation action, and add `app/(protected)/printing/layout.tsx` with `canAccess(context.shellRole, "printing")`.

2. Auto-created printing expenses are not accounting-safe or synchronized with order changes
   - Files: `app/actions/printing-mutations.ts:34`, `app/actions/printing-mutations.ts:46`, `app/actions/printing-mutations.ts:65`, `app/actions/printing-mutations.ts:96`, `app/actions/printing-mutations.ts:123`, `app/actions/printing-mutations.ts:154`, `app/actions/printing-mutations.ts:189`, `app/actions/printing-mutations.ts:294`
   - Current behavior: `createPrintingOrder` inserts `printing_orders`, then separately inserts an `expenses` row via `autoCreatePrintingExpense`. Later `updatePrintingOrder` changes `total_amount`, lab, items, and notes without updating/reversing the expense. `deletePrintingOrder` soft-deletes the order without reversing the expense. Category lookup is fuzzy text matching on `%in an%`.
   - Impact: Finance cost reports can stay inflated or stale after edit/delete; the expense insert can fail silently while the print order succeeds; locked accounting periods are not checked; and category assignment can drift when category names change.
   - Required fix: move create/update/delete of print order and its finance expense into one RPC or transactional server path. Store a durable link, e.g. `printing_order_id` on expenses or a mapping table, enforce period lock, and use configured category ID instead of fuzzy text.

3. Lab payment marks every unpaid order for the lab as paid regardless of payment amount
   - Files: `app/actions/lab-mutations.ts:297`, `app/actions/lab-mutations.ts:310`, `app/actions/lab-mutations.ts:321`, `app/actions/lab-mutations.ts:327`, `app/actions/lab-mutations.ts:328`, `components/finance/lab-debts/lab-debts-client.tsx:6`, `app/actions/finance-operations-queries.ts:474`, `app/actions/finance-operations-queries.ts:482`, `app/actions/finance-operations-queries.ts:485`
   - Current behavior: `recordLabPayment` inserts one `lab_payments` row, then updates all active `printing_orders` for that lab where `payment_status = "chua_thanh_toan"` to `"da_thanh_toan"`. It does not allocate payment amount per order, reject underpayment, support partial payment, or run atomically.
   - Impact: a small partial payment can close all lab debt. If the payment insert succeeds and the order update fails, accounting and order status diverge. Finance lab-debt screens then calculate from already-corrupted statuses/payments.
   - Required fix: replace with an atomic RPC that locks the lab/order rows, accepts selected order IDs or explicit allocation, rejects over/under-payment unless intentional, updates only covered orders, and rolls back payment insert on any failure.

4. Printing RPCs exist in generated types but are missing from local migrations, and stats swallow RPC errors
   - Files: `types/database.types.ts:3840`, `types/database.types.ts:3967`, `app/actions/printing-queries.ts:211`, `app/actions/printing-queries.ts:219`, `app/actions/printing-queries.ts:226`, `app/actions/finance-operations-queries.ts:474`, `app/actions/finance-operations-queries.ts:477`
   - Current behavior: `get_printing_cost_stats` and `finance_lab_debt_summary` are present in generated database types, but no local migration defines them. `getPrintingOrderStats` reads `costStatsResult.data` without checking `costStatsResult.error`, so missing/failed RPC returns zero cost values without surfacing the deployment problem.
   - Impact: preview/fresh environments recreated from migrations can show incorrect printing cost stats and fall back to slower app-side lab debt aggregation. Silent zero-cost stats are worse than a visible failure for finance-facing data.
   - Required fix: add migrations for both RPCs, revoke public/authenticated execution, grant service_role only, and make `getPrintingOrderStats` throw when `get_printing_cost_stats` fails.

## Warnings

1. Page size and filters are not server-validated
   - Files: `app/actions/printing-queries.ts:139`, `app/actions/printing-queries.ts:177`, `app/actions/printing-queries.ts:169`, `app/actions/printing-queries.ts:173`, `lib/validations/printing.schema.ts:18`
   - Impact: direct action callers can request very large `pageSize`, invalid statuses, arbitrary lab IDs, and invalid or very wide date ranges.
   - Required fix: add a Zod filter schema, clamp `pageSize` to 50 or 100, validate enum values and UUIDs, and cap custom date windows.

2. Lab management still performs duplicate app-side debt aggregation
   - Files: `app/(protected)/printing/labs/page.tsx:12`, `app/actions/lab-queries.ts:79`, `app/actions/lab-queries.ts:89`, `app/actions/lab-queries.ts:94`, `app/actions/lab-queries.ts:99`, `app/actions/printing-reference-queries.ts:82`, `app/actions/printing-reference-queries.ts:88`
   - Impact: `/printing/labs` fetches labs, up to 500 services, up to 500 payments, all unpaid orders, and then separately fetches all unpaid orders again through `getLabDebts`.
   - Required fix: make a single `printing_lab_overview` RPC/view for lab cards and debt totals, or have `fetchLabsList` consume the same aggregate result as `getLabDebts`.

3. `fetchLabsList` derives `lastPaymentAt` from a global 500-row payment window
   - Files: `app/actions/lab-queries.ts:34`, `app/actions/lab-queries.ts:61`, `app/actions/lab-queries.ts:94`, `app/actions/lab-queries.ts:97`
   - Impact: once total lab payment history exceeds 500 rows, labs outside the latest global slice can show `lastPaymentAt = null` even if they have older payments.
   - Required fix: use `max(created_at) group by lab_id` in SQL/RPC instead of transferring payment rows.

4. `getLabDebts` has no default limit and aggregates in app memory
   - Files: `app/actions/printing-reference-queries.ts:82`, `app/actions/printing-reference-queries.ts:88`, `app/actions/printing-reference-queries.ts:99`, `app/actions/printing-reference-queries.ts:111`
   - Impact: as unpaid printing orders grow, labs page and finance lab debt can become slow and memory-heavy.
   - Required fix: move debt summary to SQL with `GROUP BY lab_id`, and paginate/order at the database layer.

5. Printing stats still fan out into multiple exact count queries
   - Files: `app/actions/printing-queries.ts:197`, `app/actions/printing-queries.ts:200`, `app/actions/printing-queries.ts:211`, `app/actions/printing-queries.ts:219`
   - Impact: page load does 5 exact counts plus one RPC for stats. Indexes help, but one aggregate RPC would be cheaper and more consistent.
   - Required fix: replace status counts and cost sums with one `printing_stats()` RPC.

6. Lab update schema can reactivate inactive labs on partial direct updates
   - Files: `lib/validations/lab.schema.ts:20`, `lib/validations/lab.schema.ts:25`, `app/actions/lab-mutations.ts:76`, `app/actions/lab-mutations.ts:88`
   - Current behavior: `updateLabSchema = createLabSchema`, and `createLabSchema.status` defaults to `"active"`.
   - Impact: direct callers that update only `lab_name`, phone, or address can unintentionally set `status = "active"`.
   - Required fix: split create/update schemas so update status has no default.

7. Printing order code generation can collide
   - Files: `app/actions/printing-mutations.ts:24`, `app/actions/printing-mutations.ts:100`, `types/database.types.ts:2971`
   - Impact: `IN-${Date.now().toString(36)}` can collide under concurrent creates in the same millisecond, and local migrations do not show a unique order-code constraint.
   - Required fix: use a DB sequence/RPC, or add a random suffix plus a unique constraint and retry on conflict.

8. Status semantics are inconsistent between UI and persisted dates
   - Files: `components/printing/printing-detail-drawer.tsx:50`, `components/printing/printing-detail-drawer.tsx:56`, `app/actions/printing-mutations.ts:266`, `types/printing.ts:32`, `types/printing.ts:53`
   - Current behavior: the UI labels the next action from `da_in` as "Da giao khach", but the backend sets `received_date` when status becomes `da_nhan`. `delivered_date` exists in types/DB but no mutation sets it.
   - Impact: reports can confuse "received from lab" with "delivered to customer".
   - Required fix: decide the lifecycle terms, then either rename UI copy to "Da nhan tu lab" or add a real delivered status/date.

9. Contract option search needs integration coverage after query consolidation
   - Files: `app/actions/printing-reference-queries.ts:24`, `app/actions/printing-reference-queries.ts:55`, `app/actions/printing-reference-queries.ts:60`
   - Current behavior: contract code and customer name search were consolidated into one `.or(...)` over an embedded customer relation.
   - Impact: if PostgREST does not apply the embedded relation branch as intended in the deployed schema, customer-name search can silently miss records.
   - Required fix: add an integration test or RPC-backed search for contract code/customer name.

## Suggestions

1. Split large client components after P0 fixes
   - Files: `components/printing/printing-detail-drawer.tsx` 542 lines, `components/printing/labs/lab-list-page.tsx` 523 lines, `components/printing/labs/lab-form-modal.tsx` 346 lines.
   - Reason: these are still under chunk budget, but maintenance risk is high. Extract item editor, lab cards, lab stats/filter row, and service sync helpers.

2. Lazy-load write-heavy drawers/modals
   - Files: `components/printing/printing-list-page.tsx`, `components/printing/labs/lab-list-page.tsx`.
   - Reason: `/printing` and `/printing/labs` chunks are healthy now, but create/edit forms are not needed for first paint.

3. Add focused server-action tests for status transitions and payment allocation
   - Files: `app/actions/printing-mutations.ts`, `app/actions/lab-mutations.ts`.
   - Reason: the business risk is in state transitions and accounting effects, not in rendering.

4. Add an integrity query for printing/finance drift
   - Suggested checks: printing orders with no matching expense, deleted/cancelled orders with active expense, paid lab orders with no payment allocation, and inactive labs with new orders.

5. Document module ownership between Printing, Contracts, and Finance
   - Reason: printing creation is available from contract detail, printing creates finance expenses, and finance displays lab debt. These boundaries need explicit permission and accounting rules.

## Positive Findings

- Legacy `lab-actions.ts` and `lab-sync-actions.ts` are gone.
- `/printing` now uses `getLabOptions()` instead of heavy `fetchLabsList()` for the lab dropdown.
- SWR hooks on `/printing` and `/printing/labs` set `revalidateOnMount: false`, avoiding the old immediate double-fetch after SSR.
- `escapeLikePattern()` is in place for order and contract search.
- `updatePrintingOrder` revalidates the related contract path.
- Printing hot-path indexes exist for active contract, lab, status/date, payment/date, and lab/payment filters.
- `getVerifiedUser()` and `createAdminClient()` are React-cached, reducing repeated auth/client setup inside one request.
- Build, typecheck, source perf audit, and chunk budget all pass.

## Suggested Fix Order

1. P0: add `withPrintingAccess` and a `/printing` route layout guard; wrap all printing/lab actions.
2. P0: replace lab payment flow with atomic allocation RPC and repair existing bad payment/order-state data if present.
3. P0: make printing expense sync transactional and reversible on update/delete.
4. P0: add missing RPC migrations and fail fast when printing stats RPC errors.
5. P1: validate/clamp printing filters and page size.
6. P1: replace lab overview/debt app-side aggregation with SQL/RPC.
7. P1: split create/update lab schema to avoid status default reset.
8. P2: harden order-code generation with DB sequence/unique constraint.
9. P2: resolve `da_nhan`/`delivered_date` business semantics and add coverage.

## Verification Commands Run

```powershell
npx tsc --noEmit --pretty false
npm run build
npm run perf:audit
npm run perf:chunks
npm run verify:printing
npx supabase db push --dry-run
```

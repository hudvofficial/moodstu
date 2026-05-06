# Plan: Contract Payment + Receipt + Finance Max Fix

Created: 2026-05-03T06:43
Status: Phase 07 migration applied to Supabase; UI smoke pending
Target Score: 10/10 production workflow

## Objective

Fix toàn bộ nghiệp vụ thu tiền hợp đồng để đạt chuẩn kế toán nội bộ:

- Không thu sai, không thu vượt ngoài ý thức.
- Không double-count doanh thu/cashflow.
- Thu tiền hợp đồng vẫn là một phiếu thu có thể xem, in, export, đối soát.
- Dashboard, cashflow, report, monthly close dùng cùng định nghĩa dòng tiền.
- UX nhanh, rõ, khó bấm nhầm, không tự sinh giá trị nguy hiểm.

## Source Audits

- `docs/reports/audit_2026-05-03_contract_payment_logic.md`
- V1 reference: `C:\Users\Admin\Desktop\Ai\0Moodstudio`
- Current V2 core:
  - `app/actions/payment-actions.ts`
  - `app/actions/receipt-actions.ts`
  - `app/actions/finance-dashboard-queries.ts`
  - `app/actions/finance-operations-queries.ts`
  - `app/actions/finance-reports-queries.ts`
  - `app/actions/finance-close-actions.ts`
  - `components/contracts/detail/payment-receipt-form.tsx`
  - `components/contracts/detail/financial-dashboard.tsx`
  - `supabase/migrations/20260422160000_contracts_business_logic_backfill.sql`

## Core Decisions

1. `payments` remains the write model for contract collections.
2. `receipts` remains the write model for standalone receipts and sale receipts.
3. Do not insert contract collection into both `payments` and `receipts`.
4. Add unified receipt-document read model for finance UI/export/print/stats.
5. `process_contract_payment_v2` remains the only contract payment accounting write path.
6. Normal payment cannot exceed `contracts.remaining_amount`.
7. `Phát sinh tăng HĐ` must create/attach a contract addon or adjustment record, not only increase `total_amount`.
8. Authorized contract collection is confirmed immediately unless a separate approval workflow is explicitly introduced later.

## Affected Surfaces

- Contract detail: debt summary, payment history, payment plans, collect button, print receipt.
- Finance receipts: list, stats, search, filters, receipt detail, receipt print.
- Finance cashflow: daily/monthly inflow, ledger rows, payment method totals.
- Finance reports: revenue vs cash collected, category grouping, export.
- Monthly close: closed-period reads and locked-period mutation rules.
- Audit trail: create/update/void/reversal events must name the business action, not only `System CREATE`.
- Data health: overpaid contracts, pending paid rows, missing receipt codes, orphan plan/payment links.

## Execution Guardrails

- Server/database checks ship before UI convenience changes.
- Any new read model must be source-aware: `payment` vs `receipt`.
- Existing standalone receipts must keep working unchanged.
- Contract payment must never be counted once from `payments` and once from `receipts`.
- Production fallback paths that bypass RPC invariants must be removed or gated off.
- Every phase must include at least one verification query or UI smoke route.

## Target Score Rubric

| Area | Current | Target | Gate |
| --- | ---: | ---: | --- |
| DB invariants / double-count safety | 7/10 | 10/10 | No duplicate write path; RPC rejects invalid amounts. |
| Receipt document completeness | 4/10 | 9.5/10 | Contract payments visible/printable/exportable as receipts. |
| Finance reports/cashflow/monthly close | 7/10 | 9.5/10 | One shared inflow definition, no missing contract receipts. |
| Contract payment UX | 6/10 | 9.5/10 | Blank-safe defaults, quick chips, plan collect, smart state. |
| Audit/reversal/locked period safety | 5/10 | 9/10 | Void/reversal flow with period lock; no unsafe deletes. |
| Performance | 8/10 | 9.5/10 | Unified queries are paginated/RPC-backed and indexed. |

Overall target: 9.5/10+.

## Phases

| Phase | Name | Status | Risk | Est. |
| --- | --- | --- | --- | --- |
| 00 | Baseline + Contract Invariants Audit | Covered by audit | Low | 45m |
| 01 | DB Payment Invariants + Receipt Code | Implemented | High | 2h |
| 02 | Unified Receipt Documents Read Model | Implemented | High | 3h |
| 03 | Contract Payment UX Max Polish | Implemented | Medium | 3h |
| 03A | Form Grid Layout (CSS) | ✅ Complete | 100% |
| 03B | Form UX & V1 Parity | ✅ Complete | 100% |
| 03C | Cleanup Dashboard & Form Sync | ✅ Complete | 100% |
| 04 | Reports, Export, Close, Cashflow Consistency | Implemented locally | High | 2h |
| 05 | Void/Reversal, Audit, Health Checks | Implemented locally | Medium | 2.5h |
| 06 | QA, Benchmark, Deploy | Local QA passed; deploy pending | Medium | 1.5h |
| 07 | Payment Plan SSOT + Financial Summary Max | Migration applied; UI smoke pending | High | 6-10h |

Estimated total: 14-16h.

Phase 07 adds a production rework on top of the earlier phases. The earlier fixes improved safety and receipt visibility, but they still allowed V2 to fall back to guessed payment stages when `payment_plans` were missing. That is not acceptable for the final V2 target.

## Implementation Order

1. Phase 00: snapshot current behavior and list all consumers.
2. Phase 01: lock DB invariants first to prevent new bad data.
3. Phase 02: expose unified receipt documents before touching finance UI widely.
4. Phase 03: change user-facing contract payment form after server guards exist.
5. Phase 04: switch reports/export/close to shared definitions.
6. Phase 05: add reversal/audit/health so mistakes are recoverable and visible.
7. Phase 06: QA and deploy.

## Non-Goals

- Do not rebuild the whole finance module.
- Do not add full external bank reconciliation in this pass.
- Do not introduce an approval workflow unless the business explicitly chooses it.
- Do not create duplicate accounting rows in `payments` and `receipts`.

## Definition Of Done

- A contract payment appears in contract detail, finance receipt list, cashflow ledger, export, print, and monthly close exactly once.
- Normal contract collection cannot exceed remaining debt.
- Fully paid contract opens `Phát sinh`, not normal `Thu tiền`.
- Contract receipt has stable `receipt_code`.
- Contract receipt is not shown as pending if it already updated debt.
- Reports distinguish contract value/revenue basis from cash inflow basis.
- Health checks catch drift: overpaid, missing receipt code, paid plan without payment, payment pending mismatch.
- Production smoke passes on `/contracts`, `/contracts/[id]`, `/finance`, `/finance/receipts`, `/finance/cashflow`, `/reports`.

## Implementation Progress 2026-05-03

- Added migration `20260503070000_contract_payment_receipt_finance_max.sql`.
- `process_contract_payment_v2` now rejects normal over-collection, generates `receipt_code`, confirms contract payment via `approved_by`, and blocks unsafe missing-RPC fallback.
- Finance receipt list/stats/detail/print/export now read contract payments through unified receipt documents without writing duplicate rows into `receipts`.
- Contract payment modal now preserves V1 business logic: auto-selects `initialPlanId` or the first unpaid payment plan, falls back to V1 stages (`Tiền cọc / Lần 1`, `Thanh toán đợt 2`, `Thanh toán hết`) when plan rows are missing, uses a simple payment-method select, hides finance category from the contract context, and distinguishes normal collection from fully-paid contract adjustments.
- Contract-generated receipt documents cannot be edited or deleted from the generic receipt list.
- Added `contract_payment_health_checks()` for drift detection.
- Added migration `20260503080000_contract_payment_completion.sql`.
- `Phát sinh` payments now create a linked `contract_items` addon row and voiding that payment soft-deletes the addon row atomically.
- Finance receipt rows sourced from `payments` now support explicit void with required reason instead of generic delete.
- Contract payment history rows now link to receipt detail and print routes.
- Fully paid contract CTAs switch to `Phát sinh` across financial card, quick actions, and mobile bottom bar.
- `run_integrity_scan()` now includes contract payment health checks and the Ghost scan widget shows named check failures.

External deploy/smoke still required:

- Run DB migration on target Supabase and smoke test with real data.
- Run finance report/monthly close comparison after migration to confirm no historical mismatch from imported payments.

Verification:

- `npx tsc --noEmit` passed.
- Targeted `npx eslint ...` passed.
- `npm run lint` passed with 5 pre-existing warnings in `lib/navigation-data-prefetch.ts`.
- `npm run build` passed.
- `node scripts/verify-contracts.mjs` passed.
- `node scripts/verify-reports.mjs` passed.

## Production Rework Decision 2026-05-04

V1 remains stronger than current V2 in the business workflow around financial summary and payment schedule visibility. V2 remains stronger in atomic payment safety, receipt documents, void/reversal, locked-period checks, and finance integrity.

Final V2 direction:

- Keep V2 accounting safety.
- Port the V1 business shape of a clear financial summary and real `Kế hoạch thanh toán`.
- Make `payment_plans` the normal-collection source of truth.
- Add allocation-aware payment handling so partial payments and one receipt covering multiple plans are production-safe.
- Remove UI fallback stages after backfill. Missing plans become a health issue, not a normal UI path.
- Preserve speed with bounded detail queries, allocation indexes, no client N+1, and explicit contract-detail smoke budgets.

New phase:

- `phase-07-payment-plan-ssot-financial-summary-max.md`

## Phase 07 Implementation Progress 2026-05-04

- Added allocation-aware payment plan SSOT migration and health checks.
- Added default payment schedule creation inside `save_contract_atomic`.
- Upgraded contract payment RPC to allocate normal collections to plan rows and reserve `Phát sinh hợp đồng` for fully paid contract adjustments.
- Rebuilt contract financial summary, payment plan block, and payment receipt modal around real plan state.
- Removed normal UI dependence on guessed fallback stages.
- Verified locally with `npx tsc --noEmit`, targeted eslint, and `npm run build`.

Deployment update:

- Applied pending Supabase migrations `20260503073000`, `20260503080000`, and `20260504103000` to linked project `mnoqeluywookswpcykha`.
- Verified remote migration history includes `20260504103000`.
- Verified `payment_plan_allocations`, `payment_plan_states`, new payment plan columns, and Phase 07 RPC/functions exist on remote.
- `contract_payment_health_checks()` returned no rows with `issue_count > 0`.
- Applied follow-up migration `20260504114500` to normalize final/remaining plan labels to `Thanh toán hết`; remote now has no `remaining/final` plan labeled `Thanh toán còn lại`.
- Reworked contract receipt UI to separate business payment stages from allocation rows:
  - `Cọc lần 1`
  - `Thanh toán đợt 2`
  - `Thanh toán hết`
- `payment_plans` now acts as allocation/debt state in the form; the dropdown no longer exposes raw plan labels as the business flow.

Remaining gate:

- Smoke real UI flows on target data before calling Phase 07 production-complete.

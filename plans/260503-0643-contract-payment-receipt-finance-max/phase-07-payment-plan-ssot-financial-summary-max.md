# Phase 07: Payment Plan SSOT + Financial Summary Max

Status: Migration applied to Supabase; UI smoke pending
Priority: Critical
Goal: Make V2 genuinely production-grade, not a UI patch over missing payment-plan data.

## Why This Phase Exists

V2 currently has stronger accounting safety than V1, but the business workflow is weaker because `payment_plans` are not guaranteed to exist or represent the actual collection schedule.

The production model must be:

```text
Contract
  -> Payment plans / schedule
  -> Payments allocated to plans
  -> Contract financial summary
  -> Receipt documents / finance reports
```

No production UI should infer business stages from `remainingAmount` alone.

## Non-Negotiable Rules

- `payment_plans` becomes the source of truth for normal contract collection.
- UI fallback stages are removed after backfill. Missing plan rows become a data-health error, not a normal UX path.
- `payments` remains the source of truth for cash events.
- A payment may pay one plan, several plans, or part of one plan.
- `Phát sinh hợp đồng` is not a payment stage. It is a contract value adjustment and must create/attach a `contract_items` addon row.
- `Thanh toán khác` is only an exceptional contract collection, not the default path.
- Contract financial summary must explain total value, discount, collected cash, remaining debt, completion percent, and net profit clearly.
- Contract detail must stay fast after the business model is upgraded. No UI path may load unbounded finance rows or recompute heavy summaries client-side.

## Target Data Model

Keep existing tables, but add the minimum production structure needed to avoid fake UI state.

### `payment_plans`

Required meaning:

- One row = one planned milestone/installment.
- `stage_name`: display label, e.g. `Cọc lần 1`, `Đợt 2`, `Tất toán`, `Thanh toán còn lại`.
- `stage_key`: stable machine key, e.g. `deposit`, `second`, `final`, `remaining`, `custom`.
- `sort_order`: deterministic display/order.
- `amount`: planned amount.
- `due_date`: planned due date.
- `status`: derived or synchronized from allocations: `pending`, `partial`, `paid`, `cancelled`.

### `payments`

Required meaning:

- One row = one cash collection event.
- Contract payments still use `payments`, not duplicate `receipts`.
- `is_contract_adjustment = true` only for `Phát sinh hợp đồng`.

### New Bridge: `payment_plan_allocations`

Needed for real production cases:

- Customer pays part of an installment.
- Customer pays one receipt that covers several installments.
- A paid plan should not depend on a single `receipt_id`.

Proposed columns:

- `id`
- `contract_id`
- `payment_plan_id`
- `payment_id`
- `amount`
- `created_at`
- `created_by`

Rules:

- `SUM(allocation.amount)` for a plan determines `paid_amount`.
- plan remaining = `payment_plans.amount - allocated_amount`.
- plan status:
  - `paid` when allocated >= planned amount.
  - `partial` when allocated > 0 and < planned amount.
  - `pending` when allocated = 0.
  - `cancelled` only by explicit cancellation.

Keep `payment_plans.receipt_id` as a legacy compatibility field during migration, but UI and business logic should read allocation-derived state.

## Performance Contract

This phase must preserve or improve V2 speed while adding stronger business logic.

### Query Shape

- Contract detail must fetch a bounded contract detail payload, not a large finance ledger.
- Payment plans and allocations should be returned in the same detail bootstrap/RPC path when practical.
- Payment history should remain limited/paginated. Default detail view only needs the latest rows.
- Financial summary values should be derived server-side or from already-fetched bounded rows.
- No client-side N+1 queries for plan allocation, receipt links, customers, or category names.

### Required Indexes

Add or verify indexes for:

- `payment_plans(contract_id, status, sort_order)`
- `payment_plans(contract_id, due_date)`
- `payment_plan_allocations(payment_plan_id)`
- `payment_plan_allocations(payment_id)`
- `payment_plan_allocations(contract_id)`
- `payments(contract_id, payment_date DESC)` where `deleted_at IS NULL`
- `payments(contract_id, is_contract_adjustment)` where `deleted_at IS NULL`

### Speed Budgets

Local/dev budgets are advisory, production smoke budgets are gates:

- `/contracts/[id]` initial server data: no obvious regression from current baseline.
- Contract detail interactive payment modal open: under 150ms after page data is loaded.
- Payment submit round trip: one RPC write path, no chained client writes.
- Finance receipt list remains paginated and source-aware.
- Build bundle must not add a large client-only dependency for financial calculations.

### Performance Verification

- Capture before/after query count for contract detail.
- Run `EXPLAIN ANALYZE` for the detail plan/allocations query on a realistic contract.
- Smoke a contract with:
  - no payments,
  - 2 payments,
  - 10+ payments,
  - 3+ planned installments,
  - adjustment payment.
- Verify no detail view makes repeated per-plan/per-payment server calls.

## Payment Schedule Creation Rules

When creating a contract, V2 must create a real plan schedule inside `save_contract_atomic`.

### No Initial Payment

```text
Thanh toán còn lại: total_after_discount, pending
```

### Initial Payment < Contract Total

```text
Cọc lần 1: initial_payment, paid/allocated
Thanh toán còn lại: total_after_discount - initial_payment, pending
```

### Initial Payment = Contract Total

```text
Thanh toán hết: total_after_discount, paid/allocated
```

### Optional 3-Installment Preset

Expose later in create-contract UI, not required for first migration:

```text
Cọc lần 1
Đợt 2
Tất toán
```

Amounts must sum to contract total after discount.

## Backfill Strategy

Create a migration/RPC that repairs historical V2 contracts.

### Contract Has No Payment Plans

- If `paid_amount = 0`: create one pending `Thanh toán còn lại`.
- If `paid_amount > 0` and `remaining_amount > 0`:
  - create paid/partial plans from existing `payments`, ordered by `payment_date`.
  - create pending `Thanh toán còn lại` for current remaining.
- If `remaining_amount <= 0`:
  - create paid plans from existing `payments`.
  - if one payment paid the whole contract, label it `Thanh toán hết`.

### Contract Has Payment Plans

- Normalize status values to `pending | partial | paid | cancelled`.
- Create allocations from existing `receipt_id` links.
- If plans do not sum to contract total, add or adjust a `Thanh toán còn lại` plan.
- Do not delete historical payment rows.

### Health Checks After Backfill

Add/extend health checks:

- active contract with `total_amount > 0` and no non-cancelled plans.
- plan total does not match contract total after discount, excluding known adjustments.
- paid plan without allocation/payment.
- payment allocation sum does not match payment amount.
- contract `paid_amount` differs from sum of non-voided payments.
- contract `remaining_amount` differs from total minus paid.

## RPC Changes

### `save_contract_atomic`

Add plan creation inside the same transaction:

1. Insert contract.
2. Insert contract items.
3. Create default payment schedule.
4. If initial payment exists, create payment through `process_contract_payment_v2`.
5. Allocate payment to the correct plan(s).
6. Recalculate contract financial state.

### `process_contract_payment_v2`

Upgrade from single-plan close to allocation-aware payment:

- Accept either:
  - explicit allocation list, or
  - `payment_plan_id`, or
  - `collect_remaining = true`.
- Normal payment cannot exceed current contract remaining.
- If `collect_remaining = true`, allocate across all open plans by `sort_order`.
- If only `payment_plan_id` is supplied, allocate to that plan.
- If amount is less than plan remaining, mark plan `partial`.
- If amount covers multiple plans, close them in order.
- Reject normal payment if no open plan exists and contract still has no repairable schedule.
- `Phát sinh hợp đồng` bypasses plan allocation and creates an addon adjustment.

## UI Changes

### Contract Detail Financial Card

Replace the current thin V2 card with a production summary inspired by V1, but cleaner.

Must show:

- `Tổng giá trị HĐ`
- `Giảm giá`
- `Giá trị sau giảm`
- `Đã thanh toán`
- `Còn lại cần thu`
- progress percent
- `Lợi nhuận ròng` / `Lợi nhuận dự kiến`
- clear status: `Chưa thanh toán`, `Đã cọc`, `Đang thanh toán`, `Đã tất toán`

### Payment Plan Block

Bring back a dedicated `Kế hoạch thanh toán` block:

- ordered milestones.
- amount, due date, paid/partial/pending status.
- next unpaid badge.
- inline `Thu tiền` action per open plan.
- plan mismatch warning only for admins/dev health mode.

### Payment Receipt Modal

Simplify after SSOT/backfill:

- No fake V1 fallback stage list.
- Default selected plan = next open plan.
- Amount default = selected plan remaining amount.
- Support partial amount if business allows partial collection.
- `Thu hết` = collect all open plan balances.
- `Thanh toán khác` hidden behind advanced/manual mode.
- Fully paid contract opens `Phát sinh hợp đồng`, not payment-stage mode.

### Finance Receipt UI

Receipt detail/print must show:

- contract code/customer.
- payment stage/allocation summary.
- method/date/amount.
- whether this receipt is normal collection or contract adjustment.

## Files To Touch

Expected DB/migrations:

- `supabase/migrations/*_payment_plan_ssot_allocations.sql`
- `types/database.types.ts` after type regeneration

Expected server/actions:

- `app/actions/contract-mutations.ts`
- `app/actions/payment-actions.ts`
- `app/actions/contract-queries.ts`
- `app/actions/finance-operations-queries.ts`

Expected UI:

- `components/contracts/detail/financial-dashboard.tsx`
- new or rebuilt `components/contracts/detail/payment-plan-block.tsx`
- `components/contracts/detail/payment-receipt-form.tsx`
- `components/contracts/detail/detail-layout-sections.tsx`
- `components/contracts/detail/contract-detail-client.tsx`
- `components/contracts/print/contract-template.tsx`

Expected docs/tests:

- update this plan.
- add SQL health queries.
- add targeted component/server tests where local test harness supports it.

## Execution Order

1. Confirm current DB schema and real status values in `payment_plans`.
2. Add allocation table and plan-state helpers/views.
3. Upgrade `process_contract_payment_v2` allocation behavior.
4. Upgrade `save_contract_atomic` to always create payment plans.
5. Backfill existing V2 contracts.
6. Add health checks and verify zero critical drift.
7. Rebuild contract financial summary and payment plan UI.
8. Simplify payment modal by removing fake fallback stages.
9. Verify finance receipts/print/export still count contract payments exactly once.
10. Add/verify indexes and run query-plan checks.
11. Run production smoke against real data.

## Test Matrix

- New contract, no initial payment: one pending plan, card shows full debt.
- New contract with deposit: paid deposit plan + pending remaining plan.
- New contract fully paid: paid final/full plan, no pending debt.
- Contract with 3 planned installments: next unpaid is selected correctly.
- Partial installment payment: plan becomes `partial`, contract paid/remaining correct.
- One payment covers multiple open plans: all covered plans update correctly.
- Normal overpayment: rejected.
- Fully paid contract: CTA becomes `Phát sinh`.
- Contract adjustment: creates addon item, increases total and paid equally, remaining stays 0.
- Void normal payment: allocations and plan states roll back.
- Void adjustment payment: linked addon is soft-deleted and totals roll back.
- Legacy contract with no plans: backfill creates deterministic schedule.
- Finance receipt list/cashflow/export/report counts each payment once.
- Monthly locked period rejects create/void.

## Definition Of Done

- No active contract with `total_amount > 0` is missing a payment plan.
- No contract detail UI path uses guessed/fallback stages for normal collection.
- Financial card explains the contract as clearly as V1, with V2-safe data.
- Payment plan block is visible and actionable on desktop/mobile.
- Payment modal always opens in the correct business mode.
- Contract payments remain visible/printable/exportable exactly once.
- Health scan is clean on local seed/real target data.
- Contract detail has no new N+1 query path and no unbounded payment/finance fetch.
- Required indexes exist and query plans use them for realistic data.
- `npx tsc --noEmit`, targeted eslint, `npm run build`, and SQL smoke checks pass.

## Implementation Progress 2026-05-04

- Added migration `20260504103000_payment_plan_ssot_allocations.sql`.
- Added `payment_plan_allocations`, allocation indexes, `payment_plan_states`, plan status sync, label normalization, default schedule creation, legacy backfill, and allocation-aware health checks.
- Upgraded `process_contract_payment_v2` so normal receipt money allocates to open plans by selected plan/order, supports partial installment payments, supports one receipt covering multiple plans, and rejects over-collection.
- Upgraded `save_contract_atomic` so new contracts create a real payment schedule before initial payment allocation.
- Upgraded void flow to remove allocations, resync plan state, and roll back adjustment addon totals.
- Contract detail now fetches bounded payment history and allocation-derived payment plans in the detail bootstrap path.
- Rebuilt financial card with total, discount, net value, paid, remaining, progress, estimated net profit, recent receipts, and payment plan block.
- Added `PaymentPlanBlock` with ordered installments, paid/partial/pending status, next badge, due date, remaining amount, and per-plan collect action.
- Rebuilt `PaymentReceiptForm` so it defaults to the next open plan, uses selected plan remaining amount, keeps payment method as a select, hides category UI, supports `Thu hết`, blocks missing schedules, and only uses `Phát sinh hợp đồng` when the contract is fully paid.
- New contract initial payment now defaults to `dat_coc` and is normalized to `Cọc lần 1` in DB labels.

Local verification:

- `npx tsc --noEmit` passed.
- Targeted `npx eslint ...` passed.
- `npm run build` passed.

Supabase deployment 2026-05-04:

- Applied pending migrations `20260503073000_contract_payment_void_reversal.sql`, `20260503080000_contract_payment_completion.sql`, and `20260504103000_payment_plan_ssot_allocations.sql` to linked project `mnoqeluywookswpcykha`.
- Remote migration history now includes `20260504103000`.
- Verified `payment_plan_allocations`, `payment_plan_states`, `stage_key`, `sort_order`, and Phase 07 RPC/functions exist on remote.
- `contract_payment_health_checks()` returned no rows with `issue_count > 0`.
- Applied follow-up migration `20260504114500_payment_plan_stage_label_cleanup.sql` so final/remaining payment plans use `Thanh toán hết` at the DB default/source label level.
- Verified remote final/remaining plan labels: only `remaining | Thanh toán hết` remains.
- Reworked the contract receipt modal and payment plan block around the actual operating flow:
  - `Cọc lần 1`
  - `Thanh toán đợt 2`
  - `Thanh toán hết`
- `payment_plans` remains the allocation/debt source; user-facing stage choice is now a business-stage layer above it, so raw plan labels cannot replace the workflow.

Pending outside local code:

- Run real UI smoke on contracts with no payments, deposit + remaining, partial installment, multi-plan payment, full payment, adjustment, and void.
- Run query-plan checks on target data volume if performance baseline is needed.

## Rollback Plan

- The allocation table is additive.
- Existing `payments` rows remain untouched.
- Existing `payment_plans.receipt_id` remains during the transition.
- If UI rollout finds issues, feature-flag the new plan block while keeping DB backfill and health checks.

# Phase 03B: Payment Form UX V1 Parity

Status: Done locally; superseded by Phase 07 for final production quality

## Superseded Scope

This phase improved the modal UX, but it still allowed fallback payment stages when `payment_plans` were missing. That is no longer accepted as the final V2 direction.

Phase 07 replaces fallback-driven UI with a real `payment_plans` source-of-truth model plus payment allocations and backfill.

## Business Rule

The contract payment form keeps V1's business model:

- `payment_plans` drive normal contract collection.
- Opening the form selects `initialPlanId` when provided, otherwise the first unpaid plan.
- Selecting a plan fills `amount` from that plan and submits its `paymentPlanId`.
- Paid plans are visible but disabled.
- If a contract has no `payment_plans` rows, the modal falls back to V1 receipt stages:
  - `Tiền cọc / Lần 1`
  - `Thanh toán đợt 2`
  - `Thanh toán hết / Tất toán`
- `Thanh toán khác` is still a contract collection, not a contract adjustment.
- `Phát sinh hợp đồng` only applies when `remainingAmount <= 0`.

## V2 UI Shape

- Modal layout stays compact: amount/date, payment plan/method, notes.
- Payment method is a normal select field, matching V1's low-friction workflow.
- Finance category is hidden because the user is already in contract context.
- Quick links stay small under the amount field:
  - `Đợt tiếp theo` selects the next unpaid plan.
  - `Thu hết` is only shown when it cannot leave open payment plans behind.
- Fully paid contracts show an adjustment banner, require a reason, and submit with `updateTotal = true`.

## Guardrails

- Normal collection cannot exceed `remainingAmount`.
- A selected payment plan requires amount >= plan amount.
- `Thu hết` must not create `contract_fully_paid_with_open_plans` drift.
- Source text must remain clean UTF-8.

## Verification

- `npx tsc --noEmit`
- `npx eslint components/contracts/detail/payment-receipt-form.tsx components/ui/currency-input.tsx`
- `npm run build`

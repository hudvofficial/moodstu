# Audit: Contract Payment Collection Logic

Date: 2026-05-03
Scope: `/contracts/[id]` payment collection, payment plans, finance ledger sync.
V1 reference root: `C:\Users\Admin\Desktop\Ai\0Moodstudio`

## Executive Summary

The current V2 payment foundation is better than V1 in one important area: contract payment writes already go through an atomic RPC (`process_contract_payment_v2`) that locks the contract row, inserts a payment, updates paid/remaining amounts, and marks the selected payment plan paid in the same transaction.

However, V2 has not fully carried over the mature business behavior from V1: smart state based on `remaining_amount`, explicit "phat sinh" mode, overpayment handling, plan-driven collection UX, and clear accounting category defaults. The next implementation should keep V2's atomic write model, borrow V1's smart state UX, and avoid V1's old double-count mistake.

## V1 Findings Worth Keeping

### 1. `remaining_amount` is the UI source of truth

V1's `PaymentPlanBlock` explicitly decides payment state from contract-level `remaining_amount`, not from payment plan status alone.

Reference:
- `0Moodstudio\webapp\components\contracts\details\PaymentPlanBlock.tsx`
- `0Moodstudio\docs\BRIEF_payment_smart_state.md`

Adopt for V2:
- `remaining_amount > 0`: normal collect mode.
- `remaining_amount = 0`: fully paid mode; do not show normal "Thu tiền".
- `remaining_amount < 0`: overpaid/exception mode.

### 2. Smart label: "Thu tiền" becomes "Phát sinh"

V1 changes quick action label and tone when a contract is fully paid.

Reference:
- `0Moodstudio\webapp\components\contracts\ContractActions.tsx`

Adopt for V2:
- If `remainingAmount > 0`: show `Thu tiền`.
- If `remainingAmount <= 0`: show `Phát sinh` or hide payment CTA unless the user has finance permission.

### 3. Plan-level collection UX is useful

V1 lets the user collect directly from the next unpaid payment plan, auto-fills the amount, and highlights the next plan.

Reference:
- `0Moodstudio\webapp\components\contracts\details\PaymentPlanBlock.tsx`
- `0Moodstudio\webapp\components\contracts\PaymentReceiptForm.tsx`

Adopt with caution:
- Keep "Thu tiền" on each unpaid plan.
- Auto-fill only after the user clicks a plan-specific collect action.
- Do not auto-fill amount just because the modal opened from the generic `Thu tiền` CTA.

### 4. Notes are mandatory for "phát sinh"

V1 requires a reason when the contract is already fully paid and a new collection is created.

Reference:
- `0Moodstudio\webapp\components\contracts\PaymentReceiptForm.tsx`

Adopt for V2:
- In `phat_sinh` mode, require reason/notes.
- If the amount should increase contract value, require explicit `updateTotal = true`.

## V1 Lessons Not To Repeat

### 1. Do not mix trigger-based recalculation with app/RPC increments

V1 had a documented double-count bug because both the DB trigger and RPC updated `paid_amount`.

Reference:
- `0Moodstudio\plans\260306-1745-system-health-upgrade\phase-01-fix-double-count.md`
- `0Moodstudio\update_financials_trigger.sql`

V2 decision:
- Keep one write path only: `process_contract_payment_v2`.
- Do not add a second trigger that also recalculates contract paid/remaining from payments unless the RPC is redesigned around that trigger.

### 2. Do not use weak browser confirmation for overpayment

V1 allowed overpayment through `window.confirm`. That is too easy to misclick and does not create a clean accounting state.

V2 decision:
- Normal payment must not exceed current `remaining_amount`.
- If the user intentionally collects more, force them into one explicit mode:
  - `Phát sinh tăng HĐ`: increase `total_amount`, keep `remaining_amount = 0`.
  - `Thu thừa/chờ xử lý`: record as overpayment liability, not as normal revenue.

## Current V2 State

### Working well

- Server action validates positive amount and requires payment permissions.
- Period lock is checked before mutation.
- RPC uses `FOR UPDATE` on the contract row.
- RPC inserts payment, updates contract totals, and updates selected payment plan inside one transaction.
- Contract detail subscribes to `contracts`, `payments`, and `payment_plans` changes.

References:
- `app/actions/payment-actions.ts`
- `supabase/migrations/20260422160000_contracts_business_logic_backfill.sql`
- `components/contracts/detail/contract-detail-client.tsx`

### Gaps

1. Normal payment can still exceed remaining debt at server/DB level.
2. Generic modal opens with amount `0`, and if there is an unpaid plan it auto-fills the first unpaid plan amount.
3. Category is optional/manual, which makes contract receipt accounting inconsistent.
4. Fully paid contracts switch modal title to "Tạo phiếu phát sinh", but the entry CTAs are not consistently state-aware.
5. Payment plan only supports `paid` or not paid; partial plan collection is not modeled.
6. `receipt_code` exists on `payments` but is not generated during insertion.
7. Date defaults use `toISOString()`, which can show the wrong local date around timezone boundaries.
8. Server action still has a non-atomic fallback if the RPC is missing. That is useful for migration safety, but it should not remain in production behavior.

## Finance, Receipt, And Report Impact

### Current data split

V2 currently has two money-in tables:

- `payments`: contract payments. This table updates contract `paid_amount`, `remaining_amount`, and `payment_status`.
- `receipts`: standalone receipts and sale receipts. Contract receipt types from `/finance/receipts` are routed into `createPaymentReceipt`, so they become `payments`, not regular `receipts`.

This split is acceptable only if every finance UI/report treats "phiếu thu" as a union of both sources. Right now that is not consistent.

### Impact Matrix

| Area | Current behavior | Risk | Required decision |
| --- | --- | --- | --- |
| Contract detail | Reads `payments` and shows payment history. | OK for contract view, but no full receipt document/print action. | Add receipt code + view/print action for `payments`. |
| Finance dashboard KPI | Sums `payments.amount + receipts.receipt_amount where contract_id is null`. | Good cashflow basis. | Keep this rule. |
| Finance ledger/cashflow | Union of `payments`, standalone `receipts`, and `expenses`. | Contract payment rows can show `pending` because `approved_by` is null. | Confirm payment status at creation or change ledger status mapping. |
| `/finance/receipts` list | Fetches `receipts` only. | Contract payments are missing from the "Phiếu thu" screen if users expect all receipt documents there. | Replace with a unified receipt-documents query/view. |
| Receipt stats | `finance_receipt_stats` counts `receipts` only. | Receipt count/amount excludes contract payments. | Stats must count unified receipt documents or clearly label "phiếu thu khác". |
| Receipt print/detail | Routes read `receipts` only. | Contract payments cannot be printed as formal receipt documents from finance. | Add print/detail support for `payments`. |
| CSV export `receipts` | Exports `receipts` only. | Contract payments missing from exported phiếu thu. | Export unified receipt documents. |
| Reports snapshot | P&L revenue uses contract total; cashflow uses payments + standalone receipts. | Good distinction, but `phat_sinh updateTotal` silently increases contract total without a classified contract item. | Extra charges must create/update a contract addon line or explicit adjustment category. |
| Monthly close | Snapshot uses payments + standalone receipts. | OK, but reversals/voids must respect locked period. | Add payment void/reversal flow with period lock. |

### Key business issue: "payment" is also a receipt document

For accounting, a contract payment is not just a contract event. It is a receipt document. Therefore `payments` must carry document-grade fields:

- `receipt_code`
- receipt status (`confirmed`/`voided`/`reversed`, or reliable `approved_by`)
- customer identity
- category
- payment method
- printable notes/content
- created/voided audit trail

At the UI level, finance should not force users to understand whether a receipt is stored in `payments` or `receipts`. The finance "Phiếu thu" surface should display both.

### Do not insert duplicate rows into both tables

Do not solve this by inserting the same contract collection into both `payments` and `receipts`. That would reintroduce V1-style double-count risk unless every dashboard/report excludes one of them perfectly.

Recommended model:

1. Keep `payments` as the write model for contract collections.
2. Keep `receipts` as the write model for standalone/sale receipts.
3. Add one read model/RPC/view, for example `finance_receipt_documents`, that unions:
   - `payments` as `source_table = 'payments'`
   - standalone `receipts` as `source_table = 'receipts'`
4. Make `/finance/receipts`, receipt stats, receipt export, and receipt print use that unified read model.

### Approval/status decision

Current ledger maps a contract payment as `pending` when `payments.approved_by IS NULL`. Since `createPaymentReceipt` does not set `approved_by`, normal contract receipts can look pending while contract debt is already reduced.

Decision needed:

- If there is no approval workflow: set `approved_by = created_by` during `process_contract_payment_v2`, or add a concrete `status = confirmed`.
- If approval is required: do not reduce contract `remaining_amount` until the payment is approved, or represent it as "pending receipt" and keep debt unchanged.

For MoodStudio's current workflow, the pragmatic rule should be: authorized contract collection is confirmed immediately.

### Phát sinh and reports

`updateTotal = true` currently increases contract total in the payment RPC. That affects P&L revenue, service distribution, and profit report, but it does not create a `contract_items` addon line. As a result, reports can classify extra charges as package revenue by accident.

Decision:

- `Phát sinh tăng HĐ` should create a contract addon/adjustment line item, then collect payment against the updated contract total.
- A payment alone should not be the only place where new revenue is introduced.

## Business Rules To Finalize

### P0 Rules

1. Contract payment source of truth is `contracts.remaining_amount`.
2. Normal payment amount must be `> 0` and `<= remaining_amount`.
3. Overpayment cannot happen in normal mode.
4. Fully paid contracts cannot open normal collection; they open `Phát sinh` mode only.
5. `Phát sinh` requires a reason and an explicit choice:
   - Increase contract total.
   - Keep as overpayment/adjustment.
6. Contract payments are written only through `process_contract_payment_v2`.
7. `payments` is the ledger for contract receipts in V2; `receipts` remains for non-contract receipts/sale receipts.
8. Category should be auto-derived:
   - deposit/plan deposit: `contract_deposit`
   - regular collection: `contract_payment`
   - extra charge: `contract_addon` or `contract_adjustment`
9. Finance receipt screens/reports must consume a unified receipt-document read model, not `receipts` table alone.
10. A confirmed contract payment must not appear as `pending` in cashflow/ledger.

### P1 Rules

1. Add plan-driven collect action: "Thu đợt này" on each unpaid plan.
2. Generic `Thu tiền` should start blank and offer quick chips:
   - `Còn lại`
   - `Theo đợt tiếp theo`
   - `Cọc 30%`
   - `Nhập khác`
3. If a selected plan is paid in full, mark that plan paid and link `receipt_id`.
4. If contract becomes fully paid, auto-reconcile unpaid plans as display-paid only if the accounting team accepts this rule. Otherwise show "HĐ đã thu đủ, kế hoạch chưa khớp" warning.
5. Generate stable receipt codes, for example `PT-2605-0001`.
6. For transfer payments, add optional transaction reference and later attach proof image.
7. Replace UTC date default with local Vietnam date helper.

## Recommended V2 Flow

### Flow A: Normal collection

1. User clicks `Thu tiền`.
2. Modal opens with amount blank.
3. User chooses amount manually or quick chip.
4. If amount exceeds remaining, block and offer `Chuyển sang phát sinh`.
5. Submit calls `process_contract_payment_v2`.
6. RPC locks contract, re-checks remaining, inserts payment, updates totals, updates selected plan if any, returns new financial state.

### Flow B: Collect a payment plan

1. User clicks `Thu đợt này` on an unpaid plan.
2. Modal opens with that plan selected and amount prefilled.
3. Server locks the payment plan and rejects it if already paid/cancelled.
4. If paid amount satisfies the plan amount, link `payment_plans.receipt_id = payment.id`.

### Flow C: Fully paid contract

1. Normal `Thu tiền` CTA is hidden or renamed to `Phát sinh`.
2. Modal shows warning: contract already fully paid.
3. User must enter reason.
4. User chooses whether the amount increases contract total.
5. RPC records a payment with `payment_stage = phat_sinh` and updates totals accordingly.

## Implementation Backlog

### P0

- Add DB guard in `process_contract_payment_v2`: reject `p_amount > current_remaining` when `p_update_total = false` and the contract is not already fully paid.
- Remove/disable non-atomic fallback in `createPaymentReceipt` for production.
- Stop auto-selecting first unpaid plan when the modal opens from generic `Thu tiền`.
- Make amount input blank-capable and keep submit disabled until amount is valid.
- Auto-select category by payment mode instead of asking the user.
- Use local date helper for payment date default.
- Generate `receipt_code` and a confirmed receipt status for contract payments.
- Add unified receipt-document query/RPC and switch `/finance/receipts`, receipt stats, receipt export, and receipt print to it.

### P1

- Add payment-plan collect action and initial selected plan wiring.
- Add stable receipt code generation.
- Add bank transfer reference field.
- Add payment history row action: view/print receipt.
- Add health checks:
  - `paid_amount > total_amount`
  - `remaining_amount < 0`
  - `payment_plan paid but missing receipt_id`
  - `contract paid full but unpaid plans remain`
  - `payment missing receipt_code`
  - `confirmed contract payment shown as pending`

## Final Decision

Use V2 atomic RPC as the only accounting write path. Adopt V1 smart-state UX and plan-driven collection, but make overpayment explicit instead of a confirm popup. Treat every contract payment as a receipt document even if it lives in `payments`, and expose it through a unified finance receipt read model. The first coding pass should be P0 only: server-side amount guard, safer modal defaults, state-aware CTA, auto category, local date, receipt code/status, unified receipt-document read model, and production removal of the non-atomic fallback.

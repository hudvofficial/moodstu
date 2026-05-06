# Phase 04: Reports, Export, Close, Cashflow Consistency

Status: Implemented locally
Risk: High
Estimate: 2h

## Goal

Unify definitions across finance surfaces so every receipt document and cashflow row is counted exactly once.

## Definitions

- Cash inflow = confirmed `payments.amount` + confirmed standalone/sale `receipts.receipt_amount`.
- Contract revenue/P&L = contract value basis, not raw cash collected.
- `Phát sinh tăng HĐ` must be represented as a contract addon/adjustment item before it changes contract revenue.
- Monthly close snapshot uses the same cash inflow definition as dashboard/cashflow.

## Tasks

- [ ] Update export receipts CSV to use unified receipt documents.
- [ ] Update print/detail routes to support both source types.
- [ ] Audit `finance_dashboard_metrics`, `finance_ledger`, `finance_ledger_range`, `finance_reports_snapshot`.
- [ ] Ensure receipt stats are unified after Phase 02.
- [ ] Ensure cashflow recent transactions route payments to a useful detail/print route, not generic `/finance/cashflow` only.
- [ ] Add/adjust `finance_receipt_documents` use in reports where receipt document count is needed.
- [ ] For `phat_sinh updateTotal`, create contract addon/adjustment data before/inside payment transaction or block until addon exists.

## Files

- `app/actions/export-actions.ts`
- `app/actions/finance-dashboard-queries.ts`
- `app/actions/finance-reports-queries.ts`
- `app/actions/finance-close-actions.ts`
- `components/finance/dashboard/recent-transactions.tsx`
- `app/(protected)/finance/receipts/[id]/page.tsx`
- `app/(protected)/finance/receipts/[id]/print/page.tsx`
- `components/finance/receipts/print-receipt-client.tsx`

## Acceptance Criteria

- Receipt export contains contract payments and standalone receipts exactly once.
- Receipt print works for a `payments` source row.
- Monthly close total inflow equals dashboard cash inflow for the same period.
- Reports cashflow total equals ledger inflow sum for the same period.
- `Phát sinh` is visible as addon/adjustment in profit breakdown.

## Tests

- [ ] Compare dashboard inflow vs ledger inflow vs close snapshot.
- [ ] Export receipts CSV after creating a contract payment.
- [ ] Print contract payment receipt.
- [ ] Reports show no double-count when both payments and standalone receipts exist.

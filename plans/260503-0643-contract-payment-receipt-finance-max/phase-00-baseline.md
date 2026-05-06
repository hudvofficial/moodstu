# Phase 00: Baseline + Contract Invariants Audit

Status: Covered by audit
Risk: Low
Estimate: 45m

## Goal

Freeze the current behavior before changing money flows. This phase prevents accidental regressions in finance/report pages while later phases change shared receipt logic.

## Tasks

- [ ] Capture current DB counts:
  - `payments` active count/sum by month.
  - standalone `receipts` active count/sum by month.
  - `receipts` with `contract_id IS NOT NULL`.
  - payments missing `receipt_code`.
  - payments with `approved_by IS NULL`.
- [ ] Capture current UI behavior:
  - `/contracts/[id]` thu tiền modal.
  - `/finance/receipts` list/stats.
  - `/finance/cashflow` ledger.
  - `/reports` snapshot.
  - monthly close snapshot.
- [ ] Identify migration prerequisites:
  - columns available on `payments`.
  - category codes available in `transaction_categories`.
  - print/detail routes expected data shape.
- [ ] Write a small QA fixture checklist with at least:
  - unpaid contract.
  - partially paid contract.
  - fully paid contract.
  - standalone receipt.
  - sale receipt.

## Acceptance Criteria

- Baseline notes exist in the phase file or linked QA report.
- No code behavior changes in this phase.
- We know whether existing production data needs backfill.

## Verification Commands

```powershell
rg -n "from\\(\"payments\"\\)|from\\(\"receipts\"\\)|finance_receipt_stats|finance_ledger|finance_reports_snapshot" app lib components supabase\migrations -S
```

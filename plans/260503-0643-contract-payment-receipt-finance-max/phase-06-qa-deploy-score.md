# Phase 06: QA, Benchmark, Deploy

Status: Local QA passed; target deploy pending
Risk: Medium
Estimate: 1.5h

## Goal

Verify the whole payment/receipt/report workflow end to end and deploy safely.

## QA Matrix

| Case | Expected |
| --- | --- |
| Unpaid contract, collect partial | Payment created, contract debt reduced, receipt document visible once. |
| Partial contract, collect remaining | Contract becomes fully paid, receipt printable, ledger confirmed. |
| Attempt overpay normal mode | UI blocks; DB rejects if bypassed. |
| Fully paid contract, create phát sinh | Requires reason; addon/adjustment represented; reports classify correctly. |
| Standalone receipt | Still creates in `receipts`, visible once in unified list. |
| Sale receipt | Receipt + inventory stay atomic, visible once. |
| Export receipts | Includes payments + receipts exactly once. |
| Monthly close | Snapshot matches cashflow inflow. |
| Void payment | Totals and plan state update atomically. |

## Performance Gates

- `/contracts/[id]` initial detail remains responsive.
- `/finance/receipts` uses RPC/pagination, no client-side full scan.
- Receipt stats do not run N+1 queries.
- Cashflow/reports do not duplicate heavy union logic in JS.

## Commands

```powershell
npm run lint
npm run build
node scripts/verify-contracts.mjs
```

Add focused scripts if needed:

```powershell
node scripts/verify-payment-receipt-flow.mjs
node scripts/verify-finance-receipt-documents.mjs
```

## Acceptance Criteria

- All QA matrix rows pass.
- Build/lint pass or documented pre-existing failures are isolated.
- Smoke production preview:
  - `/contracts`
  - `/contracts/[id]`
  - `/finance`
  - `/finance/receipts`
  - `/finance/cashflow`
  - `/reports`
- Final score >= 9.5/10 by rubric in `plan.md`.

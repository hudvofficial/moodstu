# Plan: Inventory Sale, Stock-Out, Contract Fulfillment + Report SSOT

Created: 2026-05-07
Status: Implemented / Supabase migration applied / production deployed / verified
Target Score: 9.5/10 production workflow

## Objective

Fix the inventory operation model so stock movement, retail sale, contract fulfillment, contract add-on sale, and reports use one clear business standard.

The current problem is not only UI. The domain is mixed:

- `stock_out` is a stock movement and should record cost/quantity.
- Retail sale needs selling price, payment method, receipt/revenue, and stock decrement.
- Contract fulfillment may have no extra revenue because the item is included in the contract/package.
- Contract add-on sale may create both revenue and a contract adjustment.
- Internal use, loss, sample, gift, or correction should not look like sales.

## Current Findings

- `inventory_items` already has `purchase_price`, `average_unit_price`, and `sale_price`, but the workflow does not clearly decide which item can be sold, fulfilled to a contract, or used internally.
- `inventory_stock_out_atomic` writes `inventory_transactions.stock_out` using `average_unit_price`. That is valid for cost of goods, but not enough for retail sale because it has no structured sale price or payment record.
- `create_sale_receipt_atomic` exists and atomically creates a receipt plus stock-out, but its item payload calls selling price `unit_cost`. The DB then stores real cost in `inventory_transactions.unit_cost` and pushes sale price into `notes`. That is fragile for reports.
- The current stock-out modal patch is interim only. It should be replaced by a planned flow split rather than expanded further.
- Reports and dashboards consume `receipts`, `payments`, `inventory_transactions`, and contract data. Any change must preserve cashflow, revenue, COGS, margin, inventory valuation, and contract profitability definitions.

## Business Taxonomy

Inventory should cover stocked products/materials only:

| Type | Examples | Allowed flows |
| --- | --- | --- |
| Sellable product | thiep, album, frame, small retail items | retail sale, contract add-on sale, contract fulfillment if included |
| Contract deliverable | album, printed product, invitation package | contract fulfillment, add-on sale |
| Consumable/internal material | paper, ink, packaging, supplies | stock-in, internal use, loss/correction |
| Operational supply | bag, box, cleaning item | stock-in, internal use |
| Excluded from inventory | dress assets, labor/service packages, pure service | handled by dress/service/contract modules |

Phase 01 must decide whether to encode this as `item_kind`, `sales_enabled`, and/or stricter categories. UI labels alone are not enough.

## Flow Matrix

| Flow | Business meaning | Required fields | Money write | Stock write | Report effect |
| --- | --- | --- | --- | --- | --- |
| Stock in | Buy/import inventory | item, qty, unit cost, supplier/reason | none | `stock_in` with cost; update avg cost | inventory value up |
| Contract fulfillment | Item delivered as part of contract | contract, item, qty, optional note | no new receipt | `stock_out` with avg cost and contract link | COGS for contract profit, no extra revenue |
| Retail sale | Walk-in/customer buys item without contract | customer optional, item, qty, selling price, payment method | standalone receipt | atomic `stock_out` with cost and receipt link | revenue/cash/COGS/margin |
| Contract add-on sale | Customer buys extra item tied to contract | contract, item, qty, selling price, payment method/payment state | contract adjustment/payment or linked receipt | atomic `stock_out` with cost and contract/source link | contract revenue/cash/COGS/margin |
| Internal use | Used by studio, sample, gift, marketing | item, qty, reason | none or expense/loss bucket later | `stock_out` with cost and reason | internal consumption/loss, no revenue |
| Loss/correction | Damaged/lost/count correction | item, qty, reason, approval | none | `stock_out` or correction entry | shrinkage/loss, audit visible |
| Return/refund | Customer returns sold item | original source, qty, refund decision | reversal/refund if needed | stock-in/reversal | restores stock, reverses revenue/COGS safely |

## Core Decisions

1. Do not use contract lookup as the only "xuat cho" path. Walk-in retail sale must not need a fake contract.
2. Do not allow retail sale without a selling price and payment method.
3. Do not show `average_unit_price` as the operator's price input. It is cost, not sale price.
4. Contract fulfillment must not create extra revenue unless the user explicitly chooses add-on sale.
5. Contract add-on sale must create a traceable finance record and a stock movement in one atomic operation.
6. Sale price and cost must be separate structured fields. Do not store sale price only inside `notes`.
7. Reports must define revenue, cash, COGS, margin, loss, and inventory value from shared source rules.
8. Existing historical data must remain readable. Backfill should classify old rows without rewriting business history blindly.

## Affected Surfaces

- Inventory UI: `/inventory`, stock-in/out modal, item detail drawer/page, transaction history.
- Finance UI: `/finance`, `/finance/receipts`, receipt detail/print/export.
- Reports UI: `/reports`, service/product distribution, revenue, cost, margin, cashflow.
- Dashboard UI: `/dashboard` widgets that surface receivables, recent money, and operational reminders.
- Contract UI: `/contracts/[id]` financial summary, add-ons, payment receipts, detail dashboard.
- Server actions:
  - `app/actions/inventory-mutations.ts`
  - `app/actions/inventory-queries.ts`
  - `app/actions/receipt-actions.ts`
  - `app/actions/finance-*-queries.ts`
  - `app/actions/payment-actions.ts`
- Types/schemas:
  - `types/inventory.ts`
  - `types/database.types.ts`
  - `lib/validations/inventory.schema.ts`
  - `lib/validations/finance.schema.ts`
- DB/RPC:
  - `inventory_items`
  - `inventory_transactions`
  - `receipts`
  - `payments`
  - `contract_items`
  - `inventory_stock_in_atomic`
  - `inventory_stock_out_atomic`
  - `create_sale_receipt_atomic`

## Data Contract Direction

Target model to validate in Phase 01/02:

- Keep `inventory_transactions.unit_cost` as cost basis.
- Add structured source metadata:
  - `source_type`: `stock_in`, `contract_fulfillment`, `retail_sale`, `contract_addon_sale`, `internal_use`, `loss_adjustment`, `correction`, `return`
  - `source_id`: receipt/payment/contract_item/reversal id when applicable
  - `contract_id`: only when truly tied to a contract
  - `customer_name`, `customer_phone`, optional address for non-contract sale
- Add structured sale metadata where needed:
  - `sale_unit_price`
  - `sale_total`
  - `payment_method`
  - `receipt_id` or `payment_id`
- Add item operation flags if needed:
  - `item_kind`
  - `sales_enabled`
  - `contract_fulfillment_enabled`
  - `default_sale_price`

Migration must be additive first. Existing columns and existing readers stay compatible until all consumers move.

## Report SSOT

Shared definitions:

- Revenue: confirmed receipts/payments only. Plain stock-out never creates revenue.
- Cashflow: actual confirmed payment/receipt date and payment method.
- COGS: inventory stock-out cost, grouped by `source_type`.
- Retail gross margin: retail sale revenue minus linked retail-sale COGS.
- Contract profit: contract revenue plus add-on revenue minus contract fulfillment/add-on COGS and contract expenses.
- Internal loss/usage: stock-out cost with internal/loss source type, excluded from revenue margin.
- Inventory valuation: current stock times average unit cost, not sale price.

Reports must not infer sale revenue from inventory `notes`.

## Phases

| Phase | Name | Status | Risk | Deliverable |
| --- | --- | --- | --- | --- |
| 00 | Baseline Audit + Flow Freeze | Planned | Medium | Current write/read map, sample data scan, no more modal expansion |
| 01 | Business Rule SSOT | Planned | High | Approved taxonomy, flow matrix, field requirements, permission rules |
| 02 | Data Contract + Migration Plan | Planned | High | Additive schema/RPC contract, backfill strategy, indexes, rollback notes |
| 03 | Atomic Server Workflows | Planned | High | Split server actions/RPCs for fulfillment, retail sale, add-on sale, internal use |
| 04 | Inventory UI Rebuild | Planned | Medium | Mode-based modal/page flow with correct fields per business case |
| 05 | Finance + Reports Integration | Planned | High | Revenue/cash/COGS/margin/report/export consistency |
| 06 | Backfill + Health Checks | Planned | High | Historical row classification, drift checks, Sentry-safe validation |
| 07 | QA Matrix + Performance Smoke | Planned | Medium | Real workflow smoke on inventory/contract/finance/reports/dashboard |
| 08 | Deploy + Monitor | Planned | Medium | Migration deploy, app deploy, Sentry and data-product monitoring |

## Phase Details

### Phase 00 - Baseline Audit + Flow Freeze

- Freeze further stock-out UX expansion until rules are signed off.
- Audit current production/staging data:
  - item categories and sale prices
  - stock-out rows with/without contract/customer
  - sale receipts and linked inventory transactions
  - report consumers using inventory cost/revenue
- Produce a call graph from UI -> server action -> RPC/table -> report consumer.
- Decide whether the current interim modal needs a short-term guard, for example hiding walk-in from plain stock-out before the full rebuild.

Gate: no behavior change beyond urgent guardrails.

### Phase 01 - Business Rule SSOT

- Finalize item taxonomy and allowed flows.
- Define required fields per flow.
- Define role permissions:
  - who can see cost
  - who can discount/change sale price
  - who can write loss/correction
  - who can create contract add-on sale
- Decide contract add-on accounting:
  - preferred: create/attach contract item adjustment, then collect payment through contract/receipt path
  - acceptable alternative: standalone receipt linked to contract with explicit `source_type`
- Define reversal/return policy.

Gate: signed flow matrix before DB/UI work.

### Phase 02 - Data Contract + Migration Plan

- Add source metadata and sale fields additively.
- Keep old RPC/function signatures until UI migration is complete.
- Add indexes for:
  - `inventory_transactions(source_type, created_at)`
  - `inventory_transactions(source_id)`
  - `inventory_transactions(contract_id, created_at)`
  - receipt/payment joins used by reports
- Generate database types after migration.
- Write backfill SQL as a separate, reviewable migration:
  - existing `contract_id` stock-outs -> likely `contract_fulfillment`
  - existing sale receipt stock-outs with receipt note -> likely `retail_sale`
  - customer-only stock-outs without receipt -> flagged as `unclassified_stock_out`
  - plain stock-outs -> `internal_use` or `unclassified_stock_out` depending reason

Gate: migration is additive, reversible by ignoring new columns, and has health checks.

### Phase 03 - Atomic Server Workflows

Create explicit server/RPC paths:

- `stockInAtomic`: unchanged direction, with validation cleanup.
- `stockOutContractFulfillmentAtomic`: contract + item + qty; no receipt.
- `createInventoryRetailSaleAtomic`: receipt + stock decrement + sale price/cost links.
- `createContractInventoryAddonAtomic`: contract adjustment/payment-or-receipt + stock decrement.
- `stockOutInternalAtomic`: item + qty + approved reason; no receipt.
- `reverseInventorySaleAtomic` or documented reversal path.

Guardrails:

- `FOR UPDATE` inventory row lock for all stock-changing flows.
- Reject negative stock.
- Reject sale total mismatch.
- Check finance period lock for money writes.
- Revalidate `/inventory`, `/finance`, `/finance/receipts`, `/reports`, `/dashboard`, and contract detail when relevant.
- Audit log must name the business action, not only `CREATE inventory_transactions`.

Gate: server tests or SQL smoke cover each flow.

### Phase 04 - Inventory UI Rebuild

Replace one overloaded modal with a mode-based workflow:

- `Xuat cho hop dong`: search/select contract, item, qty, notes; show cost only to authorized roles.
- `Ban le`: customer optional, item, qty, selling price defaulted from `sale_price`, payment method, receipt date.
- `Ban them cho hop dong`: contract, item, qty, selling price, payment state/method.
- `Noi bo / hao hut`: item, qty, reason, approval hint.

UI requirements:

- The first field changes by mode; no fake contract for walk-in customer.
- Sale price label must say selling price, not cost.
- Cost and margin are secondary finance info, hidden for non-finance roles.
- Disable invalid flow based on item flags.
- Show exact report impact before submit in a compact summary row.

Gate: manual smoke on desktop/mobile and no ambiguous price labels.

### Phase 05 - Finance + Reports Integration

- Update finance receipt list/detail/export to show retail/add-on item sales consistently.
- Update `/reports`:
  - revenue by receipt/payment source
  - COGS by inventory source type
  - retail margin
  - contract item/add-on margin
  - internal loss/usage
  - inventory valuation
- Update `/dashboard` widgets only through shared report helpers, not ad hoc sums.
- Ensure service distribution/report labels do not expose raw technical identifiers.
- Add report health sections for unclassified stock-outs and sale transactions without linked receipt.

Gate: known sample scenarios reconcile across finance, inventory, reports, dashboard.

### Phase 06 - Backfill + Health Checks

- Classify historical transactions with conservative rules.
- Do not rewrite sale amounts from notes unless parser confidence is high; otherwise flag for review.
- Add health checks:
  - retail sale stock-out without receipt/source link
  - receipt sale without matching inventory transaction
  - contract fulfillment without contract
  - sale price missing on sale source type
  - negative stock impossible check
  - unclassified stock-out count
- Add Sentry breadcrumbs around failed RPC/action paths.

Gate: health checks return zero critical issues, or known issues are documented with IDs.

### Phase 07 - QA Matrix + Performance Smoke

Smoke scenarios:

- Create sellable item with opening stock and sale price.
- Retail sale to walk-in customer.
- Retail sale with insufficient stock.
- Contract fulfillment for included item.
- Contract add-on sale and payment.
- Internal use/loss.
- Return/reversal if included in scope.
- Finance receipt print/export.
- `/reports` margin/cashflow reconciliation.
- `/dashboard` refresh after sale/stock-out.
- Period lock rejects money write in locked month.
- Concurrent sale attempts cannot oversell stock.

Performance:

- Inventory picker must be paginated/search-indexed.
- Reports must avoid client N+1 across receipts and transactions.
- No full-table client fetch for dashboard/report widgets.

Gate: `tsc`, lint/build, targeted SQL smoke, UI smoke, and Sentry check.

### Phase 08 - Deploy + Monitor

- Deploy migrations first.
- Regenerate DB types.
- Deploy app behind completed data contract.
- Monitor:
  - Sentry errors on inventory actions
  - Supabase RPC/schema cache errors
  - health-check output
  - report totals before/after
  - slow query logs for reports/inventory picker
- Keep rollback path:
  - old read paths tolerate new columns
  - old stock-out RPC remains until UI is fully migrated
  - no destructive migration in first deploy

## Definition Of Done

- Walk-in retail sale can be completed without contract and creates a receipt plus stock decrement atomically.
- Retail/add-on sale cannot submit without selling price and payment method.
- Contract fulfillment reduces stock and affects COGS/contract profit, but does not create duplicate revenue.
- Contract add-on sale is traceable from contract, inventory, receipt/payment, and reports.
- Internal/loss stock-out is separated from sales and excluded from revenue margin.
- Reports can reconcile revenue, cash, COGS, margin, inventory value, and contract profit from structured fields.
- Existing historical data remains readable and unclassified risky rows are surfaced.
- No report relies on sale price stored inside `notes`.
- UI labels distinguish `Gia ban` from `Gia von`.
- Sentry has no new production errors from inventory/finance/report paths after deploy.

## Non-Goals

- Do not rebuild the whole finance module in this pass.
- Do not merge dress asset inventory into consumable/product inventory.
- Do not add external accounting integration.
- Do not rewrite historical finance numbers without explicit review.
- Do not make contract mandatory for retail sale.

## Immediate Next Step

Phase 00 should be executed first:

1. Run production/staging data scan for inventory item categories, sale prices, stock-out reasons, contract links, and receipt-linked sales.
2. Produce a small audit report with real counts and examples.
3. Confirm the final business taxonomy and add-on accounting decision before writing the migration.

## Implementation Progress 2026-05-07

Phase 00-04 critical guardrails implemented locally:

- Added additive migration `20260507103000_inventory_sale_stockout_source_contract.sql`.
- Added structured inventory transaction fields: `source_type`, `source_id`, `receipt_id`, `sale_unit_price`, `sale_total`, `payment_method`.
- Reworked `create_sale_receipt_atomic` so sale price is stored as `sale_unit_price/sale_total`; `unit_cost` remains cost basis.
- Reworked `inventory_stock_out_atomic` classification:
  - contract stock-out -> `contract_fulfillment`
  - non-contract stock-out -> `internal_use`
  - stock-in -> `stock_in`
- Added conservative historical backfill for old receipt-linked sale stock-outs.
- Added `createInventoryRetailSale` server action so `/inventory` can sell walk-in items without fake contract while still creating receipt + stock decrement atomically.
- Updated `/inventory` stock-out modal into explicit modes:
  - `Bán lẻ`: requires sale price, payment method, receipt date.
  - `Xuất HĐ`: requires a real contract and creates no extra revenue.
  - `Nội bộ`: requires reason and creates no revenue.
- Updated finance sale item selector to use `Giá bán` and `sale_unit_price`.
- Updated inventory detail/drawer transaction tables to show source label plus separate `Giá vốn` and `Giá bán`.
- Added report label mappings for sale/stock source types.

Verification:

- `npx tsc --noEmit` passed.
- Targeted `npx eslint ...` passed.
- `npm run build` passed.
- `npm run verify:inventory` passed.

Deployment:

- Applied Supabase migration `20260507103000_inventory_sale_stockout_source_contract.sql` to linked remote on 2026-05-07.
- Remote migration history now includes `20260507103000`.
- Post-migration `npm run verify:inventory` passed against remote.

Phase 05-08 closeout 2026-05-07:

- Added Supabase migration `20260507123000_inventory_contract_addon_reports.sql`.
- Added atomic contract add-on inventory sale flow:
  - validates contract, item, stock, sale price, payment method, and finance period lock
  - creates contract add-on item
  - creates contract adjustment/payment record
  - writes linked inventory `stock_out` with structured sale price, cost, source metadata, and contract id
  - updates inventory stock and contract totals/payment status in one RPC
- Added inventory restore triggers for voided retail sale receipts and voided contract add-on payments.
- Updated `/inventory` stock-out modal modes:
  - retail sale
  - contract fulfillment
  - contract add-on sale
  - internal use
- Hardened plain stock-out guardrails:
  - customer-only sale data is rejected from generic stock-out
  - non-contract internal stock-out must include a reason
  - retail/add-on sale must use dedicated sale flows with selling price and payment method
- Updated receipt mutation rules:
  - inventory sale receipts revalidate inventory/reports/dashboard
  - direct editing of inventory sale receipts is blocked so stock and finance cannot drift
- Updated finance and reports:
  - `finance_contract_profit_report` now includes `inventory_cost`
  - reports snapshot includes `summary.inventoryCost`
  - contract profit detail drawer lists inventory COGS rows
  - profit table shows inventory cost as part of total cost
  - `/reports` overview and export include inventory COGS separately

Verification closeout:

- Applied Supabase migration `20260507123000_inventory_contract_addon_reports.sql` to linked remote on 2026-05-07.
- Remote migration history includes both `20260507103000` and `20260507123000`.
- `npm run verify:inventory` passed.
- `npm run verify:reports` passed.
- `npx tsc --noEmit` passed.
- Targeted `npx eslint ...` passed.
- `npm run build` passed.

Production deploy closeout:

- Deployed production via Vercel on 2026-05-07.
- Production URL: `https://stu.moodwedding.com`
- Deployment URL: `https://project-v9q6z-94f4o8uoa-moodstu.vercel.app`
- Vercel build completed successfully.
- `npm run smoke:production` passed.

Remaining:

- Monitor Sentry and production inventory/report flows after real usage data lands.

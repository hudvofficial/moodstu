# Phase 02: Unified Receipt Documents Read Model

Status: Implemented locally
Risk: High
Estimate: 3h

## Goal

Make finance "Phiếu thu" mean all receipt documents, regardless of whether the write model is `payments` or `receipts`.

## Design

Create a unified read model/RPC, tentatively:

- `finance_receipt_documents`
- `finance_receipt_document_stats`
- `get_finance_receipt_document(p_source_table, p_id)`

Unified row fields:

- `id`
- `source_table`: `payments` | `receipts`
- `receipt_code`
- `receipt_date`
- `receipt_type`
- `payment_method`
- `contract_id`
- `contract_code`
- `customer_name`
- `amount`
- `total_amount`
- `remaining_amount`
- `category_id`
- `category_name`
- `status`
- `notes`
- `created_at`
- `updated_at`

## Tasks

- [ ] Add SQL RPC/view unioning:
  - `payments` as contract receipt documents.
  - `receipts` where `contract_id IS NULL` as standalone/sale receipt documents.
- [ ] Exclude soft-deleted rows.
- [ ] Join contracts/customers/categories for payment rows.
- [ ] Add pagination, month/year filters, receipt type filters, search.
- [ ] Replace `fetchReceipts` to use unified model.
- [ ] Replace `fetchReceiptStats` to count unified model.
- [ ] Update `ReceiptListItem` type to include `source_table`.
- [ ] Update receipt row actions to pass source identity.
- [ ] Keep `createReceipt` write routing:
  - contract type -> `createPaymentReceipt`
  - standalone/sale -> `receipts`

## Files

- `app/actions/finance-operations-queries.ts`
- `components/finance/receipts/*`
- `types/finance-operations.ts`
- `supabase/migrations/<new>_finance_receipt_documents.sql`

## Acceptance Criteria

- `/finance/receipts` lists both contract payments and standalone receipts.
- Receipt stats include both sources.
- Contract payment row does not duplicate with standalone receipts.
- Search by contract code/customer/category works for both sources.
- Pagination remains server-side/RPC-backed.

## Tests

- [ ] Create contract payment, verify it appears in `/finance/receipts`.
- [ ] Create standalone receipt, verify it appears once.
- [ ] Create sale receipt, verify inventory and receipt row still work.
- [ ] Month filter counts both sources.
- [ ] CSV after Phase 04 exports both sources.

# Phase 02: Server Actions (Backend)
Status: ✅ Complete
Dependencies: Phase 01 (Types ready) ✅

## Objective
Backend mutations + queries cho Contract CRUD.
Port V1 logic (atomic, validated) → V2 server actions.

## Tasks

### 2.1. `contract-mutations.ts` (~170 lines) ✅
- [x] submitContract — Zod validate, optimistic lock, upsert + items + payment
- [x] getNextContractCode — HĐ-YYYY-XXXX format
- [x] updateContractStatus — simple status change
- [x] Added: transaction_type, per-item discount, inventory_item_id, updated_by

### 2.2. `contract-lifecycle.ts` (~135 lines) ✅ NEW
- [x] cancelContract — cascade to tasks + prints + plans
- [x] deleteContract — block if hasReceipts, soft delete
- [x] reactivateContract — reverse cancel, restore tasks

### 2.3. `contract-queries.ts` (~165 lines) ✅ NEW
- [x] searchCustomers — ILIKE autocomplete (top 10)
- [x] getContractForEdit — full prefill with items mapping
- [x] searchAddonHistory — autocomplete for addons
- [x] upsertAddonHistory — usage tracking
- [x] getAvailableServices — services for ItemModal

### 2.4. RPC functions ⏳ Deferred
- Note: RPCs deferred — server actions handle atomicity via sequential calls.
  Will create RPCs if needed for true atomicity later.

## Test Criteria
- [x] `tsc --noEmit` passes ✅ Zero errors
- [x] submitContract with optimistic lock logic ✅
- [x] cancelContract cascades to tasks + prints ✅
- [x] deleteContract blocks when hasReceipts ✅
- [x] searchCustomers returns correct shape ✅

---
Next Phase: → phase-03-core-hooks.md

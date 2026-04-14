# Phase 03: Soft-Delete Filters (TS Fallbacks)
Status: ⬜ Pending
Dependencies: Phase 01 (RPC migration đã fix SQL side)

## Objective
Fix soft-delete filtering trong TypeScript fallback functions. Phase 01 đã fix RPCs trong SQL, phase này fix TS fallbacks để cả 2 paths đều exclude soft-deleted receipts.

## Requirements
### Functional
- [ ] `getDashboardMetricsFallback()` — receipts queries thêm `.is("deleted_at", null)`
- [ ] `getRevenueByMonthFallback()` — receipts query thêm `.is("deleted_at", null)`
- [ ] `fetchLedgerFallback()` — receipts query thêm `.is("deleted_at", null)`

## Implementation Steps

### Step 1: Fix `getDashboardMetricsFallback()`

**File:** `app/actions/finance-dashboard-queries.ts`
**Lines:** 62, 65

```diff
 // Line 62: current month receipts
-    supabase.from("receipts").select("receipt_amount").is("contract_id", null).gte("receipt_date", current.start).lt("receipt_date", current.end),
+    supabase.from("receipts").select("receipt_amount").is("deleted_at", null).is("contract_id", null).gte("receipt_date", current.start).lt("receipt_date", current.end),

 // Line 65: previous month receipts
-    supabase.from("receipts").select("receipt_amount").is("contract_id", null).gte("receipt_date", previous.start).lt("receipt_date", previous.end),
+    supabase.from("receipts").select("receipt_amount").is("deleted_at", null).is("contract_id", null).gte("receipt_date", previous.start).lt("receipt_date", previous.end),
```

### Step 2: Fix `getRevenueByMonthFallback()`

**File:** `app/actions/finance-dashboard-queries.ts`
**Line:** 94

```diff
-    supabase.from("receipts").select("receipt_date, receipt_amount").is("contract_id", null).gte("receipt_date", start).lt("receipt_date", end),
+    supabase.from("receipts").select("receipt_date, receipt_amount").is("deleted_at", null).is("contract_id", null).gte("receipt_date", start).lt("receipt_date", end),
```

### Step 3: Fix `fetchLedgerFallback()`

**File:** `app/actions/finance-dashboard-queries.ts`
**Line:** 242

```diff
-  let receiptsQuery = supabase.from("receipts").select("id, receipt_date, receipt_amount, contract_code, customer_name, category_name, payment_type, notes, status, created_at").is("deleted_at", null);
```

> Hmm — line 242 ALREADY HAS `.is("deleted_at", null)`. Verify this is correct:
> `let receiptsQuery = supabase.from("receipts").select(...).is("deleted_at", null);`
> ✅ This is correct — no change needed for ledger fallback.

**Net fix: 3 lines in getDashboardMetricsFallback + getRevenueByMonthFallback**

## Files to Create/Modify
- `app/actions/finance-dashboard-queries.ts` — [MODIFY] 3 lines

## Test Criteria
- [ ] Soft-delete 1 receipt → dashboard KPI totalInflow KHÔNG bao gồm nó
- [ ] Revenue by month chart không tính receipt đã soft-delete
- [ ] Ledger fallback không hiển thị receipt đã soft-delete

---
Next Phase: [Phase 04 — Expense Field Fix](phase-04-expense-field.md)

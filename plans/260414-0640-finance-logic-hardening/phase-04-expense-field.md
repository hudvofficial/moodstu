# Phase 04: Expense Field Fix (Profit Drawer)
Status: ⬜ Pending
Dependencies: None

## Objective
Fix lỗi `expenses` table có `expense_date`, nhưng `getContractFinanceDetails()` select `transaction_date` (không tồn tại) → drawer chi phí hợp đồng trả về null date.

## Requirements
### Functional
- [ ] Query select `expense_date` thay vì `transaction_date`
- [ ] Map sang type `OperationalExpense.transaction_date` đúng giá trị

## Implementation Steps

### Step 1: Fix select query

**File:** `app/actions/finance-dashboard-queries.ts`
**Line:** 521

```diff
-      supabase.from("expenses").select("id, description, amount, transaction_date").eq("contract_id", contractId).is("deleted_at", null).not("description", "like", "[Auto-Print]%"),
+      supabase.from("expenses").select("id, description, amount, expense_date").eq("contract_id", contractId).is("deleted_at", null).not("description", "like", "[Auto-Print]%"),
```

### Step 2: Fix mapping

**File:** `app/actions/finance-dashboard-queries.ts`
**Line:** 568

```diff
-        transaction_date: asString(e.transaction_date) || undefined,
+        transaction_date: asString(e.expense_date) || undefined,
```

> **Giữ nguyên** type interface `OperationalExpense.transaction_date` — đây là display name, mapping từ DB field `expense_date`.

## Files to Create/Modify
- `app/actions/finance-dashboard-queries.ts` — [MODIFY] 2 lines

## Test Criteria
- [ ] Profit drawer hiện ngày chi phí đúng (không null/undefined)
- [ ] TypeScript compile pass (`npx tsc --noEmit`)

---
Next Phase: [Phase 05 — Receipt Stats Status](phase-05-receipt-stats.md)

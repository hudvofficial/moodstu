# Vendor Debts Feature Audit Report
**Date:** 2026-05-25  
**Feature:** /finance/vendor-debts  
**Scope:** Business Logic & Performance Analysis

---

## Executive Summary

✅ **Overall Status:** Good foundation with several critical issues requiring attention  
🔴 **Critical Issues:** 3  
🟡 **Moderate Issues:** 5  
🟢 **Minor Issues:** 4

---

## 1. BUSINESS LOGIC ISSUES

### 🔴 CRITICAL #1: Incorrect "Overdue Tasks" Calculation
**File:** [vendor-debts-stats-bar.tsx:22](components/finance/vendor-debts/vendor-debts-stats-bar.tsx#L22)

```typescript
// WRONG: comparing last_task_date with today
const overdueTasks = debts.filter((d) => d.last_task_date && d.last_task_date < today).length;
```

**Problem:**
- `last_task_date` is the date of the most recent task, NOT the deadline
- This shows vendors whose last task was in the past, not overdue tasks
- Misleading metric for payment urgency

**Impact:** Business users cannot identify which vendors have overdue unpaid tasks

**Fix Required:**
```typescript
// Need to query actual task deadlines from work_tasks
// Either add deadline info to VendorDebtItem or fetch separately
```

---

### 🔴 CRITICAL #2: FIFO Allocation Logic Mismatch
**Files:** 
- [vendor-payment-modal.tsx:107-112](components/finance/vendor-debts/vendor-payment-modal.tsx#L107-L112) (Frontend)
- [20260527000001_vendor_payment_rpcs.sql:231-237](supabase/migrations/20260527000001_vendor_payment_rpcs.sql#L231-L237) (Backend)

**Frontend FIFO:**
```typescript
const sortedTasks = [...unpaidTasks].sort((a, b) => {
  const dateA = a.deadline ? new Date(a.deadline).getTime() : Date.now();
  const dateB = b.deadline ? new Date(b.deadline).getTime() : Date.now();
  return dateA - dateB; // oldest deadline first
});
```

**Backend FIFO:**
```sql
ORDER BY deadline NULLS LAST, created_at NULLS LAST, id
```

**Problem:**
1. **Frontend:** Tasks with NULL deadline use `Date.now()` (treated as recent)
2. **Backend:** Tasks with NULL deadline go to the end (`NULLS LAST`)
3. **Result:** Preview doesn't match actual allocation!

**Business Impact:** User sees different allocation preview than what actually happens

**Fix Required:** Align both to use `NULLS LAST` or decide on a consistent NULL handling strategy

---

### 🔴 CRITICAL #3: Missing Transaction Rollback on Partial Failure
**File:** [vendor-payment-actions.ts:132-144](app/actions/vendor-payment-actions.ts#L132-L144)

**Problem:**
```typescript
// Call RPC (this creates payment + allocations)
const { data: result, error } = await supabase.rpc("record_vendor_payment_atomic", {...});

if (error || !result) {
  throw new Error(`Không thể ghi nhận thanh toán: ${error?.message || "Unknown"}`);
}

// Audit log happens AFTER RPC
await writeAuditLog({...});
```

**Issue:** If `writeAuditLog` fails, payment is recorded but audit log is missing. While the RPC is atomic, the action is not fully atomic.

**Fix:** Wrap the entire operation or move audit logging inside the RPC, or accept this risk with proper error logging.

---

### 🟡 MODERATE #4: "Đã trả (all time)" Label Incorrect
**File:** [vendor-debts-stats-bar.tsx:41](components/finance/vendor-debts/vendor-debts-stats-bar.tsx#L41)

```typescript
const totalPaidThisMonth = debts.reduce((sum, d) => {
  // Calculate paid this month (simplified - in reality would need date filtering)
  return sum + d.total_paid;
}, 0);
```

**Problem:** 
- Variable named `totalPaidThisMonth` but actually shows all-time total
- Label says "Đã trả (all time)" but comment acknowledges it's not filtered by month
- Misleading financial metric

**Fix:** Either filter by month properly or rename to "Tổng đã thanh toán"

---

### 🟡 MODERATE #5: Manual Allocation Amount Validation Gap
**File:** [vendor-payment-modal.tsx:175-178](components/finance/vendor-debts/vendor-payment-modal.tsx#L175-L178)

**Frontend validation:**
```typescript
if (selectionMode === "manual" && selectedTaskIds.size === 0) {
  toast.error("Vui lòng chọn ít nhất 1 task để thanh toán");
  return;
}
```

**Backend validation:**
```sql
IF v_alloc_amount <= 0 OR v_alloc_amount > v_remaining THEN
  RAISE EXCEPTION 'Số tiền phân bổ không hợp lệ cho task %', v_task_id;
END IF;
```

**Problem:** 
- Frontend doesn't validate if `amount` equals `selectedTasksTotal`
- User can enter amount that doesn't match selected tasks
- Warning shown but submission allowed (line 245-249)

**Business Risk:** User pays 500k but selects tasks totaling 300k → 200k unallocated

**Fix:** Add validation:
```typescript
if (selectionMode === "manual" && amount !== selectedTasksTotal) {
  toast.error(`Số tiền phải bằng tổng tasks đã chọn (${formatCurrency(selectedTasksTotal)}đ)`);
  return;
}
```

---

### 🟡 MODERATE #6: Race Condition on SWR Cache Invalidation
**File:** [vendor-debts-client.tsx:76-83](components/finance/vendor-debts/vendor-debts-client.tsx#L76-L83)

```typescript
const handlePaymentSuccess = useCallback(async () => {
  await Promise.all([
    revalidate(),
    invalidateFinanceAfterWrite({}),
    mutate("finance-salaries"),
    mutate("finance-dashboard"),
  ]);
  toast.success("Đã cập nhật công nợ");
}, [revalidate]);
```

**Problem:**
- Toast shows immediately after cache invalidation starts
- If revalidation fails silently, user sees success but data isn't updated
- No error handling for failed revalidations

**Fix:** Add error handling and conditional toast

---

### 🟢 MINOR #7: Inconsistent Date Formatting
**Files:** Multiple

**Issues:**
- Stats bar uses `last_task_date` (full date)
- Desktop table uses `toLocaleDateString("vi-VN")` (full format)
- Mobile list uses `toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })` (short format)

**Recommendation:** Standardize date formats across UI or document the pattern

---

### 🟢 MINOR #8: Empty State Logic Duplication
**Files:** 
- [vendor-debts-desktop-table.tsx:71-76](components/finance/vendor-debts/vendor-debts-desktop-table.tsx#L71-L76)
- [vendor-debts-client.tsx:156-168](components/finance/vendor-debts/vendor-debts-client.tsx#L156-L168)

Both components handle empty state independently. Consider consolidating.

---

## 2. PERFORMANCE ISSUES

### 🔴 CRITICAL #9: N+1 Query Pattern in Frontend
**File:** [vendor-debts-client.tsx:48-56](components/finance/vendor-debts/vendor-debts-client.tsx#L48-L56)

**Problem:**
```typescript
const { data, isLoading, mutate: revalidate } = useSWR(
  key,
  () => requireData(fetchVendorDebtSummary()),
  {
    fallbackData: initialData,
    revalidateOnFocus: true, // ❌ Expensive!
  }
);
```

**Issue:** 
- `revalidateOnFocus: true` causes RPC to run every time user switches tabs
- The RPC `finance_vendor_debt_summary` is complex with multiple CTEs
- No benefit for data that rarely changes during a session

**Impact:** Unnecessary database load, especially for multi-tab users

**Fix:** Change to `revalidateOnFocus: false` and rely on manual refresh

---

### 🟡 MODERATE #10: Inefficient Task Fetching in Payment Modal
**File:** [vendor-payment-modal.tsx:83-87](components/finance/vendor-debts/vendor-payment-modal.tsx#L83-L87)

```typescript
const { data: tasksResult, isLoading } = useSWR(
  vendorId ? ["vendor-unpaid-tasks", vendorId] : null,
  () => fetchVendorUnpaidTasks(vendorId!),
  { revalidateOnMount: true }
);
```

**Backend query:**
```typescript
// app/actions/vendor-payment-actions.ts:196-212
.select(`
  id, contract_id, work_type, deadline, cost,
  contracts!inner(contract_code)
`)
.eq("vendor_id", vendorId)
.eq("status", "hoan_thanh")
.gt("cost", 0)
.order("deadline", { ascending: true, nullsFirst: false });
```

**Then fetches allocations separately:**
```typescript
const { data: allocations } = await supabase
  .from("vendor_payment_allocations")
  .select("work_task_id, amount")
  .in("work_task_id", taskIds);
```

**Problem:** Two separate queries when could be a JOIN or RPC

**Performance:** For 50 tasks → 2 queries. Could be 1 query or use existing `finance_vendor_debt_summary` data

**Fix:** Create RPC `fetch_vendor_unpaid_tasks(vendor_id)` that returns tasks with pre-calculated remaining amounts

---

### 🟡 MODERATE #11: Vendor Costs Query Missing Index Hint
**File:** [vendor-reports-queries.ts:32-44](app/actions/vendor-reports-queries.ts#L32-L44)

```typescript
const { data: tasks, error } = await supabase
  .from("work_tasks")
  .select(`id, vendor_id, cost, deadline, contracts!inner(contract_code)`)
  .not("vendor_id", "is", null)
  .eq("status", "hoan_thanh")
  .gte("deadline", window.start)
  .lt("deadline", window.end);
```

**Problem:**
- Query filters by `vendor_id IS NOT NULL`, `status`, and `deadline` range
- Missing explicit index: `CREATE INDEX idx_work_tasks_vendor_month ON work_tasks(vendor_id, status, deadline) WHERE vendor_id IS NOT NULL;`

**Impact:** Full table scan for monthly reports, especially as work_tasks grows

**Recommendation:** Add composite index for vendor cost queries

---

### 🟡 MODERATE #12: Multiple Redundant Re-renders
**File:** [vendor-debts-client.tsx:99-127](components/finance/vendor-debts/vendor-debts-client.tsx#L99-L127)

**Problem:**
```typescript
const fifoAllocation = useMemo(() => {
  // Heavy computation: sorts all tasks, loops through, calculates allocations
}, [amount, selectionMode, unpaidTasks]);

const manualAllocation = useMemo(() => {
  // Filters and maps tasks
}, [selectionMode, unpaidTasks, selectedTaskIds]);
```

**In modal component:** These useMemos recalculate on every `amount` change (every keystroke)

**Issue:** Sorting and looping 50+ tasks on every keystroke is wasteful

**Fix:** Debounce amount updates or use `useTransition` for allocation preview

---

### 🟢 MINOR #13: Unnecessary Array Spread in FIFO
**File:** [vendor-payment-modal.tsx:107](components/finance/vendor-debts/vendor-payment-modal.tsx#L107)

```typescript
const sortedTasks = [...unpaidTasks].sort((a, b) => {...});
```

**Issue:** Creates copy of entire array just to sort it. `unpaidTasks` is already immutable from SWR

**Fix:** Remove spread: `const sortedTasks = unpaidTasks.toSorted((a, b) => {...});` (or keep for older JS support)

---

### 🟢 MINOR #14: Vendor Costs Fetches Full Phone Numbers
**File:** [vendor-reports-queries.ts:63](app/actions/vendor-reports-queries.ts#L63)

```typescript
.select("id, full_name, phone, service_type")
```

**Issue:** Phone numbers fetched but only sometimes displayed. Small PII leak if not needed.

**Recommendation:** Only fetch if UI consistently shows it

---

## 3. DATABASE RPC ANALYSIS

### ✅ GOOD: Atomic Transaction Handling
**File:** [20260527000001_vendor_payment_rpcs.sql:112-282](supabase/migrations/20260527000001_vendor_payment_rpcs.sql#L112-L282)

**Strengths:**
- Uses `FOR UPDATE` row locks to prevent race conditions
- Validates vendor status and task ownership
- Handles both FIFO and manual allocation modes
- Returns allocated vs unallocated amounts

### 🟡 MODERATE #15: Missing Index on vendor_payment_allocations.work_task_id
**File:** [20260527000001_vendor_payment_rpcs.sql:196-199](supabase/migrations/20260527000001_vendor_payment_rpcs.sql#L196-L199)

```sql
SELECT COALESCE(SUM(amount), 0)
INTO v_existing_alloc
FROM public.vendor_payment_allocations
WHERE work_task_id = v_task_id;
```

**Problem:** This query runs in a loop for each task. Without index on `work_task_id`, it's a sequential scan.

**Fix:** Ensure index exists:
```sql
CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_work_task 
ON vendor_payment_allocations(work_task_id);
```

---

### 🟢 MINOR #16: RPC Could Return More Metadata
**File:** [20260527000001_vendor_payment_rpcs.sql:275-280](supabase/migrations/20260527000001_vendor_payment_rpcs.sql#L275-L280)

**Current return:**
```sql
RETURN jsonb_build_object(
  'success', true,
  'payment_id', v_payment_id,
  'allocated_amount', v_alloc_total,
  'unallocated_amount', p_amount - v_alloc_total
);
```

**Enhancement:** Could also return:
- `allocated_task_count`: number of tasks allocated to
- `remaining_debt`: vendor's remaining debt after this payment

---

## 4. CODE QUALITY ISSUES

### 🟡 MODERATE #17: Inconsistent Error Handling
**Files:** Multiple

**Examples:**
1. [vendor-payment-actions.ts:174-176](app/actions/vendor-payment-actions.ts#L174-L176): Throws error in RPC wrapper
2. [vendor-debts-client.tsx:93-94](components/finance/vendor-debts/vendor-debts-client.tsx#L93-L94): Catches and shows toast
3. [vendor-payment-modal.tsx:196-198](components/finance/vendor-debts/vendor-payment-modal.tsx#L196-L198): Shows toast with fallback message

**Problem:** Inconsistent error message format and handling across layers

**Recommendation:** Standardize error handling pattern

---

### 🟢 MINOR #18: Type Import from Wrong Location
**File:** [vendor-payment-modal.tsx:15](components/finance/vendor-debts/vendor-payment-modal.tsx#L15)

```typescript
import type { VendorUnpaidTask } from "@/types/vendor";
```

**vs**

**File:** [vendor-payment-actions.ts:46-55](app/actions/vendor-payment-actions.ts#L46-L55)
```typescript
export interface VendorUnpaidTask {...}
```

**Issue:** Type is defined in actions file but imported from `@/types/vendor`. Duplication or wrong import?

**Check:** Verify `@/types/vendor` exports this type, or import from actions

---

## 5. SECURITY ISSUES

### ✅ GOOD: Authorization Checks Present
- All actions use `withAdmin` wrapper
- RPC functions are `SECURITY DEFINER` with proper validation
- Period lock check prevents backdating in locked periods

### 🟢 MINOR #19: Audit Log Describes Amount Without Formatting
**File:** [vendor-payment-actions.ts:151](app/actions/vendor-payment-actions.ts#L151)

```typescript
description: `Thanh toán ${input.amount.toLocaleString()}đ cho vendor ${vendor.full_name}`,
```

**Issue:** Uses `toLocaleString()` which may format differently based on locale. For audit logs, use consistent formatting.

**Fix:** Use shared `formatCurrency` function

---

## 6. UX/UI ISSUES

### 🟡 MODERATE #20: FAB Shows Wrong Message
**File:** [vendor-debts-client.tsx:233-246](components/finance/vendor-debts/vendor-debts-client.tsx#L233-L246)

```typescript
<FAB
  icon={DollarSign}
  label="Thanh toán"
  onClick={() => {
    if (debts.length > 0) {
      handlePay(debts[0]); // ❌ Always pays FIRST vendor
    } else {
      toast.info("Không có vendor nào cần thanh toán");
    }
  }}
/>
```

**Problem:** 
- FAB automatically pays the vendor with highest debt (first in list)
- No confirmation or selection
- Confusing UX

**Recommendation:** Either remove FAB or change to "Quick Pay" with vendor selection

---

### 🟢 MINOR #21: Loading States Inconsistent
**File:** [vendor-debts-client.tsx:126-152](components/finance/vendor-debts/vendor-debts-client.tsx#L126-L152)

**Issue:** Uses `isLoading && debts.length === 0` for skeleton, meaning:
- First load: shows skeleton ✅
- Refresh with data: no loading indicator ❌

**Recommendation:** Add subtle loading indicator during revalidation

---

## SUMMARY OF RECOMMENDATIONS

### 🔴 IMMEDIATE ACTION REQUIRED

1. **Fix FIFO allocation mismatch** between frontend preview and backend execution
2. **Fix overdue tasks calculation** to actually check task deadlines
3. **Add database index** on `vendor_payment_allocations.work_task_id`
4. **Disable `revalidateOnFocus`** on expensive debt summary query

### 🟡 HIGH PRIORITY

5. **Add manual allocation validation** to ensure amount matches selected tasks
6. **Create RPC for vendor unpaid tasks** to eliminate N+1 query
7. **Fix stats bar "paid this month"** calculation or label
8. **Add composite index** on work_tasks for vendor cost queries

### 🟢 NICE TO HAVE

9. Standardize error handling patterns
10. Improve FAB UX with vendor selection
11. Add debouncing to allocation preview calculations
12. Consolidate empty state components
13. Add more metadata to RPC return values

---

## Performance Benchmarks Needed

**Recommended Load Testing:**
1. Test `finance_vendor_debt_summary` RPC with 100+ vendors, 1000+ tasks
2. Test `fetchVendorUnpaidTasks` with 50+ unpaid tasks per vendor
3. Test payment modal allocation preview with 100+ unpaid tasks
4. Measure `revalidateOnFocus` impact with DevTools

---

## Files Reviewed

- ✅ app/(protected)/finance/vendor-debts/page.tsx
- ✅ components/finance/vendor-debts/vendor-debts-client.tsx
- ✅ components/finance/vendor-debts/vendor-debts-desktop-table.tsx
- ✅ components/finance/vendor-debts/vendor-debts-mobile-list.tsx
- ✅ components/finance/vendor-debts/vendor-debts-stats-bar.tsx
- ✅ components/finance/vendor-debts/vendor-payment-modal.tsx
- ✅ app/actions/vendor-payment-actions.ts
- ✅ app/actions/vendor-reports-queries.ts
- ✅ supabase/migrations/20260527000001_vendor_payment_rpcs.sql

---

**Audit completed by:** Claude Code  
**Next Review:** After fixes are implemented  
**Related Audits:** FREELANCER_SYSTEM_AUDIT.md

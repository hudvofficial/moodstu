# Phase 05: Receipt Stats Status Mismatch
Status: ⬜ Pending
Dependencies: None

## Objective
Fix status mismatch: `getReceiptStatus()` trả `"confirmed"` / `"pending"`, nhưng `fetchReceiptStats()` đếm `"completed"`. Kết quả: mọi phiếu thu đều bị đếm là "pending" vì không bao giờ có status `"completed"`.

## Root Cause Analysis
```
getReceiptStatus("contract_payment") → "confirmed"
getReceiptStatus("other_income")     → "pending"
seed data                            → "completed"

fetchReceiptStats():
  completedCount = rows.filter(r => r.status === "completed")  // = 0 luôn!
  pendingCount   = rows.filter(r => r.status !== "completed")  // = ALL!
```

## Requirements
### Functional
- [ ] Stats "hoàn thành" đếm: `completed`, `confirmed`, `approved`
- [ ] Stats "chờ duyệt" đếm: `pending`, `draft`, và mọi status khác

## Implementation Steps

### Step 1: Fix `fetchReceiptStats()`

**File:** `app/actions/finance-operations-queries.ts`
**Lines:** 174-175

```diff
-    const completedCount = rows.filter((r) => r.status === "completed").length;
-    const pendingCount = rows.filter((r) => r.status !== "completed").length;
+    const DONE_STATUSES = ["completed", "confirmed", "approved"];
+    const completedCount = rows.filter((r) => DONE_STATUSES.includes(r.status || "")).length;
+    const pendingCount = rows.filter((r) => !DONE_STATUSES.includes(r.status || "")).length;
```

## Files to Create/Modify
- `app/actions/finance-operations-queries.ts` — [MODIFY] 2 lines

## Test Criteria
- [ ] Tạo receipt → stats bar hiện "1 hoàn thành" (vì getReceiptStatus trả "confirmed")
- [ ] Tạo receipt other_income → stats bar hiện "1 chờ duyệt" (vì getReceiptStatus trả "pending")
- [ ] Tổng = completedCount + pendingCount

---
Next Phase: [Phase 06 — Search Sanitize](phase-06-search-sanitize.md)

# Blocker Report — RPC v3 drops print_orders.items field

**Date:** 2026-06-18  
**Task:** Tablet UI optimization — E2E test verification  
**Blocker:** `get_contract_detail_v3` RPC omits `items` from `print_orders` payload

---

## Blocker

E2E test `printing-ui-tablet.spec.ts` cannot pass because the UI receives empty/missing `items` array for printing orders.

Root cause: RPC `get_contract_detail_v3` (the version currently used by the app) returns `print_orders` objects **without the `items` field**.

---

## Evidence

### 1. Seed data is correct
- Test now uses production RPC `create_printing_order_atomic` (fixed by coder sub-agent)
- Direct DB query confirms seeded order has `items: [{...}, {...}]` with 2 products

### 2. RPC v2 works correctly
- `get_contract_detail_v2` returns:
  ```json
  {
    "print_orders": [{
      "id": "...",
      "items": [{...}, {...}],
      "total_amount": 362500
    }]
  }
  ```

### 3. RPC v3 drops items field
- `get_contract_detail_v3` returns:
  ```json
  {
    "print_orders": [{
      "id": "...",
      "total_amount": 362500
      // items field is MISSING
      // payment_status also missing
      // print_file_url also missing
    }]
  }
  ```

### 4. UI correctly shows "Chưa có SP"
- Component: `components/contracts/detail/print-orders-block.tsx`
- Logic: displays `{items.length} SP` only when `items` is non-empty array
- Since v3 omits `items`, UI receives `undefined`/`[]` → shows "Chưa có SP"

---

## Context

### Files involved:
- **RPC definition**: `supabase/migrations/*get_contract_detail_v3*.sql` (exact file TBD)
- **App query**: `app/actions/contract-queries.ts` line ~180-250 (calls v3 RPC)
- **UI component**: `components/contracts/detail/print-orders-block.tsx` (correct, no fix needed)
- **E2E test**: `tests/e2e/printing-ui-tablet.spec.ts` (seed fixed, assertion correct)

### Why v3 vs v2?
- App code in `contract-queries.ts` likely switched from v2 to v3 for performance/features
- v3 was created to optimize payload or add new fields
- But migration forgot to include `items` (and possibly `payment_status`, `print_file_url`)

---

## Cần gì để unblock

### Option A: Fix RPC v3 migration (recommended)
1. Locate the migration file defining `get_contract_detail_v3`
2. Add `items`, `payment_status`, `print_file_url` to the `print_orders` select/return
3. Re-run migration or create a new migration to alter the function
4. Verify RPC returns correct payload

### Option B: Revert app to use v2 (quick workaround)
1. Change `app/actions/contract-queries.ts` to call `get_contract_detail_v2` instead of v3
2. Test passes immediately
3. But loses whatever optimization/feature v3 was supposed to provide

### Option C: Create v4 with full payload
1. Copy v2 logic + v3 enhancements
2. Ensure all fields included
3. Migrate app to v4

---

## Impact

**Blocked tasks:**
- Step 3/8: E2E QA verification (tablet test cannot pass)
- Step 4/8: Visual review (dependent on passing test)
- Step 5/8+: All subsequent workflow steps

**Modules affected:**
- Printing module UI (shows incorrect "Chưa có SP")
- Any feature reading print order items from contract detail

**Severity:** HIGH  
Cannot proceed with tablet UI rollout until fixed.

---

## Temporary workaround for testing

If user needs to continue tablet UI work without waiting for RPC fix:

1. Mock `printOrders` data in UI layer temporarily
2. Or skip printing block assertion in E2E (comment out line 242)
3. Or hardcode app to use v2 RPC for testing only

None of these are production-ready.

---

**Status:** BLOCKED — waiting for RPC v3 fix or decision on workaround.

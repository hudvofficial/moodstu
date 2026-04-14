# Phase 08: Lint & Verify
Status: ⬜ Pending
Dependencies: Phase 01-07 ALL complete

## Objective
Verify toàn bộ changes compile, lint-clean, và build thành công. Catch bất kỳ regression nào.

## Requirements
### Non-Functional
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx eslint` trên finance files — 0 errors
- [ ] `npm run build` — thành công

## Implementation Steps

### Step 1: TypeScript Check

```bash
npx tsc --noEmit --incremental false --pretty false
```

**Expected issues to fix:**
- `createPaymentReceipt` return type mismatch nếu caller expects `null` nhưng payment trả `{ paymentId: string }`
- Có thể cần adjust createReceipt return type

### Step 2: ESLint (scoped)

```bash
npx eslint \
  app/actions/receipt-actions.ts \
  app/actions/finance-dashboard-queries.ts \
  app/actions/finance-operations-queries.ts \
  components/finance/receipts/ \
  scripts/seed-finance-demo.ts \
  --max-warnings 0
```

### Step 3: Build

```bash
npm run build
```

### Step 4: Fix any failures

- Type errors → adjust types in receipt-actions.ts
- Unused imports → remove
- Missing semicolons → add
- Build errors → fix module resolution

## Files to Create/Modify
- Any files with lint/type errors — [MODIFY] as needed

## Test Criteria
- [ ] All 3 commands pass with 0 errors
- [ ] No runtime errors on `/finance` page
- [ ] No runtime errors on `/finance/receipts` page

---
✅ DONE — Plan fully executed

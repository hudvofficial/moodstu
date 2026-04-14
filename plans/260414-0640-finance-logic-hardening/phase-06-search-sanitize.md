# Phase 06: Search Sanitize
Status: ⬜ Pending
Dependencies: None

## Objective
Ngăn PostgREST filter injection qua search input. Hiện tại chỉ strip `%_` nhưng PostgREST `.or()` filter dùng `,()."` như operators → user có thể inject filter logic.

## Vulnerability

```typescript
// Current (line 133-138):
const sanitized = params.search.replace(/[%_]/g, "");
const s = `%${sanitized}%`;
query = query.or(`contract_code.ilike.${s},customer_name.ilike.${s},...`);

// Attack: search = "test),id.eq.any-uuid,contract_code.ilike.(%test"
// → or(`contract_code.ilike.%test),id.eq.any-uuid,contract_code.ilike.(%test%,...`)
// PostgREST parses: id.eq.any-uuid → filter bypass
```

## Requirements
### Functional
- [ ] Strip tất cả PostgREST special chars: `% _ ( ) , . " \`
- [ ] Trim whitespace
- [ ] Cap max 100 chars
- [ ] Empty after sanitize → skip filter

## Implementation Steps

### Step 1: Harden sanitize + cap length

**File:** `app/actions/finance-operations-queries.ts`
**Lines:** 133-138

```diff
     if (params.search) {
-      const sanitized = params.search.replace(/[%_]/g, "");
+      const sanitized = params.search
+        .replace(/[%_(),."\\]/g, "")
+        .trim()
+        .slice(0, 100);
       if (sanitized) {
         const s = `%${sanitized}%`;
         query = query.or(`contract_code.ilike.${s},customer_name.ilike.${s},category_name.ilike.${s},notes.ilike.${s}`);
       }
     }
```

## Files to Create/Modify
- `app/actions/finance-operations-queries.ts` — [MODIFY] 3 lines

## Test Criteria
- [ ] Search "test" → kết quả bình thường
- [ ] Search "test),id.eq.xxx" → sanitized thành "testideqxxx", không inject
- [ ] Search "" (empty) → skip filter, show all
- [ ] Search rất dài (200 chars) → truncated to 100

---
Next Phase: [Phase 07 — Demo Seed Pipeline](phase-07-demo-seed.md)

# Phase 02: 🟡 Code Consolidation (W1-W2, S4)
Status: ⬜ Pending
Dependencies: Phase 01
Priority: P1

## Objective
Eliminate code duplication trong finance actions bằng cách consolidate utilities vào SSOT file `lib/finance-utils.ts`.

## Issues Addressed
- **W1**: `isMissingRpcError` — 3 definitions (1 canonical + 2 local duplicates)
- **W2**: `monthWindow`, `relationText` — 2 duplicates mỗi function
- **S4**: RPC-with-fallback pattern lặp 8 lần — extract utility

## Files to Modify

### 1. `lib/finance-utils.ts` (ADD new exports)

**Task 2.1**: Thêm 3 utility functions vào file canonical

```typescript
// Đã có:
// - isMissingRpcError (line 3) ✅
// - checkPeriodLock (line 12) ✅
// - firstDayOfMonth (line 37) ✅

// === THÊM MỚI ===

/** Date window for month queries: [start, end) */
export function monthWindow(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = month === 12 
    ? `${year + 1}-01-01` 
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end };
}

/** Optional month window — returns null if params missing */
export function monthWindowOptional(month?: number, year?: number) {
  if (!month || !year) return null;
  return monthWindow(month, year);
}

/** Extract text from Supabase relation join (handles array or object) */
export function relationText(value: unknown, key: string): string | null {
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== "object") return null;
  const raw = (item as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw : null;
}

/** Safe number coercion */
export function asNumber(value: unknown): number {
  return Number(value) || 0;
}

/** Safe string coercion */
export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** RPC with graceful fallback when function doesn't exist */
export async function rpcWithFallback<T>(
  supabase: SupabaseClient,
  rpcName: string,
  params: Record<string, unknown>,
  fallback: () => Promise<T>
): Promise<T> {
  const { data, error } = await supabase.rpc(rpcName, params);
  if (error && isMissingRpcError(error)) return fallback();
  if (error) throw new Error(`RPC ${rpcName} failed: ${error.message}`);
  return data as T;
}
```

### 2. `app/actions/finance-dashboard-queries.ts` (REMOVE duplicates)

**Task 2.2**: Xoá local definitions, import từ SSOT

```diff
+"use server";
+
+import type { SupabaseClient } from "@supabase/supabase-js";
+import { withAuth } from "@/lib/auth_utils";
+import { isMissingRpcError, monthWindow, relationText, asNumber, asString } from "@/lib/finance-utils";
+import type { ... } from "@/types/finance-dashboard";
 
-type RpcRow = Record<string, unknown>;
+type RpcRow = Record<string, unknown>;  // keep local — specific to this file
 
-function asNumber(value: unknown): number { ... }           // DELETE — use import
-function asString(value: unknown, fallback = ""): string { ... }  // DELETE — use import
-function isMissingRpcError(...) { ... }                     // DELETE — use import  
-function monthWindow(month: number, year: number) { ... }   // DELETE — use import
-function relationText(value: unknown, key: string) { ... }  // DELETE — use import
```

### 3. `app/actions/finance-operations-queries.ts` (REMOVE duplicates)

**Task 2.3**: Xoá local definitions, import từ SSOT

```diff
+"use server";
+
+import { withAuth } from "@/lib/auth_utils";
+import { isMissingRpcError, monthWindowOptional, relationText } from "@/lib/finance-utils";
+import type { PaginatedResult } from "@/types/finance-dashboard";
+import type { ... } from "@/types/finance-operations";
 
-function monthWindow(month?: number, year?: number) { ... } // DELETE — use monthWindowOptional import
-function relationText(value: unknown, key: string) { ... }  // DELETE — use import
-function isMissingRpcError(...) { ... }                     // DELETE — use import
```

> ⚠️ `finance-operations-queries.ts` dùng optional params `monthWindow(month?, year?)` → map sang `monthWindowOptional`.

### 4. Không sửa: `finance-cashflow-timeline.ts`

File này KHÔNG dùng `monthWindow` (dùng `startDate/endDate` trực tiếp) → không cần thay đổi.

## Implementation Steps
1. [ ] Thêm exports vào `lib/finance-utils.ts`
2. [ ] Sửa `finance-dashboard-queries.ts` — xoá 5 local functions, thêm imports
3. [ ] Sửa `finance-operations-queries.ts` — xoá 3 local functions, thêm imports
4. [ ] Verify: `npm run build` clean, no type errors

## Test Criteria
- [ ] Tất cả existing imports từ `@/lib/finance-utils` vẫn hoạt động
- [ ] `finance-dashboard-queries.ts` có 0 local utility functions
- [ ] `finance-operations-queries.ts` có 0 local utility functions
- [ ] TypeScript build pass

## Notes

**Không refactor `rpcWithFallback` call sites trong phase này** — chỉ EXPORT utility. Refactor actual usage (thay thế if-blocks) là optional trong Phase 04.

---
Next Phase: → Phase 03 (Hardening Gap-fill)

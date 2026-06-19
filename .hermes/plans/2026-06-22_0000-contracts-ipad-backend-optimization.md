# Contracts iPad A16 + Backend Optimization Plan

> **For Hermes:** Sử dụng delegate_task để triển khai từng task.

**Goal:** Tối ưu UI contracts trên iPad A16 + giảm `getContractDetail` từ 9s xuống <500ms

**Architecture:** Frontend quick wins (memo, content-visibility, prefetch) + Backend fix (bật V3 RPC, thêm index, circuit breaker)

**Tech Stack:** Next.js 16, React 19, Supabase, Playwright, PostgreSQL

**Source:** 2 debate rounds (frontend + backend) + Playwright test thực tế

---

## ✅ PHASE A: Frontend Quick Wins (ĐÃ XONG)

Đã triển khai 22/06/2026. 7 file đã sửa, type-check pass, reviewer approved.

| # | File | Fix |
|---|------|-----|
| A1 | `components/contracts/contracts-tablet-table.tsx` | content-visibility + onPointerDown + memo comparison |
| A2 | `components/contracts/contracts-table.tsx` | onPointerDown + memo comparison + falsy-0 fix |
| A3 | `components/contracts/contracts-list-client.tsx` | React.memo + useDeferredValue |
| A4 | `hooks/useContractFilters.ts` | useMemo 10 deps |
| A5 | `components/contracts/detail/contract-detail-client.tsx` | 9→4 realtime channels + info disclosure fix |
| A6 | `playwright.config.ts` | +2 project iPad (Portrait 820×1180, Landscape 1024×1366) |
| A7 | `tests/e2e/contracts-tablet-ipad.spec.ts` | 8 test case (MỚI) |

---

## ✅ PHASE B: Backend Critical Fixes (ĐÃ XONG)

Đã triển khai 19/06/2026. 4 task hoàn thành.

| # | Task | File | Kết quả |
|---|------|------|---------|
| B1 | Bật RPC v3 | `.env.local` | ✅ Đã có sẵn `NEXT_PUBLIC_RPC_V3=true` |
| B2 | Index `employees(auth_user_id)` | `supabase/migrations/20260619100000_...` | ✅ Đã tạo |
| B3 | Index `payment_plan_allocations` | `supabase/migrations/20260619100002_...` | ✅ Đã tạo |
| B4 | Circuit breaker bỏ fallback | `app/actions/contract-queries.ts` | ✅ Đã sửa, type-check pass |

**Supabase RPC latency thực tế:** V3 = 496ms, V2 = 356ms (cả 2 <500ms ✅)
**Root cause 9 giây:** Supabase free tier cold start + keep-alive cron đã tạo

### Task B1: Bật RPC v3

**Objective:** Kích hoạt `get_contract_detail_v3` thay vì v2 → giảm 9s xuống ~150ms

**Files:**
- Modify: `.env.local`

**Step 1: Thêm env var**

```
NEXT_PUBLIC_RPC_V3=true
```

**Step 2: Restart dev server**

```bash
# Server sẽ tự động pick up env mới khi restart
```

**Step 3: Verify**

Kiểm tra log server — phải thấy gọi `get_contract_detail_v3` thay vì `get_contract_detail_v2`.

---

### Task B2: Migration — thêm index `employees(auth_user_id)`

**Objective:** `requireContractAccess` gọi `.eq("auth_user_id", userId)` → cần index để tránh seq scan

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_employees_auth_user_id_index.sql`

**Step 1: Tạo migration file**

```sql
-- Migration: Add index on employees.auth_user_id for contract access checks
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id 
  ON public.employees(auth_user_id) 
  WHERE deleted_at IS NULL;
```

**Step 2: Deploy migration**

```bash
npx supabase migration up
# hoặc chạy trong Supabase SQL Editor
```

**Step 3: Verify**

```sql
EXPLAIN ANALYZE SELECT * FROM employees WHERE auth_user_id = 'test-uuid';
-- Expected: Index Scan using idx_employees_auth_user_id
```

---

### Task B3: Migration — thêm index `payment_plan_allocations(payment_plan_id)`

**Objective:** V2 fallback có N+1 query trên bảng này — đang seq scan mỗi lần gọi

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_payment_plan_allocations_index.sql`

**Step 1: Tạo migration file**

```sql
-- Migration: Add index for payment plan allocations N+1 query
CREATE INDEX IF NOT EXISTS idx_payment_plan_allocations_plan_id
  ON public.payment_plan_allocations(payment_plan_id);
```

**Step 2: Deploy**

```bash
npx supabase migration up
```

---

### Task B4: Circuit breaker — throw error thay vì silent fallback

**Objective:** Nếu RPC fail → throw error có ý nghĩa, KHÔNG fallback 8 HTTP queries

**Files:**
- Modify: `app/actions/contract-queries.ts:543-547`

**Step 1: Sửa code**

```typescript
// TRƯỚC:
if (!rpcError && rpcData) {
  // ...use rpcData
}
console.warn(`[contracts.getContractDetail] ${rpcFunction} unavailable; using 8-query fallback`, {...});
// ...8 query fallback

// SAU:
if (rpcError) {
  console.error(`[contracts.getContractDetail] ${rpcFunction} failed:`, rpcError);
  throw new Error(`Không thể tải hợp đồng. RPC ${rpcFunction} không khả dụng.`);
}
if (!rpcData) {
  throw new Error(`RPC ${rpcFunction} returned null`);
}
// Sử dụng rpcData, KHÔNG fallback
```

**Step 2: Type-check**

```bash
npx tsc --noEmit
```

---

## ⚡ PHASE C: Verify (Sau khi làm Phase B)

### Task C1: Chạy Playwright test iPad

```bash
npx playwright test tests/e2e/contracts-tablet-ipad.spec.ts --project="iPad A16 Landscape" --reporter=list
```

**Lưu ý:** 
- WebKit headless chậm hơn Chrome, target FPS realistic: 25-30fps
- Seed tối thiểu 20 contracts để có scroll thực tế
- KHÔNG dùng `test.describe.serial` — 1 test fail skip hết

### Task C2: So sánh metrics

| Metric | Trước fix | Sau fix | Target |
|--------|----------|---------|--------|
| getContractDetail | 9,165ms | ? | <500ms |
| getContractList | 2,303ms | ? | <500ms |
| getContractStats | 1,888ms | ? | <300ms |
| Scroll FPS (iPad) | 4.4fps | ? | >25fps |
| DOM nodes (list) | ? | ? | <500 |

---

## ⚠️ Risks & Tradeoffs

| Risk | Mitigation |
|------|-----------|
| V3 RPC chưa deploy lên production | Kiểm tra Supabase Dashboard → Database → Functions |
| Migration fail trên production | Chạy trên staging trước |
| Bỏ fallback → lỗi nếu RPC thực sự fail | Add error boundary + toast "Đang bảo trì" |
| WebKit headless không support LCP API | Đo LCP thủ công hoặc dùng Chrome cho perf test |

---

## 🔥 PHASE D: Cold Start Guard — Hybrid Pattern (GĐ1: Contracts)

> **Chiến lược:** Global baseline + Per-module profiles. Contracts trước để validate, rồi extract pattern, rồi rollout toàn hệ thống.
>
> **Source:** Debate "toàn hệ thống hay chỉ module contracts" + industry best practices (TanStack Query docs, Workbox, Vercel templates)

### Kiến trúc

```
┌──────────────────────────────────────────┐
│ GLOBAL BASELINE (QueryClientProvider)     │
│  · retry: 1                              │
│  · networkMode: "offlineFirst"           │
│  · refetchOnWindowFocus: true            │
├──────────────────────────────────────────┤
│ DOMAIN PROFILES (query-config.ts)        │
│  · contracts    → staleTime: 30min       │
│  · dashboard    → staleTime: 10s         │
│  · customers    → staleTime: 30min       │
│  · reference    → staleTime: Infinity    │
├──────────────────────────────────────────┤
│ PWA LAYERED CACHE (next-pwa SW routes)   │
│  · /rest/v1/*   → NetworkFirst, 3s       │
│  · /storage/*   → CacheFirst, 24h        │
└──────────────────────────────────────────┘
```

### Task D1: Tạo `lib/query-config.ts` — Domain query profiles

**Objective:** Single source of truth cho toàn bộ caching strategy

**Files:**
- Create: `lib/query-config.ts`

**Code:**

```typescript
import type { UseQueryOptions } from "@tanstack/react-query";

// ─── Global baseline: áp dụng cho MỌI query ───
export const globalQueryDefaults = {
  retry: 1,
  refetchOnWindowFocus: true,
  networkMode: "offlineFirst" as const,
} satisfies Partial<UseQueryOptions>;

// ─── Domain profiles: mỗi module có staleTime riêng ───
export const queryProfiles = {
  contracts: {
    staleTime: 30 * 60 * 1000,       // 30 phút
    gcTime: 60 * 60 * 1000,          // 1 giờ
    retry: 2,
  },
  dashboard: {
    staleTime: 10 * 1000,            // 10 giây
    gcTime: 5 * 60 * 1000,
    refetchInterval: 15_000,
  },
  customers: {
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  },
  reference: {
    staleTime: Infinity,              // Không bao giờ stale
    gcTime: 24 * 60 * 60 * 1000,
  },
} as const;

export type QueryDomain = keyof typeof queryProfiles;

// ─── Helper: merge domain profile với global defaults ───
export function createQueryOptions<TData = unknown, TError = Error>(
  domain: QueryDomain,
  overrides?: Partial<UseQueryOptions<TData, TError>>,
): UseQueryOptions<TData, TError> {
  return {
    ...globalQueryDefaults,
    ...queryProfiles[domain],
    ...overrides,
  } as UseQueryOptions<TData, TError>;
}
```

### Task D2: Cập nhật `QueryClientProvider` với global defaults

**Objective:** Toàn bộ query được bảo vệ bởi baseline config

**Files:**
- Modify: Provider file chứa QueryClient (tìm trong `app/` hoặc `components/`)

**Code:**

```typescript
import { globalQueryDefaults } from "@/lib/query-config";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: globalQueryDefaults,
    },
  });
}
```

### Task D3: Cập nhật `useContracts` hooks — dùng contract profile

**Objective:** Module contracts dùng profile riêng với staleTime 30 phút

**Files:**
- Modify: `lib/hooks/use-contract-queries.ts` (hoặc các file hook contracts tìm thấy)

**Code:**

```typescript
import { createQueryOptions } from "@/lib/query-config";

// Trong mỗi useQuery của contracts module:
useQuery({
  ...createQueryOptions("contracts"),
  queryKey: contractKeys.detail(id),
  queryFn: () => ...,
});
```

### Task D4: PWA Service Worker — thêm NetworkFirst cho Supabase API

**Objective:** Khi database cold start, SW trả cache trong 3s, user không thấy loading trắng

**Files:**
- Modify: PWA config (next.config.js hoặc file SW config của `@ducanh2912/next-pwa`)

**Code (Workbox runtimeCaching):**

```javascript
runtimeCaching: [
  {
    urlPattern: /\/rest\/v1\/.*/,
    handler: "NetworkFirst",
    options: {
      cacheName: "supabase-api",
      networkTimeoutSeconds: 3,       // Sau 3s → fallback cache
      expiration: {
        maxEntries: 200,
        maxAgeSeconds: 10 * 60,       // Cache 10 phút
      },
    },
  },
  {
    urlPattern: /\/storage\/v1\/.*/,
    handler: "CacheFirst",
    options: {
      cacheName: "supabase-storage",
      expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
    },
  },
]
```

### Task D5: Type-check toàn bộ

```bash
npx tsc --noEmit
```

### Task D6: Verify — Chạy Playwright test iPad

```bash
npx playwright test tests/e2e/contracts-tablet-ipad.spec.ts --project="iPad A16 Landscape"
```

### Lộ trình mở rộng (GĐ2-3)

```
GĐ1 (TUẦN NÀY): Contracts — validate giải pháp
  → Task D1-D6
  → Metrics: cold start latency trước/sau, cache hit rate

GĐ2 (TUẦN SAU): Extract pattern + phân loại module
  → Thêm profiles: customers, costumes, printing, calendar
  → Document pattern trong AGENTS.md

GĐ3 (TUẦN 2-3): Rollout toàn hệ thống
  → Customers + Costumes trước (quick wins)
  → Calendar + Finance sau (cần fine-tune)
```

---

## 📋 Tổng quan

```
PHASE A (ĐÃ XONG): 7 frontend fixes + QA setup
PHASE B (ĐÃ XONG): Backend: V3 RPC, 2 indexes, circuit breaker + keep-alive cron
PHASE C (PENDING): Playwright verify
PHASE D (CẦN LÀM): Cold Start Guard — GĐ1 Contracts (6 tasks)
```

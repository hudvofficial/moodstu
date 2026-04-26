# Phase 01: Client-First Detail Page
Status: ✅ Complete
Dependencies: None

## Objective
Chuyển detail page từ Server-blocks-render → Client-uses-SWR-cache.
Drawer đã prefetch data vào SWR → khi navigate, SWR cache HIT → render instant.

## Nguyên lý

```
BEFORE (2.5s):
page.tsx (Server Component) → getContractDetail() BLOCKS → render

AFTER (< 100ms warm):
page.tsx (Server Component) → chỉ pass ID → ContractDetailClient
                                                    ↓
                                        SWR cache HIT? → render ngay
                                        SWR cache MISS? → skeleton → fetch → render
```

## Implementation Steps

### 1. Slim down `page.tsx` — bỏ server-side data fetch
- [ ] File: `app/(protected)/contracts/[id]/page.tsx`
- [ ] Bỏ `getContractDetail(id)` và `getActiveEmployees()` 
- [ ] Chỉ extract `id` từ params → pass xuống `ContractDetailClient`

```typescript
// BEFORE
export default async function ContractDetailPage(props) {
  const { id } = await props.params;
  const [result, employeesResult] = await Promise.all([
    getContractDetail(id),      // ⛔ BLOCKS 1-2s
    getActiveEmployees(),       // ⛔ BLOCKS 200ms
  ]);
  return <ContractDetailClient initialContract={...} />;
}

// AFTER
export default async function ContractDetailPage(props) {
  const { id } = await props.params;
  return <ContractDetailClient contractId={id} />;  // ✅ Instant
}
```

### 2. Update `ContractDetailClient` — handle no initialData
- [ ] File: `components/contracts/detail/contract-detail-client.tsx`
- [ ] Tất cả `initial*` props trở thành **optional** (đã có `?` cho contractId)
- [ ] Thêm loading skeleton khi `!contract && isLoading`
- [ ] Import loading skeleton từ `loading.tsx` hoặc inline

```typescript
// Props: tất cả initial* thành optional
interface Props {
  contractId?: string;
  initialContract?: Contract;        // was required
  initialPayments?: Payment[];       // was required
  // ...
}

// Render: thêm loading guard
const { contract, isLoading } = useContractDetail(id, fallbackData);

if (!contract && isLoading) {
  return <ContractDetailLoading />;  // Skeleton
}
if (!contract) {
  return <NotFoundState />;
}
```

### 3. Adjust `useContractDetail` SWR config
- [ ] File: `lib/hooks/use-contracts.ts`
- [ ] Khi không có fallbackData → `revalidateOnMount: true` (fetch ngay)
- [ ] Khi có SWR cache (từ prefetch) → render instant, background revalidate

## Files to Create/Modify
- `app/(protected)/contracts/[id]/page.tsx` — Slim down (bỏ fetch)
- `components/contracts/detail/contract-detail-client.tsx` — Optional props + loading
- `lib/hooks/use-contracts.ts` — SWR config adjust

## Test Criteria
- [ ] Warm cache (mở drawer trước → bấm chi tiết): < 200ms
- [ ] Cold start (URL trực tiếp): skeleton hiện → data load
- [ ] Data freshness: SWR revalidate + Realtime vẫn hoạt động
- [ ] TypeScript: 0 errors

## Notes
- SEO không quan trọng (admin app) → client-first OK
- 90% user cases sẽ là warm cache (mở drawer → bấm chi tiết)
- Loading skeleton đã có sẵn tại `loading.tsx` — tái sử dụng

---
Next Phase: phase-02-parallelize-query.md

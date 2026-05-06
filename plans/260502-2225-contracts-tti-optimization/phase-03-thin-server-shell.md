# Phase 03: Thin Server Shell — SWR-first Architecture
Status: ✅ Done
Dependencies: Phase 01 (loading.tsx phải có trước)
Est: 1 giờ

## Objective
Chuyển `/contracts` page từ blocking SSR sang Thin Server Shell + SWR client-side fetch.
Pattern đã proven thành công ở `/contracts/[id]` (contract detail page).

## Rationale
Hiện tại `contracts/page.tsx`:
```typescript
// BLOCKING — server phải chờ cả 2 query hoàn thành (~300-800ms)
const [listResult, statsResult] = await Promise.all([
  getContractList(filters),   // ~300-600ms
  getContractStats(),         // ~100-200ms
]);
return <ContractsListClient initialData={listResult} initialStats={statsResult} />;
```

Contract detail page đã dùng thin shell thành công:
```typescript
// INSTANT — server trả HTML ngay, SWR fetch client-side
export default async function ContractDetailPage(props) {
  const { id } = await props.params;
  return <ContractDetailClient contractId={id} />;
}
```

## Implementation Steps
1. [x] Sửa `app/(protected)/contracts/page.tsx`:
   - Loại bỏ `await Promise.all([getContractList, getContractStats])`
   - Chỉ parse filters từ searchParams → truyền xuống client component
   - Server trả HTML shell ngay lập tức (0ms data wait)
2. [x] Sửa `components/contracts/contracts-list-client.tsx`:
   - `useContracts(filters)` không cần `fallbackData` nữa — SWR fetch từ đầu
   - `useContractStats()` không cần `fallbackData`
   - Đảm bảo `keepPreviousData: true` cho smooth filter transitions
   - Loading state ban đầu: dùng skeleton inline (hoặc loading.tsx đã cover)
3. [x] Xử lý initial loading UX:
   - SWR `isLoading=true` lần đầu → hiển thị shimmer skeleton
   - SWR `isLoading=false` + data → hiển thị table/cards
   - Filter change → `keepPreviousData` giữ data cũ → SWR fetch mới → swap

## Files to Create/Modify
- `app/(protected)/contracts/page.tsx` — [MODIFY] Remove SSR data fetch, thin shell
- `components/contracts/contracts-list-client.tsx` — [MODIFY] Remove fallbackData dependency, pure SWR-first

## Trade-offs
- First load: user thấy skeleton ~300ms trước khi thấy data (thay vì blank ~1.5s → full data)
- SEO: Không ảnh hưởng — trang `/contracts` là protected route, không cần SEO
- Subsequent navigation: Nhanh hơn — SWR cache hit ngay

## Test Criteria
- [x] First visit `/contracts` → skeleton → data appears via SWR
- [x] Filter change → data cũ giữ → data mới swap smooth
- [x] Page change (pagination) → smooth transition
- [x] Browser back/forward → SWR cache hit → instant
- [x] `npm run build` pass

## Impact
- **-300-800ms** server blocking time
- Combined với Phase 01: user thấy skeleton ~55ms, data ~355ms

---
Next Phase: → phase-04-single-rpc.md

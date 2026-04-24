# Phase 05: Smart Prefetch on Hover (SWR-based, Lightweight)
Status: ⬜ Pending
Dependencies: Phase 04 (nên có persist trước để prefetch data survive cold-start)

## Objective
Port V1's `usePrefetchOnHover` sang V2, nhưng dùng SWR thay React Query.
Khi hover menu item → prefetch data nhẹ nhàng bằng SWR `mutate()` (client-side Supabase query).

## ⚠️ Bài học từ V2 cũ (QUAN TRỌNG)
V2 đã từng có `prewarmRouteData()` gọi **Server Actions nặng** khi hover → gây lag nghiêm trọng.
Đã bị gỡ bỏ trong sidebar optimization (Phase trước).

**Approach mới phải KHÁC:**
- ❌ KHÔNG gọi Server Actions
- ✅ Dùng client-side Supabase query (nhẹ, 1 query duy nhất)
- ✅ Deduplicate qua `prefetchedRef` (mỗi route chỉ prefetch 1 lần/session)
- ✅ `router.prefetch(href)` — chỉ prefetch JS bundle (đã có sẵn qua `<Link prefetch>`)

## Requirements
### Functional
- [ ] Hover menu item → prefetch data cho route đó (1 lần/session)
- [ ] Chỉ prefetch cho các route có config (contracts, services, employees...)
- [ ] Không prefetch nếu đang ở route đó rồi

### Non-Functional
- [ ] Dùng client-side Supabase (createClient), KHÔNG dùng Server Actions
- [ ] Mỗi route max 1 query (không batch 5-6 queries như cũ)
- [ ] Zero impact nếu user không hover (lazy)
- [ ] Kết hợp Phase 04: data prefetched sẽ tự persist vào IndexedDB

## Implementation Steps

### 1. Tạo Prefetch Config
1. [ ] Tạo file `lib/hooks/use-prefetch-on-hover.ts`:
   - `PREFETCH_CONFIG` — map route → SWR key + lightweight fetcher
   - Mỗi fetcher chỉ fetch 1 query nhẹ (page 1, minimal columns)

### 2. Tạo Hook
2. [ ] Implement `usePrefetchOnHover()`:
   - `prefetchedRef` — Set<string> track routes đã prefetch
   - `handleHover(href)`:
     a. Check `prefetchedRef` → skip nếu đã có
     b. Lấy config cho route
     c. `mutate(swrKey, fetcherFn(), { revalidate: false })`
   - Return `handleHover` function

### 3. Tạo Dashboard Warmup
3. [ ] Tạo file `lib/hooks/use-warmup.ts`:
   - Sau 3s mount Dashboard → prefetch contracts + dresses (2 module hay dùng nhất)
   - Dùng `setTimeout` + `clearTimeout` cleanup

### 4. Integrate vào Sidebar
4. [ ] Mở `components/layout/sidebar.tsx`
5. [ ] Import `usePrefetchOnHover`
6. [ ] Thêm `onPointerEnter={() => handleHover(item.href)}` vào menu `<Link>`
   (CHỈ `onPointerEnter`, KHÔNG thêm `onClick` hay `onFocus` — tránh lặp lại lỗi cũ)

### 5. Integrate Warmup vào Dashboard
7. [ ] Mở `app/(protected)/dashboard/` component chính
8. [ ] Gọi `useWarmup()` (fire-and-forget)

## Files to Create/Modify
- `lib/hooks/use-prefetch-on-hover.ts` — [NEW] Prefetch hook
- `lib/hooks/use-warmup.ts` — [NEW] Dashboard warmup
- `components/layout/sidebar.tsx` — Thêm onPointerEnter
- Dashboard component — Gọi useWarmup()

## Test Criteria
- [ ] Hover menu item → F12 Network → thấy 1 Supabase query nhẹ
- [ ] Hover lại lần 2 → không có query mới (dedup hoạt động)
- [ ] Click vào menu → trang load nhanh hơn đáng kể
- [ ] **KHÔNG** có hiện tượng lag/đơ khi hover (khác V2 cũ)

## Risk Assessment
- **Low Risk:** Client-side query nhẹ, đã proven ở V1
- **Key Difference vs V2 cũ:** V2 cũ gọi Server Actions (nặng, block main thread). Approach mới dùng client-side Supabase (nhẹ, async, non-blocking)

---
Plan hoàn thành. Tổng: 5 phases, ~25 tasks.

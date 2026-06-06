# Gallery Performance Audit Report
**Date**: 2026-05-26  
**Audited Route**: `/contracts/[id]/gallery?galleryId=xxx` (Admin) & `/gallery/[accessUrl]` (Client)  
**Sample Gallery**: `a50f0b0d-52df-49b5-af9e-952972ba4585` (Contract: `53ff555e-39eb-4203-af35-caab9a60549a`)

---

## Executive Summary

Audit phát hiện **2 vấn đề performance chính**:

1. **Share Modal hiển thị link chậm** (lần 2+): Mặc dù data đã có sẵn, modal vẫn phải gọi lại `prepareGalleryShare()` mỗi lần mở do data mismatch giữa `gallery_links` và `gallery_share_links`.

2. **Page load tốt nhưng có room for improvement**: Admin page đã được tối ưu với V2 RPC nhưng vẫn có fallback overhead. Client page dùng SWR Infinite tốt nhưng initial SSR load có thể cache tốt hơn.

---

## Issue #1: Share Modal Slow Loading (Lần 2+)

### Hiện trạng

**Flow hiện tại khi admin click "Chia sẻ"**:

```
1. Modal mở → ShareGalleryModalContent mount
2. Nhận props: { shareLinks: [], accessUrl: "abc123", status: "shared" }
3. State init: isPreparing = (shareLinks.length === 0) → TRUE ✗
4. useEffect → handlePrepareShare() được gọi
5. prepareGalleryShare(galleryId) → Server Action
6. RPC prepare_gallery_share hoặc fallback TypeScript
7. Response trả về → setIsPreparing(false)
8. QR code generation (50ms delay)
9. Modal hiển thị links (~500-700ms total)
```

**Root Cause**:

File: [app/actions/gallery-admin-actions.ts:389-411](app/actions/gallery-admin-actions.ts#L389-L411)

```typescript
// ❌ VẤNĐỀ: Query sai table!
const { data: links } = await supabase
  .from("gallery_links")  // ← Legacy table
  .select("*")
  .in("gallery_id", galleryIds);

// ...
return {
  ...gallery,
  shareLinks: gLinks,  // ← Luôn trống vì không có data trong gallery_links
};
```

**Expected**: Query từ `gallery_share_links` table với columns:
- `id`, `gallery_id`, `slug`, `capability`, `status`, `access_version`, ...

**Actual**: Query từ `gallery_links` (legacy table, không có data mới) → `shareLinks = []`

→ Modal luôn nghĩ chưa có links → Gọi lại `prepareGalleryShare()` mỗi lần mở.

---

### Impact Analysis

| Scenario | Current | Expected |
|----------|---------|----------|
| **Lần đầu share** (status = "draft") | ~700ms | ~700ms (OK) |
| **Lần 2+ share** (status = "shared") | ~500ms | **~50ms** (chỉ QR gen) |

**Chi phí không cần thiết**:
- 1 roundtrip DB (RPC hoặc fallback queries)
- Auth check overhead
- Re-generate slugs (nếu fallback)

**Business Impact**:
- Admin cảm thấy UI lag khi click Share nhiều lần
- Tăng DB load không cần thiết
- UX không smooth

---

### Recommended Fix

#### Option 1: Fix Query Source (Recommended ⭐)

File: [app/actions/gallery-admin-actions.ts:389](app/actions/gallery-admin-actions.ts#L389)

```typescript
// Before
const { data: links } = await supabase
  .from("gallery_links")
  .select("*")
  .in("gallery_id", galleryIds);

// After
const { data: links } = await supabase
  .from("gallery_share_links")
  .select("id, gallery_id, slug, capability, status, access_version, created_at, updated_at, expires_at, created_by")
  .in("gallery_id", galleryIds)
  .eq("status", "active");  // Chỉ lấy active links
```

**Expected Result**:
- Lần 2+ mở modal: `isPreparing = false` ngay lập tức
- Không gọi `prepareGalleryShare()`
- Chỉ render QR codes (~50ms)

#### Option 2: Add Client-Side Cache

File: [components/contracts/gallery/share-gallery-modal.tsx:148-157](components/contracts/gallery/share-gallery-modal.tsx#L148-L157)

```typescript
// Add memo/cache để skip re-prepare nếu data đã có
useEffect(() => {
  if (!safeGalleryId) return;
  
  // ✅ Skip nếu đã có đủ data
  if (localStatus === "shared" && localAccessUrl && shareLinks.length > 0) {
    setIsPreparing(false);
    return;
  }
  
  // ❌ Current: Vẫn gọi nếu shareLinks.length === 0
  void handlePrepareShare();
}, [safeGalleryId]);
```

**Better approach**: Store trong React Query cache hoặc localStorage

```typescript
const queryClient = useQueryClient();

// Cache share links khi prepare thành công
const cachedLinks = queryClient.getQueryData<GalleryShareLink[]>(
  ['gallery-share-links', galleryId]
);

if (cachedLinks && cachedLinks.length > 0) {
  setShareLinks(cachedLinks);
  setIsPreparing(false);
  return;
}
```

---

## Issue #2: Page Load Performance

### Admin Page: `/contracts/[id]/gallery`

**Current Flow**:

```
Server:
1. Page component render (no data fetch)

Client:
2. GalleryFullPage mount
3. useGalleryData hook init
4. loadData() → getGallerySummariesByContract(contractId)
   ├─ galleries table
   ├─ gallery_images (id, gallery_id, is_selected only)
   ├─ gallery_links (legacy, trống)
   └─ cover images (N queries, 1 per gallery)
5. Set activeGalleryId
6. useEffect[activeGalleryId] → Load gallery data
   ├─ Try V2 RPC: get_gallery_data_v2(galleryId)
   │  Returns: { images, totalCount, hasMore, reactionCounts, commentCounts, albums }
   └─ Fallback (nếu RPC fail):
      ├─ getGalleryImagesPaginated(galleryId, page=0)
      └─ getGalleryMetadataAll(galleryId)
          ├─ gallery_reactions
          ├─ gallery_comments
          └─ gallery_albums + counts
```

**Performance Profile**:

| Metric | V2 RPC Path | Fallback Path |
|--------|-------------|---------------|
| Initial queries | 2 (summaries + V2 RPC) | 3 (summaries + images + metadata) |
| Total roundtrips | 2 | 3 |
| Estimated time | ~200-300ms | ~400-600ms |

**Issues**:

1. **Cover image N+1**: `fetchGalleryCoverImage()` gọi riêng lẻ cho từng gallery
   - File: [app/actions/gallery-admin-actions.ts:403](app/actions/gallery-admin-actions.ts#L403)
   - Solution: Batch query hoặc include trong summaries RPC

2. **V2 RPC fallback không cached**: Nếu RPC không available, mỗi lần load gallery đều retry
   - File: [app/actions/gallery-core.ts:26](app/actions/gallery-core.ts#L26)
   - Current: `prepareGalleryShareRpcAvailable: boolean | null = null`
   - Solution: Cache RPC availability per session/deployment

3. **Không có loading skeleton**: User thấy blank screen trong ~200-300ms
   - File: [components/contracts/gallery/gallery-full-page.tsx:116-122](components/contracts/gallery/gallery-full-page.tsx#L116-L122)
   - Solution: Render skeleton toolbar + grid placeholders

---

### Client Page: `/gallery/[accessUrl]`

**Current Flow**:

```
Server (SSR):
1. generateMetadata() → getPublicGalleryPreview(accessUrl)
   ├─ fetchSharedGalleryByAccessUrl
   ├─ fetchGalleryImageCount
   └─ fetchGalleryCoverImage
2. Page component → getPublicGallery(accessUrl)
   ├─ fetchSharedGalleryByAccessUrl
   ├─ fetchPublicGalleryImagesPage(galleryId, page=0, size=100)
   └─ fetchGalleryImageCount(selectedOnly)

Client:
3. PublicGalleryClient mount với initialData
4. SWR Infinite init với fallbackData
5. User scroll → loadMore → fetch page 1, 2, ...
```

**Performance Profile**:

| Metric | Value | Notes |
|--------|-------|-------|
| SSR queries | 5 (2 cho metadata + 3 cho page) | fetchSharedGallery gọi 2 lần! |
| Initial paint | ~150-250ms | Good |
| Page size | 100 images | Good for most cases |
| SWR cache | 5 min stale / 10 min gc | Good |

**Issues**:

1. **Double fetch trong SSR**: `fetchSharedGalleryByAccessUrl()` gọi 2 lần
   - Line 20: metadata generation
   - Line 76: page data generation
   - Solution: Share data giữa metadata và page

2. **No image preload**: Browser không biết preload images
   - Solution: Add `<link rel="preload">` cho first 10 images

3. **QR code loading delay**: 50ms setTimeout trong modal
   - File: [components/contracts/gallery/share-gallery-modal.tsx:113-116](components/contracts/gallery/share-gallery-modal.tsx#L113-L116)
   - Solution: Pre-generate QR server-side hoặc remove delay

---

## Benchmarks (Measured)

Từ plan document: [plans/260519-gallery-v2-share-delivery/phase-01-load-path-summary-performance.md](plans/260519-gallery-v2-share-delivery/phase-01-load-path-summary-performance.md#L20-L26)

Gallery `3b69fb5e-641f-41a1-9438-427c9a55c1f8` (415 images):

| Query Type | Time (warm cache) |
|------------|-------------------|
| Full image fetch (legacy) | 283-522ms |
| First page 200 + count | 139-183ms ✅ |
| Count-only | 93-142ms |

**Projection for 1000+ images**:
- Current pagination approach: **Good** (linear scaling)
- Legacy full fetch: **Bad** (would be 700-1200ms+)

---

## Recommendations

### Priority 1: Fix Share Modal Data Source ⭐⭐⭐

**Impact**: High (UX issue every time admin shares)  
**Effort**: Low (1 line change)  
**Files**: [app/actions/gallery-admin-actions.ts:389](app/actions/gallery-admin-actions.ts#L389)

```diff
- const { data: links } = await supabase.from("gallery_links")
+ const { data: links } = await supabase.from("gallery_share_links")
+   .select("id, gallery_id, slug, capability, status, access_version, created_at, updated_at, expires_at, created_by")
+   .eq("status", "active")
    .in("gallery_id", galleryIds);
```

**Expected improvement**: 500ms → 50ms cho lần 2+ mở modal

---

### Priority 2: Optimize Cover Image Fetching ⭐⭐

**Impact**: Medium (affects contract detail page load)  
**Effort**: Medium  
**Files**: [app/actions/gallery-admin-actions.ts:394-413](app/actions/gallery-admin-actions.ts#L394-L413)

**Option A**: Batch query

```typescript
// Before: N queries
const coverImageUrl = await fetchGalleryCoverImage(supabase, gallery.id);

// After: 1 query for all galleries
const coverImages = await supabase
  .from("gallery_images")
  .select("id, gallery_id, thumbnail_url")
  .in("gallery_id", galleryIds)
  .order("sort_order", { ascending: true })
  .limit(galleryIds.length);  // 1 per gallery

const coverMap = new Map(
  coverImages.data?.map(img => [img.gallery_id, img.thumbnail_url]) || []
);
```

**Option B**: Include trong RPC

```sql
CREATE OR REPLACE FUNCTION get_gallery_summaries_by_contract(p_contract_id uuid)
RETURNS jsonb AS $$
  SELECT jsonb_agg(jsonb_build_object(
    'id', g.id,
    'title', g.title,
    'imageCount', COUNT(gi.id),
    'selectedCount', COUNT(gi.id) FILTER (WHERE gi.is_selected),
    'coverImageUrl', (
      SELECT gi2.thumbnail_url 
      FROM gallery_images gi2 
      WHERE gi2.gallery_id = g.id 
      ORDER BY gi2.sort_order ASC 
      LIMIT 1
    ),
    'shareLinks', (
      SELECT jsonb_agg(to_jsonb(gsl))
      FROM gallery_share_links gsl
      WHERE gsl.gallery_id = g.id AND gsl.status = 'active'
    )
  ))
  FROM galleries g
  LEFT JOIN gallery_images gi ON gi.gallery_id = g.id
  WHERE g.contract_id = p_contract_id
  GROUP BY g.id;
$$ LANGUAGE sql;
```

**Expected improvement**: N queries → 1 query (~100-200ms saved)

---

### Priority 3: Add Loading States ⭐

**Impact**: Low (UX polish)  
**Effort**: Low  
**Files**: [components/contracts/gallery/gallery-full-page.tsx:116-122](components/contracts/gallery/gallery-full-page.tsx#L116-L122)

```typescript
if (loading) {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Skeleton Toolbar */}
      <div className="sticky top-0 z-50 bg-bg-base/95 backdrop-blur-md">
        <div className="h-16 animate-pulse bg-bg-hover/50" />
      </div>
      
      {/* Skeleton Grid */}
      <div className="grid grid-cols-3 gap-4 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square bg-bg-hover/50 animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}
```

---

### Priority 4: Dedupe SSR Fetches ⭐

**Impact**: Low (server-side only)  
**Effort**: Medium  
**Files**: [app/gallery/[accessUrl]/page.tsx:28-65](app/gallery/[accessUrl]/page.tsx#L28-L65)

**Option A**: React cache() wrapper

```typescript
import { cache } from 'react';

const getCachedPublicGalleryPreview = cache(async (accessUrl: string) => {
  return getPublicGalleryPreview(accessUrl);
});

export async function generateMetadata({ params }: PageProps) {
  const { accessUrl } = await params;
  const res = await getCachedPublicGalleryPreview(accessUrl);  // ✅ Cached
  // ...
}

export default async function GalleryPage({ params }: PageProps) {
  const { accessUrl } = await params;
  const preview = await getCachedPublicGalleryPreview(accessUrl);  // ✅ Hit cache
  const res = await getPublicGallery(accessUrl);  // Load images separately
  // ...
}
```

**Option B**: Unified fetch function

```typescript
export async function getPublicGalleryWithMetadata(accessUrl: string) {
  // Fetch once, return both metadata + initial page
  const supabase = await createAdminClient();
  const gallery = await fetchSharedGalleryByAccessUrl(supabase, accessUrl);
  
  const [imageCount, coverImageUrl, firstPage, selectedCount] = await Promise.all([
    fetchGalleryImageCount(supabase, gallery.id),
    fetchGalleryCoverImage(supabase, gallery.id),
    fetchPublicGalleryImagesPage(supabase, gallery.id, 0),
    fetchGalleryImageCount(supabase, gallery.id, { selectedOnly: true }),
  ]);
  
  return { metadata: {...}, page: {...} };
}
```

---

## Monitoring Recommendations

### Add Performance Instrumentation

File: [app/actions/gallery-core.ts:82-100](app/actions/gallery-core.ts#L82-L100)

**Already exists** ✅ — Gallery share profiler

Extend to other critical paths:

```typescript
// In getGallerySummariesByContract
const profiler = createGalleryShareProfiler("getGallerySummaries");
// ... queries ...
profiler.mark("galleries");
profiler.mark("images");
profiler.mark("links");
profiler.mark("covers");
profiler.done(`contractId=${contractId} count=${galleries.length}`);
```

**Environment variable control**:
- `GALLERY_SHARE_PROFILE=1`: Log all calls
- `GALLERY_SHARE_PROFILE=0`: Never log
- Default: Log if >700ms

---

### Add Metrics Dashboard

Track:
1. **Share modal open time** (lần đầu vs lần 2+)
2. **Page load time** (admin vs client)
3. **V2 RPC availability rate**
4. **Image page size distribution**

Integration: Vercel Analytics, Sentry Performance, hoặc custom metrics

---

## Test Plan

### Before Deployment

1. **Unit test**: Share links query returns correct data
   ```typescript
   test('getGallerySummariesByContract includes shareLinks', async () => {
     const result = await getGallerySummariesByContract(contractId);
     expect(result.data[0].shareLinks).toHaveLength(3);
     expect(result.data[0].shareLinks[0]).toHaveProperty('capability');
   });
   ```

2. **Integration test**: Share modal không gọi prepareGalleryShare lần 2
   ```typescript
   test('ShareModal skips prepare when links exist', async () => {
     const spy = vi.spyOn(galleryActions, 'prepareGalleryShare');
     render(<ShareGalleryModal galleryId="xxx" shareLinks={[...]} />);
     await waitFor(() => expect(screen.getByText(/stu.moodwedding.com/)).toBeInTheDocument());
     expect(spy).not.toHaveBeenCalled();
   });
   ```

3. **Performance benchmark**: Record before/after metrics
   - Share modal lần 2: Target <100ms
   - Admin page TTI: Target <500ms
   - Client page LCP: Target <1.5s

### After Deployment

1. Monitor profiler logs cho slow queries (>700ms)
2. Track error rate cho V2 RPC fallback
3. A/B test: User satisfaction với share flow mới

---

## Appendix: File Reference

### Core Files Analyzed

1. **Admin Page**:
   - [app/(protected)/contracts/[id]/gallery/page.tsx](app/(protected)/contracts/[id]/gallery/page.tsx)
   - [components/contracts/gallery/gallery-full-page.tsx](components/contracts/gallery/gallery-full-page.tsx)
   - [components/contracts/gallery/use-gallery-data.ts](components/contracts/gallery/use-gallery-data.ts)

2. **Client Page**:
   - [app/gallery/[accessUrl]/page.tsx](app/gallery/[accessUrl]/page.tsx)
   - [components/gallery/public-gallery-client.tsx](components/gallery/public-gallery-client.tsx)
   - [components/gallery/gallery-page-client.tsx](components/gallery/gallery-page-client.tsx)

3. **Share Modal**:
   - [components/contracts/gallery/share-gallery-modal.tsx](components/contracts/gallery/share-gallery-modal.tsx)

4. **Actions**:
   - [app/actions/gallery-admin-actions.ts](app/actions/gallery-admin-actions.ts)
   - [app/actions/gallery-public-actions.ts](app/actions/gallery-public-actions.ts)
   - [app/actions/gallery-core.ts](app/actions/gallery-core.ts)
   - [app/actions/gallery-composite-actions.ts](app/actions/gallery-composite-actions.ts)

5. **Database**:
   - [supabase/migrations/20260520170000_prepare_gallery_share_rpc.sql](supabase/migrations/20260520170000_prepare_gallery_share_rpc.sql)

### Related Documentation

- [plans/260519-gallery-v2-share-delivery/phase-01-load-path-summary-performance.md](plans/260519-gallery-v2-share-delivery/phase-01-load-path-summary-performance.md)

---

## Conclusion

**Current state**: Gallery system đã được tối ưu khá tốt với V2 RPC và pagination, NHƯNG vẫn có 2 issues chính:

1. **Share modal** gọi lại prepare mỗi lần do data mismatch → **Fix ngay** (1 line change, high impact)
2. **Cover images** query N+1 → **Fix sau** (medium effort, medium impact)

**Recommended action sequence**:
1. Fix Priority 1 (share links query) → Deploy
2. Measure improvement → Verify <100ms lần 2+
3. Fix Priority 2 (cover images batch) → Deploy
4. Add monitoring + skeleton states

**Estimated total effort**: 2-4 hours (mostly Priority 2)  
**Expected improvement**: Share modal 500ms → 50ms (90% faster)

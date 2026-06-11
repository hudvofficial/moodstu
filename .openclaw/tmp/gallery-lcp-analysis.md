# Gallery LCP Optimization Analysis

## Scope Read

- `components/contracts/gallery/gallery-image-grid.tsx`
- `components/contracts/gallery/gallery-image-tile.tsx`
- `components/gallery/public-gallery-client.tsx`
- `app/gallery/layout.tsx`
- `app/gallery/[accessUrl]/page.tsx`
- `app/actions/gallery-public-actions.ts`
- Supporting constant/function in `app/actions/gallery-core.ts`

## Findings

### 1. `GalleryImageGrid` preloads too many candidate images

Current logic:

```tsx
const eagerLoad = index < Math.max(columnCount * 2, 6);
```

Because `GalleryImageTile` maps `eagerLoad` to Next Image `priority`, the first `max(columnCount * 2, 6)` images all become preload/priority images. On public desktop with up to 5 columns, this can mark 10 images as high priority. On mobile it still marks at least 6 images. This is likely too broad for LCP: the browser must compete between multiple image requests before it knows which tile becomes LCP.

Risk:

- Multiple `priority` images inject multiple `<link rel="preload" as="image">` candidates.
- The actual LCP tile is usually one of the first row items, often index 0, but all first 6-10 compete for bandwidth.
- For masonry, the first visual LCP may not always be index 0, but marking 6-10 images is still excessive.

Recommended direction:

- Only mark the likely LCP image as `priority` + `fetchPriority="high"`.
- Optionally keep a small number of first-row images as `loading="eager"` but without Next `priority` preload.
- For public pages, use stricter behavior than admin because the public path is SEO/perf sensitive.

### 2. `GalleryImageTile` has `priority`, but no explicit `fetchPriority`

Current code:

```tsx
<Image
  ...
  priority={eagerLoad}
  ...
/>
```

Next `priority` helps preload, but the concrete LCP image should also get `fetchPriority="high"` so the browser's image scheduler prioritizes it. Non-LCP images should avoid high priority. If using `priority` on many images, `fetchPriority` becomes even more important because only one should be high.

Recommended direction:

- Rename/extend semantics from `eagerLoad` to separate concepts:
  - `priority`: one true LCP image preload.
  - `fetchPriority`: `"high"` only for the LCP image, `"auto"` or `"low"` for the rest.
  - `loading`: optionally `"eager"` for a tiny first-row window, otherwise `"lazy"`.

### 3. Public initial page size is large and duplicated client-side logic exists

`PUBLIC_IMAGE_PAGE_SIZE` is `100` in `app/actions/gallery-core.ts`.

`getPublicGallery()` SSR fetches page 0 using the default page size of 100:

```ts
fetchPublicGalleryImagesPage(supabase, data.id, 0)
```

`PublicGalleryClient` then computes adaptive page size client-side:

```tsx
if (isSlowNetwork || saveData) return 20;
if (effectiveType === "3g") return 50;
return 100;
```

Initial SSR cannot know the browser network quality, so it always ships up to 100 image records and the client hydrates a large first page. The fallback data key also includes the client-computed `pageSize`; when the computed `pageSize` differs from the SSR default, the first SWR page can conceptually represent a different page size than the key says.

Recommended direction:

- Lower `PUBLIC_IMAGE_PAGE_SIZE` from 100 to about 30 for public initial SSR.
- Keep adaptive client pagination, but align the default fast-network size with the SSR default or pass `initialPageSize` from server to client.
- If reducing globally affects admin/server flows, introduce `PUBLIC_INITIAL_IMAGE_PAGE_SIZE = 30` and use it for public SSR/fallback only.

### 4. `app/gallery/layout.tsx` is a client component but not a heavy provider layout

The file is client-only because it uses `useEffect` to override global `html/body` overflow styles. It does not include providers itself. The LCP impact is mostly that this segment layout must hydrate before/alongside the page, not that it mounts heavy providers directly.

Recommended direction:

- Prefer replacing the JS overflow override with a route-scoped CSS solution if possible.
- If global CSS currently forces `html, body { overflow: hidden; height: 100%; }`, add a server layout with a class wrapper and CSS overrides, or move the overflow rule to app-shell containers instead of document elements.
- This avoids unnecessary hydration for the public gallery layout.

### 5. SSR metadata/page fetches are partially deduped but still duplicate derived queries

`app/gallery/[accessUrl]/page.tsx` calls:

- `generateMetadata()` -> `getPublicGalleryPreview(accessUrl)`
- page render -> `getPublicGallery(accessUrl)`

`gallery-public-actions.ts` has:

```ts
const fetchSharedGalleryByAccessUrlCached = cache(fetchSharedGalleryByAccessUrl);
```

So the base gallery lookup is deduped by React `cache()`, but the derived queries are not merged:

- Preview does `fetchGalleryImageCount(... publicVisibleOnly)` and cover lookup.
- Page does `fetchPublicGalleryImagesPage(...)`, which also returns `totalCount`, plus `fetchGalleryImageCount(... selectedOnly)`.

For public non-password galleries, preview's `imageCount` can be served from the page query's `page.totalCount` if data fetching is unified. Currently `generateMetadata` and the page cannot share one full result unless the full gallery fetch is also cached and metadata uses it, or a cached summary helper is introduced.

Recommended direction:

- Add a cached public gallery payload helper that fetches base gallery, page 0, selected count, and metadata fields once.
- Make both `getPublicGallery()` and `getPublicGalleryPreview()` read from that helper.
- For password-protected galleries, avoid fetching images for metadata; use a lightweight cached summary path.

## Proposed Patch

This patch is intentionally a proposal only. It has not been applied.

```diff
diff --git a/components/contracts/gallery/gallery-image-grid.tsx b/components/contracts/gallery/gallery-image-grid.tsx
--- a/components/contracts/gallery/gallery-image-grid.tsx
+++ b/components/contracts/gallery/gallery-image-grid.tsx
@@
 interface GalleryImageGridProps {
@@
   publicMode?: boolean;
+  lcpImageIndex?: number;
 }
@@
 export default function GalleryImageGrid({
@@
   publicMode,
+  lcpImageIndex = 0,
 }: GalleryImageGridProps) {
@@
-                const eagerLoad = index < Math.max(columnCount * 2, 6);
+                const isLcpCandidate = index === lcpImageIndex;
+                const eagerLoad = index < Math.min(columnCount, publicMode ? 2 : 3);
@@
                     <GalleryImageTile
@@
                       eagerLoad={eagerLoad}
+                      priority={isLcpCandidate}
+                      fetchPriority={isLcpCandidate ? "high" : "auto"}
```

```diff
diff --git a/components/contracts/gallery/gallery-image-tile.tsx b/components/contracts/gallery/gallery-image-tile.tsx
--- a/components/contracts/gallery/gallery-image-tile.tsx
+++ b/components/contracts/gallery/gallery-image-tile.tsx
@@
 interface GalleryImageTileProps {
@@
   eagerLoad: boolean;
+  priority?: boolean;
+  fetchPriority?: "high" | "low" | "auto";
@@
 export function GalleryImageTile({
@@
   eagerLoad,
+  priority = eagerLoad,
+  fetchPriority = priority ? "high" : "auto",
@@
       <Image
@@
-        priority={eagerLoad}
+        priority={priority}
+        fetchPriority={fetchPriority}
+        loading={priority || eagerLoad ? "eager" : "lazy"}
```

Notes:

- This preserves backward compatibility because `priority` defaults to existing `eagerLoad` behavior if a caller does not pass it.
- For LCP optimization, callers should pass `priority={index === 0}` so only one image gets a preload and high fetch priority.
- If Next warns about using `loading` with `priority`, remove the explicit `loading` line and rely on `priority` for the LCP image; keep `eagerLoad` only if Next Image version supports the combination cleanly.

```diff
diff --git a/app/actions/gallery-core.ts b/app/actions/gallery-core.ts
--- a/app/actions/gallery-core.ts
+++ b/app/actions/gallery-core.ts
@@
-export const PUBLIC_IMAGE_PAGE_SIZE = 100;
+export const PUBLIC_IMAGE_PAGE_SIZE = 30;
```

Alternative safer variant if other flows rely on 100:

```diff
diff --git a/app/actions/gallery-core.ts b/app/actions/gallery-core.ts
--- a/app/actions/gallery-core.ts
+++ b/app/actions/gallery-core.ts
@@
 export const PUBLIC_IMAGE_PAGE_SIZE = 100;
+export const PUBLIC_INITIAL_IMAGE_PAGE_SIZE = 30;
```

```diff
diff --git a/app/actions/gallery-public-actions.ts b/app/actions/gallery-public-actions.ts
--- a/app/actions/gallery-public-actions.ts
+++ b/app/actions/gallery-public-actions.ts
@@
-import { PUBLIC_IMAGE_PAGE_SIZE, PublicGalleryRow, ... } from "./gallery-core";
+import { PUBLIC_IMAGE_PAGE_SIZE, PUBLIC_INITIAL_IMAGE_PAGE_SIZE, PublicGalleryRow, ... } from "./gallery-core";
@@
-      fetchPublicGalleryImagesPage(supabase, data.id, 0),
+      fetchPublicGalleryImagesPage(supabase, data.id, 0, PUBLIC_INITIAL_IMAGE_PAGE_SIZE),
```

```diff
diff --git a/components/gallery/public-gallery-client.tsx b/components/gallery/public-gallery-client.tsx
--- a/components/gallery/public-gallery-client.tsx
+++ b/components/gallery/public-gallery-client.tsx
@@
-    if (effectiveType === "3g") return 50;          // 50 images on 3G
-    return 100;                                     // 100 images on 4G+
+    if (effectiveType === "3g") return 30;          // align with SSR first page
+    return 30;                                      // keep first public batches LCP-friendly
```

Or, if infinite-scroll throughput matters, keep later pages larger by adding separate initial/server page size support instead of changing all client pages.

## Proposed cached merge for preview/page SSR

A conservative helper shape:

```diff
diff --git a/app/actions/gallery-public-actions.ts b/app/actions/gallery-public-actions.ts
--- a/app/actions/gallery-public-actions.ts
+++ b/app/actions/gallery-public-actions.ts
@@
 const fetchSharedGalleryByAccessUrlCached = cache(fetchSharedGalleryByAccessUrl);
+
+const getPublicGalleryPayloadCached = cache(async (accessUrl: string) => {
+  const supabase = await createAdminClient();
+  const data = await fetchSharedGalleryByAccessUrlCached(supabase, accessUrl);
+  if (!data) return null;
+
+  const hasPassword = galleryHasPassword(data);
+  const coverImagePromise = data.og_image_url
+    ? Promise.resolve(data.og_image_url)
+    : fetchGalleryCoverImage(supabase, data.id, true, data.cover_image_id);
+
+  if (hasPassword) {
+    const [imageCount, coverImageUrl] = await Promise.all([
+      fetchGalleryImageCount(supabase, data.id, { publicVisibleOnly: true }),
+      coverImagePromise,
+    ]);
+    return { data, hasPassword, imageCount, coverImageUrl, page: null, selectedCount: 0 };
+  }
+
+  const [page, selectedCount, coverImageUrl] = await Promise.all([
+    fetchPublicGalleryImagesPage(supabase, data.id, 0, 30),
+    fetchGalleryImageCount(supabase, data.id, { selectedOnly: true }),
+    coverImagePromise,
+  ]);
+
+  return { data, hasPassword, imageCount: page.totalCount, coverImageUrl, page, selectedCount };
+});
```

Then:

- `getPublicGallery()` uses `payload.page`, `payload.selectedCount`, and `payload.imageCount`.
- `getPublicGalleryPreview()` uses `payload.imageCount`, `payload.coverImageUrl`, and metadata fields.
- This dedupes base gallery lookup and also avoids a separate public image count query for non-password galleries.

Caveat: this helper uses `cache()` inside a server action module. Existing code already uses React `cache()` here, so the pattern is consistent, but verify behavior under the app's Next version and server action bundling.

## Layout Hydration Proposal

Current `app/gallery/layout.tsx` can stay functional, but it costs a client boundary just to mutate document styles.

Preferred direction:

```diff
diff --git a/app/gallery/layout.tsx b/app/gallery/layout.tsx
--- a/app/gallery/layout.tsx
+++ b/app/gallery/layout.tsx
@@
-"use client";
-
-import { useEffect } from "react";
-
 export default function GalleryLayout({ children }: { children: React.ReactNode }) {
-  useEffect(() => {
-    ...
-  }, []);
-
   return <div className="gallery-public-layout">{children}</div>;
 }
```

Then move the overflow fix to CSS, for example:

```css
html:has(.gallery-public-layout),
body:has(.gallery-public-layout) {
  overflow: auto;
  height: auto;
}
```

If `:has()` support is a concern, the better long-term fix is to stop applying app-shell overflow rules to `html, body` globally and scope them to the authenticated/app shell container instead.

## Priority Order

1. Change image priority semantics so only one LCP candidate gets `priority` and `fetchPriority="high"`.
2. Reduce public initial image page size from 100 to ~30, or introduce a separate `PUBLIC_INITIAL_IMAGE_PAGE_SIZE`.
3. Unify/cached public gallery payload so metadata and page render do not duplicate derived queries.
4. Remove client-only gallery layout if CSS scoping can replace the `useEffect` overflow override.

## Validation Plan

- Run Lighthouse on a public gallery before/after with a cold cache.
- Inspect rendered HTML/network waterfall and confirm only one gallery image has preload/high priority.
- Confirm first page still has enough images to fill initial viewport on desktop and mobile.
- Verify infinite scrolling still loads subsequent pages correctly after page size changes.
- Test password-protected public gallery metadata and unlock flow.

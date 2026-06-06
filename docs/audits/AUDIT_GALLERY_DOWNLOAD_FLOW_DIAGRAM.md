# Gallery Download Flow - Visual Diagrams

## 📊 1. COMPLETE SYSTEM FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CUSTOMER RECEIVES SHARE LINK                      │
│           https://stu.moodwedding.com/gallery/abc-xyz-123           │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     OPEN IN MOBILE BROWSER                           │
│  Platform: iOS Safari / iOS WebView / Android / Desktop             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SERVER-SIDE RENDERING (SSR) - Next.js 15               │
│                                                                      │
│  1. generateMetadata()                                              │
│     → fetchSharedGalleryByAccessUrl(accessUrl)                      │
│     → Return OG tags for social preview                             │
│                                                                      │
│  2. GalleryPage()                                                   │
│     → getPublicGallery(accessUrl)                                   │
│       ├─ Verify gallery exists                                      │
│       ├─ Check password gate                                        │
│       ├─ Generate JWT token with capability                         │
│       └─ Load first page (20-100 images based on network)           │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CLIENT HYDRATION - React Component                      │
│              <PublicGalleryClient initialData={...} />               │
│                                                                      │
│  Network Quality Detection: 2G/3G/4G/5G + Data Saver               │
│  → Adaptive page size (20/50/100 images)                           │
│                                                                      │
│  SWR Infinite Loading:                                              │
│  → Fetch page 0, 1, 2... on scroll                                 │
│  → Cache with revalidation                                          │
│  → Optimistic UI updates                                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
        ┌───────────┐    ┌───────────┐   ┌───────────┐
        │   VIEW    │    │  SELECT   │   │ DOWNLOAD  │
        │  GALLERY  │    │  IMAGES   │   │  IMAGES   │
        └─────┬─────┘    └─────┬─────┘   └─────┬─────┘
              │                │               │
              └────────────────┴───────────────┘
                               │
                               ▼
                    [DETAILED FLOWS BELOW]
```

---

## 🖼️ 2. IMAGE SELECTION FLOW

```
┌──────────────────────────────────────────────────────────────┐
│         User taps ❤️ icon on image thumbnail                 │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │   Client: Optimistic UI Update       │
    │   ✓ Instant heart animation          │
    │   ✓ Update local state               │
    │   ✓ Increment selectedCount          │
    └──────────────┬───────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────┐
    │   API Call: toggleImageSelection()   │
    │   POST with accessToken              │
    └──────────────┬───────────────────────┘
                   │
      ┌────────────┴────────────┐
      │                         │
      ▼                         ▼
┌──────────┐              ┌──────────┐
│ SUCCESS  │              │  FAILED  │
└────┬─────┘              └────┬─────┘
     │                         │
     ▼                         ▼
┌─────────────────┐    ┌──────────────────┐
│ Sync exact      │    │ Rollback state   │
│ selectedCount   │    │ Show toast error │
│ from server     │    │ Restore UI       │
└─────────────────┘    └──────────────────┘
     │                         │
     └──────────┬──────────────┘
                │
                ▼
    ┌───────────────────────────┐
    │ Bottom bar updates:       │
    │ "Đã chọn X ảnh / Y"       │
    │ [Tải X ảnh] button        │
    └───────────────────────────┘
```

---

## 📥 3. SINGLE IMAGE DOWNLOAD FLOW

```
┌────────────────────────────────────────────────────────────────┐
│  User taps [Download 📥] in ImageViewer lightbox              │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ▼
      ┌──────────────────────────────────┐
      │   detectPlatform()               │
      │   Check User-Agent               │
      └──────────┬───────────────────────┘
                 │
    ┌────────────┼────────────┬────────────┐
    │            │            │            │
    ▼            ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌────────┐  ┌────────┐
│iOS      │  │iOS      │  │Android │  │Desktop │
│Safari   │  │WebView  │  │        │  │        │
└────┬────┘  └────┬────┘  └───┬────┘  └───┬────┘
     │            │            │            │
     ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│           window.open() / window.location.href              │
│           → GET /api/gallery-download/{token}/{imageId}     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
        ┌─────────────────────────────────────┐
        │  SERVER: Validate Request           │
        │  1. Parse token (JWT-like)          │
        │  2. Verify HMAC signature           │
        │  3. Check expiration (< 12h)        │
        │  4. Verify imageId in galleryId     │
        └─────────────┬───────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
  ┌──────────┐              ┌──────────────┐
  │  VALID   │              │   INVALID    │
  └────┬─────┘              └──────┬───────┘
       │                           │
       ▼                           ▼
┌──────────────────────┐    ┌─────────────────┐
│ Check Capability     │    │ Return 403/401  │
│ & Payment Gate       │    └─────────────────┘
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  Capability Gate Decision Tree                       │
│                                                       │
│  IF capability === "view"                            │
│    → 403 "Chỉ xem, không tải"                        │
│                                                       │
│  ELSE IF capability === "select"                     │
│    IF !allow_download AND !download_unlocked_at      │
│      → 403 "Tính năng tải chưa kích hoạt"            │
│                                                       │
│  ELSE IF capability === "download"                   │
│    IF !allow_download AND !download_unlocked_at      │
│      Get contract                                    │
│      IF payment_status !== "da_thanh_toan"           │
│         AND remaining_amount > 0                     │
│        → 402 "Vui lòng hoàn thành thanh toán"        │
└──────────┬───────────────────────────────────────────┘
           │
           ▼ ALL CHECKS PASSED
┌──────────────────────────────────────────────────────┐
│  Fetch from Google Drive                             │
│  1. Try lh3.googleusercontent.com/d/{id}=s0 (fast)  │
│  2. Fallback googleapis.com/drive/.../alt=media     │
│  3. Stream response body to client (0 RAM)          │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  Response Headers:                                   │
│  Content-Type: image/jpeg                           │
│  Content-Disposition: attachment / inline           │
│    (inline for iOS Safari ?mode=view)               │
│  Content-Length: {size}                             │
│  Cache-Control: public, max-age=3600                │
└──────────┬───────────────────────────────────────────┘
           │
           ▼
    ┌─────────────────────────────────────┐
    │  PLATFORM-SPECIFIC DOWNLOAD         │
    └─────┬───────────────────────────────┘
          │
    ┌─────┴─────┬──────────┬──────────┐
    ▼           ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│iOS      │ │iOS     │ │Android │ │Desktop │
│Safari   │ │WebView │ │        │ │        │
│         │ │        │ │        │ │        │
│Open in  │ │Native  │ │Native  │ │Native  │
│new tab  │ │download│ │download│ │download│
│         │ │→ Files │ │→Gallery│ │→Down-  │
│User     │ │app     │ │        │ │loads   │
│long-    │ │        │ │        │ │folder  │
│press    │ │        │ │        │ │        │
│         │ │        │ │        │ │        │
│[Save    │ │        │ │        │ │        │
│Image]   │ │        │ │        │ │        │
│         │ │        │ │        │ │        │
│→ Photos │ │        │ │        │ │        │
└─────────┘ └────────┘ └────────┘ └────────┘
```

---

## 📦 4. BATCH ZIP DOWNLOAD FLOW

```
┌────────────────────────────────────────────────────────┐
│  User taps [Tải X ảnh] button                         │
│  (Bottom bar OR header "Tải album (ZIP)")             │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Check image count              │
    │  IF count > 30                  │
    │    → Alert: "Max 30 ảnh"        │
    │    → STOP                       │
    └─────────────┬───────────────────┘
                  │ ≤ 30 images
                  ▼
    ┌─────────────────────────────────┐
    │  window.location.href =         │
    │  /api/gallery-download-batch/   │
    │    {token}?ids=id1,id2,id3      │
    └─────────────┬───────────────────┘
                  │
                  ▼
┌───────────────────────────────────────────────────────┐
│  SERVER: Batch Download API                           │
│  1. Validate token (same as single)                   │
│  2. Verify capability + payment gate                  │
│  3. Get image list (ids param OR all selected)        │
│  4. Filter: only images with drive_file_id            │
│  5. Enforce MAX_ZIP_FILES = 30                        │
└─────────────────┬─────────────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Parallel Download (batch=5)    │
    │  for i = 0 to images.length:    │
    │    batch = images[i:i+5]        │
    │    await Promise.all(           │
    │      batch.map(downloadBuffer)  │
    │    )                            │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Create ZIP (JSZip)             │
    │  zip.file(fileName, buffer)     │
    │  ...for each image...           │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Generate ZIP Blob              │
    │  await zip.generateAsync()      │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Response:                      │
    │  Content-Type: application/zip  │
    │  Content-Disposition:           │
    │    attachment;                  │
    │    filename="album-{title}.zip" │
    └─────────────┬───────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────┐
    │  Native Download                │
    │  → iOS: Files app               │
    │  → Android: Downloads folder    │
    │  → Desktop: Downloads folder    │
    └─────────────────────────────────┘
```

---

## 🔐 5. AUTHENTICATION & AUTHORIZATION FLOW

```
┌────────────────────────────────────────────────────────┐
│  Gallery Creation by Admin                             │
│  - Set capability: "select" | "view" | "download"      │
│  - Generate access_url: "abc-xyz-123"                  │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────┐
│  Customer accesses: /gallery/abc-xyz-123               │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────────┐
    │  getPublicGallery(accessUrl)        │
    │  1. Fetch gallery by access_url     │
    │  2. Check password gate             │
    │  3. Get capability from DB          │
    │  4. Generate JWT token              │
    └─────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  signGalleryAccessProof()                               │
│                                                          │
│  payload = {                                            │
│    scope: "public-gallery",                             │
│    galleryId: "uuid",                                   │
│    accessUrl: "abc-xyz-123",                            │
│    accessVersion: 1,                                    │
│    capability: "select",                                │
│    exp: now + 12h                                       │
│  }                                                      │
│                                                          │
│  body = base64url(JSON.stringify(payload))             │
│  signature = HMAC-SHA256(body, SECRET)                 │
│  token = body + "." + signature                        │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────┐
│  Client stores token in React state                    │
│  All API calls include token in URL                    │
└────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────┐
│  DOWNLOAD REQUEST                                      │
│  GET /api/gallery-download/{token}/{imageId}           │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
    ┌─────────────────────────────────────┐
    │  verifyGalleryAccessProof()         │
    │  1. Split token into body.signature │
    │  2. Recompute HMAC(body, SECRET)    │
    │  3. Compare signatures (timing-safe)│
    │  4. Parse payload from body         │
    │  5. Verify scope, galleryId, URL    │
    │  6. Verify accessVersion matches DB │
    │  7. Check exp > now()               │
    └─────────────┬───────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
    ▼                           ▼
┌──────────┐              ┌──────────┐
│  VALID   │              │ INVALID  │
└────┬─────┘              └────┬─────┘
     │                         │
     ▼                         ▼
┌─────────────────┐    ┌──────────────┐
│ Check Payment   │    │ Return 403   │
│ Gate            │    │ "Token không │
└─────┬───────────┘    │  hợp lệ"     │
      │                └──────────────┘
      ▼
[DOWNLOAD FLOW CONTINUES]
```

---

## 💳 6. PAYMENT GATE DECISION TREE

```
                    ┌──────────────────┐
                    │  Download Request│
                    └────────┬─────────┘
                             │
                             ▼
                ┌────────────────────────────┐
                │ Get capability from token  │
                └────────┬───────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐     ┌─────────┐     ┌──────────┐
    │ "view" │     │"select" │     │"download"│
    └───┬────┘     └────┬────┘     └────┬─────┘
        │               │                │
        ▼               ▼                ▼
    ┌────────┐     ┌─────────────┐  ┌──────────────┐
    │ BLOCK  │     │Check unlock │  │ Check unlock │
    │ 403    │     │   flags     │  │   OR payment │
    └────────┘     └──────┬──────┘  └──────┬───────┘
                          │                │
              ┌───────────┴─────────┐     │
              │                     │     │
              ▼                     ▼     ▼
        ┌──────────┐          ┌──────────────┐
        │ unlocked?│          │ unlocked?    │
        └────┬─────┘          └──────┬───────┘
             │                       │
      ┌──────┴──────┐         ┌──────┴──────┐
      │             │         │             │
      ▼             ▼         ▼             ▼
   ┌─────┐      ┌──────┐  ┌─────┐      ┌──────────┐
   │ YES │      │  NO  │  │ YES │      │   NO     │
   └──┬──┘      └───┬──┘  └──┬──┘      └────┬─────┘
      │             │        │               │
      ▼             ▼        ▼               ▼
   ┌─────┐      ┌─────┐  ┌─────┐      ┌──────────┐
   │ALLOW│      │BLOCK│  │ALLOW│      │Check pay │
   └─────┘      │ 403 │  └─────┘      └────┬─────┘
                └─────┘                     │
                                    ┌───────┴───────┐
                                    │               │
                                    ▼               ▼
                            ┌───────────┐    ┌──────────┐
                            │  paid?    │    │ not paid │
                            └─────┬─────┘    └────┬─────┘
                                  │               │
                           ┌──────┴──────┐        │
                           │             │        ▼
                           ▼             ▼     ┌──────┐
                        ┌─────┐      ┌─────┐  │BLOCK │
                        │ YES │      │ NO  │  │ 402  │
                        └──┬──┘      └──┬──┘  └──────┘
                           │            │
                           ▼            ▼
                        ┌─────┐      ┌─────┐
                        │ALLOW│      │BLOCK│
                        └─────┘      │ 402 │
                                     └─────┘

UNLOCK CONDITIONS:
• allow_download = true (manual toggle by admin)
• download_unlocked_at IS NOT NULL (unlocked timestamp)

PAYMENT CONDITIONS:
• contract.payment_status = "da_thanh_toan"
  OR
• contract.remaining_amount <= 0
```

---

## 📱 7. MOBILE PLATFORM DETECTION

```
┌────────────────────────────────────────────────┐
│  detectPlatform() - lib/detect-platform.ts     │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │  Check navigator.userAgent     │
    └────────────┬───────────────────┘
                 │
        ┌────────┼────────┐
        │                 │
        ▼                 ▼
   ┌─────────┐      ┌──────────┐
   │  iOS?   │      │ Android? │
   └────┬────┘      └─────┬────┘
        │                 │
    ┌───┴───┐             ▼
    │       │      ┌──────────────┐
    ▼       ▼      │ "android"    │
┌────────┐ ┌─────────────┐       │
│Safari? │ │ WebView?    │       │
└───┬────┘ └─────┬───────┘       │
    │            │                │
    ▼            ▼                ▼
┌────────┐ ┌──────────┐ ┌─────────────┐
│"ios-   │ │"ios-     │ │  Otherwise  │
│safari" │ │webview"  │ │  "desktop"  │
└────────┘ └──────────┘ └─────────────┘

DETECTION RULES:
┌──────────────────────────────────────────────────────┐
│ iOS Safari:                                          │
│   - Has "iPad|iPhone|iPod" in UA                     │
│   - Has "Safari" in UA                               │
│   - NOT "CriOS|FxiOS|Chrome|EdgiOS|OPiOS"            │
│                                                       │
│ iOS WebView:                                         │
│   - Has "iPad|iPhone|iPod" in UA                     │
│   - Has Chrome/Facebook/Line/Zalo wrapper            │
│                                                       │
│ Android:                                             │
│   - Has "Android" in UA                              │
│                                                       │
│ Desktop:                                             │
│   - Everything else (Windows/Mac/Linux)              │
└──────────────────────────────────────────────────────┘
```

---

## 🎨 8. IMAGE LOADING STRATEGY

```
┌────────────────────────────────────────────────────────┐
│  PROGRESSIVE IMAGE LOADING PIPELINE                    │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │  1. BlurHash   │  ← Instant (20 bytes)
        │  Placeholder   │    Decode to blur preview
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │  2. Thumbnail  │  ← Fast (100-200 KB)
        │  sz=s400       │    lh3://...=s400
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │  3. Viewer     │  ← Medium (500KB-2MB)
        │  sz=s1600      │    When lightbox opened
        └────────┬───────┘
                 │
                 ▼
        ┌────────────────┐
        │  4. Original   │  ← Large (5-30 MB)
        │  On Download   │    Only on explicit download
        └────────────────┘

NETWORK-AWARE PAGINATION:
┌──────────────┬──────────────┬─────────────┐
│  Connection  │  Page Size   │  Strategy   │
├──────────────┼──────────────┼─────────────┤
│  Slow 2G/3G  │  20 images   │  Aggressive │
│  Data Saver  │  20 images   │  caching    │
├──────────────┼──────────────┼─────────────┤
│  3G          │  50 images   │  Balanced   │
├──────────────┼──────────────┼─────────────┤
│  4G / 5G     │  100 images  │  Prefetch   │
│  WiFi        │  100 images  │  next page  │
└──────────────┴──────────────┴─────────────┘
```

---

## ⚡ 9. PERFORMANCE OPTIMIZATION LAYERS

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT-SIDE                          │
├────────────────────────────────────────────────────────┤
│  ✓ Virtual Scrolling (react-window)                    │
│    → Only render visible images                        │
│    → Handle 1000+ images without lag                   │
│                                                         │
│  ✓ BlurHash Placeholders                               │
│    → Decode blur from 20-byte hash                     │
│    → Instant preview while loading                     │
│                                                         │
│  ✓ Progressive Lazy Loading                            │
│    → Intersection Observer API                         │
│    → Load images as they enter viewport                │
│                                                         │
│  ✓ SWR Caching                                         │
│    → In-memory cache with revalidation                 │
│    → Stale-while-revalidate strategy                   │
│    → Deduplication of parallel requests                │
│                                                         │
│  ✓ Image Prefetching                                   │
│    → Prefetch next/prev in lightbox                    │
│    → Prefetch next page on scroll                      │
│                                                         │
│  ✓ Optimistic UI Updates                               │
│    → Instant feedback on selection                     │
│    → Rollback on API failure                           │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                   SERVER-SIDE                          │
├────────────────────────────────────────────────────────┤
│  ✓ React cache() for SSR                               │
│    → Dedupe generateMetadata + page component          │
│                                                         │
│  ✓ Database Indexes                                    │
│    → idx_gallery_share_links_active_slug               │
│    → idx_gallery_images_gallery_selected               │
│                                                         │
│  ✓ Streaming Downloads                                 │
│    → Pipe Drive response directly to client            │
│    → 0 RAM usage on server                             │
│                                                         │
│  ✓ CDN Priority (lh3)                                  │
│    → Try Google CDN first                              │
│    → Fallback to Drive API                             │
│                                                         │
│  ✓ Parallel ZIP Downloads                              │
│    → Batch size 5 concurrent                           │
│    → Prevent overwhelming Drive API                    │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                       │
├────────────────────────────────────────────────────────┤
│  ✓ Google Drive CDN                                    │
│    → Global edge network                               │
│    → Automatic image optimization                      │
│                                                         │
│  ✓ Next.js ISR                                         │
│    → Cache OG images (revalidate 3600s)                │
│                                                         │
│  ✓ Vercel Edge Functions                               │
│    → Low-latency globally                              │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 10. STATE MANAGEMENT FLOW

```
┌────────────────────────────────────────────────────────┐
│              GALLERY STATE (SWR + React)               │
└────────────────────────────────────────────────────────┘

CLIENT STATE:
┌──────────────────────────────────────────────────────┐
│  const { data: pagesData } = useSWRInfinite(...)     │
│    → pages: [{ images, hasMore, page }, ...]         │
│                                                       │
│  const { data: stats } = useSWR("gallery-stats")     │
│    → { selectedCount, imageCount }                   │
│                                                       │
│  const { data: reactionCounts } = useSWR(...)        │
│    → { [imageId]: { hearts: 5 } }                    │
│                                                       │
│  const [viewerIndex, setViewerIndex] = useState()    │
│  const [activeGroup, setActiveGroup] = useState()    │
│  const [togglingIds, setTogglingIds] = useState()    │
└──────────────────────────────────────────────────────┘

STATE SYNC FLOW:
┌──────────────────────────────────────────────────────┐
│  User Action (e.g., toggle selection)                │
└────────┬─────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│  1. Optimistic Update (mutate + revalidate: false)   │
│     → Update images array immediately                 │
│     → Update selectedCount immediately                │
└────────┬─────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────┐
│  2. API Call (toggleImageSelection)                  │
└────────┬─────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌────────┐
│SUCCESS │  │ FAILED │
└───┬────┘  └───┬────┘
    │           │
    ▼           ▼
┌────────┐  ┌─────────────┐
│ Sync   │  │ Rollback    │
│ exact  │  │ optimistic  │
│ count  │  │ changes     │
└────────┘  └─────────────┘
    │           │
    └─────┬─────┘
          │
          ▼
┌──────────────────────────────┐
│  UI reflects final state     │
└──────────────────────────────┘
```

---

## 📊 11. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                   (Mobile Browser)                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ HTTPS
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE                               │
│              (Next.js 15 App Router)                         │
│                                                               │
│  SSR: generateMetadata() + GalleryPage()                    │
│  API Routes: /api/gallery-download/*                        │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Supabase Client
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE POSTGRES                          │
│                                                               │
│  Tables:                                                     │
│  • galleries                                                 │
│  • gallery_images                                            │
│  • gallery_share_links                                       │
│  • gallery_selection_batches                                 │
│  • contracts                                                 │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  GOOGLE DRIVE API                            │
│                                                               │
│  lh3.googleusercontent.com/d/{fileId}=s0                    │
│  googleapis.com/drive/v3/files/{id}?alt=media               │
│                                                               │
│  → Original images (5-30 MB each)                           │
└─────────────────────────────────────────────────────────────┘

DATA FLOW:
1. User → Vercel: GET /gallery/abc-xyz-123
2. Vercel → Supabase: SELECT * FROM galleries WHERE access_url = ...
3. Vercel → User: SSR HTML + React hydration
4. User → Vercel: API calls with JWT token
5. Vercel → Supabase: Verify token, fetch images
6. Vercel → Drive: Stream file download
7. Vercel → User: Pipe streamed file
```

---

## 🎯 SUMMARY

This visual documentation covers:
1. ✅ Complete system flow (entry to download)
2. ✅ Image selection with optimistic UI
3. ✅ Single download with platform detection
4. ✅ Batch ZIP download
5. ✅ Authentication & JWT token flow
6. ✅ Payment gate decision tree
7. ✅ Mobile platform detection
8. ✅ Progressive image loading strategy
9. ✅ Performance optimization layers
10. ✅ State management flow
11. ✅ Data flow architecture

**Key Insights:**
- 🔐 Security-first design with layered gates
- 📱 Mobile-optimized with platform-specific UX
- ⚡ Performance-tuned from client to CDN
- 🎨 Progressive loading for instant feedback
- 💾 Optimistic UI for smooth interactions

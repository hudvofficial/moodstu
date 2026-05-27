# AUDIT: Gallery Share Link Download Flow on Mobile
**Date:** 2026-05-27  
**Scope:** Full business flow for customers downloading images from `/gallery/[accessUrl]` on mobile devices

---

## 🎯 Executive Summary

The system provides a complete, secure flow for customers to access shared galleries and download images on mobile devices. The flow includes:
- **Token-based authentication** with capability levels (view/select/download)
- **Mobile-optimized download strategies** for iOS Safari, iOS WebView, and Android
- **Payment gates** that restrict downloads based on contract status
- **Progressive image loading** with network-aware optimization
- **Batch ZIP downloads** (up to 30 images)

**Key Finding:** The system is production-ready with solid security, mobile UX, and performance optimizations. Minor recommendations included below.

---

## 📊 Flow Architecture

```
USER ACCESS
    ↓
/gallery/[accessUrl] (Public Route)
    ↓
getPublicGallery() → Verify access_url + Generate JWT token
    ↓
PublicGalleryClient (React Component)
    ↓
    ├─→ View Gallery Grid (Virtual Scrolling)
    ├─→ Select Images (Heart Icon)
    ├─→ Open ImageViewer Lightbox
    └─→ Download Triggers
        ├─→ Single: /api/gallery-download/[token]/[imageId]
        └─→ Batch: /api/gallery-download-batch/[token]?ids=...
            ↓
        Capability Check + Payment Gate
            ↓
        Stream from Google Drive → Native Download
```

---

## 🔐 1. AUTHENTICATION & ACCESS CONTROL

### 1.1 Gallery Access Token Generation
**File:** `lib/gallery-access.ts`

```typescript
// Token structure: {body}.{signature}
// Body = base64url(JSON payload)
// Signature = HMAC-SHA256(body, secret)

Payload:
{
  scope: "public-gallery",
  galleryId: string,
  accessUrl: string,
  accessVersion: number,    // Incremented when permissions change
  capability: "select" | "view" | "download",
  exp: timestamp           // TTL = 12 hours
}
```

**Security Features:**
- ✅ HMAC signature prevents tampering
- ✅ Time-based expiration (12h TTL)
- ✅ Version-based invalidation when gallery settings change
- ✅ Capability-based permissions encoded in token

### 1.2 Access Levels (Capability)

| Capability | View Gallery | Select Images | Download Single | Download Batch |
|-----------|--------------|---------------|-----------------|----------------|
| `view`    | ✅ Yes       | ❌ No         | ❌ No           | ❌ No          |
| `select`  | ✅ Yes       | ✅ Yes        | ⚠️ If unlocked  | ⚠️ If unlocked |
| `download`| ✅ Yes       | ✅ Yes        | ⚠️ If paid      | ⚠️ If paid     |

**Unlock Conditions:**
```typescript
// "select" capability: needs manual unlock
isUnlocked = gallery.allow_download || gallery.download_unlocked_at !== null

// "download" capability: needs unlock OR full payment
isUnlocked OR (
  contract.payment_status === "da_thanh_toan" OR
  contract.remaining_amount <= 0
)
```

---

## 📱 2. MOBILE ACCESS FLOW

### 2.1 Entry Point
**Route:** `app/gallery/[accessUrl]/page.tsx`

**SSR Flow:**
1. **generateMetadata()** → Fetch OG preview for social sharing
   - Loads gallery title, image count, OG image
   - Generates Open Graph tags for Facebook/Zalo preview
   
2. **GalleryPage component** → Server-side render
   - Calls `getPublicGallery(accessUrl)`
   - Generates access token with capability
   - Returns initial page of images (20-100 based on network)

### 2.2 Client Hydration
**Component:** `components/gallery/public-gallery-client.tsx`

**Network-Aware Loading:**
```typescript
// Adaptive page size based on connection quality
const pageSize = useMemo(() => {
  if (isSlowNetwork || saveData) return 20;   // 2G/3G or Data Saver
  if (effectiveType === "3g") return 50;
  return 100;                                 // 4G+
}, [isSlowNetwork, effectiveType, saveData]);
```

**Features:**
- 📶 Progressive loading via SWR Infinite
- 🎨 BlurHash placeholders for smooth loading
- ⚡ Virtual scrolling for 1000+ images
- 💾 Client-side caching with SWR

### 2.3 Image Selection
**File:** `app/actions/gallery-selection-actions.ts`

**Flow:**
1. User taps **Heart icon** on image
2. Optimistic UI update (instant feedback)
3. API call: `toggleImageSelection(imageId, selected, accessUrl, token)`
4. Server validates token + updates `gallery_images.is_selected`
5. Rollback on error, sync exact count on success

**Database:**
```sql
-- gallery_images table
is_selected: boolean
selected_at: timestamptz
client_note: text  -- Optional note from customer
```

---

## 📥 3. DOWNLOAD MECHANISMS

### 3.1 Single Image Download

**API Route:** `app/api/gallery-download/[token]/[imageId]/route.ts`

**Security Checks:**
```typescript
1. Token validation (signature + expiration)
2. Image ownership (imageId belongs to galleryId)
3. Capability check:
   - "view" → BLOCK with 403
   - "select" → Require allow_download = true
   - "download" → Require unlock OR full payment
4. Stream file from Google Drive
```

**Mobile Download Strategy**  
**File:** `components/gallery/image-viewer.tsx` + `lib/detect-platform.ts`

```typescript
Platform Detection:
- ios-safari:   Safari on iPhone/iPad
- ios-webview:  Zalo, Facebook, Line in-app browsers
- android:      Any Android browser
- desktop:      Everything else

Download Behavior:
┌─────────────────┬──────────────────────────────────────┐
│ Platform        │ Strategy                             │
├─────────────────┼──────────────────────────────────────┤
│ ios-safari      │ Open in new tab with ?mode=view      │
│                 │ → User long-press → "Save Image"     │
│                 │ → Saves to Photos app                │
├─────────────────┼──────────────────────────────────────┤
│ ios-webview     │ window.location.href = API URL       │
│                 │ → Native download → Files app        │
├─────────────────┼──────────────────────────────────────┤
│ android         │ window.location.href = API URL       │
│                 │ → Native download → Gallery/Download │
├─────────────────┼──────────────────────────────────────┤
│ desktop         │ window.location.href = API URL       │
│                 │ → Native download → Downloads folder │
└─────────────────┴──────────────────────────────────────┘
```

**iOS Safari Workaround:**
- iOS Safari blocks direct downloads without user gesture
- Solution: Open full-res image in new tab with `Content-Disposition: inline`
- User can long-press → "Save Image" → Photos app (native iOS UX)
- Toast notification guides users: *"Nhấn giữ ảnh → chọn 'Lưu hình ảnh' để lưu vào Album"*

**Download URL Format:**
```
/api/gallery-download/{token}/{imageId}
?mode=view   (optional: inline for iOS Safari)
```

**Response Headers:**
```http
Content-Type: image/jpeg
Content-Disposition: attachment; filename="IMG_1234.jpg"
  OR
Content-Disposition: inline; filename="IMG_1234.jpg"  (iOS Safari)
Content-Length: 8421942
Cache-Control: public, max-age=3600
```

**Google Drive Source Priority:**
```typescript
1. Try lh3.googleusercontent.com/d/{fileId}=s0  (Fast CDN)
2. Fallback to googleapis.com/drive/v3/files/{fileId}?alt=media
3. Stream directly to client (0 RAM on server)
```

---

### 3.2 Batch Download (ZIP)

**API Route:** `app/api/gallery-download-batch/[token]/route.ts`

**Features:**
- ✅ Downloads up to 30 images in one ZIP
- ✅ Parallel fetching (5 concurrent downloads)
- ✅ In-memory ZIP compression via JSZip
- ✅ Same capability + payment gates

**Client Trigger:**
```typescript
// From SelectionSummary bottom bar
window.location.href = 
  `/api/gallery-download-batch/${accessToken}?ids=${imageIds.join(",")}`;

// OR album-wide download button (header)
window.location.href = `/api/gallery-download-batch/${accessToken}`;
```

**Limits:**
- MAX_ZIP_FILES = 30 (prevents timeout + excessive RAM)
- If > 30 images selected → Alert: *"Vui lòng chọn ít ảnh hơn và tải làm nhiều lần"*

**ZIP Filename:**
```typescript
album-{title}.zip  // e.g., album-Nguyen_Van_A_Wedding.zip
```

---

## 🔒 4. PAYMENT GATES

**File:** `app/api/gallery-download/[token]/[imageId]/route.ts` (Lines 139-189)

### 4.1 Gate Logic

```typescript
const capability = token.capability;
const isUnlocked = gallery.allow_download || gallery.download_unlocked_at;

if (capability === "view") {
  return 403; // "Liên kết chỉ xem, không được phép tải ảnh gốc"
}

if (capability === "select") {
  if (!isUnlocked) {
    return 403; // "Tính năng tải ảnh gốc chưa được kích hoạt"
  }
}

if (capability === "download") {
  if (!isUnlocked) {
    const contract = await getContract(gallery.contract_id);
    const isPaid = 
      contract.payment_status === "da_thanh_toan" ||
      contract.remaining_amount <= 0;
    
    if (!isPaid) {
      return 402; // "Vui lòng hoàn thành thanh toán hợp đồng"
    }
  }
}
```

### 4.2 Unlock Mechanisms

**Admin Manual Unlock:**
```sql
UPDATE galleries
SET allow_download = true,
    download_unlocked_at = now(),
    download_unlocked_by = {admin_user_id}
WHERE id = {gallery_id};
```

**Auto-unlock on Payment:**
```sql
-- When contract is fully paid
UPDATE contracts
SET payment_status = 'da_thanh_toan',
    remaining_amount = 0
WHERE id = {contract_id};

-- Gallery with capability="download" auto-unlocks
```

---

## 💾 5. DATABASE SCHEMA

### 5.1 Core Tables

**galleries**
```sql
id                    uuid PRIMARY KEY
contract_id           uuid → contracts(id)
title                 text
access_url            text UNIQUE          -- Legacy, still used
og_title              text                 -- Social preview title
og_description        text
og_image_url          text
capability            text                 -- "select" | "view" | "download"
allow_download        boolean DEFAULT false
download_unlocked_at  timestamptz
download_unlocked_by  uuid → users(id)
share_version         integer DEFAULT 1    -- Increment to invalidate tokens
selection_limit       integer              -- Max images client can select
created_at            timestamptz
```

**gallery_images**
```sql
id                uuid PRIMARY KEY
gallery_id        uuid → galleries(id)
drive_file_id     text                -- Google Drive file ID
file_name         text
image_url         text                -- Full-size URL
thumbnail_url     text                -- lh3://...=s400
is_selected       boolean DEFAULT false
selected_at       timestamptz
client_note       text
blurhash          text                -- For progressive loading
width             integer
height            integer
file_size_bytes   bigint
created_at        timestamptz
```

**gallery_share_links** (New multi-link system)
```sql
id              uuid PRIMARY KEY
gallery_id      uuid → galleries(id)
slug            text UNIQUE         -- Short URL slug
capability      text                -- "select" | "view" | "download"
status          text                -- "active" | "disabled"
expires_at      timestamptz         -- Optional expiration
access_version  integer DEFAULT 1   -- Increment to invalidate
created_by      uuid
created_at      timestamptz

UNIQUE (gallery_id, capability)    -- One link per capability
```

### 5.2 Missing: Download Analytics

**⚠️ OBSERVATION:** No download tracking exists

**Current State:**
- ❌ No table for download logs
- ❌ No tracking of who downloaded what
- ❌ No download count per image
- ❌ No bandwidth usage metrics

**Recommendation:** Consider adding:
```sql
CREATE TABLE gallery_download_logs (
  id              uuid PRIMARY KEY,
  gallery_id      uuid NOT NULL,
  image_id        uuid,           -- NULL for batch ZIP
  client_id       text,           -- Anonymous client identifier
  download_type   text,           -- "single" | "zip"
  file_count      integer,        -- For ZIP downloads
  user_agent      text,
  ip_address      inet,
  platform        text,           -- "ios-safari", "android", etc.
  downloaded_at   timestamptz DEFAULT now()
);
```

---

## 🚀 6. PERFORMANCE OPTIMIZATIONS

### 6.1 Client-Side

✅ **Implemented:**
- Virtual scrolling (react-window) for 1000+ images
- BlurHash placeholders (instant preview)
- Network-aware page sizes (20-100 images)
- Progressive lazy loading
- SWR caching with revalidation
- Image prefetching (next/prev in viewer)
- Optimistic UI updates

### 6.2 Server-Side

✅ **Implemented:**
- React cache() for SSR deduplication
- Google Drive CDN (lh3) priority
- Streaming downloads (0 server RAM)
- Parallel ZIP downloads (batch size 5)
- Index optimization on hot queries

**Key Indexes:**
```sql
idx_gallery_share_links_active_slug (slug) WHERE status = 'active'
idx_gallery_images_gallery_selected (gallery_id, is_selected)
idx_gallery_images_drive_file (drive_file_id)
```

---

## 📊 7. MOBILE UX JOURNEY

### Step-by-Step Flow

**1. Share Link Received**
```
Customer receives: https://stu.moodwedding.com/gallery/abc-xyz-123
Via: Zalo, Facebook Messenger, SMS, Email
```

**2. Open in Mobile Browser**
```
→ Auto-detect: iOS Safari / iOS WebView / Android
→ SSR: Load OG preview (title + cover image + count)
→ Hydrate: PublicGalleryClient React component
```

**3. View Gallery**
```
Header:
  📷 Album Title
  🖼️ 120 images  ❤️ 15 selected  [Download ZIP]
  
Tabs:
  [ TẤT CẢ ]  [ ĐÃ CHỌN ]

Grid:
  📸 📸 📸 📸
  📸 📸 📸 📸  ← BlurHash → Thumbnail → Full
  📸 📸 📸 📸
  [Load More...]
```

**4. Select Images** (if capability = "select")
```
Tap ❤️ icon on images
→ Instant UI update (optimistic)
→ API call to toggle is_selected
→ Bottom bar: "Đã chọn 15 ảnh / 120"  [Tải 15 ảnh]
```

**5. Open Lightbox**
```
Tap image → Full-screen viewer
→ Swipe left/right (mobile)
→ Arrow keys (desktop)
→ Bottom bar: [Download 📥] [Heart ❤️]
```

**6. Download Single Image**

**iOS Safari:**
```
Tap [Download] 
→ Opens in new tab (full-res image)
→ Toast: "Nhấn giữ ảnh → chọn 'Lưu hình ảnh' để lưu vào Album"
→ User long-press → [Save Image]
→ Saved to Photos app ✅
```

**iOS WebView (Zalo/FB):**
```
Tap [Download]
→ Native download triggered
→ Toast: "Ảnh sẽ được lưu trong app Tệp (Files)"
→ Opens Files app → Downloads ✅
```

**Android:**
```
Tap [Download]
→ Native download triggered
→ Toast: "Đang tải IMG_1234.jpg..."
→ Saved to Gallery/Downloads ✅
→ Notification: "Download complete"
```

**7. Batch Download**
```
Bottom bar: [Tải 15 ảnh]
→ Triggers /api/gallery-download-batch
→ Server creates ZIP (max 30 images)
→ Native download: album-{title}.zip
→ Android: Notification + can open ZIP
→ iOS: Files app → can extract with Files or iZip
```

---

## ⚠️ 8. EDGE CASES & ERROR HANDLING

### 8.1 Client-Side Errors

| Scenario | Handling |
|----------|----------|
| Network offline | SWR retry + fallback to cached data |
| Image load failure | Gray placeholder + retry button |
| Selection API fails | Rollback optimistic update + toast error |
| Download blocked by browser | Toast with instructions |
| > 30 images in batch | Alert with limit message |

### 8.2 Server-Side Errors

| Scenario | Response |
|----------|----------|
| Invalid token signature | 403 "Liên kết không hợp lệ hoặc đã hết hạn" |
| Token expired (> 12h) | 403 "Liên kết đã hết hạn" |
| Gallery not found | 404 "Album không tồn tại" |
| Image not in gallery | 404 "Ảnh không tồn tại trong album" |
| Drive file missing | 404 "File không tồn tại trên Drive" |
| Capability = "view" | 403 "Liên kết chỉ xem, không được phép tải" |
| Not paid (download cap) | 402 "Vui lòng hoàn thành thanh toán" |
| Not unlocked (select cap) | 403 "Tính năng tải chưa được kích hoạt" |

### 8.3 Mobile-Specific Issues

**iOS Safari Download Block:**
- **Problem:** iOS blocks `<a download>` and `window.location` without user gesture
- **Solution:** Open image in new tab with `inline` disposition → User can long-press
- **UX:** Toast guides user to long-press → Save Image

**iOS WebView Restrictions:**
- **Problem:** Zalo/FB browsers may block popups
- **Solution:** Use `window.location.href` (same tab) for reliable download
- **Trade-off:** Navigates away from gallery (can tap Back to return)

**Android ZIP Extraction:**
- **Problem:** Android Downloads doesn't auto-extract ZIP
- **Solution:** User needs to tap ZIP → Open with Files/WinZip/etc.
- **Recommendation:** Add toast: *"Tải xong! Mở file ZIP để xem ảnh"*

---

## ✅ 9. SECURITY CHECKLIST

| Check | Status | Notes |
|-------|--------|-------|
| Token signature validation | ✅ Pass | HMAC-SHA256 with secret key |
| Token expiration (12h TTL) | ✅ Pass | Checked on every request |
| Version-based invalidation | ✅ Pass | `access_version` in token |
| Image ownership verification | ✅ Pass | `imageId` must belong to `galleryId` |
| Capability enforcement | ✅ Pass | view/select/download gates |
| Payment gate (download cap) | ✅ Pass | Requires full payment |
| Manual unlock gate (select cap) | ✅ Pass | Requires `allow_download = true` |
| Admin bypass with auth check | ✅ Pass | Requires `requireContractAccess()` |
| SQL injection prevention | ✅ Pass | Parameterized queries via Supabase |
| Drive file access control | ⚠️ Warning | Relies on Google Drive public sharing |

**⚠️ Drive Security Note:**
- Files must be set to "Anyone with the link can view" in Google Drive
- If file is private, download will fail with 403
- **Recommendation:** Add validation step when uploading to ensure files are public

---

## 📈 10. METRICS & MONITORING

### Current State
❌ **No download analytics implemented**

### Recommended Metrics

**Business Metrics:**
- Total downloads per gallery
- Downloads per image (popularity)
- Download-to-selection ratio
- Time from selection to download
- Platform breakdown (iOS/Android/Desktop)
- ZIP vs single download ratio

**Technical Metrics:**
- Download success rate
- Average download time
- Drive API latency
- Token expiration rate (how often users hit 12h limit)
- Batch download size distribution

**Implementation:**
```typescript
// Add to download routes
await supabase.from('gallery_download_logs').insert({
  gallery_id,
  image_id,
  client_id: getClientId(), // From localStorage
  download_type: 'single',
  platform: detectPlatform(),
  user_agent: request.headers.get('user-agent'),
  ip_address: request.headers.get('x-forwarded-for'),
  downloaded_at: new Date(),
});
```

---

## 🎯 11. RECOMMENDATIONS

### High Priority

1. **Add Download Analytics** 📊
   - Track all downloads for business insights
   - Monitor platform-specific issues
   - Measure customer engagement

2. **Add Download Confirmation Toast** ✅
   ```typescript
   // Android after batch download
   toast.success("Đã tải xong! Mở file ZIP trong Downloads để xem ảnh");
   ```

3. **Extend Token TTL for Long Sessions** ⏰
   - Current: 12 hours → Consider 24-48 hours
   - Issue: Customers may share link in morning, download at night
   - Alternative: Add "refresh token" mechanism

4. **Add Retry Logic for Failed Downloads** 🔄
   - Current: Single attempt → fail
   - Recommendation: Retry 3 times with exponential backoff

### Medium Priority

5. **Optimize ZIP Download Memory** 💾
   - Current: Loads all images in RAM before streaming
   - Recommendation: Stream directly to ZIP (use streaming ZIP library)

6. **Add Progress Indicator for Large Batches** 📈
   ```typescript
   // Show "Đang tải 5/15 ảnh..." during ZIP creation
   ```

7. **Validate Drive Files on Upload** ✅
   - Check that files are publicly accessible
   - Prevent 404 errors on customer download

8. **Add Download Limit Per Session** 🚦
   - Prevent abuse (e.g., scraping entire gallery)
   - Limit: 100 downloads per 15 minutes per client_id

### Low Priority

9. **Add Watermark for Unpaid Downloads** 🏷️
   - For "download" capability before payment
   - Remove watermark after payment completed

10. **Add Email Receipt After Download** 📧
    - Send email with download summary
    - Useful for customer support

---

## 🧪 12. TESTING CHECKLIST

### Manual Testing

**Mobile Browsers:**
- [ ] iOS Safari (iPhone)
- [ ] iOS Safari (iPad)
- [ ] Chrome on iOS (WebView)
- [ ] Zalo in-app browser (iOS)
- [ ] Facebook in-app browser (iOS)
- [ ] Chrome on Android
- [ ] Samsung Internet
- [ ] Firefox on Android

**Download Scenarios:**
- [ ] Single image (view only) → Should block
- [ ] Single image (select, not unlocked) → Should block
- [ ] Single image (select, unlocked) → Should work
- [ ] Single image (download, not paid) → Should block
- [ ] Single image (download, paid) → Should work
- [ ] Batch < 30 images → Should create ZIP
- [ ] Batch > 30 images → Should alert
- [ ] Album-wide download (all images)

**Edge Cases:**
- [ ] Expired token (> 12h) → Should show error
- [ ] Invalid token signature → Should block
- [ ] Image deleted from Drive → Should show 404
- [ ] Network interruption during download
- [ ] Low storage space on device
- [ ] Slow 2G/3G network

---

## 📄 13. RELATED FILES

### Core Flow
- `app/gallery/[accessUrl]/page.tsx` - Entry point (SSR)
- `components/gallery/public-gallery-client.tsx` - Main client component
- `components/gallery/image-viewer.tsx` - Lightbox viewer
- `components/gallery/download-manager.tsx` - Batch download UI
- `components/gallery/selection-summary.tsx` - Bottom bar with download button

### API Routes
- `app/api/gallery-download/[token]/[imageId]/route.ts` - Single download
- `app/api/gallery-download-batch/[token]/route.ts` - Batch ZIP download

### Server Actions
- `app/actions/gallery-public-actions.ts` - Gallery data fetching
- `app/actions/gallery-selection-actions.ts` - Image selection toggle

### Libraries
- `lib/gallery-access.ts` - Token generation & validation
- `lib/detect-platform.ts` - Mobile platform detection
- `lib/supabase/server.ts` - Database client

### Database
- `supabase/migrations/20260519090000_gallery_v2_data_contract_permissions.sql`

---

## 🎓 14. GLOSSARY

**Access URL / Slug:** Short unique identifier for gallery (e.g., `abc-xyz-123`)

**Capability:** Permission level encoded in token (`view` | `select` | `download`)

**Access Token:** JWT-like signed token with 12h expiration

**Access Version:** Incremented counter to invalidate all existing tokens

**BlurHash:** Low-res placeholder (20-30 bytes) for instant preview

**lh3:** Google CDN domain (`lh3.googleusercontent.com`) for fast image delivery

**Drive File ID:** Google Drive unique identifier (e.g., `1a2b3c4d5e6f`)

**Selection:** Customer marking images as favorites (heart icon)

**Batch:** Multiple images downloaded together as ZIP

**Payment Gate:** Requirement for contract to be fully paid before downloads

**Manual Unlock:** Admin manually enabling downloads regardless of payment

---

## ✅ CONCLUSION

The gallery download flow is **production-ready** with:
- ✅ Robust security (token-based auth + capability gates)
- ✅ Mobile-optimized UX (platform-specific download strategies)
- ✅ Performance optimizations (virtual scrolling, lazy loading, CDN)
- ✅ Payment integration (contract-gated downloads)
- ✅ Error handling (graceful degradation + user guidance)

**Key Strengths:**
1. Smart iOS Safari workaround (long-press to save)
2. Network-aware progressive loading
3. Clean separation of view/select/download permissions
4. Secure token system with versioning

**Areas for Improvement:**
1. Add download analytics/tracking
2. Extend token TTL or add refresh mechanism
3. Optimize ZIP download memory usage
4. Add download progress indicators

**Overall Assessment:** 8.5/10 - Solid implementation, minor enhancements recommended

---

**Audited by:** Claude Sonnet 4.5  
**Date:** 2026-05-27  
**Version:** Gallery V2 (Post-migration)

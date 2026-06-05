# Kế hoạch: Khắc phục Gallery chậm + "Lỗi nguồn Drive" + tốc độ Lọc Drive

> **Trạng thái:** Phân tích — chưa code. Đợi user confirm.
> **Ngày:** 2026-06-06
> **Bối cảnh:** Sau commit [`b2b91de`](../../) (sáng 2026-06-05) "perf(gallery): restore SSR + bypass Next.js Image + reduce batch", user báo: (1) route `/contracts/[id]/gallery?galleryId=...` load chậm + một số tile hiện "Lỗi nguồn Drive"; (2) tác vụ "Lọc ảnh vào Google Drive" cũng chậm.
> **Constraint cứng:** Project đã **release**. Mỗi deploy phải reversible <2 phút. Không deploy nhiều fix cùng lúc.

---

## 0. Tiêu chí thành công (verify gate)

- **Phải đo bằng chrome-devtools Network panel — trước/sau, screenshot waterfall.** Số request giảm + total time decrease.
- Console không có error mới (so với baseline HEAD trước khi sửa).
- 0 regression với 3 size gallery thử: 20 / 100 / 500 ảnh.
- Mỗi phase deploy preview Vercel trước (`vercel`) → user duyệt → mới `vercel --prod`.

---

## 1. Chẩn đoán cốt lõi (trace 2026-06-06)

| Triệu chứng | Nguyên nhân gốc | Nguồn |
|---|---|---|
| Vào `/contracts/[id]/gallery` chậm 300-700ms trước khi grid xuất hiện | **Không có SSR**. [page.tsx:12](../../app/(protected)/contracts/[id]/gallery/page.tsx) chỉ pass params. Component mount → 2 RPC tuần tự ([use-gallery-data.ts:101](../../components/contracts/gallery/use-gallery-data.ts), [:107](../../components/contracts/gallery/use-gallery-data.ts)) trước khi render | Trace |
| Tile hiện "Lỗi nguồn Drive" cho file cá biệt | Commit `b2b91de` đặt `unoptimized={true}` cho lh3 ([gallery-image-tile.tsx:76](../../components/contracts/gallery/gallery-image-tile.tsx)) → bỏ Next.js Image proxy → lỗi từ Google (404/403/429) trồi thẳng vào `onError` → tile error state. Retry logic [use-masonry-grid.ts:202](../../components/contracts/gallery/use-masonry-grid.ts) mong manh với Next.js Image | Trace |
| Skeleton tile trống xám lâu (không blur) | RPC V2 ([20260529000001](../../supabase/migrations/20260529000001_gallery_data_v2_dynamic_pagination.sql)) **không trả `blur_data_url`** (commit `dbbf72a` bỏ vì khi đó column chưa có); IMAGE_COLS [gallery-image-helpers.ts:12](../../app/actions/gallery-image-helpers.ts) có select nó (path fallback). RPC path luôn chạy trước → blur luôn empty | Trace |
| Mỗi lần vào lại album = browser fetch lh3 lại từ đầu | Service Worker ([next.config.ts:238](../../next.config.ts)) **không có rule cache `lh3.googleusercontent.com`** | Trace |
| "Lọc Drive" chậm (100 file ~6s, 500 file ~30s) | Client loop **tuần tự** chunk-by-chunk ([gallery-filter-drive-tab.tsx:62](../../components/contracts/gallery/tabs/gallery-filter-drive-tab.tsx)), chunk size 10, auth tax/chunk, DB update/chunk | Trace |
| "Hồi trưa lọc lỗi giờ ok" | Transient: OAuth token rớt + Vercel cold start sau deploy `b2b91de` (sáng 2026-06-05). Code không có refresh callback truyền vào `createDriveShortcut` ([google-drive-oauth.ts:110](../../lib/google-drive-oauth.ts)) | Suy luận từ code |

---

## 2. Lựa chọn tiếp cận (chốt sau confirm user)

- **Thứ tự:** Gallery hiển thị trước (P1→P4), Drive filter sau (P5→P8). User chọn `2026-06-06`.
- **Verify:** Preview Vercel + chrome-devtools trước mỗi prod deploy.
- **Feature flag:** **KHÔNG dùng** `NEXT_PUBLIC_*` flag (Next.js inline tại build-time → đổi flag = redeploy = same as revert). Thay vào đó:
  - **Defensive code with try/catch fallback** ở mọi điểm có risk (SSR → fallback client; RPC v3 → fallback v2).
  - **Code rollback bằng `git revert <SHA>`** + `vercel --prod` (~90s).
- **Quy tắc:** 1 phase = 1 commit = 1 preview = 1 prod deploy = 24h monitor → mới phase tiếp.

---

## 3. Phase 1 — Proxy fallback cho lh3 error *(P5)*

**Mục tiêu:** Khi lh3 fail (404/403/429) cho 1 file, retry qua `/api/drive-download/{fileId}` (proxy đã có, Strategy B Drive API `alt=media`) trước khi mark error. Tile chỉ hiện "Lỗi nguồn Drive" khi cả lh3 + proxy đều fail.

**File động (1 file):**
- [components/contracts/gallery/use-masonry-grid.ts](../../components/contracts/gallery/use-masonry-grid.ts) — `handleImageError` (line 190-214).

**Logic mới:**
```
retry-level 0 (lh3 với =sN) fail
  → set retry-level 1 + src = imageUrl (lh3 raw)
retry-level 1 (lh3 raw) fail
  → set retry-level 2 + src = `/api/drive-download/${fileId}`
  → cần extract fileId từ imageUrl (regex `/d/([^/?]+)/`)
retry-level 2 (proxy) fail
  → mark error (tile hiện "Lỗi nguồn Drive")
```

**Risk:** Spam loop nếu state re-render reset `dataset.retryLevel`. Mitigation:
- Track retry trong **React state** (Map fileGroup → retryLevel), không dùng `element.dataset`.
- Hard cap 2 retry per fileGroup, set 1 lần là không reset.

**Verify (chrome-devtools Network):**
- 1 file thực sự broken: 1× lh3 fail + 1× proxy fail → 2 request total → tile error.
- 1 file lh3 fail tạm (rate limit): 1× lh3 fail + 1× proxy success → tile load OK.
- 100 file gallery bình thường: 100 lh3 200 → 0 retry → giống hiện tại.
- **KHÔNG được spam:** check 1 file fail = max 2 request, không loop.

**Rollback:** `git revert <SHA> && npx vercel --prod`.

---

## 4. Phase 2 — SSR cho `/contracts/[id]/gallery` *(P6)*

**Mục tiêu:** Bỏ waterfall 2 RPC tuần tự (~300-700ms). Page SSR fetch song song summaries + (nếu có galleryId) gallery data v2 page 0.

**File động (2 file):**
- [app/(protected)/contracts/[id]/gallery/page.tsx](../../app/(protected)/contracts/[id]/gallery/page.tsx) — fetch song song.
- [components/contracts/gallery/gallery-full-page.tsx](../../components/contracts/gallery/gallery-full-page.tsx) + [use-gallery-data.ts](../../components/contracts/gallery/use-gallery-data.ts) — nhận `initialGalleries`, `initialGalleryData` props; useEffect đầu skip nếu có initial.

**Logic mới ở page.tsx:**
```ts
const [galleriesRes, gallerySnap] = await Promise.allSettled([
  getGallerySummariesByContract(contractId),
  galleryId ? getGalleryDataV2(galleryId, 0, 60) : Promise.resolve(null),
]);
const initialGalleries = galleriesRes.status === 'fulfilled' && galleriesRes.value.success
  ? galleriesRes.value.data
  : undefined;
const initialGalleryData = gallerySnap.status === 'fulfilled' && gallerySnap.value?.success
  ? gallerySnap.value.data
  : undefined;
```

`Promise.allSettled` thay vì `Promise.all` → 1 RPC lỗi không phá page. Component có `initialX` → skip fetch lần đầu; không có → fetch như cũ (đường cũ giữ nguyên — fallback an toàn).

**Risk:**
- RPC timeout server-side → page chậm (chứ không error, vì allSettled). Mitigation: cả 2 RPC đã có timeout Supabase mặc định 60s; page sẽ chậm hơn client mode nhưng đó là edge case rất hiếm.
- `initialGalleryData` có thể stale nếu user ở yên page lâu — nhưng SWR/state refresh sau khi mount sẽ overwrite. Verify bằng test reload.

**Verify (chrome-devtools Network):**
- **Trước:** Network thấy 2 requests `gallery-admin-actions` + `gallery-composite-actions` tuần tự sau khi page mount (~300-700ms tổng).
- **Sau:** 0 request `gallery-admin-actions`/`gallery-composite-actions` lúc page mount. Grid hiện ngay.
- Test: gallery 0 ảnh (no `activeGalleryId` ban đầu) → không crash; gallery 1k ảnh → trang vẫn render.

**Rollback:** `git revert <SHA> && npx vercel --prod`. Component vẫn fetch như cũ.

---

## 5. Phase 3 — Service Worker cache `lh3.googleusercontent.com` *(P7)*

**Mục tiêu:** Vào lại album lần 2 trở đi = instant từ SW cache.

**File động (1 file):**
- [next.config.ts:238](../../next.config.ts) — thêm rule runtime cache.

**Logic mới (thêm vào `runtimeCaching`):**
```ts
{
  // 🟢 RULE 6: Google CDN ảnh — CacheFirst 30 ngày, max 500 entries
  urlPattern: /^https:\/\/lh3\.googleusercontent\.com\/.*/i,
  handler: "CacheFirst",
  options: {
    cacheName: "lh3-images",
    expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
    cacheableResponse: { statuses: [0, 200] },
  },
},
```

**Risk:**
- SW phải pick up version mới → user phải reload 1 lần để active. Workbox `skipWaiting:true` đã có → tự reload tab tiếp.
- Tệ nhất nếu SW stuck: user mở DevTools > Application > Service Workers > Unregister. Đây là rủi ro thật nhưng có thể chấp nhận vì SW đã có cơ chế `skipWaiting + clientsClaim`.
- Cache stale: file Drive đổi nội dung (cùng URL `=sN`) sẽ vẫn serve cũ trong 30 ngày. **Nhưng** Mood không cập nhật ảnh in-place (mỗi sync upload tạo file mới, image_url mới) → không phải vấn đề thực tế.
- Bumping PWA version: package.json `version` bump trước deploy → SW cache key đổi → user pick up version mới nhanh hơn.

**Verify (chrome-devtools Application + Network):**
- Lần 1 mở album: 60 request lh3 từ network (như cũ).
- Lần 2 mở album (cùng tab): 60 request lh3 từ **(disk cache)** hoặc **(ServiceWorker)** — 0ms transfer.
- DevTools > Application > Cache Storage > `lh3-images` thấy entries.
- Test offline: mở album đã visit → ảnh load từ cache.

**Rollback:** `git revert <SHA> && bump package.json version + npx vercel --prod`. User pick up version mới SW không có rule.

---

## 6. Phase 4 — RPC v3 trả `blur_data_url` *(P8)*

**Mục tiêu:** Skeleton tile hiện blurhash → cảm giác load nhanh hơn (đã có column DB, RPC v2 không SELECT nó do legacy commit `dbbf72a`).

**Pre-condition (verify trước khi viết migration):**
- Query `information_schema.columns` xác nhận `gallery_images.blur_data_url` tồn tại trên production.
- Nếu chưa có → migration thêm column NULLABLE (an toàn) + backfill background. Nếu có rồi → chỉ cần RPC v3.

**File động (2 file + 1 migration mới):**
- `supabase/migrations/20260606000000_gallery_data_v3_with_blur.sql` — RPC mới `get_gallery_data_v3` (copy v2, thêm `blur_data_url` + `blur_hash` vào JSONB). **KHÔNG drop v2.**
- [app/actions/gallery-composite-actions.ts:34](../../app/actions/gallery-composite-actions.ts) — try v3 → fallback v2 nếu RPC v3 không tồn tại (graceful upgrade, support staging chưa migrate).

**Logic mới (server action):**
```ts
const { data, error } = await supabase.rpc("get_gallery_data_v3", { ... });
if (error && error.message?.includes("does not exist")) {
  // Fallback to v2
  return await getGalleryDataV2_legacy(galleryId, page, pageSize);
}
```

**Risk:**
- Migration trên production. Mitigation: chỉ CREATE RPC mới, KHÔNG drop/alter existing → 0 destructive. Verify staging trước (LESSONS A10).
- Tệ nhất sai → revert SHA + leave RPC v3 nguyên (không drop) → code không gọi nữa → 0 ảnh hưởng.

**Verify:**
- Console không thấy log "RPC v3 failed".
- Tile skeleton hiện blur (background-image) thay vì gradient xám.
- 0 regression: 100 ảnh load như cũ.

**Rollback:** `git revert <SHA> && npx vercel --prod`. RPC v3 tồn tại nhưng không gọi.

---

## 7. Phase 5-8 — Lọc Drive *(P1-P4, sau khi Gallery xong)*

**Tóm tắt** — viết PLAN-DRIVE-FILTER.md riêng khi tới đó. Outline:

| Phase | Mục tiêu | File | Verify |
|---|---|---|---|
| **5** | Chunk size 10 → 25 | drive-tab.tsx 1 dòng | Time giảm; Google API không 429 |
| **6** | Pipeline 3 chunk song song | drive-tab.tsx ~20 dòng | Progress bar không lùi |
| **7** | Bỏ DB update mỗi chunk, chỉ checkpoint 50% + end | gallery-drive-actions.ts ~10 dòng | F5 giữa job → progress hiển thị đúng |
| **8** | Refresh callback truyền vào createDriveShortcut | google-drive-oauth.ts + gallery-drive-actions.ts ~20 dòng | Token expired 1h vẫn copy được |

---

## 8. Rollback chung

Bảng SHA + lệnh revert sẽ ghi vào [LESSONS.md](LESSONS.md) sau mỗi phase ship.

Quick reference:
- Code: `git revert <SHA> && npx vercel --prod` (~90s).
- SW: bump `package.json` version → user pick up SW không có rule mới.
- Migration: RPC v3 không drop → revert code đủ.

---

## 9. Trạng thái

- [ ] **P1** — Proxy fallback. Owner: Claude. Status: chưa làm.
- [ ] **P2** — SSR gallery. Owner: Claude. Status: chưa làm.
- [ ] **P3** — SW cache lh3. Owner: Claude. Status: chưa làm.
- [ ] **P4** — RPC v3 blur. Owner: Claude. Status: chưa làm (cần verify column).
- [ ] **P5-P8** — Drive filter. Status: chưa làm.

Mỗi phase ship xong → update checkbox + ghi SHA + screenshot Network trước/sau vào [LESSONS.md](LESSONS.md).

# T-20260825-gallery-selected-tab — Tab ĐÃ CHỌN lấy danh sách từ server (M3-A), lazy, không phụ thuộc chuỗi phân trang

**Owner:** claude (spec) → coder (fallback) · **Trạng thái:** `spec` — user đã duyệt hướng ("ok theo đề xuất viết spec rồi triển khai")
**Module:** gallery (mặt tiền khách) · **Bối cảnh:** đo production: album "Xuân Phúc – Ngọc Huy" 517 ảnh / 70 đã chọn → tab ĐÃ CHỌN hiện **40 tile** rồi đứng yên. Khách rà ảnh đã chọn trước khi chốt in/hậu kỳ mà thấy thiếu → tưởng mất, chọn lại, nhắn hỏi.

**Locks:**
- `app/actions/gallery-selection-actions.ts` (thêm 1 action)
- `components/gallery/public-gallery-client.tsx`

**Không đổi:** `getPublicSelectedImages` (3 cột, eager, cho nút Tải) và `SelectionSummary`; `use-masonry-grid.ts` (chuỗi phân trang — việc của M3-B, task riêng); tab TẤT CẢ / GHI CHÚ.

---

## 0. Gốc rễ (trace production 2026-08-25, log grid + timeline từng request/response)

```
2.9s  ⚡ AUTO-TRIGGER  (log luôn xuất hiện ĐÔI)
3.0s  RESP page=0 (100 ảnh)
3.2s  REQ  trang kế              ← setSize lần 1
3.6s  REQ  trang kế nữa          ← setSize lần 2, cùng effect chạy lần 2
3.6s  FAILED net::ERR_ABORTED    ← request trang 1 bị hủy
3.9s  RESP page=2                ← trang 1 KHÔNG BAO GIỜ về
13.0s bấm ĐÃ CHỌN → RESP page=3, page=4 → vẫn 40 tile (30 ảnh còn lại nằm ở trang 1 đã mất + trang 5 chưa gọi)
```

Ba lỗi cộng dồn (chi tiết kỹ thuật cho M3-B, không sửa ở task này):
1. Effect AUTO-TRIGGER (`use-masonry-grid.ts:145`) có dep `onLoadMore`; callback này (`public-gallery-client.tsx` `loadMoreServerImages`) đổi identity khi `size`/`isValidating` đổi — hệ quả của chính việc gọi nó → effect chạy lại → 2 request trang song song → 1 bị hủy (**5 lần/lượt mở album 517 ảnh**; trên 2G page 20 → ~26 lần).
2. `loadingMoreImages = isValidating && pagesData.length === size` sai nghĩa (false đúng lúc đang tải trang mới) → phanh không ăn.
3. Không có thử lại. Tab TẤT CẢ sống nhờ khách cuộn → sentinel bắn lại → đã kiểm cuộn hết ra đủ 517/517. Tab lọc ngắn, sentinel không bắn lại → chết.

**Kết luận cho tab ĐÃ CHỌN:** không được phụ thuộc chuỗi này. Dùng danh sách từ server như tab GHI CHÚ (M2, `334b947`, 17/17 + 8/8 prod). Dù M3-B có sửa chuỗi, tab lọc client-side vẫn phải tải **cả album** (26 trang trên 2G) chỉ để xem vài chục ảnh chọn — server list là 1 request đúng dữ liệu.

**Vì sao KHÔNG mở rộng `getPublicSelectedImages` có sẵn:** nó fetch **eager** khi mở album (cho nút "Tải N ảnh"). Mở rộng lên `IMAGE_COLS` = mọi khách tải thêm ~110KB (178 ảnh chọn × 621B) dù không bấm tab — trên 2G ~10s. Đúng cho Mood là action riêng, **lazy** y hệt M2.

## 1. Hành vi

- Bấm tab ĐÃ CHỌN → hiện **đúng và đủ** mọi ảnh đã chọn (số tile = số ✓ header = `selectedCount` server), kể cả khách chưa cuộn tới, kể cả ảnh nằm ngoài trang đã tải. Không load-more server trong tab.
- Lần đầu vào tab: spinner "Đang tải ảnh đã chọn..." (không chớp "Chưa có ảnh nào"); danh sách fetch 1 lần, cache SWR.
- Trong tab: bỏ chọn → tile biến mất ngay (như hành vi cũ), header ✓ giảm; ❤️ / viewer / ghi chú hoạt động bình thường kể cả với ảnh ngoài trang đã tải.
- Chọn thêm ở tab khác (TẤT CẢ / GHI CHÚ) → khi quay lại tab ĐÃ CHỌN, ảnh mới có mặt (revalidate sau khi server xác nhận).
- Nút "Tải N ảnh" + thanh đáy: **không đổi** (vẫn dùng `selectedImages` 3 cột eager).
- View-only: không tab (như cũ).

## 2. Thay đổi

### 2.1. `app/actions/gallery-selection-actions.ts` — action mới

Import:

```ts
// Trước (dòng 8-13):
import {
  type GalleryFilterJobType,
  type GallerySelectionBatch,
  isValidUUID,
  MAX_NOTE_LENGTH,
} from "@/types/gallery";
// Sau:
import {
  type GalleryFilterJobType,
  type GalleryImage,
  type GallerySelectionBatch,
  isValidUUID,
  MAX_NOTE_LENGTH,
} from "@/types/gallery";

// Trước (dòng 15):
import { requirePublicGalleryAccess, requirePublicGalleryImageAccess, updateGalleryImageSelection, fetchGalleryImageCount } from "./gallery-core";
// Sau:
import { IMAGE_COLS, applyPublicImageFilter, requirePublicGalleryAccess, requirePublicGalleryImageAccess, updateGalleryImageSelection, fetchGalleryImageCount } from "./gallery-core";
```

Thêm NGAY SAU hàm `getPublicSelectedImages` (trước `export async function createSelectionBatchFromCurrentSelection`):

```ts
/**
 * T-20260825-selected-tab: TOÀN BỘ ảnh ĐÃ CHỌN kèm đủ cột render tile (IMAGE_COLS + blur/kích thước) cho tab ĐÃ CHỌN.
 * Tách khỏi getPublicSelectedImages (3 cột, fetch eager cho nút Tải) để không phình payload lúc mở album — chỉ gọi khi
 * khách vào tab. Cùng gate view-token + cùng bộ lọc RAW với lưới công khai. KHÔNG lọc từ ảnh đã tải theo trang vì
 * chuỗi auto-load của grid bắn đôi → request trang bị hủy → tab lọc client-side kẹt (đo prod 40/70 — spec §0).
 */
export async function getPublicSelectedImagesFull(
  galleryId: string,
  accessUrl: string,
  accessToken: string,
): Promise<GalleryImage[]> {
  try {
    if (!accessUrl?.trim() || !accessToken?.trim()) return [];
    const supabase: SupabaseClient<Database> = await createAdminClient();
    try {
      await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId, "view");
    } catch {
      await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId);
    }
    let query = supabase
      .from("gallery_images")
      .select(`${IMAGE_COLS}, width, height, blur_hash, blur_data_url`)
      .eq("gallery_id", galleryId)
      .eq("is_selected", true);
    query = applyPublicImageFilter(query);
    const { data, error } = await query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { console.error("getPublicSelectedImagesFull query error:", error.message); return []; }
    return (data || []) as unknown as GalleryImage[];
  } catch (error) {
    console.error("getPublicSelectedImagesFull error:", error);
    return [];
  }
}
```

### 2.2. `components/gallery/public-gallery-client.tsx`

**(a) Import dòng 10:**

```tsx
import { getPublicSelectedImages, getPublicSelectedImagesFull, toggleImageSelection } from "@/app/actions/gallery-selection-actions";
```

**(b) State — NGAY SAU dòng `const [notedTabTouched, setNotedTabTouched] = useState(false);`:**

```tsx
  // T-20260825-selected-tab: cùng cơ chế lazy cho tab ĐÃ CHỌN
  const [selectedTabTouched, setSelectedTabTouched] = useState(false);
```

**(c) SWR + showSelectedTab — NGAY SAU khối `showNotedTab` (sau `}, []);` của nó):**

```tsx
  // T-20260825-selected-tab: TOÀN BỘ ảnh ĐÃ CHỌN kèm đủ cột render tile — tách khỏi `selectedImages` (3 cột, eager,
  // cho nút Tải) để khách không bấm tab không phải tải thêm ~100KB; lazy như tab GHI CHÚ. KHÔNG lọc từ `images`
  // (ảnh đã tải theo trang): chuỗi auto-load của grid bắn đôi → request trang bị hủy → tab lọc client-side kẹt
  // (đo prod: 40/70, spec §0). Sau khi chọn/bỏ chọn thành công → revalidate để ảnh vào/ra tab.
  const { data: selectedImagesFull = [], isLoading: selectedLoading, mutate: mutateSelectedImagesFull } = useSWR<GalleryImage[]>(
    gallery.id && accessUrl && accessToken && selectedTabTouched ? `gallery-selected-full-${gallery.id}` : null,
    () => getPublicSelectedImagesFull(gallery.id, accessUrl, accessToken),
    { fallbackData: [] },
  );
  const showSelectedTab = useCallback(() => {
    setSelectedTabTouched(true);
    setActiveGroup("selected");
  }, []);
```

**(d) `filteredImages`:**

```tsx
// Trước:
  const filteredImages = useMemo(
    () => activeGroup === "selected" ? images.filter((i) => i.is_selected)
      : activeGroup === "noted" ? notedImages
      : images,
    [images, notedImages, activeGroup],
  );
// Sau:
  // Tab ĐÃ CHỌN: danh sách server, lọc lại theo is_selected để bỏ chọn (vá lạc quan) → tile biến mất ngay như hành vi cũ
  const filteredImages = useMemo(
    () => activeGroup === "selected" ? selectedImagesFull.filter((i) => i.is_selected)
      : activeGroup === "noted" ? notedImages
      : images,
    [images, selectedImagesFull, notedImages, activeGroup],
  );
```

**(e) `handleToggleStar` — 4 chỗ, không refactor phần còn lại:**

```tsx
// (e1) Trước:
      const img = images.find((i) => i.id === imageId) ?? notedImages.find((i) => i.id === imageId);
// Sau:
      const img = images.find((i) => i.id === imageId) ?? notedImages.find((i) => i.id === imageId) ?? selectedImagesFull.find((i) => i.id === imageId);
```

```tsx
// (e2) NGAY SAU khối `mutateNotedImages((current) => ... newSelected ...), false);` lạc quan (trước `setTogglingIds(...)`):
      mutateSelectedImagesFull((current) => current?.map((i) =>
        i.id === imageId ? { ...i, is_selected: newSelected, selected_at: newSelected ? new Date().toISOString() : null } : i
      ), false);
```

```tsx
// (e3) Trong nhánh `if (!res.success)`, NGAY SAU khối `mutateNotedImages(... !newSelected ...)` rollback:
        mutateSelectedImagesFull((current) => current?.map((i) =>
          i.id === imageId ? { ...i, is_selected: !newSelected, selected_at: !newSelected ? new Date().toISOString() : null } : i
        ), false);
```

```tsx
// (e4) Trong nhánh `else if (res.newSelectedCount !== undefined)` — Trước:
        void mutateSelectedImages();
// Sau:
        void mutateSelectedImages();
        void mutateSelectedImagesFull(); // ảnh vừa chọn ở tab khác sẽ có mặt khi quay lại tab ĐÃ CHỌN; key null → no-op
```

Deps:

```tsx
// Trước:
    [accessToken, accessUrl, images, notedImages, isViewOnly, selectedCount, totalImageCount, mutateStats, mutateSelectedImages, mutateNotedImages, gallery.needsPassword, clientCapability],
// Sau:
    [accessToken, accessUrl, images, notedImages, selectedImagesFull, isViewOnly, selectedCount, totalImageCount, mutateStats, mutateSelectedImages, mutateNotedImages, mutateSelectedImagesFull, gallery.needsPassword, clientCapability],
```

**(f) Nút tab ĐÃ CHỌN — chỉ đổi `onClick`:**

```tsx
// Trước:
              onClick={() => setActiveGroup("selected")}
// Sau:
              onClick={showSelectedTab}
```

**(g) Spinner lần đầu — mở rộng khối M2 (l):**

```tsx
// Trước:
        {activeGroup === "noted" && notedLoading && notedImages.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-caption text-text-muted">Đang tải ảnh có ghi chú...</p>
            </div>
          </div>
        ) : (
// Sau:
        {(activeGroup === "noted" && notedLoading && notedImages.length === 0) ||
         (activeGroup === "selected" && selectedLoading && selectedImagesFull.length === 0) ? (
          <div className="py-16 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-caption text-text-muted">{activeGroup === "selected" ? "Đang tải ảnh đã chọn..." : "Đang tải ảnh có ghi chú..."}</p>
            </div>
          </div>
        ) : (
```

**(h) Grid props — tab lọc nào cũng có danh sách đầy đủ từ server:**

```tsx
// Trước:
          onLoadMore={activeGroup === "noted" ? undefined : loadMoreServerImages}
          loadingMore={activeGroup === "noted" ? false : loadingMoreImages}
          hasMore={activeGroup === "noted" ? false : hasMoreImages}
// Sau:
          onLoadMore={activeGroup !== "all" ? undefined : loadMoreServerImages}
          loadingMore={activeGroup !== "all" ? false : loadingMoreImages}
          hasMore={activeGroup !== "all" ? false : hasMoreImages}
```

Viewer (`totalImagesCount` cho tab selected = `selectedCount`), `clampedViewerIndex`, `SelectionSummary`, header ✓: **không đổi**.

**Cố tình KHÔNG làm:**
- Không đụng `getPublicSelectedImages` / `SelectionSummary` / nút Tải — 2 danh sách phục vụ 2 mục đích (eager nhẹ cho nút Tải, lazy đầy đủ cho tab), cố tình không gộp.
- Không sửa chuỗi auto-load (M3-B, task riêng, đụng `use-masonry-grid.ts` dùng chung với lưới admin).
- Không thêm ảnh vừa chọn vào danh sách bằng vá lạc quan (cần object đầy đủ) — revalidate sau khi server xác nhận là đủ, khách vốn đang ở tab khác lúc chọn.

## 3. Acceptance criteria

1. **Đủ ngay, không phụ thuộc cuộn:** mở link mới "Xuân Phúc – Ngọc Huy" (`IjbQItqZSBUz`, chỉ đọc), bấm ĐÃ CHỌN **ngay khi tab hiện** → **70 tile = header ✓ 70** (trước fix: 40).
2. **Lazy:** +1 server action khi vào tab lần đầu; TẤT CẢ ↔ ĐÃ CHỌN lần 2 → +0; tile vẫn 70.
3. **Gallery E2E** 172 ảnh, ảnh #20 và #150 đã chọn (trang đầu local = 30 ảnh → #150 ngoài trang đã tải): bấm ĐÃ CHỌN ngay → 2 tile gồm `_DSC0510.jpg`; bấm "Bỏ chọn" trên #150 → tile biến mất, header ✓ `2→1`, DB `is_selected=false`; viewer từ tile còn lại hiện `1 / 1`; sang TẤT CẢ chọn ảnh #0 → header ✓ `1→2`; quay lại ĐÃ CHỌN → 2 tile gồm ảnh #0 (revalidate); thanh đáy "Đã chọn 2 ảnh"; 0 lỗi console (trừ nhiễu `/login` local có sẵn).
4. **Regression:** TẤT CẢ vẫn tải trang (≥100 tile sau 4s); GHI CHÚ vẫn 126 trên "Huyền – Vinh".
5. @375 tab ĐÃ CHỌN: `scrollWidth == innerWidth`.
6. Lần đầu vào tab trên Slow 3G: thấy "Đang tải ảnh đã chọn...", không thấy "Chưa có ảnh nào".
7. eslint 2 file 0 lỗi (yếu cho client — `eslint-disable` sẵn) · `tsc --noEmit` 0 · `npm run build` exit 0.

## 4. Verify

1. eslint · tsc · build.
2. `next start -p 3005` + Playwright qua PowerShell (`verify-selected-tab.mjs`): AC1/2/4/5/6 trên gallery thật chỉ đọc; AC3 trên gallery E2E (seed `seed-gallery-m3.mjs`, cleanup `cleanup-gallery.mjs`, kiểm `remaining E2E-TEST galleries: 0`).
3. Sau merge: poll production tới khi deploy → chạy lại phần chỉ đọc (AC1/2/4/5/6) trên `stu.moodwedding.com`.

## 5. Sau task này

- **M3-B** `T-20260825-gallery-pagination-chain` (task riêng, spec sau khi A merge): (i) `use-masonry-grid.ts` giữ `onLoadMore` trong `useRef`, bỏ khỏi deps effect; (ii) `public-gallery-client.tsx` `requestedSizeRef` chặn `setSize` trùng; (iii) `loadingMoreImages = isValidating && size > pagesData.length`. Gate đo được: request bị hủy khi mở album 517 ảnh **5 → 0**; lưới admin + public render như cũ.
- **M3-C bỏ:** lỗi console `/login` chỉ có ở `next start` local (script `/dca4b236a0ed44fb/script.js` của `<SpeedInsights/>`; production trả 200 JS, 0 redirect) — không đổi `proxy.ts`/`layout.tsx` để dọn log máy dev; script verify đã lọc dòng này.

---

## 6. Kết quả thực thi (2026-08-25) — ĐẠT, 11/11 verify PASS local

**Đường đi:** coder-subagent (fallback) áp §2.1 + §2.2 (a)–(h) verbatim → Claude review diff-vs-spec: **ĐẠT** — 2 file (+39/−1, +47/−13), không đụng `getPublicSelectedImages`/thanh đáy/grid hook/tab TẤT CẢ–GHI CHÚ; `handleToggleStar` chỉ thêm (e1)–(e4)+deps.

**Verify đã chạy thật:** eslint 2 file 0 lỗi (yếu cho client) · `tsc --noEmit` 0 · `npm run build` exit 0 · `next start -p 3005` + Playwright (PowerShell) **11/11**:
- AC1 "Xuân Phúc – Ngọc Huy" (517/70, chỉ đọc): bấm ĐÃ CHỌN ngay khi tab hiện → **70 tile = header ✓ 70** (trước fix: 40).
- AC2: mở tab lần đầu **+1** server action; TẤT CẢ → ĐÃ CHỌN lần 2 **+0**, vẫn 70.
- AC3 gallery E2E 172 ảnh (trang đầu local = 30): tab hiện 2 tile gồm `_DSC0510.jpg` (#150 ngoài trang đã tải); "Bỏ chọn" #150 → tile biến mất, header ✓ `2→1`, DB `is_selected=false`; viewer từ tile còn lại `1 / 1`; chọn `_DSC0001.jpg` (#0) ở TẤT CẢ → ✓ `1→2`; quay lại ĐÃ CHỌN → 2 tile gồm #0 (revalidate); thanh đáy "Đã chọn 2 ảnh / 172 · Tải 2 ảnh" (nút Tải không đổi); 0 lỗi console (trừ nhiễu `/login` local).
- AC4 regression: TẤT CẢ vẫn tải trang (200 tile), GHI CHÚ vẫn 126 trên "Huyền – Vinh".
- AC5 @375 tab ĐÃ CHỌN `scrollWidth == innerWidth`. AC6 Slow 3G: thấy "Đang tải ảnh đã chọn...", không thấy "Chưa có ảnh nào".
- Dọn sạch: `remaining E2E-TEST galleries: 0`.

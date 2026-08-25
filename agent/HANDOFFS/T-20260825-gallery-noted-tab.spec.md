# T-20260825-gallery-noted-tab — Gallery khách: tab "GHI CHÚ" + chip 💬 bấm để lọc (M2 của T-20260825-gallery-header-note-count)

**Owner:** claude (spec) → coder (implement, fallback vì Codex CLI lỗi credential) · **Trạng thái:** `spec` — CHỜ USER DUYỆT
**Module:** gallery (mặt tiền khách `/gallery/[accessUrl]`) · **Bối cảnh:** M1 (`78a4fb5`) đã cho khách thấy "💬 126" trên header; câu hỏi tiếp theo của khách là *"126 tấm đó là tấm nào"* — hiện phải cuộn cả album tìm badge 💬 trên từng tile. User hỏi "hướng nào thật sự tối ưu" → đã trace + đo production, chọn **phương án B: danh sách từ server**, user duyệt "ok theo đề xuất bạn".

**Locks:**
- `app/actions/gallery-reaction-actions.ts` (thêm 1 action)
- `components/gallery/public-gallery-client.tsx`

**Không đổi:** `use-masonry-grid.ts`, `gallery-image-grid.tsx`, `image-viewer.tsx`, `selection-summary.tsx`, RPC/migration, tab ĐÃ CHỌN (giữ nguyên hành vi hiện tại kể cả lỗi đã biết — xem §5).

---

## 0. Vì sao B chứ không phải lọc client-side như tab ĐÃ CHỌN (bằng chứng đo thật 2026-08-25)

| Sự thật đo được | Hệ quả cho thiết kế |
|---|---|
| Ảnh khách note **rải khắp album, không trùng ảnh đã chọn**: "Huyền – Vinh" 585 ảnh / 126 ghi chú → chỉ 11 note trong 100 ảnh đầu, 31 trong 200 đầu, median #358; chỉ **1/126** vừa note vừa chọn. | Lọc trên ảnh đã tải theo trang (page size 100/50/20 theo mạng) sẽ hiện 11/126 (4G) hoặc 2/126 (2G) ngay khi mở link. Header báo 126 → khách tưởng mất ghi chú. |
| Cơ chế auto-load của grid (`use-masonry-grid.ts:145`) **có lúc kẹt** trên production: "Xuân Phúc – Ngọc Huy" 517 ảnh / 70 đã chọn (70 `file_group` riêng, chỉ 5/70 trong 200 ảnh đầu) → tab ĐÃ CHỌN hiện **40 tile**, 3 request trong 1s rồi đứng yên 25s. Nghi: `loadMoreServerImages` (`public-gallery-client.tsx:211`) bỏ qua khi `isValidating` → chuỗi chết. | Không được để tab GHI CHÚ phụ thuộc chuỗi này. Trong tab GHI CHÚ tắt hẳn load-more server. |
| 87 album đang share, 1 `client_identifier`/album, note nhiều nhất 126 ảnh, 1 dòng `gallery_images` ≈ 621 byte JSON. | Lấy toàn bộ ảnh có note = ≈78KB (gzip ~20KB), 1 lần khi bấm tab. Rẻ. |
| PostgREST embed `!inner` đã dùng ở `calendar-queries.ts:378`, `dress-queries.ts:273`, `inventory-queries.ts:200`. | 1 query `gallery_comments!inner(...)` lọc parent — **không `.in(id, [...])`** → né bẫy header 16KB (`vault/60-bay/bay-du-lieu.md`). |
| `handleToggleStar` tra ảnh bằng `images.find()` (chỉ ảnh đã tải theo trang) rồi `if (!img) return;`. | Ảnh trong tab GHI CHÚ nằm ngoài trang đã tải → bấm ✓ sẽ **im lặng không ăn**. Phải tra thêm trong danh sách noted + vá lạc quan cả danh sách đó. Đây là edge case bắt buộc, có AC riêng. |

## 1. Hành vi

- Chế độ chọn (không view-only): tab thứ 3 **GHI CHÚ** cạnh TẤT CẢ / ĐÃ CHỌN; chip 💬 trên header thành nút — bấm = vào tab GHI CHÚ, bấm lại = về TẤT CẢ, đang lọc thì chip tô nền `bg-primary/10`.
- Tab GHI CHÚ hiện **đúng và đủ** mọi ảnh có ≥1 ghi chú của album (số tile = số 💬), kể cả khách chưa cuộn tới. Không load-more server trong tab này.
- Danh sách chỉ fetch **lần đầu** khách vào tab (lazy), sau đó cache SWR; thêm/xoá ghi chú → revalidate → ảnh vào/ra tab, chip đổi số.
- Trong tab GHI CHÚ: ✓ / ❤️ / mở viewer / ghi chú hoạt động y như tab TẤT CẢ, kể cả với ảnh nằm ngoài trang đã tải.
- Xoá ghi chú (lưu rỗng) khi đang mở viewer trong tab GHI CHÚ → ảnh rời tập → viewer lùi về ảnh cuối tập, tập rỗng thì đóng. Không crash, không viewer "mở mà trống".
- View-only (`?mode=view`, capability view/download): không có tab, chip 💬 giữ tĩnh như M1.

## 2. Thay đổi

### 2.1. `app/actions/gallery-reaction-actions.ts` — action mới

Import (dòng 7 và 9):

```ts
// Trước:
import { isValidUUID } from "@/types/gallery";
...
import { requirePublicGalleryAccess, requirePublicGalleryImageAccess, selectAllRows } from "./gallery-core";
// Sau:
import { isValidUUID, type GalleryImage } from "@/types/gallery";
...
import { IMAGE_COLS, applyPublicImageFilter, requirePublicGalleryAccess, requirePublicGalleryImageAccess, selectAllRows } from "./gallery-core";
```

Thêm NGAY SAU hàm `getGalleryComments` (trước comment `/** Get comments for an image...` của `getComments`):

```ts
/**
 * T-20260825-noted-tab: TOÀN BỘ ảnh có ≥1 ghi chú của gallery — không phụ thuộc trang đã tải
 * (ảnh khách note rải khắp album: "Huyền - Vinh" chỉ 11/126 nằm trong 100 ảnh đầu).
 * Cùng gate view-token như getGalleryComments. Lọc bằng embed `gallery_comments!inner` để PostgREST
 * chỉ trả parent có comment — 1 query, KHÔNG .in(id, [...]) → không đụng trần header 16KB.
 * Cột = IMAGE_COLS + blur/kích thước (như RPC v3 trả cho lưới) để tile render giống tab TẤT CẢ.
 */
export async function getPublicNotedImages(
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
      .select(`${IMAGE_COLS}, width, height, blur_hash, blur_data_url, gallery_comments!inner(id)`)
      .eq("gallery_id", galleryId);
    // Cùng bộ lọc RAW với lưới công khai (fetchPublicGalleryImagesPage) — không để tab GHI CHÚ lộ file RAW.
    query = applyPublicImageFilter(query);
    const { data, error } = await query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { console.error("getPublicNotedImages query error:", error.message); return []; }
    // Bỏ mảng embed (chỉ dùng để lọc) — shape còn lại do IMAGE_COLS quyết định, ép kiểu như gallery-core.
    return (data || []).map(({ gallery_comments: _filterOnly, ...img }) => img as unknown as GalleryImage);
  } catch (error) {
    console.error("getPublicNotedImages error:", error);
    return [];
  }
}
```

Ghi chú cho coder: `applyPublicImageFilter(query: any)` — nhận/trả builder, dùng `let query` đúng như `fetchPublicGalleryImagesPage` trong `gallery-core.ts:521-526`. Nếu TS không suy được kiểu destructure `gallery_comments` từ template-literal select, đổi thành `(data || []).map((row) => { const { gallery_comments: _filterOnly, ...img } = row as Record<string, unknown>; return img as unknown as GalleryImage; })` — không được bỏ bước strip.

### 2.2. `components/gallery/public-gallery-client.tsx`

**(a) Import dòng 11** — thêm `getPublicNotedImages`:

```tsx
import { getClientReactions, getGalleryComments, getPublicNotedImages, getReactionCounts, toggleReaction, upsertComment, type ReactionCounts } from "@/app/actions/gallery-reaction-actions";
```

**(b) State dòng 55** — mở rộng union + cờ lazy:

```tsx
// Trước:
  const [activeGroup, setActiveGroup] = useState<"all" | "selected">("all");
// Sau:
  const [activeGroup, setActiveGroup] = useState<"all" | "selected" | "noted">("all");
  // T-20260825-noted-tab: chỉ fetch danh sách ảnh có ghi chú khi khách vào tab GHI CHÚ lần đầu (lazy)
  const [notedTabTouched, setNotedTabTouched] = useState(false);
```

**(c) SWR danh sách noted** — đặt NGAY SAU memo `notedImageCount` (sau dòng `[commentsPerImage],\n  );` của nó):

```tsx
  // T-20260825-noted-tab: TOÀN BỘ ảnh có ghi chú của gallery, lấy từ server — KHÔNG lọc từ `images`
  // (ảnh đã tải theo trang) vì ảnh khách note rải khắp album và chuỗi auto-load của grid có lúc kẹt
  // (đo prod: tab ĐÃ CHỌN hiện 40/70). Key null tới khi khách vào tab → không tốn request nếu không dùng.
  // isLoading (SWR 2.4): true trong lần fetch đầu kể cả khi có fallbackData → dùng để không chớp "Chưa có ảnh nào".
  const { data: notedImages = [], isLoading: notedLoading, mutate: mutateNotedImages } = useSWR<GalleryImage[]>(
    gallery.id && accessUrl && accessToken && notedTabTouched ? `gallery-noted-${gallery.id}` : null,
    () => getPublicNotedImages(gallery.id, accessUrl, accessToken),
    { fallbackData: [] },
  );
  const showNotedTab = useCallback(() => {
    setNotedTabTouched(true);
    setActiveGroup("noted");
  }, []);
```

**(d) `filteredImages`** (dòng ~218-221):

```tsx
// Trước:
  const filteredImages = useMemo(
    () => activeGroup === "selected" ? images.filter((i) => i.is_selected) : images,
    [images, activeGroup],
  );
// Sau:
  const filteredImages = useMemo(
    () => activeGroup === "selected" ? images.filter((i) => i.is_selected)
      : activeGroup === "noted" ? notedImages
      : images,
    [images, notedImages, activeGroup],
  );
```

**(e) Kẹp index viewer** — đặt NGAY SAU `const displayImages = useMemo(...)`:

```tsx
  // T-20260825-noted-tab: xoá ghi chú trong tab GHI CHÚ → ảnh rời tập → viewerIndex có thể vượt tập.
  // Kẹp lúc render (không setState trong effect): lùi về ảnh cuối; tập rỗng thì coi như đã đóng.
  // Tiện thể đúng luôn cho tab ĐÃ CHỌN khi bỏ chọn trong viewer (trước đây viewer render null mà state vẫn "mở").
  const clampedViewerIndex =
    viewerIndex !== null && displayImages.length > 0 ? Math.min(viewerIndex, displayImages.length - 1) : null;
```

**(f) `handleToggleStar`** — 3 chỗ, KHÔNG refactor phần còn lại:

```tsx
// (f1) Trước:
      const img = images.find((i) => i.id === imageId);
      if (!img) return;
// Sau:
      // T-20260825-noted-tab: ảnh trong tab GHI CHÚ có thể nằm NGOÀI trang đã tải → tra thêm danh sách noted
      const img = images.find((i) => i.id === imageId) ?? notedImages.find((i) => i.id === imageId);
      if (!img) return;
```

```tsx
// (f2) NGAY SAU khối `mutatePages((currentPages) => { ... }, false);` lạc quan (trước `setTogglingIds(...)`):
      // Vá lạc quan cả danh sách noted (nếu đã fetch) — tile trong tab GHI CHÚ phải đổi ✓ ngay như tab TẤT CẢ
      mutateNotedImages((current) => current?.map((i) =>
        i.id === imageId ? { ...i, is_selected: newSelected, selected_at: newSelected ? new Date().toISOString() : null } : i
      ), false);
```

```tsx
// (f3) Trong nhánh `if (!res.success)`, NGAY SAU khối `mutatePages(...)` rollback (trước `mutateStats(...)` rollback):
        mutateNotedImages((current) => current?.map((i) =>
          i.id === imageId ? { ...i, is_selected: !newSelected, selected_at: !newSelected ? new Date().toISOString() : null } : i
        ), false);
```

Deps của `useCallback` (dòng cuối handler): thêm `notedImages, mutateNotedImages`:

```tsx
    [accessToken, accessUrl, images, notedImages, isViewOnly, selectedCount, totalImageCount, mutateStats, mutateSelectedImages, mutateNotedImages, gallery.needsPassword, clientCapability],
```

**(g) `handleSaveNote`** — revalidate danh sách noted sau khi lưu:

```tsx
// Trước:
      if (result.success) await mutate(`gallery-comments-${gallery.id}`);
      return result.success;
    },
    [accessToken, accessUrl, clientId, gallery.id, gallery.needsPassword, clientCapability],
// Sau:
      if (result.success) {
        await mutate(`gallery-comments-${gallery.id}`);
        void mutateNotedImages(); // ảnh vào/ra tab GHI CHÚ; key null (chưa vào tab) → no-op
      }
      return result.success;
    },
    [accessToken, accessUrl, clientId, gallery.id, gallery.needsPassword, clientCapability, mutateNotedImages],
```

**(h) Chip 💬 header** (span thứ 4 thêm ở M1):

```tsx
// Trước:
            {/* 💬 = cùng icon + màu primary với chip trên tile và chip thanh đáy */}
            <span className="flex items-center gap-1.5 text-primary" title="Ảnh có ghi chú" aria-label="Ảnh có ghi chú"><MessageSquare size={14} /> {notedImageCount}</span>
// Sau:
            {/* 💬 = cùng icon + màu primary với chip trên tile và chip thanh đáy.
                T-20260825-noted-tab: chế độ chọn → nút lọc (bấm = tab GHI CHÚ, bấm lại = TẤT CẢ);
                px-2 -mx-2 để bề rộng không đổi so với M1 (đã đo @375). View-only giữ span tĩnh. */}
            {isViewOnly ? (
              <span className="flex items-center gap-1.5 text-primary" title="Ảnh có ghi chú" aria-label="Ảnh có ghi chú"><MessageSquare size={14} /> {notedImageCount}</span>
            ) : (
              <button
                type="button"
                onClick={() => (activeGroup === "noted" ? setActiveGroup("all") : showNotedTab())}
                className={`flex items-center gap-1.5 rounded-full px-2 -mx-2 py-0.5 text-primary transition-colors ${activeGroup === "noted" ? "bg-primary/10" : "hover:bg-primary/5"}`}
                title={activeGroup === "noted" ? "Bỏ lọc ghi chú" : "Xem ảnh có ghi chú"}
                aria-label="Ảnh có ghi chú"
                aria-pressed={activeGroup === "noted"}
              ><MessageSquare size={14} /> {notedImageCount}</button>
            )}
```

**(i) Tab thứ 3** — NGAY SAU nút ĐÃ CHỌN (trước `</div>` đóng hàng tab), cùng style 2 nút hiện có (raw `<button>`, không đổi 2 nút cũ):

```tsx
            <button
              onClick={showNotedTab}
              className={`py-3 relative transition-colors flex items-center gap-1.5 ${activeGroup === "noted" ? "text-primary" : "text-text-muted hover:text-text-primary"}`}
            >
              GHI CHÚ
              {activeGroup === "noted" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
```

**(j) Grid props** — tắt load-more server trong tab GHI CHÚ (danh sách đã đủ, không dựa vào chuỗi auto-load):

```tsx
// Trước:
          onLoadMore={loadMoreServerImages}
          loadingMore={loadingMoreImages}
          hasMore={hasMoreImages}
// Sau:
          onLoadMore={activeGroup === "noted" ? undefined : loadMoreServerImages}
          loadingMore={activeGroup === "noted" ? false : loadingMoreImages}
          hasMore={activeGroup === "noted" ? false : hasMoreImages}
```

**(k) Viewer** — dùng index đã kẹp + tổng đúng tab:

```tsx
// Trước:
      {viewerIndex !== null && (
        <ImageViewer
          images={displayImages}
          currentIndex={viewerIndex}
          ...
          isReacted={Boolean(reactedImageIds.has(displayImages[viewerIndex]?.id))}
          ...
          totalImagesCount={activeGroup === "all" ? totalImageCount : selectedCount}
// Sau:
      {clampedViewerIndex !== null && (
        <ImageViewer
          images={displayImages}
          currentIndex={clampedViewerIndex}
          ...
          isReacted={Boolean(reactedImageIds.has(displayImages[clampedViewerIndex]?.id))}
          ...
          totalImagesCount={activeGroup === "all" ? totalImageCount : activeGroup === "selected" ? selectedCount : notedImageCount}
```

(`onClose`, `onIndexChange`, các prop khác giữ nguyên.)

**(l) Trạng thái đang tải lần đầu** — bọc `<GalleryImageGrid …/>` trong khối `{/* ── Photo Grid ── */}`:

```tsx
// Trước:
      <div className="w-full max-w-[1600px] mx-auto pb-10">
        <GalleryImageGrid
          groups={groups}
          ...
        />
      </div>
// Sau:
      <div className="w-full max-w-[1600px] mx-auto pb-10">
        {/* T-20260825-noted-tab: lần đầu vào tab GHI CHÚ, SWR đang fetch mà groups=[] → grid sẽ hiện
            "Chưa có ảnh nào" rồi mới đổ ảnh (chớp). Hiện spinner (cùng markup "Đang tải thêm ảnh" của grid) tới khi có dữ liệu. */}
        {activeGroup === "noted" && notedLoading && notedImages.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-caption text-text-muted">Đang tải ảnh có ghi chú...</p>
            </div>
          </div>
        ) : (
        <GalleryImageGrid
          groups={groups}
          ...
        />
        )}
      </div>
```

(Chỉ thêm ternary bọc ngoài; toàn bộ prop của `GalleryImageGrid` giữ nguyên như (j).)

**Nhất quán số chip ↔ số tile (đã kiểm DB 2026-08-25, không cần code thêm):** chip đếm key `commentsPerImage` (mọi ảnh có comment), tab đếm tile sau `groupByFileGroup` + lọc RAW. Hai số chỉ lệch nếu (i) note nằm trên file RAW — **0/201** ảnh note hiện tại là RAW, và lưới công khai chưa từng hiện RAW nên khách không thể note RAW; (ii) 2 ảnh note chung `file_group` — `groupByFileGroup` tạo **1 group cho MỖI ảnh non-RAW** (RAW chỉ ghép làm đính kèm), nên không gộp; DB xác nhận 0 nhóm có >1 ảnh note. AC2 assert đẳng thức này.

**Cố tình KHÔNG làm:**
- Không đổi chữ trạng thái rỗng "Chưa có ảnh nào" thành "…có ghi chú" — text nằm trong `gallery-image-grid.tsx` (ngoài locks), tab ĐÃ CHỌN cũng dùng chữ chung này. Chip 💬 vẫn bấm được khi = 0 (mở tab rỗng, fetch 1 lần danh sách rỗng) — chấp nhận, cùng hành vi tab ĐÃ CHỌN khi chưa chọn gì.
- Không sửa tab ĐÃ CHỌN / chuỗi auto-load (`use-masonry-grid.ts`) — bug 40/70 là việc riêng (§5), đụng hook dùng chung cho tab TẤT CẢ.
- Không giữ danh sách noted "đứng yên" khi viewer đang mở: xoá ghi chú → ảnh rời tập → viewer chuyển ảnh kế. Chấp nhận (logic "hết ghi chú thì rời tab"), có AC.
- Không thêm số đếm vào chữ tab ("GHI CHÚ · 126") — chip header đã có số, tab giữ đồng dạng 2 tab cũ.
- Không dùng `gallery_comments!inner()` rỗng (PostgREST empty-embed) — chưa có tiền lệ trong repo; select `id` rồi strip là đủ.

## 3. Acceptance criteria

1. Chế độ chọn: có tab GHI CHÚ; chip 💬 là nút (`aria-pressed`), bấm → tab GHI CHÚ + chip tô nền; bấm lại → TẤT CẢ. View-only: không tab, chip là span tĩnh (M1 giữ nguyên).
2. **Đủ và đúng, không phụ thuộc cuộn:** mở link mới của "Huyền – Vinh" (`jjay1sJ9hhPq`) @1024, bấm GHI CHÚ ngay khi header hiện → số tile = 126 = chip 💬 = `count(DISTINCT image_id)` (chỉ đọc).
3. **Lazy:** đo bằng số POST có header `next-action` (Playwright `page.on("request")`): sau khi trang ổn định 5s, bấm GHI CHÚ lần đầu → **đúng +1** POST trong 2s (tab này đã tắt load-more nên không có request nào khác); bấm TẤT CẢ (có thể kích load-more trang — bỏ qua), đợi ổn định, bấm GHI CHÚ lần 2 → **+0** POST trong 2s (SWR giữ cache, hook không remount vì key không đổi).
4. **Ảnh ngoài trang đã tải:** gallery E2E tạm 172 ảnh (clone "CD Bé – Hảo"), chèn 2 ghi chú: 1 ảnh `sort_order=20` (trong trang đầu) + 1 ảnh `sort_order=150` (ngoài trang đầu 100). Mở @1024, bấm GHI CHÚ ngay → **2 tile**; bấm ✓ trên tile ảnh #150 → tile hiện ✓ ngay, header ✓ `0→1`, DB `is_selected=true`; bấm ❤️ trên cùng tile → ❤️ `0→1`. Mở viewer từ tile #150 → hiện đúng ảnh, `1 / 2` hoặc `2 / 2`.
5. **Sửa / xoá ghi chú trong tab:** (a) trong viewer (tab GHI CHÚ) **sửa** nội dung ghi chú ảnh #150 → viewer đứng yên đúng ảnh #150, panel hiện nội dung mới, chip 💬 vẫn 2, tab vẫn 2 tile (revalidate danh sách không làm nhảy ảnh); (b) **xoá** ghi chú ảnh #150 → chip `2→1`, tab còn 1 tile, viewer hiện ảnh #20 (lùi về cuối tập), không lỗi console; xoá nốt → chip 0, tab "Chưa có ảnh nào", viewer đóng. (c) **Lần đầu bấm tab** (gallery thật, throttle mạng "Slow 3G" trong Playwright) → thấy spinner "Đang tải ảnh có ghi chú...", **không** thấy "Chưa có ảnh nào" trước khi ảnh đổ.
6. Tab TẤT CẢ và ĐÃ CHỌN: hành vi không đổi (tile count, load-more, chọn/tim) — đối chiếu trước/sau trên cùng gallery.
7. @375 gallery thật: `scrollWidth == innerWidth`, 4 chip cùng hàng, tiêu đề cắt "…" (không lùi so với M1); hàng tab 3 nút `TẤT CẢ · ĐÃ CHỌN · GHI CHÚ` trên 1 dòng, không tràn.
8. `npx eslint` 2 file lock 0 lỗi (lưu ý `public-gallery-client.tsx` có `eslint-disable` sẵn → bằng chứng yếu) · `npx tsc --noEmit` 0 lỗi · `npm run build` exit 0.

## 4. Verify (không tạo dữ liệu thật; gallery thật chỉ đọc)

1. eslint 2 file · tsc · build.
2. `next start -p 3005` + Playwright **qua PowerShell** (Git Bash crash libuv — memory `feedback_playwright_powershell_windows`): AC2, AC3 (đếm POST có header `next-action` trước/sau bấm tab; xác định request `getPublicNotedImages` bằng action id hoặc đơn giản đếm chênh lệch = 1), AC7 trên gallery thật; AC4, AC5 trên gallery E2E tạm (seed clone 172 ảnh + 2 dòng `gallery_comments` `client_identifier='e2e'` qua service-role; cleanup xoá comments → reactions → images → gallery, kiểm `remaining E2E-TEST galleries: 0`).
3. AC6: chạy lại probe tab ĐÃ CHỌN trên 2 album đã đo (`Lệ – Vũ` 160/160, `Xuân Phúc` 40/70 kẹt) — kỳ vọng **số y hệt** trước/sau (không tốt lên, không xấu đi) — chứng minh không đụng.
4. Sau merge: poll production tới khi tab GHI CHÚ xuất hiện → chạy lại AC2/AC3/AC7 chỉ đọc trên `stu.moodwedding.com`.

## 5. Ghi nhận ngoài scope — đề xuất M3 riêng (chưa làm)

Tab ĐÃ CHỌN lọc thiếu trên album lớn (đo prod: 40/70 tile, kẹt 25s). Cách sửa rẻ nhất cùng kiểu B: `getPublicSelectedImages` **đã fetch toàn bộ ảnh đã chọn của album** cho nút "Tải N ảnh" (`gallery-selection-actions.ts:168`, 3 cột `id, file_name, drive_file_id`) → mở rộng lên `IMAGE_COLS` + blur và cho tab ĐÃ CHỌN dùng `selectedImages` thay vì lọc `images` — **không thêm request**, ~10 dòng, cùng pattern kẹp index/tắt load-more của task này. Tách task riêng để review độc lập, không gộp vào M2.

---

## 6. Kết quả thực thi (2026-08-25) — ĐẠT, 17/17 verify PASS local

**Đường đi:** user duyệt "triển khai đi bạn" → Claude fallback (Codex CLI vẫn lỗi credential, không thử lại) → coder-subagent áp §2.1 + §2.2 (a)–(l) verbatim (20/20 anchor khớp) → Claude review diff-vs-spec: **ĐẠT** — 2 file, +123/−19; tab cũ + 3 span cũ không đổi; `handleToggleStar` chỉ thêm (f1)(f2)(f3)+deps; biến thể ép kiểu chính compile sạch (không cần fallback §2.1).

**Verify đã chạy thật:**
1. eslint 2 file 0 lỗi (yếu cho `public-gallery-client.tsx` — `eslint-disable` sẵn) · `tsc --noEmit` 0 lỗi · `npm run build` exit 0, PWA artifact OK.
2. `next start -p 3005` + Playwright (PowerShell) — **17/17 PASS**:
   - AC2 gallery thật "Huyền – Vinh": bấm GHI CHÚ ngay khi header hiện → **126 tile = chip = `count(DISTINCT image_id)`**, không phụ thuộc cuộn.
   - AC3: mở tab lần đầu **+1** server action (baseline 8 của trang), mở lại **+0**, tile vẫn 126.
   - AC1: chip `aria-pressed=true` khi lọc, bấm lại → `false`, về TẤT CẢ (200 tile); view-only: chip là `SPAN`, không tab.
   - AC7 @375: `scrollWidth == innerWidth`, 3 tab cùng `y=48`.
   - AC4 gallery E2E 172 ảnh (trang đầu local = 30 ảnh): tab hiện đúng 2 tile gồm `_DSC0510.jpg` (#150, ngoài trang đầu); bấm ✓ trên #150 → header ✓ `0→1`, tile đổi sang "Bỏ chọn", DB `is_selected=true`; ❤️ → `0→1`; viewer từ #150 hiện `2 / 2`.
   - AC5a: sửa ghi chú #150 → DB ghi đúng nội dung mới, viewer đứng yên #150, chip vẫn 2. AC5b: xoá #150 → chip `2→1`, viewer lùi về `_DSC0054.jpg` (#20), tab 1 tile; xoá nốt → chip 0, "Chưa có ảnh nào", viewer đóng, 0 lỗi console (trừ lỗi có sẵn — xem dưới). AC5c Slow 3G (CDP 50KB/s, 1.5s latency): thấy spinner "Đang tải ảnh có ghi chú...", **không** thấy "Chưa có ảnh nào" trước khi ảnh đổ.
   - Dọn sạch sau test: `remaining E2E-TEST galleries: 0` (3 lần seed/xoá — 2 lần đầu fail do test-flow, không phải code, xem dưới).
3. **Phát hiện có sẵn, ngoài scope:** console `Refused to execute script from 'http://localhost:3005/login' (MIME text/html)` xuất hiện ngay khi **chỉ load** trang gallery công khai (cả gallery thật lẫn test, không tương tác, trước khi bấm gì) — 1 request `<script>` từ trang gallery bị trả về trang `/login`. Không do M2; cần điều tra riêng (proxy/auth đang bắt nhầm 1 URL script của trang công khai).
4. **2 lần verify đầu fail vì test-flow, ghi lại để khỏi lặp:** (i) ghi chú seed có `client_identifier` khác `mood_client_id` của trình duyệt → viewer coi là ghi chú người khác, không có nút "Sửa ghi chú" → fix: `addInitScript` đặt cùng id; (ii) `viewer.saveNote` **từ chối im lặng** (toast "Nhập tên để Mood biết ai dặn nhé", `return false`) khi chưa có `mood_client_name` → UI hiện optimistic rồi rollback, DB không đổi → fix: đặt sẵn tên trong localStorage. Cả hai đều là hành vi đúng của app.

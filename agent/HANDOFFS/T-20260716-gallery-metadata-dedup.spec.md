# T-20260716-gallery-metadata-dedup — Cắt double-fetch metadata gallery (perf, đo được)

**Owner:** Codex · **Spec:** Claude · **Status:** APPROVED (user duyệt 16/07 — "tối ưu all rồi giao codex")
**Locks (2 file, KHÔNG chồng task khác):**
- `app/actions/gallery-composite-actions.ts` (chỉ **THÊM** 1 hàm; KHÔNG sửa `getGalleryDataV2`/`getGalleryMetadataAll`)
- `components/contracts/gallery/use-gallery-data.ts` (chỉ sửa trong `loadGalleryData`)

**KHÔNG migration, KHÔNG đụng DB prod, KHÔNG đổi RPC SQL.** Chỉ TypeScript.

---

## Bối cảnh — đo trên prod 16/07

Trang admin gallery `/contracts/[id]/gallery` LCP **2.59s**. Mỗi lần đổi album, [use-gallery-data.ts:169-172](components/contracts/gallery/use-gallery-data.ts#L169) chạy **song song 2 lời gọi**:

```ts
const [v2Result, metadataRes] = await Promise.all([
  getGalleryDataV2(activeGalleryId, 0, pageSize),   // 1 RPC (V3): images + reactionCounts + comment counts + albums
  getGalleryMetadataAll(activeGalleryId),           // 4 query: reactions + comments + albums + albumCounts
]);
```

**Sự thật đã xác minh (đọc code + migration):**
- `getGalleryDataV2` gọi RPC `get_gallery_data_v3`, RPC này **đã đọc `gallery_comments`** để tính `commentCountsPerImage` + `totalCommentCount` ([migration 20260606000000_gallery_data_v3_with_blur.sql:88-95](supabase/migrations/20260606000000_gallery_data_v3_with_blur.sql)), và **đã trả** `reactionCounts` + `albums` (kèm `imageCount`). Xem type `GalleryDataV2Result` ([gallery-composite-actions.ts:19-30](app/actions/gallery-composite-actions.ts#L19)).
- `getGalleryMetadataAll` ([gallery-composite-actions.ts:106-115](app/actions/gallery-composite-actions.ts#L106)) chạy 4 query, nhưng **3 trong 4 trùng V3**: `reactionCounts`, `albums`, `albumCounts`. Phần **DUY NHẤT V3 không có** = `commentsPerImage` (NỘI DUNG ghi chú từng ảnh — V3 chỉ trả *số đếm*, không trả *nội dung*).
- Ở đường V2 thành công (ca thường), code hiện lấy count/album từ metadata (ghi đè V3) tại [use-gallery-data.ts:186-189](components/contracts/gallery/use-gallery-data.ts#L186) — **thừa**, vì V3 cùng nguồn `gallery_comments` nên cho **cùng con số**.

→ **Lãng phí: 3 query DB mỗi lần đổi album** (reactions + albums + albumCounts của metadata bị ghi đè hoặc trùng V3). Sửa = trên đường thành công chỉ lấy thêm `commentsPerImage` bằng **1 query nhẹ**, không gọi `getGalleryMetadataAll` (4 query).

**Ràng buộc:** `getGalleryMetadataAll` VẪN cần cho **đường fallback** (khi RPC V3/V2 hỏng → không có V3 để lấy reactions/albums/counts). Chỉ chuyển nó vào nhánh fallback, KHÔNG xoá.

---

## Task 1 — Thêm hàm nạc `getGalleryCommentContentAll`

File: `app/actions/gallery-composite-actions.ts`. **THÊM vào cuối file** (sau `getGalleryMetadataAll`, dùng lại `withAuth`/`requireContractAccess`/`GalleryCommentSummary` đã import sẵn):

```ts
/**
 * Chỉ lấy NỘI DUNG ghi chú theo ảnh cho cả gallery (admin).
 * V3 RPC đã cấp reaction/comment counts + albums; commentsPerImage là phần DUY NHẤT V3 thiếu.
 * Tách riêng để đường thành công KHÔNG phải gọi getGalleryMetadataAll (4 query) — chỉ 1 query.
 */
export async function getGalleryCommentContentAll(galleryId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);
    const { data, error } = await supabase
      .from("gallery_comments")
      .select("image_id, content, author_name, updated_at")
      .eq("gallery_id", galleryId)
      .order("created_at", { ascending: true });
    if (error) return {} as Record<string, GalleryCommentSummary[]>;
    const map: Record<string, GalleryCommentSummary[]> = {};
    for (const row of data || []) {
      (map[row.image_id] ||= []).push({
        author_name: row.author_name || "Khách",
        content: row.content,
        updated_at: row.updated_at,
      });
    }
    return map;
  });
}
```

> Query này **giống hệt** phần xử lý comment trong `getGalleryMetadataAll` (110, 129-144) và `getGalleryComments` public (171-185) — cùng shape `GalleryCommentSummary`. Không phát minh cấu trúc mới. Admin cần gate `withAuth`+`requireContractAccess` (khác public gate) nên tách hàm riêng là hợp lý.

---

## Task 2 — Đổi `loadGalleryData` dùng hàm nạc trên đường thành công

File: `components/contracts/gallery/use-gallery-data.ts`.

### 2a. Import ([dòng 9](components/contracts/gallery/use-gallery-data.ts#L9)) — thêm `getGalleryCommentContentAll`, GIỮ `getGalleryMetadataAll`:

```ts
import { getGalleryDataV2, getGalleryMetadataAll, getGalleryCommentContentAll, type GalleryCommentSummary, type GalleryDataV2Result } from "@/app/actions/gallery-composite-actions";
```

### 2b. Thay TRỌN thân `loadGalleryData` (hiện [dòng 166-218](components/contracts/gallery/use-gallery-data.ts#L166)) bằng:

```ts
    const loadGalleryData = async () => {
      // Hot path: V3 RPC đã trả reactionCounts + comment counts + albums (RPC đọc gallery_comments).
      // Chỉ commentsPerImage (nội dung) là V3 KHÔNG có → lấy riêng 1 query nhẹ,
      // KHÔNG gọi getGalleryMetadataAll (4 query) trên đường thành công.
      const [v2Result, commentsContentRes] = await Promise.all([
        getGalleryDataV2(activeGalleryId, 0, pageSize),
        getGalleryCommentContentAll(activeGalleryId),
      ]);

      if (cancelled) return;

      if (v2Result.success && v2Result.data) {
        // V2/V3 RPC thành công — dùng thẳng, chỉ ghép commentsPerImage từ query nạc.
        const data = v2Result.data;
        const commentsContent = commentsContentRes.success && commentsContentRes.data ? commentsContentRes.data : {};
        setPaginatedImages(data.images);
        setTotalImageCount(data.totalCount);
        setHasMoreImages(data.hasMore);
        setReactionCounts(data.reactionCounts);
        setCommentCount(data.totalCommentCount);
        setCommentCountsPerImage(data.commentCountsPerImage);
        setCommentsPerImage(commentsContent);
        setAlbums(data.albums);
        setCurrentPage(0);
        setLoadingMore(false);
        return;
      }

      // V2/V3 RPC không dùng được → fallback đầy đủ (metadata cấp reactions+albums+counts qua query rời).
      console.warn("[useGalleryData] V2 RPC unavailable, using legacy fallback");
      const [imagesRes, metadataRes] = await Promise.all([
        getGalleryImagesPaginated(activeGalleryId, 0, pageSize),
        getGalleryMetadataAll(activeGalleryId),
      ]);

      if (cancelled) return;

      if (imagesRes.success && imagesRes.data) {
        setPaginatedImages(imagesRes.data.images);
        setTotalImageCount(imagesRes.data.totalCount);
        setHasMoreImages(imagesRes.data.hasMore);
        setCurrentPage(0);
      }

      if (metadataRes.success && metadataRes.data) {
        setReactionCounts(metadataRes.data.reactionCounts);
        setCommentCount(metadataRes.data.totalCommentCount);
        setCommentCountsPerImage(metadataRes.data.commentCountsPerImage);
        setCommentsPerImage(metadataRes.data.commentsPerImage);
        setAlbums(metadataRes.data.albums);
      }

      setLoadingMore(false);
    };
```

**Thay đổi so với bản cũ:**
- Bỏ 4 `console.log` chẩn đoán trong hàm này (dòng cũ 168, 176, 181 + `console.warn` V2 result) — chỉ giữ lại `console.warn` fallback vì nó báo sự cố thật. *(Các `console.log` STATE/diagnostic ở effect khác — dòng 271-303 — KHÔNG động, nằm ngoài phạm vi task này.)*
- Đường thành công: mọi count/album lấy từ V2 (`data.*`), chỉ `commentsPerImage` từ query nạc.
- `getGalleryMetadataAll` chuyển vào nhánh fallback (gọi `Promise.all` với `getGalleryImagesPaginated`).

---

## Vì sao KHÔNG đổi hành vi (điểm mấu chốt review)

| Field | Trước (nguồn) | Sau (nguồn) | Cùng giá trị? |
|---|---|---|---|
| `reactionCounts` | V2 `data.reactionCounts` | V2 `data.reactionCounts` | Y (không đổi) |
| `commentCount` | metadata `totalCommentCount` | V2 `data.totalCommentCount` | Y — V3 đọc `gallery_comments` (migration:88-95) |
| `commentCountsPerImage` | metadata | V2 `data.commentCountsPerImage` | Y — cùng nguồn `gallery_comments` |
| `commentsPerImage` | metadata (query gallery_comments) | `getGalleryCommentContentAll` (cùng query gallery_comments) | Y — cùng query |
| `albums` (+imageCount) | metadata | V2 `data.albums` | Y — V3 thiết kế để **thay** metadata (comment gallery-composite-actions.ts:10-11 "Replaces 3 sequential calls") |

**Rủi ro DUY NHẤT cần verify:** `albums` giờ lấy từ V3 thay vì metadata → phải xác nhận **danh sách tab album + số đếm ảnh/album y hệt** sau đổi (thứ tự sort + imageCount). Đây là điểm review kỹ nhất.

---

## Verify (Codex tự chạy trước khi báo xong — KHÔNG tin "should work")

1. `npx eslint app/actions/gallery-composite-actions.ts components/contracts/gallery/use-gallery-data.ts` → **0 lỗi**.
2. `npm run build` → **PASS** (Codex tự chạy, không báo pass khi chưa chạy — tiền lệ build fail 2/2 lần).
3. Báo cáo: diff từng file + kết quả eslint/build. **KHÔNG commit, KHÔNG push** (Claude review + deploy).

## Verify sau (Claude làm — không giao Codex)
- Prod (đã login Chrome): mở album có ghi chú (`jjay1sJ9hhPq`, 585 ảnh, 126 bình luận), đổi qua lại 2-3 album.
- **Network:** đường thành công chỉ còn **V2 RPC + 1 call `gallery_comments`** (hết cụm 4 query metadata). Đo số round-trip giảm ~3/lần đổi album.
- **Không đổi hành vi:** "126 Bình luận" còn nguyên; chip 💬 + preview ghi chú trên tile còn render; **tab album + số đếm ảnh/album khớp bản cũ**; tim (reactions) không đổi.

---

## Ràng buộc (nhắc lại)
- Chỉ 2 file trong locks. `getGalleryDataV2` và `getGalleryMetadataAll` **giữ nguyên** (metadata chỉ đổi CHỖ GỌI, không đổi thân hàm).
- Match style hiện có (envelope `{success, data}`, `||=`, comment tiếng Việt).
- Không đổi kiến trúc, không thêm thư viện, không đụng file khác.

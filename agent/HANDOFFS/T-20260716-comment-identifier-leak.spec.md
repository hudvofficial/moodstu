# T-20260716-comment-identifier-leak — Vá lỗ khách sửa/xoá được ghi chú của khách khác

**Owner:** Codex · **Spec:** Claude · **Status:** APPROVED (user chọn A2, 16/07)
**Locks (2 file, KHÔNG chồng task khác):**
- `app/actions/gallery-reaction-actions.ts` (chỉ `interface GalleryComment` + hàm `getComments`)
- `components/gallery/image-viewer.tsx` (chỉ chỗ dùng `client_identifier`)

**KHÔNG migration, KHÔNG đụng DB, KHÔNG đụng upsert/delete/gate logic.** Chỉ đổi *đọc*.

---

## Lỗ hổng (audit 16/07, P2 nhưng đụng đúng feature vừa ship d45ea00)

`getComments` ([gallery-reaction-actions.ts:198,204](app/actions/gallery-reaction-actions.ts#L198)) trả về `client_identifier` của **MỌI** ghi chú ra client. Mà `client_identifier` vừa là **khóa định danh chủ sở hữu** ghi chú (upsert `onConflict (image_id, client_identifier)`, delete so `client_identifier`).

**Khai thác:** khách A (đã có mật khẩu album) mở 1 ảnh → đọc trong Network `client_identifier` của khách B → gọi `upsertComment(imageId, ..., <identifier của B>, ...)` hoặc `deleteComment(commentId, <identifier của B>, ...)` → **ghi đè / xoá ghi chú của B**. Phá vỡ đúng cam kết "mỗi người 1 ghi chú, sửa được **của mình**".

**Vì sao chỉ cần vá chỗ ĐỌC:** mutation (`upsertComment`/`deleteComment`) chỉ nhận `clientIdentifier` do client gửi, mà client chỉ biết identifier **của chính mình** (localStorage `mood_client_id`). Khi ngừng lộ identifier người khác ở đường đọc, khách không còn cách nào biết identifier của B → không mạo danh được. Server `deleteComment` vẫn so `comment.client_identifier !== clientIdentifier` (`:249`) như cũ. `getGalleryComments` (chip trang khách, `:171-175`) vốn KHÔNG select `client_identifier` → đã sạch. Chỉ `getComments` hở.

**Nguyên tắc fix:** server tự tính cờ `is_mine` (so identifier hàng vs identifier người gọi) rồi **KHÔNG trả `client_identifier`** ra client nữa.

**Phạm vi tiêu thụ (đã grep toàn repo):** `GalleryComment` + `getComments` chỉ dùng ở `components/gallery/image-viewer.tsx`. Không file nào khác import — đổi type an toàn.

---

## Task 1 — `app/actions/gallery-reaction-actions.ts`

### 1a. Đổi `interface GalleryComment` ([dòng 22-31](app/actions/gallery-reaction-actions.ts#L22)) — thay `client_identifier` bằng `is_mine`:

```ts
export interface GalleryComment {
  id: string;
  image_id: string;
  gallery_id: string;
  content: string;
  author_name: string | null;
  is_mine: boolean;        // trước là client_identifier: string — KHÔNG lộ identifier người khác ra client
  created_at: string;
  updated_at: string;
}
```

### 1b. Thay TRỌN hàm `getComments` ([dòng 193-213](app/actions/gallery-reaction-actions.ts#L193)) — thêm tham số `clientIdentifier`, map sang `is_mine`, bỏ `client_identifier` khỏi kết quả:

```ts
/** Get comments for an image. is_mine tính ở server — KHÔNG trả client_identifier ra ngoài. */
export async function getComments(imageId: string, accessUrl?: string, accessToken?: string, clientIdentifier?: string): Promise<GalleryComment[]> {
  const toComment = (row: { id: string; image_id: string; gallery_id: string; content: string; author_name: string | null; client_identifier: string; created_at: string; updated_at: string }): GalleryComment => ({
    id: row.id,
    image_id: row.image_id,
    gallery_id: row.gallery_id,
    content: row.content,
    author_name: row.author_name,
    is_mine: !!clientIdentifier && row.client_identifier === clientIdentifier,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
  try {
    if (accessUrl?.trim() && accessToken?.trim()) {
      const supabase = await createAdminClient();
      await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "view");
      const { data, error } = await supabase.from("gallery_comments").select("id, image_id, gallery_id, content, author_name, client_identifier, created_at, updated_at").eq("image_id", imageId).order("created_at", { ascending: true });
      if (error) return [];
      return (data || []).map(toComment);
    }
    const result = await withAuth(async (supabase, userId) => {
      await requireContractAccess(supabase, userId);
      const { data, error } = await supabase.from("gallery_comments").select("id, image_id, gallery_id, content, author_name, client_identifier, created_at, updated_at").eq("image_id", imageId).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map(toComment);
    });
    return result.success ? result.data : [];
  } catch (error) {
    console.error("getComments error:", error);
    return [];
  }
}
```

> Vẫn `select` `client_identifier` từ DB (server cần để tính `is_mine`) nhưng CHỈ dùng nội bộ; kết quả trả ra không còn trường đó. Admin path (`withAuth`, không truyền `clientIdentifier`) → `is_mine` = false hết → admin xem read-only, đúng.

---

## Task 2 — `components/gallery/image-viewer.tsx`

4 chỗ đang so `client_identifier` → đổi sang `is_mine`. `clientIdentifier` prop VẪN GIỮ (truyền vào `getComments` + dùng cho lưu ghi chú).

### 2a. Fetcher SWR ([dòng 114](components/gallery/image-viewer.tsx#L114)) — truyền thêm `clientIdentifier`:
```ts
    () => img ? getComments(img.id, accessUrl, accessToken, clientIdentifier) : Promise.resolve([]),
```

### 2b. Phân loại own/other ([dòng 117-118](components/gallery/image-viewer.tsx#L117)):
```ts
  const ownComment = comments.find((comment) => comment.is_mine);
  const otherComments = comments.filter((comment) => !comment.is_mine);
```

### 2c. Optimistic comment ([dòng 216-225](components/gallery/image-viewer.tsx#L216)) — thay dòng `client_identifier: clientIdentifier,` bằng `is_mine: true,`:
```ts
    const optimisticComment: GalleryComment = {
      id: ownComment?.id || "optimistic-" + editingId,
      image_id: editingId,
      gallery_id: ownComment?.gallery_id || "",
      content: trimmedNote,
      author_name: authorName,
      is_mine: true,
      created_at: ownComment?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
```

### 2d. Lọc own khi build optimistic list ([dòng 227-228](components/gallery/image-viewer.tsx#L227)):
```ts
    const optimisticComments = trimmedNote
      ? [...comments.filter((comment) => !comment.is_mine), optimisticComment]
      : comments.filter((comment) => !comment.is_mine);
```

---

## Verify (Codex tự chạy trước khi báo xong)
1. `npx eslint app/actions/gallery-reaction-actions.ts components/gallery/image-viewer.tsx` → **0 lỗi**.
2. `npm run build` → **PASS** (tự chạy, không báo pass khi chưa chạy).
3. Báo diff từng file + kết quả eslint/build. **KHÔNG commit, KHÔNG push.**

## Verify sau (Claude — KHÔNG ghi data khách thật)
- Prod: mở album có ghi chú cũ (`jjay1sJ9hhPq`), mở 1 ảnh có note legacy → `evaluate_script` kiểm object comment trả về **có `is_mine` (=false vs id của mình), KHÔNG có `client_identifier`**. Đây là bằng chứng hết lộ — không cần ghi note mới.
- Note legacy (`client_identifier='legacy'`) hiện dạng "của người khác" (read-only) — đúng.

---

## Ràng buộc
- Chỉ 2 file trong locks. KHÔNG đụng `upsertComment`/`deleteComment`/`requirePublicGalleryImageAccess`/gate capability.
- Match style hiện có (inline select, comment tiếng Việt, envelope `{success,data}`).
- Không migration, không thư viện, không đụng file khác.

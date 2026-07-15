# T-20260716-gallery-notes-to-comments — Ghi chú khách: cột đơn → bảng `gallery_comments`

**Owner:** Codex · **Spec:** Claude · **Status:** APPROVED (user duyệt 16/07)
**Locks:** `supabase/migrations/20260716000000_gallery_comments_upsert.sql` (mới), `app/actions/gallery-reaction-actions.ts`, `app/actions/gallery-selection-actions.ts` (chỉ bỏ ghi client_note), `app/actions/gallery-composite-actions.ts`, `app/actions/gallery-cursor-actions.ts`, `components/gallery/image-viewer.tsx`, `components/gallery/public-gallery-client.tsx`, `components/contracts/gallery/gallery-image-grid.tsx`, `components/contracts/gallery/gallery-lightbox.tsx`, `components/contracts/gallery/use-gallery-data.ts`, `components/contracts/gallery/gallery-full-page.tsx`

> **Sửa spec v2 (16/07):** bổ sung 2 lock cuối — Codex chặn đúng ở vòng 1 vì `commentsPerImage` phải đi qua hook `use-gallery-data.ts` rồi mới tới `gallery-full-page.tsx` để truyền xuống grid/lightbox. Spec v1 thiếu 2 file này.
>
> **Sửa spec v3 (16/07) — sau review vòng 2:** thêm lock `app/actions/gallery-core.ts` (CHỈ THÊM hàm gate cấp gallery, CẤM sửa `assertGalleryProof`/logic capability). Xem mục **"Sửa vòng 2"** cuối file — spec v1/v2 sót đường cấp dữ liệu cho grid TRANG KHÁCH.

---

## Bối cảnh — bug đang chảy máu (đo trên prod 16/07)

| Sự thật | Số liệu |
|---|---|
| Khách ghi chú → lưu ở `gallery_images.client_note` (1 cột/ảnh) | **148 ảnh có ghi chú thật** |
| Admin đếm "bình luận" + lọc "HÌNH CÓ GHI CHÚ" → đọc bảng `gallery_comments` | **0 dòng** → luôn hiện 0 / danh sách rỗng |
| Admin grid render `client_note` | **chỉ khi `publicMode`** → admin không bao giờ thấy |
| Nội dung note = chỉ dẫn in ấn | "In lớn", "Hình nhỏ nha", "Ảnh cổng" — HĐ-2026-0028 có **126 cái** |

**Quyết định nghiệp vụ (user chốt 16/07):**
1. **Có hỏi tên** người ghi — hỏi 1 lần, nhớ `localStorage`.
2. **Mỗi người 1 ghi chú/ảnh, sửa được của mình** → ngữ nghĩa **UPSERT theo `(image_id, client_identifier)`**.

**⚠️ 4 action comment hiện có ĐỀU THIẾU CỔNG BẢO MẬT** (`getComments`, `addComment`, `deleteComment`, `getGalleryCommentCount` — dùng `createAdminClient()` bypass RLS mà không kiểm quyền). Bảng có RLS bật + 0 policy + `anon` không grant → DB an toàn, nhưng server action thì ai gọi cũng được. **Bắt buộc siết trong task này**, nếu không sẽ hạ cấp bảo mật từ "phải có mật khẩu" xuống "ai cũng ghi".

---

## Task A — Migration SQL

Tạo `supabase/migrations/20260716000000_gallery_comments_upsert.sql`:

```sql
-- 1. updated_at: user chốt "sửa được ghi chú của mình" → xưởng cần biết sửa lúc nào.
ALTER TABLE public.gallery_comments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Unique cho upsert (image_id, client_identifier) — mỗi người 1 ghi chú/ảnh.
CREATE UNIQUE INDEX IF NOT EXISTS uq_gallery_comments_image_client
  ON public.gallery_comments (image_id, client_identifier);

-- 3. Backfill 148 ghi chú cũ. IDEMPOTENT — chạy lại nhiều lần vô hại.
--    client_identifier='legacy': không UUID nào trùng → khách không sửa/xoá nhầm ghi chú cũ.
--    author_name='Khách': dữ liệu cũ KHÔNG lưu tên, không bịa được.
--    created_at: lấy mốc gần đúng nhất đang có (selected_at → created_at của ảnh).
INSERT INTO public.gallery_comments
  (image_id, gallery_id, content, author_name, client_identifier, created_at, updated_at)
SELECT gi.id, gi.gallery_id, btrim(gi.client_note), 'Khách', 'legacy',
       COALESCE(gi.selected_at, gi.created_at, now()),
       COALESCE(gi.selected_at, gi.created_at, now())
FROM public.gallery_images gi
WHERE gi.client_note IS NOT NULL AND btrim(gi.client_note) <> ''
ON CONFLICT (image_id, client_identifier) DO NOTHING;
```

**KHÔNG xoá cột `client_note`** — giữ làm bản sao lưu (ngừng ghi từ task này). Xoá cột = task riêng sau khi chạy ổn định ≥ 2 tuần.

**Chạy migration:** `node scripts/migrate-direct.mjs 20260716000000_gallery_comments_upsert.sql` (BẮT BUỘC truyền tên file — không-arg sẽ chạy nhầm file phase1 cũ). Verify bằng: `node scripts/db-q.mjs "SELECT count(*) FROM gallery_comments"` → phải ra **148**.

**Chạy LẠI backfill sau khi deploy code** (bước 3 ở trên, copy nguyên) để hốt ghi chú khách viết trong khoảng ~4 phút deploy.

---

## Task B — Siết + đổi server action (`app/actions/gallery-reaction-actions.ts`)

### B1. Thay `addComment` bằng `upsertComment`

```ts
export async function upsertComment(
  imageId: string,
  galleryId: string,
  content: string,
  authorName: string,
  clientIdentifier: string,
  accessUrl: string,
  accessToken: string,
) {
  try {
    if (!accessUrl?.trim() || !accessToken?.trim()) {
      return { success: false as const, error: "Thiếu quyền truy cập." };
    }
    if (!clientIdentifier?.trim()) {
      return { success: false as const, error: "Thiếu định danh client." };
    }
    const trimmed = (content || "").trim();
    if (trimmed.length > 500) {
      return { success: false as const, error: "Ghi chú tối đa 500 ký tự." };
    }

    const supabase = await createAdminClient();
    // Ghi chú = chỉ dẫn hậu kỳ/in ấn → CÙNG gate với chọn ảnh (mật khẩu Mood cấp).
    // Giữ đúng hành vi updateClientNote cũ; KHÔNG được nới xuống "view".
    await requirePublicGalleryImageAccess(
      supabase, accessUrl.trim(), accessToken.trim(), imageId, "select",
    );

    // Xoá trắng ô = xoá ghi chú của chính mình.
    if (!trimmed) {
      await supabase.from("gallery_comments").delete()
        .eq("image_id", imageId)
        .eq("client_identifier", clientIdentifier);
      return { success: true as const, data: null };
    }

    const author = (authorName || "").trim().slice(0, 50) || "Khách";
    const { data, error } = await supabase
      .from("gallery_comments")
      .upsert(
        {
          image_id: imageId,
          gallery_id: galleryId,
          content: trimmed,
          author_name: author,
          client_identifier: clientIdentifier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "image_id,client_identifier" },
      )
      .select()
      .single();

    if (error) return { success: false as const, error: error.message };
    return { success: true as const, data };
  } catch (error) {
    console.error("upsertComment error:", error);
    return { success: false as const, error: error instanceof Error ? error.message : "Không thể lưu ghi chú" };
  }
}
```

### B2. `getComments` — thêm gate
Chữ ký mới: `getComments(imageId: string, accessUrl?: string, accessToken?: string)`.
- Có `accessUrl`+`accessToken` (khách) → `requirePublicGalleryImageAccess(..., "view")`.
  *Lý do dùng "view" chứ không "select": hành vi HIỆN TẠI là mọi người có link đều thấy `client_note` trên grid — giữ nguyên, không siết thêm ngoài phạm vi task.*
- Không có (gọi từ admin) → bọc `withAuth` + `requireContractAccess` như `getGalleryMetadataAll` đang làm.
- Trả thêm `updated_at`.

### B3. `deleteComment` — thêm gate + kiểm quyền phía server
Chữ ký mới: `deleteComment(commentId, clientIdentifier, accessUrl, accessToken)`.
- Bắt buộc `requirePublicGalleryImageAccess(..., "select")` với `imageId` LẤY TỪ DB theo `commentId` (không tin client).
- Giữ so khớp `client_identifier` (chống xoá nhầm của người khác).

### B4. `getGalleryCommentCount`
Grep xem còn ai gọi không (`grep -rn "getGalleryCommentCount" --include=*.tsx --include=*.ts`). **Không ai gọi → xoá hàm** (dead code do chính task này dọn). Có người gọi → bọc `withAuth`.

### B5. Ngừng ghi `client_note`
`app/actions/gallery-selection-actions.ts`: **XOÁ** `updateClientNote` + `updateGalleryImageNote` (sau khi Task C không còn gọi). Giữ nguyên `getSelectedImages` (dead code KHÔNG liên quan — mention, đừng xoá).

---

## Task C — UI khách (`image-viewer.tsx` + `public-gallery-client.tsx`)

### C1. Tên người ghi
- Key localStorage: `mood_client_name` (cùng chỗ với `mood_client_id` đã có).
- Panel ghi chú: nếu **chưa có tên** → hiện ô `<Input>` "Tên của bạn" **phía trên** ô ghi chú, placeholder `"Vd: Dịu Êm"`, bắt buộc nhập trước khi lưu (nút/auto-save chờ đến khi có tên; nếu trống → toast "Nhập tên để Mood biết ai dặn nhé").
- Đã có tên → hiện dòng nhỏ `Ghi chú của <tên> · Đổi tên` (bấm "Đổi tên" → hiện lại ô input). Style: `text-tiny text-text-muted`, nút dùng `<Button unstyled className="underline">`.

### C2. Ngữ nghĩa lưu
- `onSaveNote(imageId, note)` → gọi `upsertComment(imageId, gallery.id, note, tên, clientId, accessUrl, accessToken)`.
- **GIỮ NGUYÊN**: debounce 800ms, gate `gallery.needsPassword && clientCapability === "view"` → mở modal mật khẩu (dòng ~315 public-gallery-client.tsx).
- Optimistic patch: KHÔNG patch `img.client_note` nữa (cột đã chết) — patch vào state comment của ảnh.

### C3. Hiển thị ghi chú người khác
- Panel liệt kê comment của ảnh: `<tên> — <nội dung>` (read-only), ghi chú **của chính mình** nằm trong ô sửa được.
- Nguồn: `getComments(imageId, accessUrl, accessToken)`, SWR key `gallery-comments-${imageId}`.

---

## Task D — UI admin (thấy 148 ghi chú)

### D1. Nguồn dữ liệu
`app/actions/gallery-composite-actions.ts` (`getGalleryMetadataAll`, dòng ~104): đang `select("image_id")` → đổi thành
`select("image_id, content, author_name, updated_at")`, trả thêm:
```ts
commentsPerImage: Record<string, { author_name: string; content: string; updated_at: string }[]>
```
Giữ nguyên `commentCountsPerImage` (đang chạy đúng). Làm y hệt ở `app/actions/gallery-cursor-actions.ts` nếu nó cũng trả `commentCountsPerImage`.

**Đường đi của `commentsPerImage` (bám đúng đường `commentCountsPerImage` đang chạy — KHÔNG tự nghĩ đường mới):**
`getGalleryMetadataAll` → `components/contracts/gallery/use-gallery-data.ts` (thêm field vào state + return) → `components/contracts/gallery/gallery-full-page.tsx` (destructure ~dòng 45-46, truyền xuống) → `gallery-image-grid.tsx` (chip + preview) và `gallery-lightbox.tsx` (khối ghi chú).

### D2. Grid admin (`gallery-image-grid.tsx`)
- Dòng **224** (chip 💬 "Có ghi chú") và **265** (preview chữ): **BỎ điều kiện `publicMode`**, đổi nguồn từ `image.client_note` → `commentsPerImage[image.id]?.length > 0` (chip) và `commentsPerImage[image.id][0].content` (preview).
- Prop mới: `commentsPerImage` (optional) truyền từ `gallery-full-page.tsx`.

### D3. Lightbox admin (`gallery-lightbox.tsx`)
Thêm khối "Ghi chú của khách" (read-only): mỗi dòng `<author_name> — <content>` + thời gian `updated_at` (format `formatDate`). Không có ghi chú → không render khối.

---

## Ràng buộc cứng
- **KHÔNG** nới gate ghi chú xuống "view" (ghi = "select" = mật khẩu). Đây là nghiệp vụ user đã chốt.
- **KHÔNG** xoá cột `client_note` trong task này.
- **KHÔNG** dùng `<button>` trần (dùng `<Button>`); màu dùng token (`text-error`…), cấm `text-[#...]`.
- **KHÔNG** thêm dependency. Comment tiếng Việt, match style hiện có.
- Đụng dữ liệu THẬT của khách → **không được chạy migration trên prod trước khi user duyệt spec này**.

## Verify (bắt buộc, theo thứ tự)
1. `npx eslint <tất cả file trong Locks>` → 0 error; `npm run build` → pass.
2. `node scripts/db-q.mjs "SELECT count(*) FROM gallery_comments"` → **148** sau backfill.
3. `node scripts/db-q.mjs "SELECT count(*) FROM gallery_comments WHERE client_identifier='legacy'"` → **148**.
4. Prod sau deploy — album HĐ-2026-0028 (`/contracts/59045f4c-28b1-478b-823d-b321da6e5352/gallery`): ô "bình luận" phải hiện **126** (đang hiện 0); bấm vào → danh sách "HÌNH CÓ GHI CHÚ" ra **126 ảnh**; tile có chip 💬 + preview "In lớn".
5. Trang khách: nhập ghi chú → hiện tên; máy KHÁC (localStorage khác) ghi chú cùng ảnh → **2 ghi chú song song, không đè nhau**.
6. Bảo mật: gọi `upsertComment` với token "view" (album có pass, chưa nhập pass) → **phải bị từ chối**.

---

# SỬA VÒNG 2 (Claude review 16/07) — 3 lỗi phải fix

Vòng 2 Codex làm đúng phần lõi: gate `"select"` cho `upsertComment` ✅, `deleteComment` tự lấy `imageId` từ DB ✅, `onConflict` khớp unique index ✅, Task C (tên + upsert + getComments) ✅, gỡ `updateClientNote` ✅, không đụng `getSelectedImages` ✅, không chạy migration/commit ✅. Còn 3 lỗi:

## R1 — BLOCKER: build FAIL (type error)
`components/contracts/gallery/gallery-lightbox.tsx` — `commentsPerImage` được destructure (dòng 66) + dùng (dòng 90) nhưng **KHÔNG khai trong `interface GalleryLightboxProps`** (dòng 18-25) → `gallery-full-page.tsx:260` không truyền được, `npm run build` fail:
```
Type '{ ...; commentsPerImage: Record<string, GalleryCommentSummary[]>; }' is not assignable to type 'IntrinsicAttributes & GalleryLightboxProps'
```
**Fix:** thêm vào interface:
```ts
  commentsPerImage?: Record<string, GalleryCommentSummary[]>;
```

## R2 — REGRESSION trang KHÁCH: mất chip 💬 + preview ghi chú
`gallery-image-grid.tsx` giờ chỉ đọc `commentsPerImage` (mặc định `{}`), nhưng **`public-gallery-client.tsx` KHÔNG truyền prop này** → trên trang khách chip + preview **biến mất hoàn toàn** (trước đây render từ `image.client_note`). Khách mất dấu hiệu "ảnh này mình đã dặn gì đó" — regression, spec v1/v2 sót đường cấp dữ liệu này.

**Fix 3 bước (bám đúng tiền lệ `getReactionCounts` + `gallery-reactions-${gallery.id}` đang chạy):**

**a. `app/actions/gallery-core.ts` — CHỈ THÊM hàm mới** (CẤM sửa `assertGalleryProof`, `buildGalleryAccessToken`, logic capability):
```ts
export async function requirePublicGalleryAccess(
   
  supabase: any,
  accessUrl: string,
  accessToken: string,
  galleryId: string,
  requiredCapability: GalleryShareCapability = "select",
) {
  if (!accessUrl?.trim()) {
    throw new Error("Thieu link gallery.");
  }
  const gallery = await fetchSharedGalleryByAccessUrl(supabase, accessUrl.trim());
  if (!gallery) {
    throw new Error("Gallery không tồn tại hoặc chưa được chia sẻ.");
  }
  if (!assertGalleryProof(gallery, accessToken, requiredCapability)) {
    throw new Error("Phiên truy cập gallery không hợp lệ hoặc đã hết hạn.");
  }
  if (gallery.id !== galleryId) {
    throw new Error("Gallery không khớp link chia sẻ.");
  }
  return { gallery };
}
```

**b. `app/actions/gallery-reaction-actions.ts` — thêm:**
```ts
/** Ghi chú theo ảnh cho CẢ gallery — cấp dữ liệu cho chip + preview trên grid trang khách. */
export async function getGalleryComments(
  galleryId: string,
  accessUrl: string,
  accessToken: string,
): Promise<Record<string, GalleryCommentSummary[]>> {
  try {
    if (!accessUrl?.trim() || !accessToken?.trim()) return {};
    const supabase = await createAdminClient();
    // "view": ĐÚNG mức bảo mật hiện tại — hôm nay client_note vốn đã nằm trong payload ảnh
    // (IMAGE_COLS) gửi cho MỌI người có link; UI mới là chỗ giấu nội dung với người không pass.
    // KHÔNG siết thêm ngoài phạm vi task.
    await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId, "view");
    const { data, error } = await supabase
      .from("gallery_comments")
      .select("image_id, content, author_name, updated_at")
      .eq("gallery_id", galleryId)
      .order("created_at", { ascending: true });
    if (error) return {};
    const map: Record<string, GalleryCommentSummary[]> = {};
    for (const row of data || []) {
      (map[row.image_id] ||= []).push({
        author_name: row.author_name,
        content: row.content,
        updated_at: row.updated_at,
      });
    }
    return map;
  } catch (error) {
    console.error("getGalleryComments error:", error);
    return {};
  }
}
```

**c. `components/gallery/public-gallery-client.tsx`** — SWR y hệt pattern `reactionCounts` (dòng ~90):
```tsx
const { data: commentsPerImage = {} } = useSWR(
  gallery.id && accessUrl && accessToken ? `gallery-comments-${gallery.id}` : null,
  () => getGalleryComments(gallery.id, accessUrl, accessToken),
  { fallbackData: {} },
);
```
Truyền `commentsPerImage={commentsPerImage}` xuống grid (cạnh `showClientNote={!isViewOnly}` dòng ~384). Sau khi `onSaveNote` chạy xong → `mutate(\`gallery-comments-${gallery.id}\`)` để chip cập nhật ngay.

## R3 — QUYỀN RIÊNG TƯ: preview đang lộ cho người KHÔNG có mật khẩu
`gallery-image-grid.tsx` dòng ~267: Codex bỏ luôn điều kiện `showClientNote` → prop chết. Hôm nay trang khách truyền `showClientNote={!isViewOnly}` (dòng 384) = **người thân chỉ-xem KHÔNG đọc được nội dung ghi chú** của dâu rể. Phải giữ đúng ranh giới đó.

**Fix:**
- Preview (dòng ~267): `{showClientNote && commentsPerImage[image.id]?.[0]?.content && (...)}`.
- Chip 💬 (dòng ~226): **giữ nguyên không gate** — khớp hành vi hôm nay (ai có link cũng thấy "ảnh này có ghi chú", chỉ không đọc được nội dung).
- `gallery-full-page.tsx` (admin) phải truyền `showClientNote` → admin luôn đọc được nội dung (đây là mục tiêu chính của task).

## R4 — Style (không chặn, sửa nếu tiện)
`gallery-reaction-actions.ts`: mấy dòng `.upsert(...)`/`.select(...)` gộp 1 dòng dài 200+ ký tự, lệch style multi-line của repo (xem `toggleReaction` ngay trên). Tách dòng cho khớp.

## Verify lại (bắt buộc)
- `npm run build` → **PASS** (R1 đang fail — Codex vòng 2 báo "pass" nhưng thực tế FAIL, phải tự chạy lại).
- `npx eslint` 12 file → 0 error.
- Grep chứng minh R2/R3: `grep -n "commentsPerImage" components/gallery/public-gallery-client.tsx` → phải có; `grep -n "showClientNote &&" components/contracts/gallery/gallery-image-grid.tsx` → phải có.

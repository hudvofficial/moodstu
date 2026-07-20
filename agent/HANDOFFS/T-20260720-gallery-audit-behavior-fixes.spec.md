# SPEC — T-20260720-gallery-audit-behavior-fixes

**Nguồn:** Audit toàn app 2026-07-20 (sau fix b47f396 "khách kẹt 30 ảnh"). User đã duyệt Đợt 2.
**Module:** gallery public (reaction + core). Không đụng file shared ngoài danh sách dưới.
**Owner thực thi:** Claude (fallback trực tiếp, user đã cho phép fix nhanh trong session audit).

## Bug 1 — upsertComment tin `galleryId` từ client (M2)

**File:** `app/actions/gallery-reaction-actions.ts`, hàm `upsertComment` (~dòng 234-259).

**Hiện trạng:** gate `requirePublicGalleryImageAccess(..., imageId, "select")` xác minh imageId thuộc gallery của accessUrl, nhưng dòng upsert ghi `gallery_id: galleryId` lấy thẳng từ tham số client → khách có token album A ghi được row mang `gallery_id` album B → note "biến mất" khỏi grid album A + đếm note album B sai.

**Fix:** hứng `gallery` từ kết quả gate rồi dùng `gallery.id`, bỏ tin client:

```ts
// TRƯỚC (dòng 245):
await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "select");
// SAU:
const { gallery } = await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "select");
```

```ts
// TRƯỚC (dòng 252, trong upsert):
gallery_id: galleryId,
// SAU:
gallery_id: gallery.id,
```

Tham số `galleryId` GIỮ nguyên trong chữ ký hàm (client đang gọi với nó — không breaking) nhưng không dùng để ghi nữa. Không thêm check `gallery.id !== galleryId` trả lỗi — dùng thẳng `gallery.id` là đủ và đơn giản hơn.

## Bug 2 — deadline chặn nhầm cả ĐỌC + tim (M3)

**File:** `app/actions/gallery-core.ts`, hàm `requirePublicGalleryImageAccess` (~dòng 338-378).

**Hiện trạng:** check `isSelectionClosed(gallery.selection_deadline)` nằm trong hàm gate chung → sau deadline, cả `getComments` (đọc, view) lẫn `toggleReaction` (tim xã giao) đều ném "Album đã hết hạn chọn ảnh" → catch nuốt → khách thấy comment trống / tim không ăn, không một thông báo. Trong khi `requirePublicGalleryAccess` (gallery-level) KHÔNG check deadline → 2 tầng gate lệch nhau (chip note trên grid vẫn hiện, mở ảnh thì trống).

**Nghiệp vụ chốt:** deadline chọn ảnh = khóa INPUT HẬU KỲ (chọn/bỏ chọn, ghi/xóa note). Xem note, thả tim = xã giao, không bị deadline.

**Fix:** thêm option `enforceDeadline` (default `false`) vào `requirePublicGalleryImageAccess`; chuyển check deadline vào sau option:

```ts
export async function requirePublicGalleryImageAccess(
  supabase: any,
  accessUrl: string,
  accessToken: string,
  imageId: string,
  requiredCapability: GalleryShareCapability = "select",
  options: { enforceDeadline?: boolean } = {},
) {
  // ... giữ nguyên phần fetch gallery + assertGalleryProof ...
  if (options.enforceDeadline && isSelectionClosed(gallery.selection_deadline)) {
    throw new Error("Album đã hết hạn chọn ảnh.");
  }
  // ... giữ nguyên phần verify image ...
```

**Call sites cập nhật (truyền `{ enforceDeadline: true }`)** — các hành động GHI input hậu kỳ:
- `app/actions/gallery-selection-actions.ts:29` `toggleImageSelection`
- `app/actions/gallery-selection-actions.ts:87` `toggleImageStar`
- `app/actions/gallery-reaction-actions.ts` `upsertComment` (dòng 245, cả 2 nhánh nếu có) và `deleteComment` (dòng 268)

**Call sites GIỮ default false** (đọc + tim): `getComments` (214/216), `toggleReaction` (59/61).

Đã kiểm (grep 20/07): UI public chỉ gọi `toggleReaction(..., "heart", ...)` (public-gallery-client.tsx:312) — giữ nguyên đơn giản, KHÔNG thêm logic phân nhánh theo reaction_type.

## Success criteria
1. `npx eslint` các file đổi = exit 0; `npm run build` pass.
2. Test hành vi bằng script node (tsx, import trực tiếp — pattern scripts/tmp-verify-gate.mts session này) hoặc trên prod sau deploy:
   - upsertComment với galleryId SAI → row ghi ra vẫn mang gallery_id ĐÚNG (của accessUrl).
   - Gallery có `selection_deadline` quá khứ: `getComments` trả data bình thường, `toggleImageSelection` bị chặn "Album đã hết hạn chọn ảnh".
3. Không đổi hành vi nào khác: album không deadline, album còn hạn — mọi action như cũ.

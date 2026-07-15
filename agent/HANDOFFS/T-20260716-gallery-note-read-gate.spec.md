# T-20260716-gallery-note-read-gate — Khách không thấy ghi chú của chính mình (regression d45ea00)

**Owner:** Codex · **Spec:** Claude · **Status:** APPROVED (user duyệt 16/07)
**Locks (1 file):** `app/actions/gallery-reaction-actions.ts` — **CHỈ** `getGalleryComments` + `getComments`.

**KHÔNG migration, KHÔNG đụng DB, KHÔNG đụng `lib/gallery-access.ts`, KHÔNG đụng `upsertComment`/`deleteComment`/`toggleReaction`.**

---

## Bug — đang chảy máu trên prod, do `d45ea00` (hôm qua) gây ra

Khách viết ghi chú → **lưu được vào DB** → mở lại thì **ô ghi chú trống trơn**, tưởng mất. Đọc thất bại, ghi thành công.

### Chuỗi nhân quả (đã xác minh từng mắt, không suy đoán)

| Mắt xích | Bằng chứng |
|---|---|
| So capability là **EXACT** | `normalizeCapability(payload.capability) === normalizeCapability(expected.capability)` — [lib/gallery-access.ts:99](lib/gallery-access.ts#L99) |
| `"select"` KHÔNG khớp `"view"` | `normalizeCapability` chỉ giữ nguyên `"view"`/`"download"`, còn lại → DEFAULT (`"select"`) — [gallery-access.ts:44](lib/gallery-access.ts#L44) |
| Album **không mật khẩu** cấp thẳng select-token | `getGalleryCapability` = `gallery.capability \|\| "select"` — [gallery-core.ts:105](app/actions/gallery-core.ts#L105) |
| App thật gửi select-token cho `getComments` | Request thật của lightbox trên prod (reqid 1894): JWT body chứa `"capability":"select"` |
| `getComments` đòi `"view"` → từ chối → **nuốt lỗi thành `[]`** | `catch { return [] }` — không ai thấy lỗi |

**Bất đối xứng:** `upsertComment` gate `"select"` → **ghi OK**. `getComments` gate `"view"` → **đọc HỎNG**. Album **có** mật khẩu còn ngược đời hơn: thấy ghi chú *trước* khi nhập pass (view-token), nhập pass xong (select-token) thì **mất**.

**Đã đo trên prod:** replay `getComments` cho ảnh `c25cfd2c` (DB có note "In lớn") bằng select-token thật → trả `[]`.

### ĐÃ CÓ LỜI GIẢI TRONG REPO — tái dùng, đừng phát minh

`toggleReaction` ([gallery-reaction-actions.ts:55-62](app/actions/gallery-reaction-actions.ts#L55)) đụng đúng bẫy này hồi 15/07 và giải bằng try/catch, kèm comment nghiệp vụ:

```ts
    // Tim = hành động xã giao, KHÔNG cần mật khẩu (nghiệp vụ chốt 15/07):
    // chấp nhận VIEW-token (album có pass) LẪN token đầy đủ (album không pass).
    let access;
    try {
      access = await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "view");
    } catch {
      access = await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId);
    }
```

**Task này = áp đúng pattern đó cho 2 hàm ĐỌC ghi chú.** Không đổi kiến trúc, không cần ADR: chấp nhận select-token là chấp nhận token **quyền CAO hơn** — vẫn chứng minh truy cập hợp lệ, không cấp thêm gì. Lõi EXACT match của ADR-008 **giữ nguyên**.

### Phạm vi thật (đã soi MỌI call site gate public)
| Hàm | Gate | Trạng thái |
|---|---|---|
| `getGalleryComments` :170 | `"view"` trần | 🔴 **HỎNG** — chip/preview ghi chú trên grid khách |
| `getComments` :207 | `"view"` trần | 🔴 **HỎNG** — ghi chú trong lightbox khách |
| `toggleReaction` :59-61 | try/catch | ✅ đã đúng |
| `upsertComment` :235 · `deleteComment` :258 | `"select"` | ✅ đúng (ghi phải có pass) — **KHÔNG ĐỘNG** |
| `gallery-public-actions` :131, :349 | gate mặc định | ✅ dùng capability của chính gallery |

---

## Task 1 — `getGalleryComments` (chip/preview grid khách)

File `app/actions/gallery-reaction-actions.ts`. Thay khối comment + 1 dòng gate hiện tại ([dòng 167-170](app/actions/gallery-reaction-actions.ts#L167)):

```ts
    // "view": ĐÚNG mức bảo mật hiện tại — hôm nay client_note vốn đã nằm trong payload ảnh
    // (IMAGE_COLS) gửi cho MỌI người có link; UI mới là chỗ giấu nội dung với người không pass.
    // KHÔNG siết thêm ngoài phạm vi task.
    await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId, "view");
```

bằng:

```ts
    // Đọc ghi chú = mức "view" (ai có link đều đọc được — client_note vốn đã nằm trong
    // payload ảnh IMAGE_COLS cho mọi người có link). NHƯNG album KHÔNG mật khẩu cấp thẳng
    // select-token, mà so capability là EXACT → gate "view" trần sẽ từ chối chính nó.
    // Chấp nhận CẢ HAI như toggleReaction: view-token (album có pass) lẫn token đầy đủ.
    try {
      await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId, "view");
    } catch {
      await requirePublicGalleryAccess(supabase, accessUrl.trim(), accessToken.trim(), galleryId);
    }
```

## Task 2 — `getComments` (ghi chú trong lightbox khách)

Cùng file. Thay dòng gate trong nhánh public ([dòng ~207](app/actions/gallery-reaction-actions.ts#L207)):

```ts
      await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "view");
```

bằng:

```ts
      // Chấp nhận view-token (album có pass) LẪN token đầy đủ (album không pass) — xem toggleReaction.
      try {
        await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId, "view");
      } catch {
        await requirePublicGalleryImageAccess(supabase, accessUrl.trim(), accessToken.trim(), imageId);
      }
```

**KHÔNG đụng** nhánh admin (`withAuth`) phía dưới, **KHÔNG đụng** `toComment` (vừa làm ở A2), **KHÔNG đổi** chữ ký hàm.

---

## Vì sao KHÔNG hạ cấp bảo mật (điểm review kỹ nhất)

- `requirePublicGalleryAccess`/`requirePublicGalleryImageAccess` mặc định `requiredCapability = "select"` ([gallery-core.ts:320,344](app/actions/gallery-core.ts#L320)) → nhánh `catch` vẫn **bắt buộc có proof HMAC hợp lệ** cho đúng gallery + đúng accessVersion + chưa hết hạn. Không có token = vẫn trượt cả hai nhánh → ném lỗi → `[]`/`{}`.
- Không có đường leo thang: người chỉ có view-token vẫn KHÔNG ghi/xoá được (`upsertComment`/`deleteComment` giữ `"select"`).
- Lõi `verifyGalleryAccessProof` + EXACT match **không đổi 1 ký tự**.

## Verify (Codex tự chạy)
1. `npx eslint app/actions/gallery-reaction-actions.ts` → **0 lỗi, 0 warning**.
2. `npm run build` → **PASS** (tự chạy — tiền lệ Codex báo pass sai 2/2 lần).
3. Báo diff + kết quả. **KHÔNG commit, KHÔNG push.**

## Verify sau (Claude — read-only, KHÔNG ghi data khách)
Replay đúng request đã dùng để bắt bug, trên prod, sau deploy:
- `getComments` cho ảnh `c25cfd2c-338f-4051-b670-13d366234473` bằng **select-token thật** của album `jjay1sJ9hhPq`.
- **Trước fix:** `[]`. **Sau fix (kỳ vọng):** trả note `"In lớn"` kèm `is_mine` (false vì identifier `legacy`), và **vẫn KHÔNG có `client_identifier`** (không được phá A2).
- Kiểm thêm: gọi không token → vẫn phải trượt (`[]`).

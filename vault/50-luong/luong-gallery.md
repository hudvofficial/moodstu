---
title: "Luồng — Gallery từ upload tới hậu kỳ"
tags: [luong, gallery]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/05-gallery-moodie.md · vault/30-du-lieu/than-ham/gallery.md
---

# Luồng Gallery

```
Google Drive (ảnh gốc nằm ở đây, KHÔNG ở Supabase)
     │  import metadata
     ▼
galleries + gallery_images ──prepare_gallery_share──► link chia sẻ
     │                                                     │
     │                                          /gallery/[accessUrl]
     │                                                     │
     │                    ┌────────────────┬───────────────┼──────────────┐
     │                    ▼                ▼               ▼              ▼
     │             XEM (tự do)      TIM (tự do)     CHỌN (mật khẩu)   TẢI (gate riêng)
     │                          gallery_reactions   is_selected      view/select/
     │                                              is_starred       payment 402
     │                                                    │
     └──────── modal "Lọc ảnh" ◄──────────────────────────┘
                     │
                     ▼
          gallery_filter_jobs → chép sang thư mục Drive mới → hậu kỳ / in ấn
```

## 1. Đưa ảnh vào

Admin import từ Drive. Ảnh **không** upload lên Supabase — chỉ lưu `drive_file_id` + URL.
`gallery-drive-actions.ts` chạm `galleries`, `gallery_images`, `contract_events`, `contracts`, `studio_info`.
Kích thước ảnh + blurhash nạp sau bằng `backfill-dimensions` / `blurhash-actions`.

⚠️ `gallery_images` **không có `deleted_at`** → xoá là hard-delete.

## 2. Chia sẻ

`prepare_gallery_share` → `gallery_share_links` (**258 dòng**, ảnh chụp lược đồ ~27/08/2026 — trước đó trang này ghi 219, số 07/08).
Đường công khai `/gallery/[accessUrl]`, khách **không đăng nhập**.

## 3. Quyền của khách — hai token

| | Cấp khi nào | Làm được gì |
|---|---|---|
| `view-token` | ngay khi mở link, miễn phí | xem · thả tim · tải (nếu bật) |
| `select-token` | sau khi nhập đúng mật khẩu | thêm: **chọn ảnh · gắn sao · ghi chú** |

Nghiệp vụ: album được share cho người thân bạn bè xem thoải mái; chỉ cô dâu chú rể (có mật khẩu admin cấp) mới được **chọn**, vì ảnh chọn là input cho hậu kỳ/in ấn. → [[adr-index|ADR-008]]

`lib/gallery-access.ts` so capability **EXACT hai chiều**. Đã lọt bug **hai lần** vì gate một chiều — mỗi lần khách kẹt ở một hướng khác nhau. Mẫu đúng: `toggleReaction` (try/catch, verify 2 lần).

Chống dò mật khẩu: 10 sai / 15 phút / gallery.

⚠️ **Bốn server action công khai KHÔNG kiểm token** — `getPublicGalleryStats`, `getReactionCounts`, `getClientReactions`, `getCommentCountsPerImage`: chỉ cần biết UUID gallery là gọi được. Thêm `/api/drive-download/[fileId]` không kiểm gì (nhất quán ADR-011 nhưng chưa ai xác nhận là chủ ý).
⚠️ Trong 2 route download, `capability` dùng làm `expected` lại **lấy chính từ payload token** → phép so capability là **tautology**; hiện an toàn nhờ chữ ký HMAC phủ luôn `capability`, nhưng rất dễ hiểu nhầm khi sửa sau này.

> ⚠️ CHƯA KIỂM (2026-08-31): mức độ lộ thật của 4 action trên; và `/api/gallery-download-batch/[token]` **không** áp `applyPublicImageFilter` → danh sách trả về có thể gồm cả file RAW mà lưới công khai đã giấu.

## 4. "Chọn" ≠ "Tim"

| | Chọn | Tim |
|---|---|---|
| `gallery_images.is_selected` | `gallery_reactions` |
| cần mật khẩu | tự do |
| input hậu kỳ | xã giao |

**Cấm gộp bằng `||`.**

**Hệ quả về con số:** admin đếm *số ảnh* có ít nhất một tim; trang khách đếm *số lượt* tim. Hai người cùng tim một ảnh → hai số lệch mà **cả hai đều đúng**. Đây không phải bug.

## 5. Lọc về Drive

Modal "Lọc ảnh" — 3 chế độ thật: **Tim · Khách chọn · Cả hai** (khử trùng theo `imageId`).
`initDriveCopyJob(galleryId, contractId, driveFolderName, filterMode)` → `gallery_filter_jobs` → tạo thư mục/shortcut trên Drive thật của khách.

⚠️ **Chạy thật sẽ tạo thư mục trên Drive khách.** Test phải dùng gallery nháp.

✅ **Nợ `.in('id', [...])` đã trả.** Bản cũ của trang này cảnh báo chế độ "tim" vỡ khi vượt ~400 ảnh (giới hạn header 16KB của PostgREST). `initDriveCopyJob` nay đã đổi sang `selectAllRows` + lọc bằng `Set` trong JS (`gallery-drive-actions.ts:300-304` có comment ghi rõ "bản cũ dùng `.in(...)`"). Giới hạn header vẫn là bẫy thật ở chỗ khác → [[bay-du-lieu]] #2.

## 6. Ảnh gốc

`=s0` cho ra ảnh gốc, ai cũng đoán được URL. Cổng tải là **UX-gate**, không phải security-gate — đã chấp nhận ([[adr-index|ADR-011]]). Đừng vá bằng cách giấu `drive_file_id`.

## Ai ghi được vào đâu

| Bảng / cột | Ai ghi |
|---|---|
| `gallery_images` (INSERT ảnh) | admin: `createGallery` · `syncDriveFolder` · **`createMultiFolderGalleries`** · **Moodie** (tool `sync_drive_gallery` → `syncDriveFolder`, **sau khi user duyệt**) |
| `gallery_images.sort_order` | admin (`reorderImages`) |
| `gallery_images.width/height/blur_hash` | admin (backfill dimensions / blurhash) |
| `gallery_images.is_selected`/`selected_at` | **khách** có select-token |
| `gallery_images.is_starred`/`starred_at` | **khách** có select-token |
| `galleries.cover_image_id` | **khách** có select-token |
| `gallery_reactions`, `gallery_comments` | khách |

⚠️ **Bản cũ của trang này viết "`gallery_images` chỉ admin ghi, đúng 3 nơi" và kết luận "không có tác nhân thứ hai". Nay SAI hai chỗ:**
1. Khách ghi được `is_starred`/`starred_at` và `galleries.cover_image_id` — danh sách cũ thiếu.
2. **Moodie có thể INSERT ảnh** qua `sync_drive_gallery` (`moodie-action-actions.ts:102`). Vẫn **không có cron, không webhook** — nhưng đây là tác nhân thứ hai **có người duyệt**, không phải "không có".

Điều đó **không** làm bài học ở [[bay-du-lieu]] #13 mất giá trị — nó chỉ đổi cách kiểm: **grep lại người ghi mỗi lần viết spec**, đừng chép kết luận cũ. Danh sách người ghi thay đổi theo thời gian.

## Liên quan

[[gallery]] · [[hop-dong]] · [[tich-hop-ngoai]] · [[bao-mat-du-lieu-rls]] · [[bay-du-lieu]]

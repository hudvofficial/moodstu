---
title: "Luồng — Gallery từ upload tới hậu kỳ"
tags: [luong, gallery]
cap-nhat: 2026-08-07
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
     │                            ┌────────────────────────┼──────────────┐
     │                            ▼                        ▼              ▼
     │                     XEM (tự do)            TIM (tự do)     CHỌN (mật khẩu)
     │                                        gallery_reactions   is_selected
     │                                                                    │
     └──────── modal "Lọc ảnh" ◄──────────────────────────────────────────┘
                     │
                     ▼
          gallery_filter_jobs → chép sang thư mục Drive mới → hậu kỳ / in ấn
```

## 1. Đưa ảnh vào

Admin import từ Drive. Ảnh **không** upload lên Supabase — chỉ lưu `drive_file_id` + URL.
`gallery-drive-actions.ts` chạm `galleries`, `gallery_images`, `contract_events`, `contracts`, `studio_info`.
Kích thước ảnh + blurhash nạp sau bằng `backfill-dimensions` / `blurhash-actions`.

## 2. Chia sẻ

`prepare_gallery_share` → `gallery_share_links` (219 dòng).
Đường công khai `/gallery/[accessUrl]`, khách **không đăng nhập**.

## 3. Quyền của khách — hai token

| | Cấp khi nào | Làm được gì |
|---|---|---|
| `view-token` | ngay khi mở link, miễn phí | xem · thả tim · tải (nếu bật) |
| `select-token` | sau khi nhập đúng mật khẩu | thêm: **chọn ảnh · ghi chú** |

Nghiệp vụ: album được share cho người thân bạn bè xem thoải mái; chỉ cô dâu chú rể (có mật khẩu admin cấp) mới được **chọn**, vì ảnh chọn là input cho hậu kỳ/in ấn. → [[adr-index|ADR-008]]

`lib/gallery-access.ts` so capability **EXACT hai chiều**. Đã lọt bug **hai lần** vì gate một chiều — mỗi lần khách kẹt ở một hướng khác nhau. Mẫu đúng: `toggleReaction` (try/catch, verify 2 lần).

Chống dò mật khẩu: 10 sai / 15 phút / gallery.

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

⚠️ Chế độ "tim" hiện dựng câu `.in('id', [...])` → **vỡ khi vượt ~400 ảnh được tim** (giới hạn header 16KB của PostgREST). Nợ kỹ thuật đã biết.

## 6. Ảnh gốc

`=s0` cho ra ảnh gốc, ai cũng đoán được URL. Cổng tải là **UX-gate**, không phải security-gate — đã chấp nhận ([[adr-index|ADR-011]]). Đừng vá bằng cách giấu `drive_file_id`.

## Ai ghi được vào đâu

| Bảng | Ai ghi |
|---|---|
| `gallery_images` | **chỉ admin** — 3 nơi: thêm ảnh, import Drive, kéo thả `sort_order` |
| `gallery_reactions`, `gallery_comments`, `is_selected` | khách |

Không cron, không webhook. → **đừng viết rủi ro đồng thời cho `gallery_images` vào spec.**

## Liên quan

[[gallery]] · [[hop-dong]] · [[tich-hop-ngoai]] · [[bao-mat-du-lieu-rls]]

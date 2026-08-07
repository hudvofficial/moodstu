---
title: "Module Gallery"
tags: [module, gallery]
cap-nhat: 2026-08-07
---

# Module Gallery

Album ảnh giao khách. **Module nặng dữ liệu nhất hệ thống**: 76 gallery / 17.704 ảnh, album lớn nhất 780 ảnh. Ảnh không lưu ở Supabase — lưu trên **Google Drive**, chỉ metadata nằm trong DB.

## Hai mặt tiền

| | Admin | Khách |
|---|---|---|
| Route | `/contracts/[id]/gallery` | `/gallery/[accessUrl]` |
| Đăng nhập | có | **không** |
| Quyền | `requireContractAccess` | token ký trong URL |
| Component | `components/contracts/gallery/` | `components/gallery/` |

Hai bên **dùng chung lưới ảnh** nhưng lightbox khác nhau (`gallery-lightbox.tsx` vs `image-viewer.tsx`). Sửa lưới phải verify cả hai.

## ⚠️ "Chọn" và "Tim" là HAI hệ độc lập

| | Chọn | Tim |
|---|---|---|
| Lưu ở | `gallery_images.is_selected` | bảng `gallery_reactions` |
| Ai làm | cô dâu chú rể (cần mật khẩu) | ai xem cũng được |
| Ý nghĩa | ảnh đưa vào hậu kỳ / in ấn | thích, xã giao |
| UI | ✓ xanh | ❤️ đỏ |

**CẤM gộp bằng `||`.** Đây là lỗi từng làm modal "Lọc ảnh" lọc sai nguồn.

Một hệ quả trực tiếp: số "đã tim" ở admin và ở trang khách **có thể lệch mà vẫn đúng cả hai** — admin đếm *số ảnh* có ít nhất 1 tim, trang khách đếm *số lượt* tim. Nhiều người cùng tim một ảnh → hai số khác nhau.

## Mô hình quyền 2 tầng (ADR-008)

Nghiệp vụ, nguyên văn user: album giao cô dâu chú rể, họ còn share cho người thân bạn bè. Chỉ cần mật khẩu khi **bấm chọn** (ảnh chọn là input cho hậu kỳ/in ấn), còn **xem thì tự do**.

| Hành động | Cần gì |
|---|---|
| Xem ảnh | tự do — `view-token` cấp miễn phí |
| Thả tim | tự do (view-token đủ) |
| **Chọn ảnh + Ghi chú** | **mật khẩu** → `select-token` |

`lib/gallery-access.ts` so capability **EXACT hai chiều** — đừng đụng, route download phụ thuộc vào nó. Đã hai lần lọt bug vì gate một chiều: view-token bị gate select chặn, và ngược lại. Mẫu xử lý đúng: `toggleReaction` (verify 2 lần, try/catch).

Nhãn UI: "Mật khẩu chọn ảnh" / "Yêu cầu mật khẩu khi chọn ảnh" — **không phải** "Bảo vệ album" (gây hiểu nhầm là chặn xem). `PasswordGate` chặn-xem là dead code **cố ý**, đừng nối lại.

Chống dò: 10 lần sai / 15 phút / gallery (`gallery_password_attempts`).

## Ảnh: cỡ và URL

`lh3.googleusercontent.com/d/<fileId>=sN`

| Cỡ | Dùng cho |
|---|---|
| `=s600` | ô lưới |
| `=s1200` / `=s2048` | xem trước trong lightbox |
| `=s0` | **ảnh gốc** |

**Ảnh gốc lộ được** — chỉ cần đổi hậu tố. Đã chấp nhận: cổng tải là **UX-gate**, không phải security-gate ([[adr-index|ADR-011]]). **Đừng vá bằng cách giấu `drive_file_id`** — fileId nằm sẵn trong URL ảnh, helper còn tự extract bằng regex.

### Lightbox: thứ tự nạp
Nạp thẳng `=s0` cùng lúc với ảnh xem trước gây chớp đen (đo prod: `=s2048` 450KB và `=s0` 19,4MB khởi động cùng lúc, khung trắng 334–2337ms). Cách đúng đã áp cho **cả hai** viewer:
1. hiện ngay `=s600` đã có trong cache lưới (placeholder),
2. đổi sang ảnh xem trước khi nó tải xong,
3. **chỉ khi đó** mới bắt đầu nạp `=s0`.

Desktop phải khoá `md:h-[90vh]` nếu không khung ảnh nhảy cỡ khi đổi nguồn.

### LCP mobile (ADR-012)
Ba lỗi đã sửa, đừng tái phạm: (1) `imageSrc` phụ thuộc `columnWidth` runtime → SSR và client ra src khác nhau → trình duyệt vứt ảnh tải lại bằng JS; (2) `eagerLoad` quá ít + thiếu `fetchpriority`; (3) `opacity-0` chờ `onLoad` → LCP phải đợi JS.
**Nguyên tắc: thumbnail dùng MỘT cỡ cố định** để src ổn định tuyệt đối giữa SSR và client.

## Bảng

[[luoc-do-gallery]] — `galleries` · `gallery_images` (17.704 dòng) · `gallery_reactions` · `gallery_comments` · `gallery_share_links` · `gallery_albums` · `gallery_selection_batches` + `_items` · `gallery_filter_jobs` · `gallery_password_attempts`

## ⚠️ Chỉ admin ghi vào `gallery_images`

Đúng **3 nơi**: `gallery-admin-actions.ts` (thêm ảnh) · `gallery-drive-actions.ts` (import Drive) · `gallery-selection-actions.ts` (kéo thả `sort_order`). Không cron, không webhook. Khách chỉ ghi được `gallery_reactions` / `gallery_comments` / `is_selected`.

→ **Đừng viết rủi ro "có người upload trong lúc khách đang cuộn" vào spec.** Không có tác nhân thứ hai.

## Bẫy phân trang & đếm

- **PostgREST cắt 1000 dòng/request.** `.limit(20000)` vẫn chỉ trả 1000, **im lặng**. Đếm phía client sẽ ra số sai. Phải `.range()` phân trang hoặc `count: 'exact', head: true`.
  Đang còn nợ ở `getReactionCounts` và query tim của admin.
- **PostgREST giới hạn header 16KB.** `.in('id', [~500 uuid])` sinh URL ~19.700 ký tự → lỗi "HTTP headers exceeded server limits". Chế độ lọc "tim" hiện dùng cách này → **vỡ khi album có hơn ~400 ảnh được tim**. Nợ kỹ thuật đã biết.
- **Guard bằng state không chặn được hai lời gọi trong cùng một tick** → dùng `useRef`. Dedupe phải làm **bên trong** `setState(prev => …)`, không so với snapshot của closure.

## Lọc ảnh về Drive

Modal "Lọc ảnh" có 3 chế độ thật: **Tim · Khách chọn · Cả hai** (khử trùng theo `imageId`). Trước đây radio là dead UI — tab Drive chép `is_selected OR tim` trong khi hiển thị số tim.
`initDriveCopyJob(galleryId, contractId, driveFolderName, filterMode)` → `gallery_filter_jobs`.

## Liên quan

[[luong-gallery]] · [[hop-dong]] · [[tich-hop-ngoai]] · [[bay-du-lieu]]

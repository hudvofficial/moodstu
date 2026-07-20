# ADR DRAFT — Lộ `drive_file_id` vô hiệu hóa cổng tải ảnh gốc + brute-force password (Đợt 3 audit 20/07)

**Trạng thái: CHỜ USER CHỌN PHƯƠNG ÁN.** Không code gì trước khi chốt.

## Vấn đề 1 (HIGH): `drive_file_id` phát cho mọi khách

`IMAGE_COLS` (gallery-core.ts:15) chứa `drive_file_id` và nằm trong payload ảnh gửi MỌI khách có link (kể cả album khóa pass, chưa nhập pass). Ảnh Drive vốn share public → ai ghép `lh3.googleusercontent.com/d/<id>=s0` là tải ảnh gốc full-res, né toàn bộ gate view-block / unlock / payment-402 mà 2 route download dựng kỹ. `/api/drive-download/[fileId]` cũng redirect không kiểm gì.

### Phương án A — Chấp nhận, ghi nhận chính thức (0 ngày công)
Ghi vào DECISIONS: "cổng tải chỉ là UX-gate, không phải security-gate; ảnh Drive share public là chấp nhận rủi ro". Xong. **Được:** không tốn công, không risk regression. **Mất:** khách rành kỹ thuật tải ảnh gốc không trả tiền; watermark vô nghĩa với họ.

### ~~Phương án B — Giấu `drive_file_id` khỏi payload public~~ **VÔ HIỆU — RÚT LẠI (scope 21/07)**
Khi scope chi tiết phát hiện: `image_url`/`thumbnail_url` mà khách BẮT BUỘC nhận để hiển thị ảnh có dạng `lh3.googleusercontent.com/d/<fileId>=sN` — **fileId nằm sẵn trong chính URL ảnh** (gallery-helpers.ts:53-55 còn tự extract nó bằng regex `\/d\/([^/?]+)`), và đổi `=sN` → `=s0` là ra ảnh gốc. Giấu cột `drive_file_id` không đóng được gì — bảo mật hình thức. Đã báo user 21/07, khuyến nghị chuyển sang A (ghi nhận) hoặc C (đổi cách serve ảnh) nếu doanh thu tải ảnh gốc đáng kể.

### Phương án C — Đổi cách share Drive (nhiều ngày công, đụng vận hành)
Ảnh Drive chuyển sang restricted; mọi ảnh serve qua proxy có token (route stream từ Drive API bằng OAuth studio). **Được:** kín thật sự. **Mất:** đổi quy trình upload/share của studio, tốn băng thông Vercel, risk cao — chỉ đáng nếu doanh thu tải ảnh gốc là nguồn thu quan trọng.

## Vấn đề 2 (MEDIUM): `verifyGalleryPassword` không chống brute-force

### Phương án đề xuất (gọn): đếm attempt theo galleryId trong bảng nhỏ
Bảng `gallery_password_attempts(gallery_id, window_start, fail_count)`; sai >10 lần / 15 phút → trả "Thử lại sau ít phút" (không lộ đúng/sai). Reset khi nhập đúng. ~nửa ngày công gồm migration. Phương án rẻ hơn (delay lũy tiến in-memory) KHÔNG dùng được — serverless không giữ state giữa các invocation.

## Đề xuất tổng: B + bảng attempt. Chờ user chốt từng mục.

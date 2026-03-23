# 💡 BRIEF V2: Quản Lý File Ảnh & Drive (Nâng Cấp)

**Ngày tạo:** 2026-03-22
**Brainstorm từ:** Phân tích app cũ + ShotPik + yêu cầu thực tế studio cưới

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT
- DriveGalleryBlock v1 hiện 1000 ảnh inline → quá dài, contract detail bị phình
- Chỉ có 1 link Drive → thực tế studio cần **3 loại folder** (gốc / đã sửa / chọn in)
- Không có ngày trả file → admin không tracking được deadline
- Không có tracking tiến độ retouch
- Khách không tải ảnh gốc được từ link Mood → phải vào Drive (khách không biết dùng)
- Ảnh RAW + JPG bị hiện trùng (DSC09882.ARW + DSC09882.JPG = 2 entry)

## 2. GIẢI PHÁP ĐỀ XUẤT
Nâng cấp module "Quản lý File ảnh & Drive" hoàn chỉnh — hơn app cũ ở mọi mặt

## 3. ĐỐI TƯỢNG SỬ DỤNG
- **Admin (primary):** Quản lý link Drive, tracking retouch, theo dõi deadline
- **Client (secondary):** Xem gallery, chọn ảnh ❤️, **tải ảnh gốc** trực tiếp

## 4. SO SÁNH VỚI APP CŨ

| # | Tính năng | App cũ | Mood Studio V2 |
|---|-----------|--------|-----------------|
| 1 | Nhập link Drive | 3 link thủ công | **1 link tự tách** (hoặc manual) |
| 2 | Tracking retouch | ❌ | ✅ Auto đếm + progress bar |
| 3 | Ngày trả file | Text thủ công | ✅ Auto từ event "Hậu Kỳ" |
| 4 | Xem ảnh | Mở Drive | ✅ Gallery full page trong app |
| 5 | Khách chọn ảnh | Qua Zalo/gọi điện | ✅ Bấm ❤️ trực tiếp |
| 6 | Khách tải ảnh | Vào Drive tải | ✅ **Tải trực tiếp từ link Mood** |
| 7 | Gộp trùng RAW/JPG | ❌ | ✅ Smart grouping |

## 5. TÍNH NĂNG CHI TIẾT

### 🚀 MVP (Bắt buộc có):

#### A. Admin — "Quản lý File ảnh & Drive" block gọn
- [ ] Giao diện gọn trong contract detail (link + stats, KHÔNG grid ảnh)
- [ ] 3 loại link Drive: Ảnh gốc / Ảnh đã sửa / Ảnh chọn in
- [ ] Hỗ trợ 1 link parent folder → tự tách subfolder (hoặc dán thủ công 3 link)
- [ ] Nút "Sửa" cho từng link

#### B. Admin — Tracking
- [ ] Ngày trả file: lấy tự động từ event `hau_ky` (deadline field)
- [ ] Tracking retouch: so sánh ảnh khách chọn (is_selected) vs ảnh trong folder "đã sửa"
- [ ] Progress bar: "45/120 ảnh (37%)" + "(50 trong gói, 70 sửa thêm)"

#### C. Gallery — Full page view
- [ ] Bấm vào link Drive → mở trang gallery full page `/contracts/[id]/gallery?folder=goc`
- [ ] Grid ảnh responsive (mobile + desktop)
- [ ] Gộp ảnh trùng RAW/JPG: cùng tên file khác extension → hiện 1 entry

#### D. Download — Core feature (QUAN TRỌNG NHẤT)
- [ ] Download 1 ảnh: bấm icon ⬇️ → server proxy từ Drive → file gốc về thiết bị
- [ ] Download nhiều ảnh: chọn ❤️ → "Tải X ảnh" → tải lần lượt với progress bar
- [ ] Download tất cả: nút "Tải tất cả ảnh" → download lần lượt
- [ ] Hoạt động mượt trên iPhone/Android (không cần app Google Drive)
- [ ] Progress: "Đang tải 12/50 ảnh..."

### 🎁 Phase 2 (Làm sau):
- [ ] Cảnh báo deadline (🟢 > 5 ngày, 🟡 3 ngày, 🔴 quá hạn)
- [ ] Tự tính phụ thu ảnh sửa thêm
- [ ] Watermark trên ảnh preview

### 💭 Backlog:
- [ ] Phiếu xuất lab
- [ ] QR code chia sẻ
- [ ] Auto-notify khi retouch xong
- [ ] Sản phẩm ảnh in (bảng sản phẩm từ HĐ)

## 6. DỮ LIỆU ĐÃ CÓ SẴN

### DB tables:
- `galleries` (đã có: id, contract_id, title, access_url, password, status...)
- `gallery_images` (đã có: id, gallery_id, image_url, thumbnail_url, is_selected, client_note...)
- `contract_events` (đã có: event_type = "hau_ky" | "giao_san_pham", deadline field)

### Event types (enum):
- `hau_ky` → "Hậu Kỳ" → dùng lấy ngày trả file
- `giao_san_pham` → "Giao sản phẩm"
- `ngay_chup` → "Ngày chụp"
- `ngay_to_chuc` → "Ngày tổ chức"

### DB cần bổ sung:
- `galleries`: thêm `folder_type` (enum: "goc" | "da_sua" | "chon_in")
- `galleries`: thêm `drive_folder_id`, `drive_folder_url` (đã có trong DESIGN.md)
- `gallery_images`: thêm `drive_file_id`, `file_name` (đã có trong DESIGN.md)
- `gallery_images`: thêm `file_group` (varchar) — tên base file (DSC09882) để gộp RAW/JPG

## 7. RÀNG BUỘC
- Download phải proxy qua server Mood (khách không cần biết Google Drive)
- Gallery phải responsive: mobile-first (khách dùng điện thoại là chính)
- Không tốn storage — ảnh vẫn nằm trên Drive
- API key đã có: `GOOGLE_DRIVE_API_KEY` trong .env.local

## 8. BƯỚC TIẾP THEO
→ `/plan` → Phase-based implementation

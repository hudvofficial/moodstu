# 💡 BRIEF V3: Share Gallery cho Khách (ShotPik-class)

**Ngày tạo:** 2026-03-22
**Từ:** /brainstorm deep audit + ShotPik competitor analysis
**Benchmark:** ShotPik.com — gallery sharing platform cho studio cưới

---

## 1. VẤN ĐỀ CẦN GIẢI QUYẾT

### Pain point chính:
Admin gán link Drive xong → **không thấy link** để gửi khách → khách không xem/chọn ảnh được.

### Vấn đề phụ (từ audit + benchmark):
- Trang public gallery ĐÃ CÓ nhưng thiếu download, stats, category tabs
- Không phân biệt quyền "chọn ảnh" vs "chỉ xem" (ShotPik có 2 link riêng)
- Không có QR code
- Branding yếu
- Không có password protection

## 2. COMPETITOR: ShotPik — Học gì?

### ShotPik làm tốt:
| Feature | Vì sao hay |
|---------|-----------|
| 2 loại link (chọn/xem) | Mẹ chồng xem ≠ cô dâu chọn — phân quyền đúng |
| 2 QR code riêng | Admin in ra, dán lên phong bì hoặc gửi Zalo |
| Stats bar (290 📷 / 114 ❤️) | Trực quan, biết tiến độ chọn ảnh ngay |
| Category tabs ("Tất cả" / "Lễ cưới") | Ảnh nhóm theo sự kiện, dễ tìm |
| Download từ trang khách | Khách tải ảnh trực tiếp |
| Masonry grid | Ảnh dọc/ngang tự xếp đẹp |

### Mood Studio ĐÃ HƠN ShotPik:
| Feature | Mood Studio | ShotPik |
|---------|------------|---------|
| Client note (ghi chú) | ✅ Khách ghi chú từng ảnh | ❌ Không có |
| Selection summary | ✅ Tóm tắt ảnh chọn | ❌ Không có |
| Selection deadline | ✅ DB hỗ trợ | ❌ Không rõ |
| Drive integration | ✅ Ảnh từ Drive trực tiếp | ✅ Upload riêng |

## 3. ĐỐI TƯỢNG SỬ DỤNG

- **Admin (primary):** Share link/QR, xem thống kê khách chọn ảnh
- **Khách chọn ảnh (primary):** Cô dâu/chú rể — xem + chọn ❤️ + ghi chú + tải ảnh
- **Khách xem (secondary):** Họ hàng/bạn bè — chỉ xem album, KHÔNG chọn/tải

## 4. HẠ TẦNG ĐÃ CÓ

| Layer | Status | Chi tiết |
|-------|--------|----------|
| DB: `galleries.access_url` | ✅ | Slug duy nhất auto-gen |
| DB: `galleries.password` | ✅ | Nullable varchar |
| DB: `galleries.status` | ✅ | "shared" = public |
| DB: `gallery_images.is_selected` | ✅ | Toggle ❤️ |
| DB: `gallery_images.client_note` | ✅ | Ghi chú khách |
| Route: `/gallery/[accessUrl]` | ✅ | Public, NO AUTH |
| Component: `PublicGalleryClient` | ✅ | Landing + Grid + ❤️ |
| Component: `ImageViewer` | ✅ | Lightbox + file name |
| Component: `SelectionSummary` | ✅ | Tóm tắt chọn |
| Action: `toggleImageSelection()` | ✅ | Toggle chọn |
| API: `/api/drive-download/[fileId]` | ✅ | Proxy download |

## 5. TÍNH NĂNG

### 🚀 MVP (Bắt buộc — match ShotPik + vượt):

#### A. Admin — Share Modal (🔴 Chưa có — PRIORITY 1)
Giống ShotPik nhưng qua `openModal("SHARE_GALLERY", data)`:
- [ ] 2 loại link: "Khách chọn ảnh" + "Người xem (chỉ xem)"
- [ ] Nút "Sao chép" cho từng link → toast "Đã sao chép!"
- [ ] 2 QR code: QR chọn ảnh + QR xem album
- [ ] Nút "Tải QR (.PNG)" cho từng QR
- [ ] QR có logo Mood Studio ở giữa (đẹp hơn ShotPik)

**Link format:**
```
Chọn ảnh: mood.studio/gallery/[access_url]
Chỉ xem:  mood.studio/gallery/[access_url]?mode=view
```

**DB thêm:**
```
galleries.view_only_url (varchar, nullable) — slug riêng cho view-only
HOẶC dùng query param ?mode=view (đơn giản hơn, không cần thêm column)
```

#### B. Admin — Share trigger trên DriveGalleryBlock (🔴 Chưa có)
- [ ] Mỗi gallery row có nút "📤 Chia sẻ"
- [ ] Toggle ON/OFF "Chia sẻ" (update status: "shared" ↔ "draft")
- [ ] Indicator: 🟢 "Đang chia sẻ" / ⚪ "Chưa chia sẻ"

#### C. Client — Stats Bar (🔴 Chưa có — học ShotPik)
- [ ] Top bar: "📷 290 ảnh | ❤️ 114 đã chọn | 📁 3 nhóm"
- [ ] Sticky header khi scroll
- [ ] Real-time update khi chọn/bỏ ảnh

#### D. Client — Category/Folder Tabs (🔴 Chưa có — học ShotPik)
- [ ] Tabs: "Tất cả" | "Ảnh gốc" | "Ảnh đã sửa" | "Ảnh chọn in"
- [ ] Dùng folder_type từ galleries table
- [ ] Hoặc nếu contract có nhiều gallery → mỗi gallery = 1 tab

#### E. Client — Download ảnh (🔴 Chưa có)
- [ ] Nút ⬇️ trên mỗi ảnh trong grid (proxy qua drive-download API)
- [ ] "Tải ảnh đã chọn (X ảnh)" ở SelectionSummary
- [ ] Progress: "Đang tải 12/50 ảnh..."
- [ ] Chỉ hiện cho link "chọn ảnh", KHÔNG hiện cho link "chỉ xem"

#### F. Client — View-only Mode (🟡 Mới — theo ShotPik)
- [ ] Khi mở với `?mode=view` → ẩn nút ❤️, ẩn ghi chú, ẩn download
- [ ] Chỉ xem ảnh + lightbox — KHÔNG interact
- [ ] Header hiện "Chế độ xem" thay vì "Chọn ảnh yêu thích"

#### G. Client — Password Gate (🟡 DB có, chưa dùng)
- [ ] Nếu `password` != null → hiện form nhập mật khẩu
- [ ] Server-side check (trong getPublicGallery action)
- [ ] Lưu session (localStorage) để không hỏi lại
- [ ] UI: input + "Xem Album" button

### 🎁 Phase 2 (Sau):
- [ ] Contract-level share: 1 link → tất cả gallery của HĐ
- [ ] Masonry grid layout (Pinterest-style, đẹp hơn regular grid)
- [ ] Admin đặt/đổi password từ share modal
- [ ] Thông báo admin khi khách chọn ảnh xong
- [ ] Đếm lượt xem
- [ ] Share qua Web Share API (mobile native share sheet)
- [ ] Watermark trên preview
- [ ] Cảnh báo deadline: "Chọn ảnh trước DD/MM"

### 💭 Backlog:
- [ ] Auto-notify qua Zalo
- [ ] In phiếu xuất lab
- [ ] Email template có branding
- [ ] Sản phẩm ảnh in

## 6. ƯỚC TÍNH

| Feature | Độ phức tạp | Sessions |
|---------|-------------|----------|
| A. Share Modal (2 links + 2 QR) | 🟡 Trung bình | 1 |
| B. Share trigger trên card | 🟢 Dễ | 0.5 |
| C. Stats bar | 🟢 Dễ | 0.5 |
| D. Category tabs | 🟡 Trung bình | 1 |
| E. Download trên public | 🟢 Dễ (API có) | 0.5 |
| F. View-only mode | 🟢 Dễ | 0.5 |
| G. Password gate | 🟡 Trung bình | 0.5 |
| **Tổng** | | **~4 sessions** |

- **Risk:** Low — 90% hạ tầng đã proven
- **QR lib:** `qr-code-styling` (~15KB, client-side, custom logo support)

## 7. USER FLOW

### Admin flow:
```
Card "Quản lý File ảnh & Drive"
→ Gallery row: [📁 Ảnh gốc] [🟢 Đang chia sẻ] [📤 Chia sẻ]
→ Bấm "📤 Chia sẻ" → Modal mở ra
→ 2 link + 2 QR
→ Copy link / tải QR → gửi Zalo cho khách
```

### Client flow (chọn ảnh):
```
Nhận link Zalo → mở browser
→ [Nếu password] → Nhập mật khẩu
→ Landing page cinematic (cover photo + "Xem Album")
→ Stats bar: "290 ảnh | ❤️ 0 đã chọn"
→ Category tabs: [Tất cả] [Lễ cưới] [Tiệc]
→ Grid ảnh → bấm ❤️ → ghi chú
→ Lightbox: xem full + ❤️ + counter "7/290"
→ "Tải ảnh đã chọn (114 ảnh)" ⬇️
```

### Client flow (chỉ xem):
```
Nhận link Zalo (?mode=view) → mở browser
→ Landing page → "Xem Album"
→ Grid ảnh (KHÔNG có ❤️, KHÔNG có download)
→ Lightbox xem full
```

## 8. SO SÁNH SAU KHI XONG

| Feature | ShotPik | Mood Studio V3 |
|---------|---------|----------------|
| 2 loại link | ✅ | ✅ Match |
| 2 QR code | ✅ | ✅ Match + logo |
| Stats bar | ✅ | ✅ Match |
| Category tabs | ✅ | ✅ Match |
| Download | ✅ | ✅ Match |
| Masonry grid | ✅ | 🎁 Phase 2 |
| Client note | ❌ | ✅ **HƠN** |
| Selection summary | ❌ | ✅ **HƠN** |
| Selection deadline | ❌ | ✅ **HƠN** |
| Password protection | ❌ | ✅ **HƠN** |
| QR có logo | ❌ (plain) | ✅ **HƠN** |

## 9. BƯỚC TIẾP THEO
→ `/plan` → Phase-based implementation (4 sessions)

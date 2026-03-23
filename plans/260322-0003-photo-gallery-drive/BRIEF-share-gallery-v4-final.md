# 💡 BRIEF V4 FINAL: Share Gallery cho Khách

**Ngày:** 2026-03-22 | **Từ:** /brainstorm cross-check BRIEF V3 + DESIGN.md + code thực tế
**Benchmark:** ShotPik.com

---

## 📊 CROSS-CHECK: Code ĐÃ CÓ vs CẦN LÀM

### ✅ ĐÃ CODE XONG (không cần động):

| # | Thứ đã có | File | Chi tiết |
|---|-----------|------|----------|
| 1 | Landing page cinematic | `public-gallery-client.tsx:116-196` | Cover blur + title + "Xem Album" + Mood Studio branding |
| 2 | Photo grid responsive | `public-gallery-client.tsx:242-304` | `auto-fill, minmax(140px, 1fr)` + lazy load |
| 3 | ❤️ toggle trên grid | `public-gallery-client.tsx:53-98` | Optimistic update + revert on fail |
| 4 | ❤️ toggle trong lightbox | `image-viewer.tsx` | Counter + file name + ❤️ |
| 5 | Ghi chú khách (client_note) | `public-gallery-client.tsx:100-111` | Save note qua server action |
| 6 | Selection summary bar | `selection-summary.tsx` | Bottom bar "Đã chọn X/Y" |
| 7 | Sticky header + counter | `public-gallery-client.tsx:207-240` | `❤️ 14/111` sticky top |
| 8 | Server actions CRUD | `gallery-actions.ts` | 8 actions: create, get, sync, share, delete, toggle, note |
| 9 | Public route | `app/gallery/[accessUrl]/page.tsx` | NO AUTH, fetch by access_url |
| 10 | Drive sync + re-sync | `gallery-actions.ts:107-141` | So sánh drive_file_id, chỉ INSERT mới |
| 11 | Download proxy API | `app/api/drive-download/[fileId]/route.ts` | Server-side proxy |
| 12 | Share action (status→shared) | `gallery-actions.ts:143-152` | `shareGallery()` update status + shared_at |
| 13 | Admin gallery card | `drive-gallery-block.tsx` | Stats + grid + filter tabs |
| 14 | GlobalModal: DRIVE_LINK | `modal-renderer.tsx` | Đã tích hợp openModal system |

### 🔴 CẦN LÀM MỚI (8 items):

| # | Feature | Mô tả | Ước tính |
|---|---------|-------|----------|
| **A** | **Share Modal** | Modal admin với 2 link + 2 QR code + copy + tải QR | 🟡 1 session |
| **B** | **Nút Share trên card** | Nút "📤 Chia sẻ" + indicator 🟢/⚪ trên DriveGalleryBlock | 🟢 0.5 |
| **C** | **Stats bar (client)** | "📷 290 ảnh • ❤️ 114 đã chọn • 📁 3 nhóm" sticky header nâng cấp | 🟢 0.5 |
| **D** | **Category tabs (client)** | Filter theo folder_type/gallery tabs | 🟡 1 |
| **E** | **Download button (client)** | ⬇️ trên mỗi ảnh + "Tải X ảnh đã chọn" batch | 🟢 0.5 |
| **F** | **View-only mode** | `?mode=view` → ẩn ❤️, download, ghi chú | 🟢 0.5 |
| **G** | **Password gate** | Nếu password != null → form nhập mật khẩu, localStorage session | 🟡 0.5 |
| **H** | **OG meta tags** | og:image, og:title, og:description cho link preview Zalo/Facebook | 🟢 0.3 |

**Tổng ước tính: ~4 sessions**

---

## 🔍 GAP ANALYSIS — Những gì BRIEF V3 CHƯA NÊU hoặc CẦN CẬP NHẬT:

### 🆕 Phát hiện mới từ cross-check code:

| # | Gap | Giải pháp |
|---|-----|-----------|
| 1 | **Header hiện tại đã có counter** `❤️ 14/111` nhưng BRIEF nói "chưa có stats bar" | → Stats bar = **NÂNG CẤP** header hiện có, không tạo mới. Thêm 📷 total + 📁 groups |
| 2 | **SelectionSummary** đã có bottom bar nhưng chưa có download | → Thêm nút "⬇️ Tải ảnh đã chọn" vào SelectionSummary |
| 3 | **shareGallery()** action đã có nhưng **chưa gọi từ UI** | → Feature B: Nút Share gọi shareGallery() + openModal("SHARE_GALLERY") |
| 4 | **access_url** đã được tạo auto trong createGallery() | → Không cần tạo thêm cột view_only_url, dùng `?mode=view` query param |
| 5 | **download proxy** (`/api/drive-download/[fileId]`) đã có | → Feature E chỉ cần thêm UI button, backend có sẵn |
| 6 | **password** column đã có trong DB nhưng `getPublicGallery()` **không check password** | → Feature G: Thêm password check vào getPublicGallery + front-end gate |
| 7 | **Inline `<style>` keyframes** trong public-gallery-client.tsx | → ⚠️ Vi phạm Lesson #82 (transform in keyframes). Cần fix khi touch file này |
| 8 | **page.tsx** cho `/gallery/[accessUrl]` chưa có OG meta dynamic | → Feature H: Thêm `generateMetadata()` export |

### 🔶 Decisions cần anh xác nhận:

| # | Câu hỏi | Option A | Option B | Em suggest |
|---|---------|----------|----------|------------|
| 1 | View-only dùng gì? | `?mode=view` (query param) | Slug riêng `/gallery/[url]/view` | **A** — đơn giản, không thêm column |
| 2 | Category tabs = gì? | Theo `file_group` (ảnh gốc/sửa/in) | Theo từng gallery riêng | **A** — dữ liệu đã có |
| 3 | Download batch = zip? | Tải từng ảnh tuần tự | Zip server-side rồi tải 1 file | **A** — không cần server zip, rẻ hơn |
| 4 | Password session = gì? | localStorage (mỗi browser) | Cookie (server-side) | **A** — đơn giản, client-only |
| 5 | QR code library? | `qr-code-styling` (custom logo) | `qrcode.react` (đơn giản) | **A** — có logo, đẹp hơn ShotPik |

---

## 🎯 USER FLOW ĐẦY ĐỦ (sau khi xong MVP)

### Admin tạo + chia sẻ:
```
Contract Detail → "File & Drive"
→ Dán link Drive → "Đồng bộ" → ảnh hiện ra
→ Bấm "📤 Chia sẻ" trên gallery card
→ Modal Share mở: 2 link + 2 QR
→ Copy link "chọn ảnh" → gửi Zalo cho cô dâu
→ Copy link "chỉ xem" → gửi cho họ hàng
```

### Khách chọn ảnh (link thường):
```
Nhấn link Zalo → browser mở
→ [Nếu có password] → nhập mật khẩu → Submit
→ Landing page (cover blur + "Bé My" + "290 ảnh")
→ Bấm "Xem Album"
→ Stats: "📷 290 | ❤️ 0 đã chọn | 📁 3 nhóm"
→ Tabs: [Tất cả] [Ảnh gốc] [Ảnh đã sửa]
→ Grid ảnh → bấm ❤️ → counter update real-time
→ [Bấm ảnh] → Lightbox: ❤️ + counter "7/290" + file name + ghi chú
→ [Bấm ⬇️ trên ảnh] → tải 1 ảnh
→ Bottom bar: "❤️ 14 đã chọn | [Tải 14 ảnh] [Hoàn tất]"
```

### Người xem (link ?mode=view):
```
Nhấn link Zalo → browser mở
→ [Nếu có password] → nhập mật khẩu
→ Landing page tương tự
→ "Xem Album" → Gallery grid
→ KHÔNG CÓ: ❤️, ghi chú, download
→ Lightbox xem ảnh full → chỉ xem, swipe
→ Header: "Chế độ xem" thay vì counter ❤️
```

---

## 🏆 SO SÁNH CUỐI CÙNG

| Feature | ShotPik | Mood V4 | Ai hơn? |
|---------|---------|---------|---------|
| 2 link (chọn/xem) | ✅ | ✅ | Hòa |
| 2 QR + logo | ✅ plain | ✅ + logo | **MOOD** |
| Stats bar | ✅ | ✅ | Hòa |
| Category tabs | ✅ | ✅ | Hòa |
| Download 1 ảnh | ✅ | ✅ | Hòa |
| Download batch | ✅ | ✅ | Hòa |
| Masonry grid | ✅ | 🎁 P2 | ShotPik* |
| Ghi chú ảnh | ❌ | ✅ | **MOOD** |
| Selection summary | ❌ | ✅ | **MOOD** |
| Selection deadline | ❌ | ✅ | **MOOD** |
| Password protection | ❌ | ✅ | **MOOD** |
| Drive sync (no upload) | ❌ | ✅ | **MOOD** |
| Tích hợp hợp đồng | ❌ | ✅ | **MOOD** |
| OG meta / preview Zalo | ✅ | ✅ | Hòa |
| Chặn right-click | ✅ | 🎁 P2 | ShotPik* |

**Tổng: Mood thắng 7 | Hòa 6 | ShotPik hơn 2 (P2)**

---

## ➡️ BƯỚC TIẾP THEO

```
✅ /brainstorm BRIEF V4 FINAL (đang ở đây)
    ↓
🎨 /visualize → Stitch mockup 3 screens (Gemini Pro High)
    ↓
📋 /plan → Phase-based implementation plan (Opus)
    ↓
💻 /code → 4 sessions (Opus)
```

# HANDOFF — T-20260715-image-viewer-lint — claude → roo

- **Task:** T-20260715-image-viewer-lint
- **Từ → Đến:** claude (review done) → **roo** (verify render)
- **Branch:** `codex/image-viewer-lint`
- **Locks:** `components/gallery/image-viewer.tsx`
- **Ngày:** 2026-07-15

## 1. Đã làm
Codex fix 10 lỗi lint trong `image-viewer.tsx`. Claude review bắt 1 regression (heart mất fill) → Codex đã sửa. Đã pass: `npx eslint` 0 lỗi + `npm run build`.

## 2. Files touched
`components/gallery/image-viewer.tsx` (chỉ 1 file — đúng lock).

## 3. Roo cần verify (render thật — bắt buộc vì có đổi UI)
Mở **gallery public có ảnh** → mở lightbox (ImageViewer). Kiểm **pixel-giống trước khi sửa** + hoạt động:
- [ ] **8 nút** (chọn ảnh CircleCheck, Heart, In, Note, Download, + nút X đóng note + Huỷ/Lưu trong panel note): vị trí/màu/kích thước/hover **y hệt**, click hoạt động.
- [ ] **Heart "đã thích" = ĐỎ ĐẶC** (fill), không phải rỗng ruột. (Màu đỏ giờ là `#f44336` thay `#ff3b30` — lệch tông rất nhẹ, chấp nhận.)
- [ ] Chuyển ảnh (←/→), Download, Print, Note (mở/gõ/auto-save 800ms), long-press download (non-iOS), đóng (X/Esc).
- [ ] **Mở viewer khi `images=[]`** → KHÔNG crash (đây là bug hook đã fix — test kỹ chỗ này).
- [ ] Screenshot @desktop + @768.

## 4. Nếu đạt
Báo Claude → mở PR (CI `quality` chạy lint+build) → merge. Nếu lỗi → handoff trả Codex (ghi triệu chứng + ảnh).

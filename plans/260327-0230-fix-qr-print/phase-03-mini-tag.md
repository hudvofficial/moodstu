# Phase 03: Thu nhỏ nhãn → Mini Tag (3x2cm)
Status: ✅ Complete
Dependencies: Phase 02 (đã xong)

## Vấn đề
- Nhãn hiện tại quá to (280px, full page) — không gắn được vào váy
- Bố cục dọc, nhiều thông tin thừa cho tag treo

## Giải pháp
- Kích thước: **30mm x 20mm** (3x2cm) — mini tag
- Nội dung tối giản: **QR code + mã trang phục** (bỏ tên, size, màu, giá)
- Bố cục: **ngang (landscape)** — QR bên trái, mã bên phải
- QR size: **50px** (vừa đủ scan bằng điện thoại)

## Layout nhãn mới
```
┌──────────────────────┐
│  ╔═══╗               │
│  ║QR ║  VC001        │
│  ╚═══╝               │
└──────────────────────┘
  ~30mm x 20mm
```

## Batch mode (in nhiều)
- Grid 5 cột x nhiều hàng trên A4
- Mỗi tag 30x20mm, gap 2mm
- Fit ~40 tag/trang A4

## Files sửa
- `lib/print-qr-label.ts` — sửa `buildLabelHtml()` + `buildPrintPage()` CSS

## Steps
1. [ ] Sửa `buildLabelHtml()`: bỏ tên/size/màu/giá, chỉ giữ QR + mã, layout ngang
2. [ ] Sửa `buildPrintPage()` CSS: @page 30x20mm, QR 50px, font nhỏ
3. [ ] Sửa batch: grid 5 cột thay vì 2 cột
4. [ ] Test single print → tag nhỏ gọn
5. [ ] Test batch print → nhiều tag trên A4

## Test Criteria
- [ ] Tag in ra vừa 3x2cm
- [ ] QR scan được bằng điện thoại
- [ ] Mã trang phục đọc rõ
- [ ] Batch in nhiều tag trên 1 trang A4

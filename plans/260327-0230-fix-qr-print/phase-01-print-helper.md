# Phase 01: Tạo helper `printDressLabel()`
Status: ✅ Complete
Dependencies: None

## Objective
Tạo utility function mở popup window chứa nhãn QR, tự động in và đóng.
Port pattern V1 (`QRCodeLabel.tsx`) sang V2, cải tiến dùng canvas `toDataURL()`.

## V1 Pattern (Reference)
```
1. window.open("", "_blank")
2. document.write(HTML nhãn: tên, mã, QR, size/màu/giá)
3. Copy SVG QR từ window.opener
4. setTimeout(() => window.print(), 500)
```

## V2 Cải tiến
- V1 dùng `window.opener.document.getElementById()` để copy SVG → **brittle** (phụ thuộc vào DOM gốc)
- V2: Trước khi mở popup, lấy QR image từ canvas `.toDataURL()` → nhúng `<img>` trực tiếp → **self-contained**
- Fallback: Nếu không có canvas (QR chưa render), chỉ in nhãn text (tên, mã, size, màu, giá) — vẫn hữu ích

## Implementation Steps
1. [ ] Tạo file `lib/print-qr-label.ts`
2. [ ] Export function `printDressLabel(dress: DressItem, qrDataUrl?: string)`
3. [ ] Function mở popup window → ghi HTML nhãn → auto print → auto close
4. [ ] Layout nhãn giống V1: tên (h2) → mã (h3) → QR image → size/màu/giá
5. [ ] Escape HTML để chống XSS (port `escapeHtml()` từ V1)

## Files to Create
- `lib/print-qr-label.ts` — helper function duy nhất

## Test Criteria
- [ ] Gọi `printDressLabel(dress)` → mở popup → hiện nhãn → in → đóng
- [ ] Nhãn hiện: tên, mã, QR image, size, màu, giá
- [ ] Không có lỗi console

---
Next Phase: phase-02-integrate-cleanup.md

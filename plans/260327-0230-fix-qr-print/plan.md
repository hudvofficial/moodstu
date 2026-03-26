# Plan: Fix "In nhãn QR" — Trắng trang khi in
Created: 2026-03-27T02:30
Status: 🟡 In Progress

## Overview
Nút "In nhãn QR" trong modal sửa trang phục và modal QR batch bấm ra trắng trang.
Nguyên nhân: `window.print()` gọi trong Modal Portal → CSS `@media print` không ẩn/hiện đúng DOM.
Giải pháp: Port lại pattern V1 (Popup Window Print).

## Root Cause
- V2 dùng `window.print()` trực tiếp + CSS `@media print` trick
- Modal render qua `createPortal(children, document.body)` (ModalPortal)
- CSS `body * { visibility: hidden }` ẩn cả Portal container → QR bị mất

## V1 Reference
- File: `C:\Users\Admin\Desktop\Ai\0Moodstudio\webapp\components\dresses\QRCodeLabel.tsx`
- Pattern: `window.open()` → `document.write(HTML)` → copy SVG QR → `window.print()` → tự đóng

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Tạo helper `printDressLabel()` | ✅ Complete | 100% |
| 02 | Tích hợp + Cleanup | ✅ Complete | 100% |
| 03 | Thu nhỏ nhãn → Mini Tag 3x2cm | ⬜ Pending | 0% |

## Files ảnh hưởng
- `lib/print-qr-label.ts` — **MỚI** helper function
- `components/dresses/dress-form-modal.tsx` — thay `window.print()` → gọi helper
- `components/dresses/dress-qr-modal.tsx` — thay `window.print()` → gọi helper

## Quick Commands
- Start: `/code phase-01`
- Check: `/next`

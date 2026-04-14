# Phase 03: Full Page Details & Print
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Triển khai giao diện tĩnh Detail view (Theo concept Clean UI Tech) + Môi trường xuất In mẫu 01-tt cho kế toán. Mượn lại giải thuật `readMoney` từ legacy V1 và tái kiến trúc CSS @print.

## Requirements
### Functional
- [ ] G3: Định tuyến URL: `/finance/receipts/[id]` dẫn vào Server Component nhận Param ID, lấy receipt + join info. Render Card Layout chi tiết + Toolbar In, Sửa.
- [ ] G4: Sinh Document Route `/finance/receipts/[id]/print?isExportMode=true`. Server Component Render layout A5 landscape 01-tt.
- [ ] Format Data: Kéo script `readMoney.ts` port vào dự án thành global utils.

### Non-Functional
- [ ] Print Optimization: `window.print()` behavior native, CSS xoá mọi box-shadow, padding rườm rà. Dùng typography đơn nguyên `inter` hoặc tĩnh. Không Loaders / Hydration FOUC.
- [ ] Aesthetics: Apple HIG + V2 SSOT Colors (`.text-text-main`, `.bg-primary`). Phân khu Data Card rõ ràng.

## Implementation Steps
1. [ ] Step 1 - Port thuật toán `lib/utils/readMoney.ts`.
2. [ ] Step 2 - Khởi tạo Folder page: `app/(protected)/finance/receipts/[id]/page.tsx`. Gọi db `single()` receipt ID. Render HTML Structure Card.
3. [ ] Step 3 - Khởi tạo Print Server View: `app/(protected)/finance/receipts/[id]/print/page.tsx` + `PrintActions.tsx`.
4. [ ] Step 4 - Bơm Print Header (mộc Mood Studio config) & Signatures Placeholder.
5. [ ] Step 5 - Sửa Layout Sidebar/Desktop Toolbar không đè giao diện Window Print của trình duyệt (Dùng class CSS `print:hidden`).

## Files to Create/Modify
- `lib/utils/readMoney.ts` (NEW)
- `app/(protected)/finance/receipts/[id]/page.tsx` (NEW)
- `app/(protected)/finance/receipts/[id]/PrintActions.tsx` (NEW)
- `app/(protected)/finance/receipts/[id]/print/page.tsx` (NEW)

## Test Criteria
- [ ] Truy xuất Link ID `/finance/receipts/XXX` hiển thị đầy đủ data. Header có nút XUẤT PHIẾU/IN.
- [ ] Text 5,000,000 dịch ra trơn tru thành "Năm triệu đồng chẵn" bằng chữ nghiêng (italic).
- [ ] Bấm IN -> Trình duyệt bật Modal -> Layout A5 (Ngang 2 nửa Hóa đơn, hoặc dọc nguyên khối) fit 100% giấy in kẹp mộc. Cắt Sidebar đen và Topbar chuẩn xác.

---
Next Phase: N/A - Deployment/QA

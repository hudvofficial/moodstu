# Phase 03: Thiết lập Dedicated Print Route
Status: ✅ Complete
Dependencies: Phase 01, 02

## Objective
Cách ly độc lập layout In Ấn sang route mới không lo bị CSS hay Modal chồng chéo.

## Requirements
- Dây chuyền bấm nút `Printer` (In) -> nhảy ra thẻ Browser mới, auto trigger In.

## Implementation Steps
1. [x] Đổi tên/Tái cấu trúc thư mục chứa file In: `app/(protected)/finance/receipts/[id]/print/page.tsx`
2. [x] Xóa `app/(protected)/finance/receipts/[id]/page.tsx` cũ.
3. [x] Cập nhật link Nút In sang đường dẫn `/print` dạng `target="_blank"`.

## Files to Create/Modify
- `app/(protected)/finance/receipts/[id]/print/page.tsx` - [NEW] Route chuyên biệt
- `app/(protected)/finance/receipts/[id]/page.tsx` - [DELETE]
- `components/finance/receipts/receipt-row-actions.tsx` - [MODIFY]

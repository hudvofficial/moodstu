# Phase 01: Bóc tách UI sang Component Mới
Status: ✅ Complete
Dependencies: None

## Objective
Tách toàn bộ giao diện "Bản thể Phiếu Thu" (đã xây dựng trong phiên trước) vứt vào trong lõi Component `<ReceiptDetailModal>` dùng `UnifiedModal`.

## Requirements
- Chuyển được CSS Tailwind của phiếu thu A5 ngang sang Component mới.
- Hỗ trợ Loading Skeleton State trong lúc fetch data.
- Fetch Data: Chuyển logic `getReceiptDetail` và `getStudioInfo` từ Server Page vào Client Modal.

## Implementation Steps
1. [x] Tạo file `components/finance/receipts/receipt-detail-modal.tsx`.
2. [x] Thiết kế `UnifiedModal size="md"` chứa CSS A5 Layout cũ.
3. [x] Xử lý luồng async Data dùng Server Action khi `isOpen=true`.

## Files to Create/Modify
- `components/finance/receipts/receipt-detail-modal.tsx` - [NEW] UI Phiếu Thu

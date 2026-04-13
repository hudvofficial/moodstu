# Phase 02: Refactor Receipts & Expenses
Status: ✅ Complete

## Objective
Áp dụng đúng SSOT token (Design System v2) cho Receipt và Expense components đang phân mảnh Desktop / Mobile. Hủy bỏ mọi inline font weight để Text trơn tru từ Mobile lên PC mà không bị khập khiễng sai tỉ lệ.

## Implementation Steps
1. [x] Sửa file `components/finance/receipts/receipt-mobile-list.tsx`: 
    - Bỏ `font-semibold text-text-primary` thay chiều bằng `.text-label`.
    - Số tiền: Bỏ `tabular-nums font-bold text-success` dùng class `.text-amount text-success`. (Text amount đã có tabular nums và weight trong global). 
2. [x] Sửa file `components/finance/receipts/receipt-desktop-table.tsx`:
    - Cho phép đồng bộ tương tự mobile: Số tiền dùng `.text-amount`. Tên hạng mục / thẻ loại dùng `.text-label` và `.text-caption`.
3. [x] Lặp lại quá trình trên cho `expense-mobile-list.tsx` và `expense-desktop-table.tsx` (kiểm tra text-error thay cho text-success nếu là số tiền âm, nhưng cơ bản dùng `text-amount`).

## Files to Modify
- `components/finance/receipts/receipt-mobile-list.tsx`
- `components/finance/receipts/receipt-desktop-table.tsx`
- `components/finance/expenses/expense-mobile-list.tsx`
- `components/finance/expenses/expense-desktop-table.tsx`

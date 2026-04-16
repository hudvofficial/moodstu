# Phase 06: UI Refinements

## 1. Print Expense Client Fixes
- [x] `components/finance/expenses/print-expense-client.tsx`
- [x] Xóa global rule: `body > *:not(#print-container) { display: none !important; }`
- [x] Hủy ẩn Next root/global body children ở chế độ không phải in (screen mode).
- [x] Áp dụng print styling bám theo Receipt (style block `.print-sheet` / `#print-container` chạy `@media print`), để trang không hiển thị blank page cho user trên Desktop.

## 2. Desktop Table Layout Sync
- [x] `components/finance/expenses/expense-desktop-table.tsx`
- [x] Action `<TH>` update: Thêm thẻ `<TH className="text-right w-56">Thao tác</TH>`.
- [x] Action `<TD>` cell update: Dùng `<TD className="text-right w-56">`.
- [x] Wrapper action column: Bọc lại với `<div className="flex items-center justify-end gap-1.5 min-w-max">`.
- [x] Gỡ các class tuỳ biến dư thừa, tái sử dụng hoàn toàn chuẩn `btn-icon` từ Design System.

## 3. Verify
- [x] Run `npx tsc --noEmit --incremental false --pretty false`
- [x] Run `npx eslint ... --max-warnings=0`

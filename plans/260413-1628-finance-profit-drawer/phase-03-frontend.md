# Phase 03: Frontend UI - Table & Mobile Mode
Status: ⬜ Pending
Dependencies: phase-02-backend.md

## Objective
Nâng cấp giao diện List hiển thị trên cả 2 mode (Desktop/Mobile), vá lại hạt sạn "Discount" của V1 giúp người dùng không cảm thấy cấn khi Lợi nhuận không bằng (Tổng thu - Chi Phí).

## Implementation Steps
1. [ ] Cập nhật Desktop Table:
   - Thêm cột `DT Gói`, `DT P.Sinh`. Cột `Tổng DT` sẽ show bằng giá trị `thực thu` (sau khi đã trừ Discount). Hover vào `Tổng DT` có thể nháy ra hint giảm giá nếu có.
   - Gắn View Cột Margin với thanh biểu đồ Progress.
2. [ ] Gắn sự kiện Row Click `onClick`:
   - Setup state mở `ContractProfitDetailDrawer` thông qua URL params hoặc state, truyền vào Context/Id Hợp Đồng.
3. [ ] Viết lại UI Mobile Card List chuyên dụng:
   - Thay vì bảng ép ngang, render dạng danh sách Card biên lai (V1 Card Mode) với Tổng Thu, Lợi Nhuận, Tỷ Suất rút gọn cực gắt.

## Files to Create/Modify
- `components/finance/dashboard/profit-report-table.tsx`

---
Next Phase: phase-04-frontend.md

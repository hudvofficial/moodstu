# Phase 04: Frontend UI - Detail Drawer
Status: ⬜ Pending
Dependencies: phase-03-frontend.md

## Objective
Xây dựng ngăn kéo siêu chi tiết (Drawer), Lazy Load theo từng Hợp Đồng để xem tường tận Profit Margin.

## Implementation Steps
1. [ ] Tạo Component `ContractProfitDetailDrawer.tsx` (dùng UI Drawer V2 thay cho Modal V1).
2. [ ] Call Fetcher `useSWR(contractId, getContractDetails)`. Tạo bộ Skeleton khung cho 4 Block.
3. [ ] Ráp 4 Block tài chính:
   - **Block Thu (Xanh)**: Danh sách DV. Cuối block thêm Breakdown:
     - `├ Gói dịch vụ`
     - `├ Phát sinh (n)`
     - `├ Giảm giá / Khuyến mãi:` (Hiển thị đỏ / âm nếu có)
     - `= Tổng Thực Thu`
   - **Block Lương (Cam)**: Danh sách người phụ trách + Cost.
   - **Block In ấn (Tím)**: List in ấn + Cost.
   - **Block Vận hành (Đỏ)**: Operational expense phi-in-ấn.
4. [ ] Cập nhật Header Drawer: Khách hàng, Ngân sách (Thực Thu), Trạng Thái, % Margin màu linh động.

## Files to Create/Modify
- `components/finance/dashboard/contract-profit-detail-drawer.tsx`
- `components/finance/dashboard/profit-report-table.tsx` (Import drawer vào)

---
Next Phase: Finish🏁

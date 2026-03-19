# Phase 02: Dựng Design UI Desktop / Tablet
Status: ⬜ Pending
Dependencies: Bám sát Design Stitch Management Dashboard

## Objective
Chuyển hóa 100% bản vẽ Desktop/Tablet Stitch ra giao diện Tailwind CSS chuẩn. Các components chỉ cắm data giả (Mock) trước.

## Requirements
### Functional
- [ ] Responsive grid: 4 columns cho 4 thể lọa KPI (Doanh thu, HĐ, Nợ, Hoàn thành).
- [ ] Widget Doanh Thu (Biểu đồ Đường).
- [ ] Widget Loại Dịch Vụ (Pie Chart).
- [ ] Danh sách "Hợp Đồng Sắp Chụp".
- [ ] Danh sách "Cần Thu Tiền".

### Design System (Apple HIG + Earth-tone)
- [ ] Góc bo `rounded-2xl` hoặc `rounded-[16px]` cho Card lớn.
- [ ] Dùng `shadow-sm` tĩnh và `hover:shadow-md` cho sự mượt mà.
- [ ] Text chính Inter `text-h3` hoặc `text-body`.
- [ ] Skeleton loaders cho Dashboard.

## Implementation Steps
1. [ ] Grid layout nền (Main Dashboard layout container).
2. [ ] Tạo Component `KPI_Card` (số liệu, màu đỏ/xanh tuỳ % tăng/giảm).
3. [ ] Tạo Component `Widget_Chart` (Khung vỏ).
4. [ ] Tạo Component `List_Event` và `List_Payment_Remind`.

## Files to Create/Modify
- `app/(protected)/dashboard/page.tsx` - Layout tổng.
- `app/components/dashboard/kpi-card.tsx`
- `app/components/dashboard/widget-container.tsx`

---
Next Phase: [Phase 03](phase-03-ui-mobile.md)

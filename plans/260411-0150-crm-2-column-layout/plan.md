# CRM Dashboard Optimization: 2-Column Layout

## Mục tiêu (Objective)
Cấu trúc lại giao diện CRM (Leads + Customers) theo chuẩn "Gold Standard" lấy cảm hứng từ Apple HIG và giao diện Stripe. Chuyển đổi từ mô hình "Danh sách dữ liệu dạng Bảng (Table)" sang mô hình "Dashboard Quản trị dạng Thẻ (Cards)" với bố cục 2 cột.

## Vấn đề hiện tại
- Trang CRM dàn 1 cột trải ngang theo diện tích Table (8 cột), lãng phí độ rộng màn hình 1440px.
- LeadAnalytics và các Widget hiện tại bị ép nằm trên/dưới bảng, đẩy nội dung xuống sâu gây cuộn trang nhiều.
- Các công cụ không có sự ưu tiên rõ ràng (CTA, Upcoming) khiến UX "phẳng".

## Giải pháp: Bố cục 2 cột (Tỷ lệ 8-4)
- **Cột Trái (8/12):** Chứa danh sách dữ liệu hiển thị dạng "Compact Card" gọn gàng thay cho Table.
- **Cột Phải (4/12):** Chứa các Widgets tĩnh được `sticky` lại để luôn xuất hiện khi cuộn danh sách khách hàng.
- Khi chuyển sang view Kanban Board, tự động thu gọn/ẩn Widget để trả diện tích cho bảng kéo thả.

---

## Các Phase Thực thi

### 🛠️ Phase 1: Xây dựng Nền tảng (Foundation) & Widgets
- CRM V2: Gold Standard 2-Column Dashboard Layout
**Status:** Completed
**Date:** 2026-04-10
- Xây dựng `<CrmDashboardLayout />`: Tạo Grid Layout wrapper tự động phản hồi (1 cột mobile, 2 cột desktop).
- Xây dựng `<WidgetCTA />`: Card tối màu kích thích hành động (ví dụ: Chăm sóc KH đang nguội).
- Xây dựng `<WidgetUpcoming />`: Khối hiển thị mini-list nhắc lịch trong 7 ngày.
- Chia tách `LeadAnalytics` thành `<WidgetSourceDonut />` độc lập.

### 👥 Phase 2: CRM Leads Migration
- Nhúng `<CrmDashboardLayout>` vào `app/(protected)/crm/leads/client-page.tsx`.
- Viết `<LeadCompactCard />` thu gọn thông tin 8 cột xuống 2 dòng (Tên khách + Nhu cầu/Nguồn/Trạng thái).
- Mapping data `<LeadCompactCard />` thay vì xuất ra `<LeadTable />`.
- Xử lý logic Ẩn Widgets khi user nằm ở View="Board".

### 🤝 Phase 3: CRM Customers Migration
- Nhúng `<CrmDashboardLayout>` vào `app/(protected)/crm/customers/client-page.tsx`.
- Viết `<CustomerCompactCard />` thu gọn thông tin hiển thị giá trị Hợp đồng + Tiến độ thu tiền.
- Mapping data `<CustomerCompactCard />` thay vì xuất ra `<CustomerTable />`.
- Copy logic Ẩn Widgets khi view ở dạng "Kanban".

### 🧹 Phase 4: Verification & Cleanup
- Xóa bỏ các Component cũ: `<LeadTable>`, `<CustomerTable>`, `<LeadAnalytics>`.
- Audit trên UI Mobile đảm bảo không bị lỗi tràn ngang và Widgets đẩy xuống đáy an toàn.
- Audit Desktop 1440px đảm bảo Cột phải Scroll dính (`sticky`) hoàn hảo và không bị chồng lấp Footer/Header.

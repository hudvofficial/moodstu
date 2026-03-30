# 📋 Thông số kỹ thuật (Specs): Module Services V2

## 1. Tổng quan
Module Services là trung tâm quản lý danh mục và các gói dịch vụ, sản phẩm studio, kịch bản báo giá (Quote Builder), bundle sản phẩm. Đảm bảo chuyển đổi từ kiến trúc V1 sang V2 theo tiêu chuẩn Gold Standard, tận dụng tối đa UI Registry Codebase hiện có (Shared Components).

## 2. Các Features Chính (Feature Parity với V1)
Dựa trên V1 (`ServiceManagement.tsx`), V2 đảm bảo duy trì:
- **Stats Strip**: Hiển thị tổng quan các thẻ thống kê ngang (Tổng số gói, Giá MB, Giá cao nhất, Giá thấp nhất).
- **Filter Bar**: Lọc dữ liệu theo Danh mục (Categories) linh hoạt theo dạng thanh ngang có thể kéo (scrollable).
- **View Toggles**: Nút chuyển đổi (Toggle) giữa 2 mode hiển thị:
  - Xem danh sách chi tiết (List View).
  - Xem dạng thẻ lưới (Grid View).
- **Settings Managers**: Popup cài đặt danh mục (Category Manager) và quy tắc (Rule Manager).
- **Responsive Table Data**: Bảng dịch vụ tùy biến Responsive dựa trên màn hình Mobile/Desktop, khác hẳn table cũ.
- **Quote Modal**: Trải nghiệm xây dựng và xem trước bảng báo giá.

## 3. Tiêu chuẩn SSOT UI (Gold Standard)
- **Thiết kế chủ đạo Apple HIG + Stripe Design**: Sạch sẽ (Clean UI), shadow mềm, nền tách biệt rõ ràng, phân vùng khoảng trắng (margins) cực kỳ tiêu chuẩn.
- **Table Registry**: KHÔNG code lại thẻ HTML bảng tĩnh (`<table>`).
  - Import và xử lý trực tiếp từ Registry: `@/components/ui/table.tsx`.
  - Giữ class màu header theo file cấu hình chung: `bg-bg-sidebar` (mã `#f5efe6`).
  - Đảm bảo header Sticky cho khả năng đọc lâu dài.

## 4. Phân rã Component Layout (Component Tree)
```text
app/(dashboard)/services/
├── page.tsx                           // Server Component (Renders Shell/Suspense Skeleton UI)
├── _components/
│   ├── services-client.tsx            // Client Component - React Query fetching + Data Pass down
│   ├── service-management.tsx         // State Manager (Filter status, View Mode trạng thái, Control Modals)
│   ├── service-table.tsx              // Desktop List Component (sử dụng shared/registry Table)
│   ├── service-mobile-list.tsx        // Mobile List Component
│   ├── service-grid.tsx               // Grid View dạng Card lưới
│   ├── service-stats-strip.tsx        // Rendering UI thống kê (4 thẻ nổi)
│   ├── service-filter-bar.tsx         // Thanh trạng thái filter kèm View Toggles
│   └── modals/
│       ├── quote-modal.tsx            // Modal xem/báo giá gói dịch vụ
│       └── category-manager.tsx       // Quản lý và edit danh mục
```

## 5. Kiến trúc Data / State Handling
- Sử dụng `@tanstack/react-query` trong client module qua Supabase DB request để lấy dữ liệu.
- Server Component chỉ đóng vai trò chứa Suspense shell/skeleton loading layout ban đầu.
- Client Component nạp trực tiếp dữ liệu từ backend bằng Supabase (Client-side RLS enforced 100%).
- **Staleness Handling**: Invalid queries `serviceKeys.all` ngay lập tức mỗi khi user Mutate thêm/sửa/xóa xong.

## 6. Logic Responsive (Mobile vs Desktop)
- Ở Mobile (màn width < 1024px): 
  - Ẩn dạng List Table dàn ngang.
  - Hiển thị theo dạng Card chồng nhau dọc xuống (List Mobile layout). Component UI bám sát vùng "safe-area".
- Ở Desktop (width >= 1024px): 
  - Render theo cấu trúc lưới hệ điều hành macOS app, Desktop layout dạng Grid 12 cột.
  - Dạng Table UI xuất hiện đầy đủ hàng, cột, bao gồm thao tác trỏ Hover table row rõ ràng.

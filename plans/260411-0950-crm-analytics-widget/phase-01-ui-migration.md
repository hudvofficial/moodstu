# Phase 01: UI Layout Migration & Refactor
Status: ✅ Complete
Dependencies: None

## Objective
Tách biểu đồ Phễu chuyển đổi ra khỏi Modal/Toggle ẩn và đưa lên layout Sidebar chính để người dùng theo dõi dữ liệu realtime. Khắc phục lỗi Build TypeScript NotFound do người dùng vô tình xóa file gốc `lead-analytics.tsx`.

## Requirements
### Functional
- [x] Tạo `WidgetSalesFunnel` chứa logic tính toán Phễu chuyển đổi (Cumulative Count & Conversion Rate).
- [x] Loại bỏ nút "Phân tích" khỏi thanh công cụ `LeadListPage`.
- [x] Integrate `WidgetSalesFunnel` vào chung hàng chờ `widgetsContent` bên cạnh `WidgetSourceDonut`.

### Non-Functional
- [x] Typescript Type-safety (`tsc --noEmit` phải passed 0 lỗi).

## Implementation Steps
1. [x] Khôi phục logic SVG và Cumulative Pipeline từ file cũ.
2. [x] Xóa state `showAnalytics` và Event Handlers liên quan trong `lead-list-page.tsx`.
3. [x] Clean up code rác `tmp_patch.js`.

## Files to Create/Modify
- `components/crm/widgets/widget-sales-funnel.tsx` - [NEW] Khởi tạo component.
- `components/crm/lead-list-page.tsx` - [MODIFY] Tháo code cũ, gắn widget mới.

## Test Criteria
- [x] Giao diện không bị lỗi Hydration.
- [x] Build Next.js Production qua 100% check.

---
Next Phase: Không có. Feature hoàn tất.

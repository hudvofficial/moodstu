# Phase 01: CRM Dashboard Layout Fix
Status: ⬜ Pending

## Objective
Sửa lỗi xung đột Flexbox dẫn đến sập layout (collapse height về 0) trên chế độ màn hình nhỏ (flex-col).

## Requirements
### Functional
- [ ] Màn hình Desktop (lg: >= 1024px): Layout chia 2 cột tĩnh (Main Content giãn tự động, Sidebar fix 340px).
- [ ] Màn hình Mobile/Tablet (lg: < 1024px): Layout stack dọc (flex-col), Main Content tự động dãn theo content (không bị bóp height thành 0), Sidebar trượt xuống cuối.

## Implementation Steps
1. [ ] Sửa file `components/crm/crm-dashboard-layout.tsx` - Điều chỉnh CSS module của container chứa children. Thay thế class `flex-1 min-w-0` bằng tổ hợp class phù hợp cho cả 2 view (`w-full lg:w-auto lg:flex-1 lg:min-w-0`).
2. [ ] Audit thêm wrapper của `hidden lg:flex` bên trong `lead-list-page.tsx` và `customer-list-page.tsx` để đảm bảo chúng không thiết lập `width` hoặc `flex` sai lệch làm ảnh hưởng phần block bên trong.

## Files to Modify
- `components/crm/crm-dashboard-layout.tsx` - Khắc phục layout wrapper.

## Test Criteria
- [ ] Co nhỏ (resize) màn hình trình duyệt xuống thành cửa sổ ngang ~800px. Lúc này danh sách Lead phải hiện rõ list dọc bình thường, không bị tàng hình.
- [ ] Check Desktop full-screen: Danh sách Lead ở bên trái, Lịch + Widget ở bên phải.

---
Next Phase: [Phase 02](phase-02-compact-card-safety.md)

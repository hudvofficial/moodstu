# Phase 03: Customer Drawer Component
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Xây dựng ngăn kéo chi tiết (Drawer) xuất hiện từ lề phải khi click vào một dòng khách hàng, hiển thị toàn bộ thông tin chi tiết.

## Requirements
### Functional
- [ ] Header Drawer: Tên, Mã KH, Status Badge, Nút Action (Sửa, Thêm Hợp đồng).
- [ ] Content Tab 1 (Thông tin chung): Hiển thị chi tiết SĐT, Email, DOB, Cưới hỏi (Dâu/Rể), Ghi chú.
- [ ] Responsive: Full width trên mobile, Drawer width cố định trên Desktop.

### Non-Functional
- [ ] Pattern: Sử dụng UI Component `Drawer` hoặc `Sheet` (shadcn) giống `ContractDrawer`.
- [ ] Skeleton loading: Không cần thiết nếu pass dữ liệu trực tiếp, nhưng cần handle trường hợp data bị null.

## Implementation Steps
1. [ ] Implement `CustomerDrawer` component nhận prop `customer` và `isOpen`, `onClose`.
2. [ ] Thiết kế Header với Avatar lớn, Tên, Mã.
3. [ ] Bố cục lưới (Grid) hiển thị các thông tin chi tiết.
4. [ ] Thêm nút Edit để gọi lên modal Edit hiện có.

## Files to Create/Modify
- `components/crm/customer-drawer.tsx` - File component chi tiết khách hàng.

---
Next Phase: Phase 04 - Integration

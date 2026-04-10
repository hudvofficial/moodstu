# Phase 03: UI Cards Visual Optimization (Gold Standard Alignment)
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
# Phase 03: UI Card Visual Optimization (Mobile)

## Mục tiêu
*   Đồng bộ giao diện Card (Lead, Customer) trên mobile với `PrintingCard` (Gold Standard).
*   Tối ưu không gian hiển thị, loại bỏ các thành phần rác (redundant avatar, nền footer).
*   Áp dụng `@theme` tokens chuẩn.

## File cần sửa:
1.  `components/crm/lead-card.tsx`
2.  `components/crm/customer-card.tsx`

## Chi tiết công việc:

### 1. `components/crm/lead-card.tsx`
- [x] Sửa layout thành `flex-col gap-2.5` thay vì `gap-3`.
- [x] Xóa thẻ Avatar lớn (có text Initials) khỏi Top Row, để thông tin Contact Name được gọn hơn.
- [x] Đưa Contact Name, Status Badge và Potential Badge lên cùng 1 hàng đầu tiên.
- [x] Ghép Phone (Lucide: Phone), Ngày tạo (CalendarClock), Source (Building2) thành 1 row nhỏ gọn phía dưới Name với màu `text-text-muted`.
- [x] Tách riêng phần Deal Value và Chevron sang bên tay phải ngang hàng với tên.

### 2. `components/crm/customer-card.tsx`
- [x] Tương tự LeadCard, gom nhóm Phone (Lucide: Phone) và Ngày Cưới (CalendarPlus) thành 1 block nằm cùng hàng, ẩn bớt text nếu không có.
- [x] Xóa toàn bộ background màu (bg-bg-base, bg-bg-muted) và shadow trong khu vực hiển thị Metadata (Source, Email, Group/User liên kết). Đổi sang format `icon + text` đơn thuần.
- [x] Giảm khoảng cách phần Tags, cho phép `line-clamp-1` (tối đa hiển thị 1 dòng trên mobile).
- [x] Hợp nhất toàn bộ spacing chuẩn: `gap-x-3`, `gap-y-1.5`.

## Xác nhận (GATE):
- [x] Chạy server dev.
- [x] Mở bằng Inspect -> Mobile view (iPhone).
- [x] Chụp UI Lead Card / Customer Card, so sánh với Printing Card. Nếu sai lệch Layout thì sửa lại.
- [x] Các Icon phải cùng Size (h-3.5 w-3.5) và Color (text-text-muted). Mọi link click (như SĐT) không gây redirect trang chính.

## Test Criteria
- [ ] UI trên mobile không vỡ layout khi nội dung dài ở cả màn hình Leads và Customers.
- [ ] Cards đã đồng dạng thị giác hoàn toàn với Printing Card về bố cục và mật độ.
- [ ] Trigger click (`onClick`) vẫn hoạt động.

---
Next Action: Sử dụng `/code phase-03` để tiến hành sửa code.

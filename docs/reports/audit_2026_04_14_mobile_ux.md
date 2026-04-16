# Audit Report - Tối ưu hóa UI/UX Mobile (Finance Receipts)

**Ngày tạo:** 2026-04-14
**Mục tiêu:** Rà soát và giải quyết dứt điểm các lỗi giao diện, UX gây khó chịu trên nền tảng điện thoại (Mobile) của phân hệ phiếu thu.

## 🔴 Critical Issues (UX Nghiêm trọng - Cần sửa ngay)

### 1. Nút FAB dấu (+) che khuất dòng cuối cùng của danh sách
- **File:** `components/finance/receipts/receipt-mobile-list.tsx` & `components/layout/app-shell.tsx`
- **Tình trạng:** Khung chứa danh sách (wrapper) hiện tại trên mobile chỉ khai báo `space-y-3`. Trong khi đó, component `FinanceFAB` được đặt cố định (fixed) tại tọa độ `bottom-24`. Khi cuộn thẻ xuống dưới cùng, nút FAB chắc chắn đè lên dữ liệu.
- **Giải pháp:** Bổ sung padding-bottom lớn (`pb-28` hoặc `pb-32`) vào container cuối cùng của danh sách mobile để đảm bảo chừa ra "khoảng thở" cho nút FAB.

### 2. Dòng thẻ Mobile bị nhồi nhét quá nhiều nút hành động
- **File:** `components/finance/receipts/receipt-row-actions.tsx`
- **Tình trạng:** Giao diện mobile Card đang hiển thị tới 5 icon hành động trên cùng 1 hàng ngang (Xem, QR, In, Sửa, Xóa). Việc này phá vỡ tỷ lệ thẻ (aspect ratio), làm nội dung "Ghi chú" bị đẩy lùi vào góc và bị cắt cụt (`truncate`). Đặc biệt, ngón tay rất dễ bấm nhầm giữa các nút vì quá sát nhau (fat-finger syndrome).
- **Giải pháp:** Loại bỏ hoàn toàn khối 5 nút này ra khỏi mặt tiền thẻ. Áp dụng chuẩn **Apple HIG (Swipe-to-action)** bằng cách tích hợp trực tiếp component có sẵn của hệ thống: `SwipeableCard` (`components/ui/swipeable-card.tsx`).
  - Thao tác: Vuốt sang trái thẻ để lộ ra nút màu vàng (Sửa) và đỏ (Xóa). 
  - Nút Mở rộng (3 chấm) hoặc Vuốt sang phải cho Xem/In/QR.

## 🟡 Warnings (Thiếu đồng bộ UI)

### 3. Font size và Spacing
- **Tình trạng:** Số tiền `5.500.000đ` đang dùng class `text-amount` (có thể quá to hoặc khác font), chưa kết hợp mượt với các thông tin nhãn. CSS Padding `p-5` của thẻ gốc làm tốn diện tích màn hình Mobile.
- **Giải pháp:** Cấu trúc lại Padding về `p-4`, sử dụng size tiêu chuẩn của Apple HIG cho heading số tiền.

-----

## Kế hoạch điều trị (Action Plan)

Em đã scan ra toàn bộ bệnh lý rồi. Bây giờ hệ thống của mình **đã có sẵn** component siêu vũ khí `SwipeableCard` (Vuốt cực mượt nhờ Framer Motion) y hệt app Mail của iPhone. 

Anh muốn:
1️⃣ **Xem chi tiết Report** (Trong hệ thống File/Đã lưu lại)
2️⃣ **Sửa lỗi ngay lập tức (Áp dụng SwipeableCard vào Mobile + Cứu cái FAB đè chữ)** (Dùng `/code`)
3️⃣ **Bỏ qua, lưu cái này vào /save-brain**

Mời anh bấm số (1-3) để em hành động!

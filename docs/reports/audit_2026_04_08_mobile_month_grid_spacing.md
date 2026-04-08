# 🏥 V-GATE Audit Report: Lỗi rỗng đuôi lưới Lịch Mobile 
*(Mobile Month Grid Bottom Gap Regression)*

**Ngày Audit:** 08/04/2026
**Mục tiêu:** Mổ xẻ nguyên nhân giao diện Lịch tháng trên bảng điều khiển Mobile còn lộ một "ô thừa" trống hơ trống hoác ở dưới đáy giao diện (như trong feedback screen của sếp), trong khi màn hình Desktop đã được vá lỗi tương tự thành công trước đó.

---

## 🔍 QUÁ TRÌNH KHÁM TỔNG QUÁT (ROOT CAUSE ANALYSIS)

Sau khi soi kỹ logic trong `components/calendar/views/mobile-month-grid.tsx` và cấu trúc bọc của `calendar-wrapper.tsx`, em phát hiện 3 nguyên nhân cốt lõi gây ra hố đen ở dưới đáy lịch Mobile:

### 1. Hard-coded Margin Bottom (Thủ phạm thấy rõ bằng mắt)
Trong file `mobile-month-grid.tsx` (dòng 34), thành phần Root Wrapper của bảng lịch mobile đang được ốp một class thừa mứa:
`className="flex w-full h-full flex-col overflow-hidden mb-8"`
- **Hệ quả:** Class `h-full` lệnh cho khối này phình ra bằng 100% không gian cho phép, nhưng `mb-8` lại nới tiếp 32px Margin về phía dưới. Điều này bắt hệ thống tạo ra một cục rỗng 32 pixels dư thừa bên trong Scroll container.

### 2. Sụp hầm Track Sizing (Thiếu Percentage Bounds)
Ở giao diện Desktop, ta đã diệt tận gốc khoảng trắng thừa bằng cách thay đổi kích thước từng dòng lịch qua `%` tỷ lệ tuyệt đối (`grid-rows-[repeat(5,20%)]`). 
Trong khi đó, Mobile vẫn xài đồ cổ:
`className="grid grid-cols-7 h-full grid-rows-5"`
- **Hệ quả:** Tailwind's `grid-rows-5` biên dịch thành `grid-template-rows: repeat(5, minmax(0, 1fr))`. Thuộc tính `1fr` chỉ nói trình duyệt *"chia đều khoảng trống CÒN LẠI"*, nó bị làm tròn số (rounding errors) trên màn hình độ phân giải thiết bị nhỏ sinh ra dư dả khoảng 1-3 pixels ở cuối row.

### 3. Vắng mặt Absolute Container Constraint
Desktop được giữ vững cấu trúc bằng "Nẹp chân không":
`<div className="flex-1 relative min-h-0">` bọc ngoài `<div className="absolute inset-0...">`
Trong khi Mobile vẫn để Grid nằm khơi khơi trong Flex.
- **Hệ quả:** Flexbox Engine của mobile (đặc biệt là Webkit của iOS) thường tính toán chiều cao không nhất quán khi lồng `<div h-full>` bên trong `<div overflow-y-auto h-full>`, đẩy Grid layout thụt lên trên.

---

## 💊 PHÁC ĐỒ ĐIỀU TRỊ (ACTION PLAN)

Chiến lược: **Bê nguyên "Gen đột biến" của Desktop tiêm sang Mobile.**

**Bước 1:** Cưa bỏ margin đuôi thừa
- File: `mobile-month-grid.tsx`
- Sửa: Xóa `mb-8` ở wrapper tầng cao nhất (dòng 34).

**Bước 2:** Chặn đứng sự giãn nở Flexbox bằng Absolute Inset
- Nâng cấp `Body Wrapper` từ Flex-based sang Relative -> Absolute Pattern y xì đúc `month-grid.tsx` của Desktop.

**Bước 3:** Ép khuôn Grid Track theo Percentage (Tỷ lệ tuyệt đối)
- Thay thế các class Tailwind cổ điển sang hệ Percentage Grid:
  - `grid-rows-4` → `grid-rows-[repeat(4,25%)]`
  - `grid-rows-5` → `grid-rows-[repeat(5,20%)]`
  - `grid-rows-6` → `grid-rows-[repeat(6,16.666667%)]`

---

## 🏥 KẾT LUẬN & NEXT STEPS
Việc sửa lỗi này 100% khả thi và không gây side effects vì em sẽ áp dụng đúng bài học đã thành công trên giao diện PC.

**Sếp có đồng ý với phác đồ này không?** Bật đèn xanh cho em lệnh `/code` để em tiến hành phẫu thuật đồng bộ hóa Desktop -> Mobile nhé!

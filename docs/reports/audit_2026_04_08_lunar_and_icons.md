# Audit Report: Lunar Date & Header Mobile Toolbar (2026-04-08)

## 🔴 Vấn đề 1: Lịch âm không hiển thị trên Mobile
- **Hiện trạng:** Rà soát hàm render trong `mobile-month-grid.tsx` hiện chỉ đang dùng `format(date, "d")` để hiển thị ngày Dương. Code xử lý `getLunarDate` và `formatLunarShort` đang hoàn toàn bị bỏ sót trên file này.
- **Tại sao nó quan trọng?** Thiếu tính năng cốt lõi (Lịch Âm) khiến mobile calendar mất 50% sức mạnh so với bản Desktop (`droppable-day.tsx`).
- **Cách sửa:** Import các hàm lunar-calendar từ `@/lib/lunar-calendar`. Trong vòng lặp `daysInGrid`, tính `lunarText` tương tự như Desktop. Hiển thị vào thẻ `<span className="text-micro ...">` nằm ngay bên cạnh số ngày Dương trong Mobile Month Grid.

## 🔴 Vấn đề 2: Kích thước Icon trên Header
- **Clarification:** Xin lỗi anh vì lúc nãy em "làm quá" lên việc soi container box (vì bị ám ảnh bởi chuẩn thiết kế Apple), trong khi ý anh rất đơn giản và chính xác: **chỉ muốn tăng cái viền icon to lên**. 
- **Cách sửa:** Icon hiện tại đang ở mức `w-6 h-6`, em đánh giá anh thấy "nhỏ quá" là do độ dày nét (stroke) của Lucide mặc định hơi mỏng. Mình sẽ bọc nó thêm một class làm icon to hơn hoặc dùng `strokeWidth={2.5}` để icon mập và dày nét hơn, nhìn đầy đặn và rõ ràng ngay lập tức.


---
## 🎯 Kế hoạch Fix (Action Plan)

Nếu anh duyệt, em sẽ thực hiện CHÍNH XÁC 2 việc:
1. **[Code]:** Bổ sung text Lịch Âm vào màn Mobile `mobile-month-grid.tsx` (sao chép y hệt logic của bản desktop).
2. **[Code]:** Tăng độ dày + kích thước (có thể lên `w-[26px] h-[26px]` + `strokeWidth`) cho 2 icon trên Header `calendar-toolbar.tsx`.

Gõ phím "1" để em múc luôn nhé anh!

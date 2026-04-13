# Audit Report - System Text & Typography [Finance Module]

**Thời gian quét:** `13/04/2026`
**Tiêu điểm:** Vấn đề vi phạm chuẩn Design System (SSOT) liên quan đến Text, Typography Token và Responsive Behavior.

## Summary (Tổng quan)
- 🔴 Critical Issues (Lỗi nghiêm trọng kiến trúc): 1
- 🟡 Warnings (Cảnh báo sai luồng token): 3
- 🟢 Suggestions (Đề xuất tối ưu): 2

---

## 🔴 Critical Issues (Ảnh hưởng kiến trúc & Bất đồng bộ giao diện)

### 1. Phá vỡ Typography Token & Hardcode CSS Text
   - **Tình trạng:** Khắp các file như `receipt-mobile-list.tsx`, `receipt-desktop-table.tsx`, `smart-dashboard-banner.tsx`, code đang kẹp cứng các mixin inline như `font-semibold text-text-primary`, `text-[13px]`, `text-sm`, `font-bold` v.v.
   - **Nguy hiểm:** 
     + **Responsive Gãy:** Hardcode thế này khiến Text KHÔNG THỂ tự scale giữa Desktop (rộng) và Mobile (hẹp). Dẫn tới người dùng chê "lộn xộn quá mà không được tách bạch desktop vs mobile". 
     + **Mất kiểm soát SSOT:** File `typography.css` đã có sẵn các chuẩn như `.text-h2` (bao gồm sẵn weight 600), `.text-body-sm`, `.text-caption`, `.text-label`, và `.text-amount`. Việc cấy thêm `font-bold` hay tự biên tự diễn fontsize phá nát khả năng cập nhật đồng loạt.
   - **Cách sửa:** Gỡ bỏ MỌI class inline như `text-sm/text-xs/font-bold`. Thay thế toàn bộ bằng đúng ngữ nghĩa:
     + Số tiền: Thay bằng `.text-amount`
     + Tiêu đề / Tên hạng mục: Thay bằng `.text-label`
     + Nội dung nhỏ / Phụ đề: Thay bằng `.text-caption`

---

## 🟡 Warnings (Thiếu đồng bộ UI/UX)

### 1. Separation of Concerns (Di động và Desktop xử lý riêng rẽ)
   - **Vấn đề:** Thay vì viết các component Typography có tính Elastic (tự thay đổi kích thước chữ), các component đang xử lý bằng việc giấu nguyên cục component (`hidden lg:block` và `block lg:hidden`) cho List và Table.
   - **Hậu quả:** Bảo trì nhọc nhằn (ví dụ sửa chữ "Thu khác" phải nhảy vào 2 component khác nhau để sửa typography/logic). Tuy nhiên đây là kiến trúc P04 (tách file theo view). Cần đảm bảo component cả hai bên CÙNG gọi đúng chung 1 loại token (`.text-body-sm`) để nhất quán trải nghiệm, hiện tại chúng đang lệch nhịp.

### 2. Dịch vụ lạm dụng Text-color thay vì Semantic Badge
   - **Vấn đề:** Khá nhiều file dùng `text-success`, `text-error` thẳng vào text.
   - **Hậu quả:** Giảm độ nhận diện.
   - **Đề xuất:** Cần quy về hệ thống Badge/Tag (`tag-badge`, `badge-success`) để nổi bật hơn, hoặc dùng Semantic Amount cho số tiền.

### 3. Tồn đọng Fluff Text (Cognitive Overload)
   - **Vấn đề:** Các dòng phụ đề như *Đi thẳng đến nghiệp vụ cần xử lý.*
   - **Hậu quả:** Chiếm dòng code, dư thừa DOM node, vi phạm nguyên tắc Clean & Minimalist.

---

## 🟢 Suggestions (Tối ưu hóa mã nguồn)

1. **Auto-Format Typography:** Viết lại toàn bộ text styling cho module Finance, xóa hết class Tailwind inline để file ngắn lại khoảng 15%.
2. **Review lại thẻ H:** Có chỗ đang lạm dụng the `div` cho text tiêu đề thay vì semantic HTML (`h2`, `h3`, `p`). Cải thiện SEO và Screen Reader accessibility.

---

## Next Steps
Bản thiết kế này chỉ ra toàn bộ điểm bất thường gây cảm giác "chắp vá" cho Finance Module so với các module khác. Hệ thống `/finance` cần một cuộc tổng vệ sinh Token.

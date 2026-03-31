# Audit Report - 2026-03-31

**Mục tiêu kiểm tra:** Card "Lưu thay đổi" (SaveActionPanels) tại Module Services.
**Đánh giá tổng quan:** KHÔNG ĐẠT CHUẨN GOLD STANDARD. Card hiện tại đang chứa lỗi sai lệch Design System và sai Semantic Token.

## Summary
- 🔴 Critical Issues: 1
- 🟡 Warnings: 2
- 🟢 Suggestions: 1

---

## 🔴 Critical Issues (Phải sửa ngay)

1. **Lỗi hiển thị Nút "Xóa vĩnh viễn dịch vụ" (Invalid Destructive Token)**
   - **File:** `components/services/form/SaveActionPanels.tsx`
   - **Nguy hiểm:** Code đang bám vào class `text-danger hover:bg-danger/10`, tuy nhiên trên hệ thống Mood Studio V2, token danger được định nghĩa là `--color-error` (dùng `text-error`). Hậu quả là Tailwind bỏ qua class này, đưa màu text về màu xám trung tính giống hệt nút Cancel, làm người dùng sơ ý ấn nhầm thao tác Cực Kỳ Nguy Hiểm (Xóa vĩnh viễn) mà không hề có nhận diện cảnh báo thị giác đỏ.
   - **Phạm vi lây lan:** Quét toàn bộ `components/services` phát hiện lỗi `danger` lây lan ở **5 file khác nhau** (Category Modal, Bundle Section, Editor).
   - **Cách sửa:** Replace toàn bộ chuỗi regex `*danger*` thành `*error*` trên toàn Module Services.

## 🟡 Warnings (Nên sửa)

1. **Sử dụng sai Pattern Ghost Button (Visual Inconsistency)**
   - **File:** `SaveActionPanels.tsx`
   - **Vấn đề:** Nút "Quay về" đang sử dụng chuẩn `.btn-ghost` nhưng lại đính kèm `.border .border-border`. Tại Gold Standard (`FormActions.tsx` - nút Hủy), trạng thái ghost button đứng sát Primary CTA **không viền**. Việc gán viền phá vỡ hệ thống phân cấp nút nhấn (Button Hierarchy) của iOS/Stitch.
   - **Cách sửa:** Xoá class `border border-border` khỏi nút Quay Về.

2. **Thiếu khoảng cách Margin (Layout Bleeding)**
   - **Vấn đề:** Viền top của Card trắng đang cấn khít và cọ sát vào khoảng không (hoặc khối Quote Preview phía trên). Hình ảnh chụp cho thấy shadow/viền top nằm sát mép ảnh. Cần rà soát lại gap giữa các tầng block trong layout sidebar.

## 🟢 Suggestions (Tùy chọn)

1. **Thống nhất chiều cao Button (h-11 vs h-10)**
   - **Vấn đề:** Các form quan trọng (Gold Standard) chuộng thiết lập fixed form control logic. Nên đảm bảo nút Primary và Secondary trong Card có khối thống nhất, thay vì phó thác hoàn toàn cho padding `py-x`. Bổ sung `min-h-[44px]` (chuẩn touch iOS) để tối ưu trên cảm ứng mượt mà hơn.

# Phase 07: Refactor Shapes: Shadow & Border

Status: ✅ Complete
Dependencies: Phase 06

## Objective

Triệt để áp dụng Lesson 64: "V2 TUYỆT ĐỐI KHÔNG DÙNG BORDER — CHỈ SHADOW".
Loại bỏ tất cả bóng đổ cứng (arbitrary rgba shadows) như `shadow-[0_-8px_30px_rgb(0,0,0,0.04)]` và thay thế bằng các SSOT token chuẩn từ design system (`shadow-card`, `shadow-float`, `shadow-popover`).

## Requirements

### Functional

- [x] Tìm và gỡ bỏ toàn bộ code có thuộc tính `border` (ngoại trừ các border input đặc thù chưa thẻ thay) và chuyển sang cấu trúc UI shadow-based.
- [x] Thay thế các arbitrary box-shadow `shadow-[...]` về Tailwind box-shadow system SSOT.

## Implementation Steps

1. [x] Định nghĩa lại bảng Shadow tokens trong `globals.css` nếu còn thiếu (`--shadow-float`, `--shadow-sticky-nav`, `--shadow-bottom-nav`).
2. [x] Grep `shadow-\[` trong toàn dự án và map lại sang token đúng.
3. [x] Kiểm tra các thẻ chứa `border border-border` không cần thiết quanh cards, modal để xoá (giữ lại background và đổi qua shadow).

## Test Criteria

- [x] Component BottomNav, Dashboard Widgets sử dụng đúng SSOT Shadow.
- [x] CSS Compile mượt mà, không gặp lỗi Scanner của Tailwind v4 đối với các variant cũ.

---

Next Phase: Hoàn tất quá trình Remediation

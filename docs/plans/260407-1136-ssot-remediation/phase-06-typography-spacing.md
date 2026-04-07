# Phase 06: Refactor Typography & Spacing

Status: ✅ Complete
Dependencies: Phase 01

## Objective

Loại bỏ hoàn toàn các class CSS có kích thước cứng (typography và spacing) vi phạm SSOT như `text-[8px]`, `text-[11px]`, `w-[230px]`, `min-h-[44px]`. Đưa tất cả về hệ thống lưới và typography của thiết kế Tailwind (vd: `text-micro`, `text-tiny`, `w-full max-w-sm`).

## Requirements

### Functional

- [x] Chuyển đổi toàn bộ `text-[xxx]` sang CSS Variables / Tailwind classes chuẩn.
- [x] Xóa bỏ các giá trị arbitrary spacing như `w-[XXpx]`, `min-w-[XXpx]`, `h-[XXpx]`.

### Non-Functional

- [x] Responsive UI bảo toàn trên Mobile/Tablet.
- [x] Tối ưu hóa file CSS (dùng `@theme` cho các custom font-size nếu cần thêm token).

## Implementation Steps

1. [x] Cập nhật `globals.css` @theme để thêm token phụ trợ nếu cần (vd `text-micro`).
2. [x] Grep `components/ui/` tìm `text-[` và thay thế.
3. [x] Grep `components/` (các module còn lại) tìm `<div className="... w-[`, `min-h-[` và thay thế bằng flex layouts/Tailwind spacing scale.
4. [x] Xóa các class typography lắt nhắt vi phạm SSOT.

## Test Criteria

- [ ] UI không bị vỡ trên Mobile (đặc biệt Dropdowns và Pagination).
- [ ] Không còn kết quả tìm kiếm nào cho `text-\[` trong components.

---

Next Phase: phase-07-shadow-shapes.md

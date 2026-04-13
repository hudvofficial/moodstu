# Phase 04: Desktop CSS Validation
Status: ⬜ Pending
Dependencies: Phase 02, Phase 03

## Objective
Khôi phục cục diện hiển thị FAB đúng chuẩn SSOT trên Desktop bằng cách dọn dẹp xung đột class (`!` CSS Cascade) từ thư viện tailwind-merge. Đảm bảo cấu trúc class ở frontend "sạch" hoàn toàn, phó thác việc ẩn hiện cho prefix nguyên bản của Tailwind V4.

## Implementation Steps
1. [ ] **Clean CSS Prop** - Xóa chuỗi `!important` rườm rà ở `finance-fab.tsx`, truyền chuẩn `block lg:block` để fix cascade hiển thị Desktop.
2. [ ] **Hardcode Removal (Bonus)** - Xóa `bg-[#8B5E34]`, xài chung Token `bg-primary text-primary-foreground` cho icon Trợ lý AI.
3. [ ] **60FPS Overlay Fix** - Gỡ bỏ hiệu ứng `backdrop-blur-sm`. Đây là thủ phạm "ăn" GPU và gây lag số 1 trên mobile khi animate cùng bảng dashboard dày đặc data. Dùng nền `bg-black/20` hoặc `black/40` nguyên thủy + `will-change-opacity`.
4. [ ] **Hardware Acceleration** - Sửa `transition-all` của 3 icon thành `transition-[transform,opacity]` và thêm `will-change-transform`. Đổi `delay-[150ms]` JIT thành Token chuẩn của Tailwind (`delay-150`, `delay-100`, `delay-75`).
5. [ ] **Enhance UX** - Bổ sung modifier `group` cho hover.

## Files to Create/Modify
- `components/finance/finance-fab.tsx` - [Purpose: Revert to strict CSS native cascade rules]

## Test Criteria
- [ ] Mở giao diện trên cửa sổ Web (w > 1024px) -> FAB phải CÓ MẶT ở góc dưới phải.
- [ ] Di chuột qua FAB -> Không bị giật / mất tích do trigger sai độ ưu tiên.

---
Next Phase: N/A - Deployment/Save-Brain

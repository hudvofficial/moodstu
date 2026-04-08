# Phase 01: Frontend UI Fix
Status: ⬜ Pending
Dependencies: None

## Objective
Áp dụng giải pháp thiết kế sử dụng đồng bộ hệ thống Design System Tokens của Mood Studio để tối ưu hóa UI Modal `SolarLunarConverter`. Đảm bảo các ô nhập liệu ngày tháng năm không bị cắt chữ số, modal gọn gàng hơn vì không bị cấn sát mí viền.

## Requirements
### Functional
- [ ] Giao diện Modal cân đối, top và bottom margin đều và đẹp.
- [ ] Mở Drag Handle trên mobile để modal Drawer trong tự nhiên, liền mạch hơn.
- [ ] Ngăn chặn tình trạng input type="number" hiển thị Spin Buttons (nút Tăng/Giảm mặc định).

### Non-Functional
- [ ] UI/UX nhất quán với V2 Gold Standard.
- [ ] Không dùng class inline hardcode, phải tái sử dụng design token chuẩn (typography, form).

## Implementation Steps
1. [ ] **Clean up & Styling Tokens:** Mở file `solar-lunar-converter.tsx`. Xoá thiết lập class hardcode `text-2xl font-bold py-3 w-full`. Cập nhật `h2`, base spacing.
2. [ ] **Chỉnh sửa Modal Layout Spacing:** Thêm drag-handle `showDragHandle={true}`, chêm thêm space-top (`mt-4`, `mt-6`) và space-bottom để giảm ngộp (cramped UI). 
3. [ ] **Điều chỉnh lưới CSS Grid:** Thay `flex gap-3` bằng `grid grid-cols-4 gap-3`. Thiết lập ô Ngày (1 cột), Tháng (1 cột), Năm (2 cột).
4. [ ] **Ẩn Webkit Spin Buttons:** Thêm inline utility `[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0` hoặc thêm class ẩn spin buttons gốc từ core style.

## Files to Create/Modify
- `components/calendar/solar-lunar-converter.tsx` - File đích duy nhất để sửa đổi Modal Layout & Grid.

## Test Criteria
- [ ] Modal trên Desktop + Mobile (Drawer) không sát rịt trên dưới. Ô "Năm" gõ 4 chữ số (VD: "2026") hiện full box không bị cắt.
- [ ] Spin Button tăng giảm ẩn hoàn toàn, clean space cho input text.
- [ ] Component dùng 100% token base có sẵn. 

---
Next Phase: N/A - Hoàn tất Fix

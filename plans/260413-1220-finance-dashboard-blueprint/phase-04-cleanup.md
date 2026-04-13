# Phase 04: Tối ưu Banner & Dọn dẹp
Status: ⬜ Pending
Dependencies: phase-03

## Objective
Biến khối Banner báo cáo thông minh thành dạng Badge/Alert tinh tế để hạn chế cản trở luồng thị giác. Đồng thời rà soát lại toàn bộ trang để cleanup mọi dòng CSS dư thừa.

## Requirements
### Functional
- [ ] Mở file `smart-dashboard-banner.tsx`.
- [ ] Tháo bỏ background `#8b5e3c` (nâu khối lượng lớn), đưa về dạng `bg-primary/10 text-primary` hoặc `.card-base` với viền mỏng.
- [ ] Chỉnh sửa layout sang chiều ngang (Flex Row) gọn nhẹ (Icon + Dòng text + Nút mũi tên).

## Implementation Steps
1. [ ] Sửa `components/finance/dashboard/smart-dashboard-banner.tsx`.
2. [ ] Dọn dẹp imports không sử dụng trong `finance-dashboard-client.tsx`.
3. [ ] Hoàn thiện và chạy kiểm tra TypeScript.
4. [ ] Build thử và xác nhận không có `hydration error`.

## Files to Create/Modify
- `components/finance/dashboard/smart-dashboard-banner.tsx`

## Test Criteria
- [ ] Trang Finance gọn gàng, có tính "thở", cấu trúc mạch lạc phân tầng y hệt Blueprint của HR/Contracts.

---
Next Phase: N/A

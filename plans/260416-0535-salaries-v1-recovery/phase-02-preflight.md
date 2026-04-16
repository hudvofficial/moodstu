# Phase 02: Pre-flight Warnings & Xác thực Dữ liệu
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: None

## Objective
Dịch chuyển cảnh báo xác thực (0đ, chưa giao việc) từ Backend-Action-Exception về Frontend-Pre-Flight API, để xin phép User trước khi dứt điểm tính lương.

## Requirements
### Functional
- [ ] API Route / Server Action độc lập: `validatePayrollWarnings(month, year)` trả về mảng cảnh báo.
- [ ] Giao diện Client: Hiện pop-up Cảnh báo thông minh chứa danh sách rủi ro (Giống hệt cảnh báo chữ vàng trên V1).
- [ ] Xác nhận tiếp tục -> Mới gọi vào Hàm sinh lương nguyên bản.

## Files to Create/Modify
- `app/actions/salary-actions.ts` - Tách hàm check cảnh báo.
- `components/finance/salaries/salaries-client.tsx` - Nhúng Prompt Dialog.

## Test Criteria
- [ ] Popup Warning xuất hiện rõ ràng khi có hợp đồng lỗi.
---
Next Phase: [phase-03]

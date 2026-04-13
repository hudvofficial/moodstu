# Phase 03: Chuẩn hóa Thẻ Số (Stats Bar)
Status: ⬜ Pending
Dependencies: phase-02

## Objective
Xóa bỏ module `FinanceCompactBar` custom thiếu đồng bộ, chuyển sang sử dụng `StatsBar` (Shared component) để render 4 thông số: Tổng Thu, Tổng Chi, Tồn Quỹ, Công nợ. Đập bỏ nút bấm tích hợp dư thừa.

## Requirements
### Functional
- [ ] Tạo file mới `components/finance/dashboard/finance-stats-bar.tsx`.
- [ ] Sử dụng thẻ `<StatsBar>` (nếu có sẵn trong `components/ui/`) hoặc tái cấu trúc thành các thẻ dọc/ngang chuẩn style V2.
- [ ] Xóa nút `<Link href="/finance/receipts">Khai báo thu` khỏi thanh ngang (vì đã có FAB xử lý bên ngoài).

## Implementation Steps
1. [ ] Check `components/ui/stats-bar.tsx` hoặc các pattern tương tự của Hợp đồng/Nhân sự.
2. [ ] Viết `finance-stats-bar.tsx` map đúng biến data của Tài chính vào mảng config.
3. [ ] Xóa file legacy `finance-compact-bar.tsx` (nếu không còn dùng ở đâu).

## Files to Create/Modify
- `components/finance/dashboard/finance-stats-bar.tsx`
- `components/finance/dashboard/finance-compact-bar.tsx` (Xóa/Bỏ gọi)
- `components/finance/dashboard/finance-dashboard-client.tsx`

## Test Criteria
- [ ] Thẻ số chuẩn grid, đổ màu semantic icon (đỏ/xanh) giữ nguyên, không lòi nút thừa, padding khít rịt chuẩn Blueprint.

---
Next Phase: `phase-04-cleanup.md`

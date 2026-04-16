# Phase 02: Refactor Salaries Client
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Triệt tiêu lỗi vỡ giao diện Mobile khi dùng thẻ `<Table>`. Đưa `salaries-client.tsx` vào rập khuôn SSOT Layout (main-container + SSOT Header).

## Implementation Steps
1. [ ] Thay wrapper nguyên khối thành chuẩn `.main-container`:
   - Gắn component `<Breadcrumb>` (Tài chính > Bảng lương).
   - Sử dụng chung bộ classes với các module như Debts (`<div className="main-container gap-4!">`).
   
2. [ ] Đồng bộ hóa phần Header / Filter (entrance-0):
   - Thay `<h1 className="text-h1">` thành giao diện tiêu đề chuẩn.
   - Chuyển dropdown select bộ lọc tháng/năm sang hàng trên cùng với Breadcrumb (nếu có thể) hoặc chung Header action. Phân bổ khoảng trống hợp lý.
   
3. [ ] Import và Tái cấu trúc mảng UI thành chia tách thiết bị:
   - Thay khối section lưới hiện tại bằng việc đặt:
     ```tsx
     <div className="hidden lg:block card-base">
       <SalaryDesktopTable items={salaryData.items} ... />
     </div>
     <div className="lg:hidden">
       <SalaryMobileList items={salaryData.items} ... />
     </div>
     ```
   
4. [ ] Bổ sung thanh `<SalaryStatsBar>`/`StatsBar` (entrance-1).
5. [ ] Refine lại Animation Entrance (0, 1, 2) cho hiệu ứng trượt vào nuột nà.

## Files to Modify
- `components/finance/salaries/salaries-client.tsx`

---
Tiến hành sau khi Phase 01: Extract SSOT Components hoàn thành!

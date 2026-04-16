# Phase 01: Extract SSOT Components
Status: ⬜ Pending

## Objective
Xé nhỏ kiến trúc Monolithic `<Table>` của trang quản lý Lương thành các component con chuẩn bị cho việc ghép nối đa nền tảng.

## Implementation Steps
1. [ ] Trích xuất `SalaryDesktopTable`:
   - Mang toàn bộ cấu trúc `<TableWrapper>`, `<THead>`, `<TBody>` hiện tại đẩy vào file `components/finance/salaries/salary-desktop-table.tsx`.
   - Đảm bảo nhận các props chuẩn: `items`, `busyId`, `onView`, `onAdjust`.
   
2. [ ] Xây dựng `SalaryMobileList`:
   - Tạo file `components/finance/salaries/salary-mobile-list.tsx`.
   - Không dùng `<Table>`, dùng cấu trúc Component `<SwipeableCard>` chuẩn bọc trong `<ul className="space-y-3">`.
   - Card hiển thị 2 dòng: Hàng trên là Tên nhân sự / Mã nhân sự. Hàng dưới là Thực nhận. Có badge chức vụ.
   
3. [ ] (Tuỳ chọn) Tạo `SalaryStatsBar`: 
   - Đổi 3 thẻ `<div className="stats-card">` đang bọc thủ công thành cấu trúc chuẩn. Có thể map dữ liệu qua dùng `<StatsBar>` của UI core (giống trang Thu/Chi).

## Files to Create
- `components/finance/salaries/salary-desktop-table.tsx`
- `components/finance/salaries/salary-mobile-list.tsx`
- `components/finance/salaries/salary-stats-bar.tsx` (nếu cần)

---
Next Phase: `phase-02-refactor-client.md`

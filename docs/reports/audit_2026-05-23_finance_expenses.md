# Audit Report - 2026-05-23: Module /finance/expenses

## Summary
- 🔴 Critical Issues: 1
- 🟡 Warnings: 3
- 🟢 Suggestions: 2

## 🔴 Critical Issues (Phải sửa ngay)
1. **Lỗi logic khi generate chi phí tự động (generateMonthlyFixedCosts)**
   - File: `app/actions/expense-actions.ts`
   - Nguy hiểm: Việc tìm category đang dựa trên so sánh chuỗi tên (`cat.name === cost.cost_type`). Nếu User đổi tên danh mục (ví dụ từ "Tiền điện" sang "Điện nước"), logic tự động sinh chi phí sẽ bị lỗi hoặc gán sai danh mục mặc định.
   - Cách sửa: Sử dụng `category_code` hoặc `id` làm tham chiếu cứng (Foreign Key) thay vì so sánh `name`.

## 🟡 Warnings (Nên sửa)
1. **Performance: Thiếu prefetch cho Expense Stats (Gây độ trễ UI)**
   - File: `components/finance/expenses/expenses-client.tsx`
   - Vấn đề: `ExpensesClient` nhận `initialData` cho danh sách chi phí, nhưng `stats` lại gọi qua `useSWR` ở client. Điều này khiến thanh thống kê (ExpenseStatsBar) bị trống hoặc loading một nhịp sau khi trang đã render, làm giảm trải nghiệm người dùng.
   - Cách sửa: Truyền `initialStats` từ Server Component (`page.tsx`) xuống `ExpensesClient` tương tự như `initialData`.

2. **Performance: Cơ chế Fallback của fetchExpenseStats**
   - File: `app/actions/finance-operations-queries.ts`
   - Vấn đề: Nếu RPC `finance_expense_stats` lỗi, hàm sẽ fallback bằng cách query TOÀN BỘ dữ liệu của tháng đó (`select amount, approved_by`) rồi dùng vòng lặp JavaScript để tính toán. Khi số lượng phiếu chi lên đến hàng ngàn, việc này sẽ ngốn RAM server và làm chậm API.
   - Cách sửa: Nên dùng PostgREST aggregation (nếu có thể) hoặc bắt buộc phải có RPC để tính toán phía Database.

3. **Inconsistent UI Tokens (Chưa tối ưu SSOT)**
   - File: `components/finance/expenses/expenses-client.tsx`, `expense-desktop-table.tsx`
   - Vấn đề: Code vẫn còn lạm dụng nhiều utility classes cứng (như `py-3 px-5`, `w-4 h-4`, `gap-4!`, `w-56`) kết hợp với CSS Variables. Việc này làm mất đi sức mạnh của hệ thống Design System (SSOT).
   - Cách sửa: Thay thế các class hardcode bằng các component chuẩn hoặc các Spacing/Layout token đã được định nghĩa trong `design-system.css`.

## 🟢 Suggestions (Tùy chọn)
1. **UX: Refetch Cache chưa tối ưu**
   - File: `components/finance/expenses/expenses-client.tsx`
   - Gợi ý: Trong hàm `refresh()`, việc gọi 5 hàm `mutate` liên tục không có `Promise.all` hoặc cơ chế batch có thể gây re-render nhiều lần. Đã có `Promise.all`, nhưng nên kiểm tra việc invalidation toàn bộ `financeDashboard` có thật sự cần thiết sau mỗi lần sửa 1 phiếu chi hay không.
2. **Business Logic: Cập nhật phiếu chi đã duyệt**
   - File: `app/actions/expense-actions.ts`
   - Gợi ý: Hiện tại `updateExpense` sẽ chặn việc sửa đổi nếu `approved_by` khác null. Đây là quy trình kế toán chuẩn, nhưng có thể gây khó khăn thực tế nếu kế toán nhập sai thông tin diễn giải. Có thể cân nhắc thêm quyền "Super Admin" cho phép sửa thông tin mô tả (không sửa số tiền) kể cả khi đã duyệt.

## Next Steps
- Review lại cách fetch dữ liệu Category trong Fixed Costs.
- Bổ sung `initialStats` vào `page.tsx`.

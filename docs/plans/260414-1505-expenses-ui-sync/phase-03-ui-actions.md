# Phase 03: Desktop & Mobile UI Actions
Status: ⬜ Pending | 🟡 In Progress | ✅ Complete
Dependencies: Phase 02

## Objective
Xây dựng nút thao tác (Row Actions) đồng nhất cho cả Desktop (w-56) và Mobile (Swipeable). Không dùng Dropdown.

## Implementation Steps
1. [x] Tạo `ExpenseRowActions` direct icons: View, Print, Approve, Edit, Delete.
   - **Policy Phiếu Đã Duyệt**: Ẩn/disable Approve button nếu `approved_by` đã có. Tương tự chặn/hide Edit/Delete button với phiếu đã duyệt để đồng bộ behavior server (block edit/delete).
   - **SSOT token compliance**: Dùng class `btn-icon` tiêu chuẩn, `text-text-secondary`/`text-error` và token hiện có. Không hardcode hex/custom spacing/button sizing.
   - Desktop action column `w-56`, wrapper `min-w-max`. 
2. [x] Mobile swipe nếu có chỉ reveal actions, không auto approve/delete. Đảm bảo mobile không vỡ layout khi hiển thị các nút thao tác.

## Files to Create/Modify
- components/finance/expenses/expense-row-actions.tsx
- components/finance/expenses/expense-mobile-swipe-card.tsx
- components/finance/expenses/expense-mobile-list.tsx
- components/finance/expenses/expense-desktop-table.tsx

# Phase 03: Đồng bộ Khối Danh sách & Bảng (Lists & Datatables)
Status: ⬜ Pending
Dependencies: Phase 02

## 2026-04-21 Audit Addendum

Tables/lists must expose the same business columns returned by server logic:

- [ ] Fix `finance_contract_profit_report` RPC to return `package_revenue`, `addon_revenue`, and `discount`, or stop rendering those fields. Current action maps them but SQL does not return them.
- [ ] `finance_ledger` must exclude soft-deleted receipts and keep the JS fallback formula identical to the SQL path.
- [ ] Recent transactions, pending collections, and upcoming contracts should use shared card/table primitives, not V1 copied wrappers.
- [ ] All amounts must use `tabular-nums` and shared finance formatting.
- [ ] Paginated tables must stay server-side/RPC paginated; no client slicing of full finance data.

## Objective
Tất cả các khối Datatables và Lists phải hiển thị liền mạch với tổng thể, không lỗi margin-bottom gây mất cân bằng so với đồ thị.

## Implementation Steps
1. [ ] Kiểm tra và chuẩn hóa `pending-collections.tsx`.
2. [ ] Chuẩn hóa `upcoming-contracts.tsx` & `recent-transactions.tsx`.
3. [ ] Chuẩn hóa `profit-report-table.tsx` & `budget-vs-actual-list.tsx`.
4. [ ] Đảm bảo List Headers dùng thống nhất 1 chuẩn chữ và khoảng cách (VD: `flex justify-between items-center mb-4`).

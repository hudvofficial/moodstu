# Phase 05: Polish & Suggestions
Status: ⬜ Pending
Dependencies: Phase 04
Priority: 🟢 Suggestion

## Objective
Chuẩn hóa error messages, thêm optimistic lock cho các update functions còn thiếu, và thêm pagination cho queries chưa có.

## Audit Items
- **S2**: Error messages tiếng Việt không dấu
- **S3**: Missing optimistic lock (3 update functions)
- **S4**: `fetchDebts` không có pagination
- **S5**: `fetchGoals`, `fetchFixedCosts`, `fetchInvestments` không có pagination

---

## Implementation Steps

### 1. Chuẩn hóa Error Messages (S2)

- [ ] **1.1** File: `fixed-cost-actions.ts`  
  ```
  "Ten chi phi khong duoc de trong" → "Tên chi phí không được để trống"
  "So tien hang thang phai lon hon 0" → "Số tiền hàng tháng phải lớn hơn 0"
  "Khong tim thay chi phi co dinh" → "Không tìm thấy chi phí cố định"
  "Loi tao chi phi co dinh" → "Lỗi tạo chi phí cố định"
  "Loi cap nhat chi phi co dinh" → "Lỗi cập nhật chi phí cố định"
  "Loi xoa chi phi co dinh" → "Lỗi xóa chi phí cố định"
  ```
- [ ] **1.2** File: `finance-category-actions.ts`
  ```
  "Ten danh muc khong duoc de trong" → "Tên danh mục không được để trống"
  "Khong tim thay danh muc" → "Không tìm thấy danh mục"
  "Khong the xoa danh muc mac dinh" → "Không thể xóa danh mục mặc định"
  "Loi tao danh muc" → "Lỗi tạo danh mục"
  "Loi cap nhat danh muc" → "Lỗi cập nhật danh mục"
  "Loi xoa danh muc" → "Lỗi xóa danh mục"
  ```
- [ ] **1.3** File: `finance-operations-queries.ts` — fix tất cả error messages không dấu
  ```
  "Loi tai danh muc" → "Lỗi tải danh mục"
  "Loi tai hop dong" → "Lỗi tải hợp đồng"  
  "Loi tai phieu thu" → "Lỗi tải phiếu thu"
  "Loi tai phieu chi" → "Lỗi tải phiếu chi"
  "Loi tai cong no" → "Lỗi tải công nợ"
  "Loi tai chi phi co dinh" → "Lỗi tải chi phí cố định"
  "Loi tai tai san" → "Lỗi tải tài sản"
  "Loi tai bang luong" → "Lỗi tải bảng lương"
  "Loi tai tong luong" → "Lỗi tải tổng lương"
  "Loi tai muc tieu" → "Lỗi tải mục tiêu"
  ```
- [ ] **1.4** Cập nhật audit log descriptions tương tự

### 2. Thêm Optimistic Lock (S3)

- [ ] **2.1** `updateFixedCost` — `fixed-cost-actions.ts:63`
  - Thêm param `expectedUpdatedAt?: string`
  - Fetch `updated_at` trong old data select
  - Check before update
- [ ] **2.2** `updateCreditCard` — `debt-actions.ts:213`
  - Thêm param `expectedUpdatedAt?: string`
  - Fetch + check
- [ ] **2.3** `updateFinanceCategory` — `finance-category-actions.ts:56`
  - Thêm param `expectedUpdatedAt?: string`
  - Fetch + check (đã fetch `updated_at` — chỉ cần thêm check)

### 3. Thêm Pagination cho Debts (S4)

- [ ] **3.1** File: `finance-operations-queries.ts`
- [ ] **3.2** Thay đổi `fetchDebts()` → `fetchDebts(params: MonthYearPageParams = {})`
- [ ] **3.3** Thêm `pageWindow`, `range`, `count: "exact"`
- [ ] **3.4** Return `PaginatedResult<DebtListItem>` thay vì `DebtListItem[]`
- [ ] **3.5** Cập nhật `debts-client.tsx` để handle pagination

### 4. Thêm Pagination cho Goals, Fixed Costs, Investments (S5)

- [ ] **4.1** `fetchGoals()` → paginated (tương tự S4)
- [ ] **4.2** `fetchFixedCosts()` → paginated
- [ ] **4.3** `fetchInvestments()` → paginated
- [ ] **4.4** Cập nhật các client components tương ứng

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/actions/fixed-cost-actions.ts` | S2 (i18n) + S3 (optimistic lock) |
| `app/actions/finance-category-actions.ts` | S2 (i18n) + S3 (optimistic lock) |
| `app/actions/finance-operations-queries.ts` | S2 (i18n) + S4/S5 (pagination) |
| `app/actions/debt-actions.ts` | S3 (creditCard optimistic lock) |
| `components/finance/debts/debts-client.tsx` | S4 (pagination UI) |
| `components/finance/goals/goals-client.tsx` | S5 (pagination UI) |
| `components/finance/fixed-costs/fixed-costs-client.tsx` | S5 (pagination UI) |
| `components/finance/investments/investments-client.tsx` | S5 (pagination UI) |

## Test Criteria
- [ ] Zero error messages không dấu trong finance actions
- [ ] Tất cả update functions có optimistic lock
- [ ] Debts, goals, fixed costs, investments có pagination
- [ ] Build thành công

## Notes
- Pagination cho debts/goals/fixed-costs/investments có thể break existing UI. Cần cập nhật client components.
- ⚠️ Nếu số lượng records thực tế < 50 → pagination không urgent, có thể defer.

---
✅ End of Plan. All phases complete.

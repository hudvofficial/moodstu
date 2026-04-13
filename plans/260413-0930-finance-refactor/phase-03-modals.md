# Phase 03: Modals & Forms
Status: ⬜ Pending
Dependencies: phase-02-dashboards.md

## Objective
Xử lý toàn bộ logic Modal Form - nơi có tính năng nhập liệu (Input typing), nhằm ngăn Dropdown Selection bị vẽ lại tốn CPU khi User gõ ký tự.

## Requirements
### Functional
- [ ] Hạn chế sử dụng `<Input onChange={(v) => set(v)} />` nếu state set không được memoized.
- [ ] Bao bọc Lookup Data (options) của Select/Dropdown trong `useMemo`.

## Implementation Steps
1. [ ] Refactor `receipt-form-modal.tsx` (Bọc mảng categories/contracts bằng useMemo)
2. [ ] Refactor `expense-form-modal.tsx` (Bọc categories)
3. [ ] Refactor `close-create-modal.tsx` 
4. [ ] Refactor `investment-form-modal.tsx`
5. [ ] Refactor `fixed-cost-form-modal.tsx`
6. [ ] Refactor `debt-form-modal.tsx`
7. [ ] Refactor `goal-form-modal.tsx`
8. [ ] Refactor `category-form-modal.tsx`
9. [ ] Refactor `salary-adjustment-modal.tsx`
10. [ ] Refactor `budget-form-modal.tsx`
11. [ ] Kiểm tra thêm các Modal nhỏ khác theo regex quét.

## Test Criteria
- [ ] Typing trong form cực kỳ mượt mà, không giật màn hình.

---
Next Phase: phase-04-sub-clients.md

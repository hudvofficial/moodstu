# Phase 16: Payroll

**Status:** ⬜ Backlog
**Dependencies:** Phase 15 (HR), Phase 11 (Expenses)
**Est.:** 1.5 days

## Objective

Bảng lương tháng. Formula: Net = base + product + Σbonus - Σpenalty - advance. Thưởng/phạt. Recursive recalculation.

## Implementation Steps

### Bảng lương
- [ ] DB: Bảng `employee_salaries` (employee_id, month, year, base_salary, product_salary, bonus_total, penalty_total, advance_payment, net_salary)
- [ ] DB: Bảng `monthly_salaries` (month, year, total_payroll, employee_count)
- [ ] Generate bảng lương tháng mới (clone structure từ tháng trước)
- [ ] Net salary formula: `base + product + Σbonus - Σpenalty - advance`
- [ ] Recursive recalculation: sửa 1 thành phần → sync net → sync monthly total

### Thưởng/Phạt
- [ ] DB: Bảng `evaluations` (employee_salary_id, type ENUM 'bonus'|'penalty', description, amount)
- [ ] CRUD thưởng/phạt per salary record
- [ ] Auto recalc salary khi thêm/sửa/xoá evaluation
- [ ] Link vào nội quy (nếu có — Backlog)

### Thanh toán lương
- [ ] Trả lương → tạo phiếu chi tự động (link expense + salary)
- [ ] Đánh dấu "Đã trả" / "Chưa trả"

## V1 Lessons (CRITICAL)
```
Formula: Net = base_salary + product_salary + (Σ bonuses - Σ penalties) - advance_payment
→ Recursive: khi sửa evaluation → recalc employee_salary.net → recalc monthly_salaries.total
→ Centralized helper: recalculateEmployeeSalary() — KHÔNG tính scattered
```

## Test Criteria
- [ ] Formula tính đúng Net
- [ ] Thêm bonus/penalty → auto recalc Net + Monthly total
- [ ] Xoá evaluation → recalc ngược
- [ ] Trả lương → expense tự động tạo đúng amount

---
**Next Phase:** → Phase 17 (Labs & Printing)

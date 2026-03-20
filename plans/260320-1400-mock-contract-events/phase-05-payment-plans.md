# Phase 05: INSERT Payment Plans (Lịch thanh toán)
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Tạo 3 payment milestones khớp với 2 payments thực đã có.

## Mock Data

| # | stage_name | amount | due_date | status | receipt_id |
|---|-----------|--------|----------|--------|------------|
| 1 | Đặt cọc | 20,000,000 | 2026-02-14 | paid | (link payment 1) |
| 2 | Trước ngày chụp | 15,000,000 | 2026-03-05 | paid | (link payment 2) |
| 3 | Sau giao sản phẩm | 28,000,000 | 2026-07-15 | pending | null |

## SQL
```sql
-- Get payment IDs to link
-- Payment 1 (cọc 20M): query by amount + date
-- Payment 2 (đợt 2 15M): query by amount + date

WITH payments_ref AS (
  SELECT id, amount, payment_date
  FROM payments
  WHERE contract_id = 'b9dcca30-de58-46d1-ab3a-44b610a5bbb2'
    AND deleted_at IS NULL
  ORDER BY payment_date ASC
)
INSERT INTO payment_plans (contract_id, stage_name, amount, due_date, status, receipt_id)
SELECT
  'b9dcca30-de58-46d1-ab3a-44b610a5bbb2',
  v.stage_name, v.amount, v.due_date::date, v.status,
  pr.id
FROM (VALUES
  ('Đặt cọc', 20000000, '2026-02-14', 'paid', 1),
  ('Trước ngày chụp', 15000000, '2026-03-05', 'paid', 2),
  ('Sau giao sản phẩm', 28000000, '2026-07-15', 'pending', 0)
) AS v(stage_name, amount, due_date, status, pay_idx)
LEFT JOIN (
  SELECT id, ROW_NUMBER() OVER (ORDER BY payment_date) AS rn
  FROM payments
  WHERE contract_id = 'b9dcca30-de58-46d1-ab3a-44b610a5bbb2'
    AND deleted_at IS NULL
) pr ON pr.rn = v.pay_idx AND v.pay_idx > 0;
```

## Test Criteria
- [ ] FinancialDashboard hiện "Lịch thanh toán" với 3 milestones
- [ ] 2 milestones = paid (checkmark), 1 = pending
- [ ] Tổng milestones = 63M = total_amount - discount

---
Next Phase: [phase-06-reservations.md](./phase-06-reservations.md)

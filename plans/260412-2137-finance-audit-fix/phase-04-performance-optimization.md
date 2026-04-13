# Phase 04: Performance Optimization
Status: ✅ Complete (2026-04-12)
Dependencies: Phase 03
Priority: 🟡 Warning

## Objective
Loại bỏ N+1 query pattern và tối ưu các query tuần tự không cần thiết.

## Audit Items
- **W5**: N+1 pattern trong `fetchLabDebts` — fetch toàn bộ orders + payments rồi nhóm bằng JS
- **W6**: 3 queries tuần tự trong `getBudgetsWithActuals`

---

## Implementation Steps

### 1. RPC `finance_lab_debt_summary` (W5)

- [ ] **1.1** Tạo migration `add_finance_lab_debt_summary_rpc`
- [ ] **1.2** SQL:
  ```sql
  CREATE OR REPLACE FUNCTION finance_lab_debt_summary()
  RETURNS TABLE (
    lab_id UUID,
    lab_name TEXT,
    order_count BIGINT,
    total_orders NUMERIC,
    total_paid NUMERIC,
    remaining NUMERIC
  ) AS $$
  BEGIN
    RETURN QUERY
    WITH lab_orders AS (
      SELECT 
        po.lab_id,
        l.lab_name,
        COUNT(*) AS order_count,
        COALESCE(SUM(po.total_amount), 0) AS total_orders
      FROM printing_orders po
      JOIN labs l ON l.id = po.lab_id
      WHERE po.deleted_at IS NULL
        AND po.lab_id IS NOT NULL
        AND po.payment_status NOT IN ('paid', 'da_thanh_toan')
      GROUP BY po.lab_id, l.lab_name
    ),
    lab_paid AS (
      SELECT 
        lp.lab_id,
        COALESCE(SUM(lp.amount), 0) AS total_paid
      FROM lab_payments lp
      GROUP BY lp.lab_id
    )
    SELECT 
      lo.lab_id,
      lo.lab_name,
      lo.order_count,
      lo.total_orders,
      COALESCE(lp.total_paid, 0) AS total_paid,
      GREATEST(0, lo.total_orders - COALESCE(lp.total_paid, 0)) AS remaining
    FROM lab_orders lo
    LEFT JOIN lab_paid lp ON lp.lab_id = lo.lab_id
    WHERE lo.total_orders - COALESCE(lp.total_paid, 0) > 0
    ORDER BY remaining DESC;
  END;
  $$ LANGUAGE plpgsql STABLE;
  ```
- [ ] **1.3** Cập nhật `fetchLabDebts` trong `finance-operations-queries.ts`:
  ```ts
  export async function fetchLabDebts() {
    return withAuth(async (supabase) => {
      const { data, error } = await supabase.rpc("finance_lab_debt_summary");
      if (error) throw new Error(`Lỗi tải công nợ lab: ${error.message}`);
      return (data || []) as LabDebtItem[];
    });
  }
  ```
- [ ] **1.4** Xóa code JS aggregation cũ (30+ lines)

### 2. Optimize `getBudgetsWithActuals` (W6)

- [ ] **2.1** File: `app/actions/goal-budget-actions.ts:175-226`
- [ ] **2.2** Chuyển 3 queries tuần tự sang `Promise.all`:
  ```ts
  const [budgetsResult, expensesResult, categoriesResult] = await Promise.all([
    supabase.from("budgets").select("...").eq("period_month", month).eq("period_year", year),
    supabase.from("expenses").select("amount, category_id").gte("expense_date", startDate).lt("expense_date", endDate).is("deleted_at", null),
    supabase.from("transaction_categories").select("id, name").eq("type", "Chi"),
  ]);
  ```
- [ ] **2.3** Destructure results và handle errors
- [ ] **2.4** Giữ nguyên JS join logic (vẫn cần map category_id → name)

---

## Files to Create/Modify

| Action | File | Changes |
|--------|------|---------|
| CREATE | Migration: `finance_lab_debt_summary` | New RPC |
| MODIFY | `app/actions/finance-operations-queries.ts` | Refactor `fetchLabDebts` |
| MODIFY | `app/actions/goal-budget-actions.ts` | `Promise.all` for `getBudgetsWithActuals` |

## Test Criteria
- [ ] `fetchLabDebts` trả về cùng kết quả với code cũ
- [ ] `getBudgetsWithActuals` trả về cùng kết quả
- [ ] Response time giảm (đặc biệt `fetchLabDebts` với nhiều orders)
- [ ] Build thành công

## Performance Impact Estimate
- `fetchLabDebts`: Từ **2 full-table scans + JS loop** → **1 SQL query** (estimated 5-10x faster)
- `getBudgetsWithActuals`: Từ **3 sequential queries** → **3 parallel queries** (estimated 2-3x faster)

---
Next Phase: → [Phase 05: Polish & Suggestions](./phase-05-polish-suggestions.md)

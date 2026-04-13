# Audit Report — Finance Module

**Ngày:** 2026-04-12  
**Scope:** Full Audit — toàn bộ module `/finance`  
**Phạm vi:** 14 server action files, 35+ UI components, 2 type files, 1 Zod schema  

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical Issues | 3 |
| 🟡 Warnings | 7 |
| 🟢 Suggestions | 5 |

**Tổng quan:** Module Finance đã qua giai đoạn "Hardened V2" nên nền tảng khá solid. Tất cả mutations đều có Zod validation, audit logging, và period lock. Tuy nhiên vẫn tồn tại **3 lỗi nghiêm trọng** liên quan đến data integrity (race condition, non-atomic operation, inconsistent delete).

---

## 🔴 Critical Issues (Phải sửa ngay)

### C1. Race Condition trong `createPaymentReceipt` — Non-Atomic Contract Update

- **File:** [payment-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/payment-actions.ts#L57-L97)
- **Vấn đề:** Flow thanh toán gồm 5 bước riêng biệt (insert payment → select contract → tính toán → update contract → update payment_plan), nhưng **KHÔNG nằm trong transaction**. Nếu 2 user cùng thanh toán cho 1 hợp đồng, cả 2 đều đọc `paid_amount` cũ → ghi đè lẫn nhau → mất tiền.
- **Hậu quả:** Hợp đồng có thể bị tính sai `paid_amount` và `remaining_amount`. Tiền thanh toán bị "nuốt" mà không ai biết.
- **Cách sửa:** Chuyển toàn bộ flow sang **1 PostgreSQL RPC** (atomic transaction) tương tự pattern `create_sale_receipt_atomic` đã có. Steps 1→5 phải nằm trong `BEGIN...COMMIT`:

```sql
-- Pseudocode:
CREATE FUNCTION process_contract_payment(
  p_contract_id UUID, p_amount NUMERIC, ...
) RETURNS UUID AS $$
DECLARE v_contract RECORD; ...
BEGIN
  SELECT ... INTO v_contract FROM contracts WHERE id = p_contract_id FOR UPDATE;
  -- FOR UPDATE = row-level lock chống race condition
  INSERT INTO payments (...) VALUES (...) RETURNING id INTO v_payment_id;
  UPDATE contracts SET paid_amount = v_contract.paid_amount + p_amount, ...;
  -- Update payment_plan nếu có
  RETURN v_payment_id;
END; $$ LANGUAGE plpgsql;
```

---

### C2. Non-Atomic `undoContribution` — Race Condition + Partial Failure

- **File:** [goal-budget-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/goal-budget-actions.ts#L100-L133)
- **Vấn đề:** `undoContribution` thực hiện 3 operations riêng biệt (delete contribution → RPC decrement → check + update status). Nếu step 2 fail sau step 1 đã xóa contribution → **mất dữ liệu**: contribution đã bị xóa nhưng `current_amount` chưa giảm.
- **Hậu quả:** Goal `current_amount` bị sai, tiền "ma" xuất hiện trong báo cáo.
- **Cách sửa:** Gom cả 3 steps vào 1 RPC `undo_contribution_atomic(p_contribution_id UUID)`:

```sql
CREATE FUNCTION undo_contribution_atomic(p_contribution_id UUID) 
RETURNS VOID AS $$
DECLARE v_contrib RECORD; v_goal RECORD;
BEGIN
  SELECT * INTO v_contrib FROM goal_contributions WHERE id = p_contribution_id;
  IF NOT FOUND THEN RAISE 'Contribution not found'; END IF;
  -- Kiểm tra 24h window
  IF extract(epoch FROM now() - v_contrib.created_at) > 86400 THEN
    RAISE 'Quá 24h, không thể hoàn tác';
  END IF;
  DELETE FROM goal_contributions WHERE id = p_contribution_id;
  UPDATE financial_goals 
    SET current_amount = GREATEST(0, current_amount - v_contrib.amount)
    WHERE id = v_contrib.goal_id
    RETURNING * INTO v_goal;
  -- Auto-revert status
  IF v_goal.status = 'completed' AND v_goal.current_amount < v_goal.target_amount THEN
    UPDATE financial_goals SET status = 'active' WHERE id = v_goal.id;
  END IF;
END; $$ LANGUAGE plpgsql;
```

---

### C3. Inconsistent Delete Strategy — Hard Delete vs Soft Delete

- **File:** Nhiều file actions
- **Vấn đề:** Các bảng tài chính có chính sách xóa **không nhất quán**:

| Table | Chiến lược | File |
|---|---|---|
| `expenses` | ✅ Soft delete (`deleted_at`) | expense-actions.ts:179 |
| `debts` | ❌ Hard delete | debt-actions.ts:144 |
| `financial_goals` | ❌ Hard delete | goal-budget-actions.ts:74 |
| `budgets` | ❌ Hard delete | goal-budget-actions.ts:166 |
| `fixed_costs` | ❌ Hard delete | fixed-cost-actions.ts:106 |
| `investments` | ❌ Hard delete | investment-actions.ts:134 |
| `receipts` | ❌ Hard delete | receipt-actions.ts:54 |
| `credit_cards` | ❌ Hard delete | debt-actions.ts:234 |

- **Hậu quả:** Dữ liệu tài chính bị **xóa vĩnh viễn** không có cách khôi phục. Audit log ghi nhận action nhưng data bản gốc đã mất. Nếu kỳ đã chốt sổ mà vẫn có thể hard delete → sai lệch báo cáo tài chính.
- **Cách sửa:** 
  1. Tất cả bảng tài chính nên dùng soft delete (`deleted_at` column)
  2. Các query đọc phải thêm `.is("deleted_at", null)` (đã đúng ở expenses, contracts)
  3. Debt, receipt, investment, goal, budget cần migration thêm `deleted_at` column

---

## 🟡 Warnings (Nên sửa)

### W1. Missing Zod Validation — `fixed-cost-actions.ts`

- **File:** [fixed-cost-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/fixed-cost-actions.ts#L11-L37)
- **Vấn đề:** Dùng function `normalizeFixedCost()` tự viết thay vì Zod schema. Không nhất quán với pattern V2 Hardened của tất cả các file action khác.
- **Cách sửa:** Tạo `createFixedCostSchema` trong `finance.schema.ts` và sử dụng trong actions.

### W2. Missing Zod Validation — `payment-actions.ts`

- **File:** [payment-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/payment-actions.ts#L25-L29)
- **Vấn đề:** `createPaymentReceipt` chỉ check `amount <= 0` bằng if statement đơn giản, không dùng Zod. Input không được validate đầy đủ (thiếu check UUID format cho `contractId`, kiểm tra `paymentDate` format, v.v.).
- **Cách sửa:** Tạo `createPaymentSchema` trong `finance.schema.ts`.

### W3. Missing Period Lock — `debt-actions.ts` và `investment-actions.ts`

- **File:** [debt-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/debt-actions.ts), [investment-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/investment-actions.ts)
- **Vấn đề:** Expenses, receipts, payments đều check `is_period_locked` trước khi tạo/sửa/xóa. Nhưng **debts, investments, fixed costs, goals, salaries, credit cards** không check period lock → vẫn có thể thao tác trên kỳ đã chốt sổ.
- **Hậu quả:** Báo cáo tài chính sau chốt sổ có thể bị thay đổi.

### W4. `eslint-disable` Untyped Supabase Client

- **File:** [salary-actions.ts:19](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/salary-actions.ts#L19), [expense-actions.ts:24](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/expense-actions.ts#L24)
- **Vấn đề:** 2 chỗ dùng `// eslint-disable-next-line @typescript-eslint/no-explicit-any` cho tham số `supabase: any`. Mất type safety.
- **Cách sửa:** Dùng type từ `@supabase/supabase-js`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
async function checkPeriodLock(supabase: SupabaseClient, date: string) { ... }
```

### W5. N+1 Pattern — `fetchLabDebts`

- **File:** [finance-operations-queries.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/finance-operations-queries.ts#L214-L257)
- **Vấn đề:** Fetch toàn bộ `printing_orders` + toàn bộ `lab_payments` rồi gom nhóm bằng JS. Khi có 500+ đơn in → tải toàn bộ data về server action → chậm.
- **Cách sửa:** Tạo RPC `finance_lab_debt_summary` dùng SQL `GROUP BY lab_id` để tính tổng trực tiếp trong DB.

### W6. `getBudgetsWithActuals` — 3 Queries Tuần Tự

- **File:** [goal-budget-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/goal-budget-actions.ts#L175-L226)
- **Vấn đề:** Thực hiện 3 query riêng biệt tuần tự (budgets → expenses → categories) rồi join bằng JS. Có thể gom thành 1 RPC hoặc ít nhất dùng `Promise.all`.
- **Cách sửa:** Dùng `Promise.all` cho 3 query, hoặc tốt hơn là tạo RPC `finance_budget_vs_actual`.

### W7. `createDebt` Dùng `input.status` Bỏ Qua Zod Validation

- **File:** [debt-actions.ts:65](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/debt-actions.ts#L65)
- **Vấn đề:** Sau khi validate bằng `createDebtSchema`, code lại dùng `input.status` (raw input) thay vì `parsed.data.status`. Nếu schema không có field `status`, giá trị unvalidated sẽ lọt vào DB.
- **Cách sửa:** Thêm `status` vào `createDebtSchema` hoặc dùng `parsed.data` nhất quán.

---

## 🟢 Suggestions (Tùy chọn — cải thiện chất lượng)

### S1. AI Analysis Stub — `analyze-finance-actions.ts`

- **File:** [analyze-finance-actions.ts](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/analyze-finance-actions.ts)
- **Tình trạng:** File chỉ là stub, trả về message cố định "Chức năng đang phát triển". Không ảnh hưởng runtime nhưng nên được ghi nhận trong roadmap.

### S2. Error Messages Không Nhất Quán (Tiếng Việt)

- **Mô tả:** Một số file dùng tiếng Việt có dấu (`"Lỗi tạo công nợ"`), một số không có dấu (`"Loi tao chi phi co dinh"`). Nên chuẩn hóa toàn bộ sang tiếng Việt có dấu.
- **Files:** `fixed-cost-actions.ts`, `finance-category-actions.ts`, `finance-operations-queries.ts`

### S3. Missing Optimistic Lock — Một Số Update Functions

- **Mô tả:** `updateDebt`, `updateExpense`, `updateGoal`, `updateInvestment` đã có optimistic lock (check `expectedUpdatedAt`). Nhưng `updateFixedCost`, `updateCreditCard`, `updateFinanceCategory` **chưa có**.
- **Cách sửa:** Thêm tham số `expectedUpdatedAt` + check trước khi update.

### S4. `fetchDebts` Không Có Pagination

- **File:** [finance-operations-queries.ts:184](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/finance-operations-queries.ts#L184)
- **Vấn đề:** Fetch tất cả debts không giới hạn. Khi có 500+ công nợ → tải toàn bộ. Nên thêm pagination tương tự `fetchReceipts` / `fetchExpenses`.

### S5. `fetchGoals` và `fetchFixedCosts` Không Có Pagination

- **File:** [finance-operations-queries.ts:259](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/finance-operations-queries.ts#L259), [finance-operations-queries.ts:352](file:///c:/Users/Admin/Desktop/Ai/mood%20saas/mood-studio/app/actions/finance-operations-queries.ts#L352)
- **Tương tự S4**: Không có pagination cho goals, fixed costs, investments.

---

## ✅ Điểm Tốt (Đã Đạt Chuẩn)

| Tiêu chí | Trạng thái |
|---|---|
| `withAdmin` cho tất cả mutations | ✅ 100% |
| `writeAuditLog` sau mỗi mutation | ✅ 100% |
| Zod validation (trừ W1, W2) | ✅ 12/14 files |
| Period lock cho expenses, receipts, payments | ✅ |
| Optimistic lock cho update (trừ S3) | ✅ 4/7 update functions |
| Atomic RPC cho goal contributions | ✅ `contribute_to_goal` |
| Atomic RPC cho sale receipts | ✅ `create_sale_receipt_atomic` |
| SWR caching pattern | ✅ Consistent |
| No `console.log` / `console.error` | ✅ Zero |
| No TODO/FIXME trong UI | ✅ Zero |
| Type-safe query responses | ✅ `satisfies` operator |
| Error boundary + toast notifications | ✅ |
| Responsive Desktop/Mobile split | ✅ expenses, receipts |
| `revalidatePath` cross-module | ✅ finance ↔ contracts |

---

## Kiến Trúc Tổng Quan

```
app/actions/                   (14 files — server actions)
├── finance-dashboard-queries  → Dashboard KPIs, charts, ledger (RPC-based)
├── finance-operations-queries → CRUD queries for all sub-modules
├── debt-actions               → Debts + Credit Card CRUD
├── expense-actions            → Expenses CRUD + Auto fixed costs
├── receipt-actions            → Receipts + Atomic sale receipt
├── payment-actions            → Contract payment flow ⚠️ C1
├── salary-actions             → Salary adjustments + recalculation
├── goal-budget-actions        → Goals + Contributions + Budgets ⚠️ C2
├── investment-actions         → Investments + Maintenance logs
├── fixed-cost-actions         → Fixed costs CRUD
├── finance-close-actions      → Monthly close workflow (8-step)
├── finance-category-actions   → Transaction categories CRUD
├── finance-cashflow-timeline  → Cashflow timeline aggregation
└── analyze-finance-actions    → AI analysis (STUB)

components/finance/            (35+ files — UI)
├── dashboard/                 → KPIs, charts, profit report
├── debts/                     → Debt list + form
├── expenses/                  → Desktop table + Mobile list + Form
├── receipts/                  → Desktop table + Mobile list + Form
├── salaries/                  → Salary list + Adjustment + Detail
├── goals/                     → Goal list + Contribution + Form
├── investments/               → Investment list + Form
├── fixed-costs/               → Fixed cost list + Form
├── closes/                    → Close workflow + Detail
├── categories/                → Category manager + Form
├── cashflow/                  → Ledger (Desktop + Mobile)
├── budget/                    → Budget vs Actual
└── integrity/                 → Ghost scan widget

types/                         (2 files)
├── finance-dashboard.ts       → Dashboard + Ledger types
└── finance-operations.ts      → All operations types

lib/validations/
└── finance.schema.ts          → 8 Zod schemas
```

---

## Next Steps

```
📋 Anh muốn làm gì tiếp theo?

1️⃣ Xem báo cáo chi tiết (đã xem)
2️⃣ Sửa lỗi Critical ngay (dùng /code)
3️⃣ Dọn dẹp code smell (dùng /refactor) 
4️⃣ Bỏ qua, lưu báo cáo vào /save-brain
5️⃣ 🔧 FIX ALL — Tự động sửa TẤT CẢ lỗi có thể sửa

Gõ số (1-5) để chọn:
```

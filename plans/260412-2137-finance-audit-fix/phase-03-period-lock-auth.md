# Phase 03: Period Lock + Auth Consistency
Status: ✅ Complete (2026-04-12)
Dependencies: Phase 02
Priority: 🟡 Warning

## Objective
Đảm bảo tất cả mutation actions trong module finance đều check period lock trước khi thao tác, và loại bỏ `eslint-disable` for `any` type.

## Audit Items
- **W3**: Missing period lock cho debts, investments, fixed costs, goals, salaries, credit cards
- **W4**: `eslint-disable` untyped supabase client (2 files)

---

## Implementation Steps

### 1. Tạo Shared Period Lock Helper (W3)

- [ ] **1.1** Tạo hoặc tái sử dụng helper `checkPeriodLock` đã có trong `expense-actions.ts`
- [ ] **1.2** Quyết định strategy: Extract helper sang `lib/finance-utils.ts` để share:
  ```ts
  // lib/finance-utils.ts
  import type { SupabaseClient } from "@supabase/supabase-js";
  
  export async function checkPeriodLock(supabase: SupabaseClient, date: string) {
    const { data: isLocked } = await supabase.rpc("is_period_locked", { p_date: date });
    if (isLocked) {
      throw new Error("Kỳ này đã chốt sổ, không thể thay đổi dữ liệu.");
    }
  }
  ```

### 2. Thêm Period Lock cho Debt Actions (W3)

- [ ] **2.1** `createDebt` — Lock check dùng `due_date` hoặc ngày hiện tại
- [ ] **2.2** `updateDebt` — Lock check dùng old record date
- [ ] **2.3** `deleteDebt` (now soft delete) — Lock check dùng `due_date`

### 3. Thêm Period Lock cho Investment Actions (W3)

- [ ] **3.1** `createInvestment` — Lock check dùng `purchase_date`
- [ ] **3.2** `updateInvestment` — Lock check dùng old `purchase_date`
- [ ] **3.3** `deleteInvestment` — Lock check dùng `purchase_date`

### 4. Thêm Period Lock cho Fixed Cost Actions (W3)

- [ ] **4.1** `createFixedCost` — Lock check dùng `start_date` hoặc ngày hiện tại
- [ ] **4.2** `updateFixedCost` — Lock check
- [ ] **4.3** `deleteFixedCost` — Lock check

### 5. Thêm Period Lock cho Goal/Budget Actions (W3)

- [ ] **5.1** `addContribution` — Lock check dùng ngày hiện tại
- [ ] **5.2** `undoContribution` — Lock check (hoặc skip vì RPC đã handle)
- [ ] **5.3** `upsertBudget` — Lock check dùng `period_month/period_year` → first day of month
- [ ] **5.4** `deleteBudget` — Lock check

### 6. Thêm Period Lock cho Salary Actions (W3)

- [ ] **6.1** `addSalaryAdjustment` — Lock check dùng salary month/year → first day
- [ ] **6.2** `deleteSalaryAdjustment` — Lock check

### 7. Thêm Period Lock cho Credit Card Actions (W3)

- [ ] **7.1** `createCreditCard` — Lock check ngày hiện tại (hoặc skip — credit card ít liên quan period)
- [ ] **7.2** `updateCreditCard` — Lock check
- [ ] **7.3** `deleteCreditCard` — Lock check

### 8. Fix Untyped Supabase Client (W4)

- [ ] **8.1** File `salary-actions.ts:19-20`:
  ```ts
  // BEFORE:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function recalculateEmployeeSalary(supabase: any, ...)
  
  // AFTER:
  import type { SupabaseClient } from "@supabase/supabase-js";
  async function recalculateEmployeeSalary(supabase: SupabaseClient, ...)
  ```
- [ ] **8.2** File `expense-actions.ts:24-25`:
  ```ts
  // BEFORE:
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function checkPeriodLock(supabase: any, date: string)
  
  // AFTER: (Đã move sang lib/finance-utils.ts với SupabaseClient type)
  ```
  Xóa local `checkPeriodLock` và import từ `lib/finance-utils.ts`

---

## Files to Create/Modify

| Action | File | Changes |
|--------|------|---------|
| CREATE | `lib/finance-utils.ts` | Shared `checkPeriodLock` with proper type |
| MODIFY | `app/actions/debt-actions.ts` | Add period lock (3 functions) |
| MODIFY | `app/actions/investment-actions.ts` | Add period lock (3 functions) |
| MODIFY | `app/actions/fixed-cost-actions.ts` | Add period lock (3 functions) |
| MODIFY | `app/actions/goal-budget-actions.ts` | Add period lock (4 functions) |
| MODIFY | `app/actions/salary-actions.ts` | Add period lock + fix SupabaseClient type |
| MODIFY | `app/actions/expense-actions.ts` | Remove local helper, import shared |

## Test Criteria
- [ ] Tất cả mutation functions check period lock
- [ ] Zero `eslint-disable` liên quan `any` type trong finance actions
- [ ] Build thành công
- [ ] Thao tác trên kỳ đã chốt sổ → nhận error "Kỳ này đã chốt sổ"

## Notes
- ⚠️ Credit card CRUD có thể không cần period lock vì không liên quan trực tiếp đến báo cáo kỳ. Cân nhắc skip hoặc dùng ngày hiện tại.
- ⚠️ Goals/Budgets: period lock theo `contribution_date` hoặc `period_month/year` — cần quyết định rõ date nào.

---
Next Phase: → [Phase 04: Performance Optimization](./phase-04-performance-optimization.md)

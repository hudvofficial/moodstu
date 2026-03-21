# Plan: Phase 10 — Finance Module Full Port (V2 = V1 + Optimized)

Created: 2026-03-21T12:43
Status: 🟡 In Progress

## Overview

Split `finance-actions.ts` (550 lines, vi phạm lesson #7: max 250) thành 7 files.
Port thêm 5 file V1 chưa port: expenses.ts, creditCards.ts, investments.ts, analyzeFinance.ts, salary-adjustments.ts.

## V1 → V2 Optimization Pattern

Mỗi file V2 áp dụng:
- `withAuth` thay `withAdmin` (chuẩn V2)
- `fireAuditLog` thay `writeAuditLog` 
- Error messages tiếng Việt rõ ràng
- Input validation trước DB call

## Phases

| # | Task | V1 Source | V2 File | Status |
|---|------|-----------|---------|--------|
| A | Split Expenses | finance.ts (expense fns) + expenses.ts | `expense-actions.ts` | ⬜ |
| B | Split Receipts | finance.ts (receipt fns) | `receipt-actions.ts` | ⬜ |
| C | Split Debts + Credit Cards | debts.ts + creditCards.ts | `debt-actions.ts` | ⬜ |
| D | Split Goals + Budgets | goals.ts + budgets.ts | `goal-budget-actions.ts` | ⬜ |
| E | Port Investments (NEW) | investments.ts (234 lines) | `investment-actions.ts` | ⬜ |
| F | Port Salary Adjustments (NEW) | salary-adjustments.ts (153 lines) | `salary-actions.ts` | ⬜ |
| G | Port Analyze Finance (NEW stub) | analyzeFinance.ts (47 lines) | `analyze-finance-actions.ts` | ⬜ |
| H | DB Migrations cho tables thiếu | — | Supabase migrations | ⬜ |
| I | Xóa finance-actions.ts gốc | — | — | ⬜ |
| J | Build verify + lessons update | — | — | ⬜ |

## Detail per file

### A. expense-actions.ts (~180 lines)
**V1 sources:** `finance.ts` (approveExpense, deleteExpense, createExpense, updateExpense) + `expenses.ts` (generateMonthlyFixedCosts)
**V2 tối ưu:**
- `withAuth` wrapper
- `fireAuditLog` cho mọi mutation
- `generateMonthlyFixedCosts` → adapt `fixed_costs` table (cần migration)
- 5 functions total

### B. receipt-actions.ts (~140 lines)
**V1 sources:** `finance.ts` (deleteReceipt, createReceipt, createSaleReceipt)
**V2 tối ưu:**
- `withAuth` wrapper
- `fireAuditLog` audit trail
- Atomic RPC `create_sale_receipt_atomic` preserved
- 3 functions total

### C. debt-actions.ts (~170 lines)
**V1 sources:** `debts.ts` (createDebt, updateDebt, deleteDebt, markInstallmentPaid) + `creditCards.ts` (createCreditCard, updateCreditCard, deleteCreditCard)
**V2 tối ưu:**
- `withAuth` + `fireAuditLog` cho debts (V1 thiếu audit!)
- Credit cards CRUD port nguyên + thêm audit
- `credit_cards` table cần migration
- 7 functions total

### D. goal-budget-actions.ts (~240 lines)
**V1 sources:** `goals.ts` (createGoal, updateGoal, deleteGoal, addContribution, undoContribution, enrichGoals) + `budgets.ts` (upsertBudget, deleteBudget, getBudgetsWithActuals)
**V2 tối ưu:**
- `withAuth` wrapper
- Atomic RPC `contribute_to_goal` + `decrement_goal_amount` preserved
- `enrichGoals` pure function (no DB) — keep as shared helper
- 9 functions total

### E. investment-actions.ts (~200 lines) — NEW PORT
**V1 source:** `investments.ts` (createInvestment, updateInvestment, deleteInvestment, addMaintenanceLog)
**V2 tối ưu:**
- `withAuth` + `fireAuditLog`
- `investments` + `investment_maintenance_logs` tables cần migration
- Auto-calculate next_maintenance_date logic preserved
- 4 functions + types

### F. salary-actions.ts (~130 lines) — NEW PORT
**V1 source:** `salary-adjustments.ts` (addSalaryAdjustment, deleteSalaryAdjustment, recalculateEmployeeSalary)
**V2 tối ưu:**
- `withAuth` + `fireAuditLog`
- `employee_salaries` + `monthly_salaries` tables — check if exist
- `recalculateEmployeeSalary` shared helper
- 3 functions

### G. analyze-finance-actions.ts (~50 lines) — STUB
**V1 source:** `analyzeFinance.ts` (analyzeFinance)
**V2:** Stub — depends on `lib/analytics/` which isn't ported yet
- Return placeholder, mark TODO
- 1 function

### H. DB Migrations needed
- [x] receipts (done earlier)
- [x] budgets (done earlier)
- [x] financial_goals (done earlier)
- [x] goal_contributions (done earlier)
- [x] contribute_to_goal RPC (done earlier)
- [x] decrement_goal_amount RPC (done earlier)
- [ ] credit_cards
- [ ] fixed_costs
- [ ] investments
- [ ] investment_maintenance_logs
- [ ] employee_salaries (check existing)
- [ ] monthly_salaries (check existing)

## Files to Delete
- `app/actions/finance-actions.ts` (replaced by A-G)

## Test Criteria
- [ ] All 7 files < 250 lines each
- [ ] `npm run dev` builds without errors
- [ ] All V1 functions have V2 counterpart (≥35 functions)
- [ ] No function dropped vs V1

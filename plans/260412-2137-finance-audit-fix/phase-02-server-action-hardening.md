# Phase 02: Server Action Hardening
Status: ✅ Complete (2026-04-12)
Dependencies: Phase 01 (RPCs + migrations must exist)
Priority: 🔴🟡 Critical + Warning

## Objective
Cập nhật server actions để sử dụng RPCs mới, chuyển sang soft delete, và bổ sung Zod validation còn thiếu.

## Audit Items
- **C1**: Refactor `createPaymentReceipt` → dùng RPC `process_contract_payment`
- **C2**: Refactor `undoContribution` → dùng RPC `undo_contribution_atomic`
- **C3**: Chuyển 7 delete functions sang soft delete
- **W1**: Thêm Zod schema cho `fixed-cost-actions.ts`
- **W2**: Thêm Zod schema cho `payment-actions.ts`
- **W7**: Fix `createDebt` dùng raw `input.status`

---

## Implementation Steps

### 1. Refactor `createPaymentReceipt` (C1)

- [ ] **1.1** File: `app/actions/payment-actions.ts`
- [ ] **1.2** Thay thế Steps 1–6 bằng single RPC call:
  ```ts
  const { data, error } = await supabase.rpc("process_contract_payment", {
    p_contract_id: validated.contractId,
    p_amount: validated.amount,
    p_payment_method: validated.paymentMethod,
    p_payment_date: validated.paymentDate,
    p_payment_stage: validated.paymentStage,
    p_category_id: validated.categoryId,
    p_notes: validated.notes,
    p_payment_plan_id: validated.paymentPlanId,
    p_update_total: validated.updateTotal,
    p_user_id: userId,
  });
  ```
- [ ] **1.3** Giữ nguyên audit log + revalidatePath sau RPC
- [ ] **1.4** Xóa code cũ (Steps 1–6)

### 2. Refactor `undoContribution` (C2)

- [ ] **2.1** File: `app/actions/goal-budget-actions.ts`
- [ ] **2.2** Thay thế 3 operations bằng single RPC:
  ```ts
  const { error } = await supabase.rpc("undo_contribution_atomic", {
    p_contribution_id: contributionId,
  });
  if (error) throw new Error(`Lỗi hoàn tác: ${error.message}`);
  ```
- [ ] **2.3** Giữ nguyên audit log + revalidatePath
- [ ] **2.4** Xóa code fetch + delete + decrement + status check

### 3. Chuyển 6 Delete Functions sang Soft Delete (C3)

Mỗi function: thay `.delete().eq("id", id)` → `.update({ deleted_at: new Date().toISOString() }).eq("id", id)`

- [ ] **3.1** `deleteDebt` — `debt-actions.ts:136`
- [ ] **3.2** `deleteGoal` — `goal-budget-actions.ts:71`
- [ ] **3.3** `deleteBudget` — `goal-budget-actions.ts:163`
- [ ] **3.4** `deleteFixedCost` — `fixed-cost-actions.ts:98`
- [ ] **3.5** `deleteInvestment` — `investment-actions.ts:126`
- [ ] **3.6** `deleteReceipt` — `receipt-actions.ts:41`
- [ ] **3.7** `deleteCreditCard` — `debt-actions.ts:232`

### 4. Thêm Soft Delete Filter cho Queries (C3)

Thêm `.is("deleted_at", null)` vào read queries:

- [ ] **4.1** `fetchDebts` — `finance-operations-queries.ts:186`
- [ ] **4.2** `fetchFixedCosts` — `finance-operations-queries.ts:261`
- [ ] **4.3** `fetchInvestments` — `finance-operations-queries.ts:273`
- [ ] **4.4** `fetchGoals` — `finance-operations-queries.ts:354`
- [ ] **4.5** `fetchReceipts` — `finance-operations-queries.ts:123`  
  *(Kiểm tra xem receipts query đã có filter chưa)*
- [ ] **4.6** `getBudgetsWithActuals` — `goal-budget-actions.ts:178`

### 5. Thêm Zod Schema cho Fixed Costs (W1)

- [ ] **5.1** File: `lib/validations/finance.schema.ts`
- [ ] **5.2** Tạo `createFixedCostSchema`:
  ```ts
  export const createFixedCostSchema = z.object({
    cost_name: z.string().min(1, "Tên chi phí không được để trống").trim(),
    cost_type: z.string().optional().nullable(),
    monthly_amount: z.number().positive("Số tiền hàng tháng phải > 0"),
    deposit_amount: z.number().min(0).optional().nullable(),
    start_date: z.string().date().optional().nullable(),
    end_date: z.string().date().optional().nullable(),
    description: z.string().optional().nullable(),
    cost_code: z.string().optional(),
  });
  export const updateFixedCostSchema = createFixedCostSchema.partial();
  ```
- [ ] **5.3** Cập nhật `fixed-cost-actions.ts` dùng schema thay `normalizeFixedCost`

### 6. Thêm Zod Schema cho Payment (W2)

- [ ] **6.1** File: `lib/validations/finance.schema.ts`
- [ ] **6.2** Tạo `createPaymentSchema`:
  ```ts
  export const createPaymentSchema = z.object({
    contractId: z.string().uuid("Contract ID không hợp lệ"),
    amount: z.number().positive("Số tiền phải > 0"),
    paymentDate: z.string().date(),
    paymentMethod: z.enum(["tien_mat", "chuyen_khoan"]),
    paymentStage: z.string().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
    paymentPlanId: z.string().uuid().optional().nullable(),
    updateTotal: z.boolean().default(false),
  });
  ```
- [ ] **6.3** Cập nhật `payment-actions.ts` dùng schema

### 7. Fix `createDebt` Raw Input Bypass (W7)

- [ ] **7.1** File: `debt-actions.ts:65`
- [ ] **7.2** Thêm `status` vào `createDebtSchema`:
  ```ts
  export const createDebtSchema = z.object({
    // ... existing fields
    status: z.enum(["dang_no", "da_thanh_toan"]).default("dang_no"),
  });
  ```
- [ ] **7.3** Thay `input.status || "dang_no"` → `parsed.data.status`

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/actions/payment-actions.ts` | C1 (RPC) + W2 (Zod) |
| `app/actions/goal-budget-actions.ts` | C2 (RPC) |
| `app/actions/debt-actions.ts` | C3 (soft delete) + W7 (status bypass) |
| `app/actions/fixed-cost-actions.ts` | C3 (soft delete) + W1 (Zod) |
| `app/actions/investment-actions.ts` | C3 (soft delete) |
| `app/actions/receipt-actions.ts` | C3 (soft delete) |
| `app/actions/finance-operations-queries.ts` | C3 (add deleted_at filters) |
| `lib/validations/finance.schema.ts` | W1 + W2 + W7 (new schemas) |

## Test Criteria
- [ ] `createPaymentReceipt` dùng RPC, không có multi-step
- [ ] `undoContribution` dùng RPC, single call
- [ ] Tất cả 7 delete functions → soft delete
- [ ] Tất cả read queries có `.is("deleted_at", null)`
- [ ] Zod validation cho fixed-cost, payment, debt status
- [ ] Build thành công (`npm run build`)

---
Next Phase: → [Phase 03: Period Lock + Auth Consistency](./phase-03-period-lock-auth.md)

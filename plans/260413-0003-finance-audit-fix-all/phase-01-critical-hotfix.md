# Phase 01: 🔴 Critical Hotfix
Status: ⬜ Pending
Dependencies: None
Priority: P0 — Sửa ngay

## Objective
Sửa 1 lỗi logic nghiêm trọng ảnh hưởng tính toàn vẹn dữ liệu kế toán.

## Issue: C1 — `deleteSalaryAdjustment` Period Lock sai thứ tự

**Root cause**: `checkPeriodLock()` được gọi SAU khi `DELETE` đã thực hiện (line 121-127 trong salary-actions.ts). Nếu kỳ đã khoá sổ, data đã bị xoá không thể rollback.

**Nguyên tắc**: Mọi `checkPeriodLock()` phải đặt TRƯỚC mutation query.

## Files to Modify

### 1. `app/actions/salary-actions.ts`

**Task 1.1**: Di chuyển `checkPeriodLock` lên TRƯỚC `delete()`

Hiện tại (SAI):
```typescript
// Line 113-143
export async function deleteSalaryAdjustment(id: string, salaryId: string) {
  return withAdmin(async (supabase) => {
    const { data: oldData } = await supabase
      .from("salary_adjustments")
      .select("amount, type, reason")
      .eq("id", id)
      .single();

    const { error: deleteError } = await supabase.from("salary_adjustments").delete().eq("id", id);
    if (deleteError) throw new Error(`Lỗi xóa điều chỉnh: ${deleteError.message}`);

    // W3: Period lock  <-- SAI: Lock check SAU delete
    const { data: salaryRecord } = await supabase.from("employee_salaries").select("month, year").eq("id", salaryId).single();
    if (salaryRecord) {
      await checkPeriodLock(supabase, firstDayOfMonth(salaryRecord.month, salaryRecord.year));
    }
    ...
```

Sửa thành (ĐÚNG):
```typescript
export async function deleteSalaryAdjustment(id: string, salaryId: string) {
  return withAdmin(async (supabase) => {
    // W3: Period lock — TRƯỚC mutation
    const { data: salaryRecord } = await supabase.from("employee_salaries").select("month, year").eq("id", salaryId).single();
    if (salaryRecord) {
      await checkPeriodLock(supabase, firstDayOfMonth(salaryRecord.month, salaryRecord.year));
    }

    const { data: oldData } = await supabase
      .from("salary_adjustments")
      .select("amount, type, reason")
      .eq("id", id)
      .single();

    const { error: deleteError } = await supabase.from("salary_adjustments").delete().eq("id", id);
    if (deleteError) throw new Error(`Lỗi xóa điều chỉnh: ${deleteError.message}`);

    // (period lock block đã chuyển lên trên)
    ...
```

**Task 1.2**: Thêm guard check cho `oldData` null

Hiện tại chưa check `if (!oldData)` trước delete — nếu adjustment không tồn tại, delete sẽ silently succeed nhưng `recalculateEmployeeSalary` chạy vô nghĩa.

```typescript
    if (!oldData) throw new Error("Không tìm thấy khoản điều chỉnh cần xóa.");
```

**Task 1.3**: Review `payment-actions.ts` — thiếu `checkPeriodLock`

`createPaymentReceipt` hiện KHÔNG gọi `checkPeriodLock()` trước mutation. Thêm:

```typescript
export async function createPaymentReceipt(input: CreatePaymentInput) {
  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) { ... }

  return withAdmin(async (supabase, userId) => {
    // W3: Period lock
    await checkPeriodLock(supabase, input.paymentDate);
    
    // Existing RPC call...
```

## Implementation Steps
1. [x] Xác nhận scope — chỉ sửa logic ordering, không refactor
2. [ ] Sửa `salary-actions.ts` — di chuyển checkPeriodLock + thêm null guard
3. [ ] Sửa `payment-actions.ts` — thêm checkPeriodLock
4. [ ] Verify: grep toàn bộ finance actions xác nhận mọi mutation đều có period lock TRƯỚC mutation

## Test Criteria
- [ ] `deleteSalaryAdjustment` trên kỳ đã khoá sổ → throw error TRƯỚC khi xoá
- [ ] `createPaymentReceipt` trên kỳ đã khoá sổ → throw error TRƯỚC khi tạo payment
- [ ] TypeScript build pass (`npm run build`)

---
Next Phase: → Phase 02 (Code Consolidation)

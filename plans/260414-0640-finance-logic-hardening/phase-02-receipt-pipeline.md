# Phase 02: Contract Receipt → Payment Pipeline
Status: ⬜ Pending
Dependencies: Phase 01 (sale RPC must exist)

## Objective
Fix 2 nghiệp vụ quan trọng nhất:
1. Thu hợp đồng (contract_payment / contract_deposit) PHẢI đi qua `payments` pipeline → update contract `paid_amount`, `remaining_amount`, `payment_status`
2. Sale receipt PHẢI atomic — xóa fallback non-atomic, fail rõ ràng nếu RPC missing

## Requirements
### Functional
- [ ] `createReceipt()` khi `receipt_type` ∈ {contract_payment, contract_deposit} + có `contract_id` → delegate sang `createPaymentReceipt()`
- [ ] `createReceipt()` khi standalone (other_income, sale_receipt KHÔNG có contract_id) → insert `receipts` table như cũ
- [ ] `createSaleReceipt()` fallback non-atomic bị XÓA → throw Error nếu RPC missing
- [ ] Audit log có `source: "server_action"` ở cả 2 paths

### Non-Functional
- [ ] Zero data inconsistency: contract paid amounts LUÔN khớp payments table
- [ ] Không trust client-sent `previous_paid`, `total_amount`
- [ ] Fail-fast: nếu RPC chưa deploy → error message rõ ràng

## Implementation Steps

### Step 1: Modify `createReceipt()` — Route contract receipts

**File:** `app/actions/receipt-actions.ts`
**Scope:** Function `createReceipt()` (line 79-152)

```typescript
// TRƯỚC: Insert tất cả vào receipts table
// SAU: Check receipt_type + contract_id → route

export async function createReceipt(input: CreateReceiptInput) {
  return withAdmin(async (supabase) => {
    const parsed = createReceiptSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    await checkPeriodLock(supabase, parsed.data.receipt_date);

    const isContractReceipt = 
      (parsed.data.receipt_type === "contract_payment" || parsed.data.receipt_type === "contract_deposit")
      && parsed.data.contract_id;

    // ─── CONTRACT RECEIPT → PAYMENTS PIPELINE ───
    if (isContractReceipt) {
      // Import createPaymentReceipt từ payment-actions.ts
      const { createPaymentReceipt } = await import("./payment-actions");
      const result = await createPaymentReceipt({
        contractId: parsed.data.contract_id!,
        amount: parsed.data.receipt_amount,
        paymentDate: parsed.data.receipt_date,
        paymentMethod: parsed.data.payment_type as "tien_mat" | "chuyen_khoan",
        paymentStage: parsed.data.receipt_type === "contract_deposit" ? "coc" : "thanh_toan",
        categoryId: parsed.data.category_id || null,
        notes: parsed.data.notes || null,
        paymentPlanId: null,
        updateTotal: false,
      });
      // createPaymentReceipt đã revalidatePath + audit log
      return result;
    }

    // ─── STANDALONE RECEIPT (other_income, sale_receipt) ───
    const status = getReceiptStatus(parsed.data.receipt_type);
    const insertData = {
      receipt_date: parsed.data.receipt_date,
      receipt_type: parsed.data.receipt_type,
      payment_type: parsed.data.payment_type,
      contract_id: null, // standalone — không gắn HĐ
      contract_code: null,
      receipt_amount: parsed.data.receipt_amount,
      previous_paid: 0,
      total_amount: 0,
      remaining_amount: 0,
      notes: parsed.data.notes || "",
      status,
      category_id: parsed.data.category_id || null,
      category_name: input.category_name || "",
    };

    const { data, error } = await supabase
      .from("receipts")
      .insert(insertData)
      .select("id")
      .single();
      
    if (error) throw new Error(`Lỗi tạo phiếu thu: ${error.message}`);

    await writeAuditLog({ 
      action: "CREATE", 
      tableName: "receipts", 
      recordId: data?.id,
      newData: insertData as unknown as Record<string, unknown>,
      description: `Tạo phiếu thu ${parsed.data.receipt_amount.toLocaleString("vi-VN")}₫`,
      source: "server_action",
    });
    
    revalidatePath("/finance");
    return null;
  });
}
```

**Key changes:**
- `isContractReceipt` check → delegate sang payment pipeline
- Standalone path: `contract_id = null`, `previous_paid = 0`, `total_amount = 0`
- XÓA toàn bộ code cũ query `contracts` table trong createReceipt (line 92-128)

### Step 2: Remove non-atomic fallback from `createSaleReceipt()`

**File:** `app/actions/receipt-actions.ts`  
**Scope:** Function `createSaleReceipt()` (line 239-370)

```typescript
// XÓA: Line 282-352 (entire fallback block)
// THAY BẰNG:
if (error && isMissingRpcError(error)) {
  throw new Error(
    "Migration create_sale_receipt_atomic chưa được chạy. " +
    "Vui lòng chạy: npx supabase migration up"
  );
}
```

**Cũng fix:**
- Thêm `source: "server_action"` cho audit log (line 358-364)
- Giữ nguyên RPC call path (line 262-280) và success handler (line 354-368)

### Step 3: Fix `deleteReceipt()` for contract receipts

**File:** `app/actions/receipt-actions.ts`
**Scope:** Function `deleteReceipt()` (line 42-75)

> **Lưu ý:** Hiện tại `deleteReceipt()` soft-delete receipt nhưng KHÔNG revert contract financials. Khi contract receipts đã chuyển sang payments pipeline, delete phải xử lý khác:
> - Nếu receipt có `contract_id` → throw Error "Không thể xóa phiếu thu hợp đồng. Vui lòng xóa thanh toán từ chi tiết hợp đồng."
> - Nếu standalone receipt → soft-delete như cũ

## Files to Create/Modify
- `app/actions/receipt-actions.ts` — [MODIFY] major refactor createReceipt + createSaleReceipt + deleteReceipt

## Test Criteria
- [ ] Tạo phiếu thu loại "Thu hợp đồng" + chọn HĐ → record xuất hiện trong `payments` table, KHÔNG trong `receipts`
- [ ] Contract `paid_amount` tăng đúng số tiền thu
- [ ] Contract `remaining_amount` giảm tương ứng
- [ ] Tạo phiếu thu loại "Thu khác" → record xuất hiện trong `receipts` table
- [ ] Dashboard KPI revenue tính đúng (payments + standalone receipts)
- [ ] Sale receipt khi RPC missing → error message clear
- [ ] Sale receipt khi RPC có → atomic insert + stock decrement
- [ ] Delete contract receipt → blocked with message

## Notes
- `createPaymentReceipt` đã có đầy đủ: Zod validation, period lock, RPC call, fallback, audit log, revalidate
- Dynamic import `await import("./payment-actions")` để tránh circular dependency
- Không cần sửa UI form — form vẫn gọi `createReceipt()`, server tự route

---
Next Phase: [Phase 03 — Soft-Delete Filters](phase-03-soft-delete-filters.md)

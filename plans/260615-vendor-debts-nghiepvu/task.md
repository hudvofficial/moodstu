# Task Breakdown — Vendor Debts Nghiệp Vụ Fixes

Kèm theo [implementation_plan.md](implementation_plan.md). Mỗi task bite-sized, có file path + code thực tế + acceptance.
Ký hiệu: **[P]** = chạy song song được; **[GATE]** = chờ duyệt; **[DONE]** = đã xong.

---

## W1 — Finance Integrity (Agent: A-FIN)

### T1.1 [DONE] Bỏ phiếu chi trùng trong `recordVendorPayment`
- **File:** `app/actions/vendor-payment-actions.ts`
- Đã xóa block `expenses.insert` (cũ dòng 146-158). Giữ phần fetch `vendor` (audit log còn dùng). ✅ Đã verify đọc code.

### T1.2 [P] Verify Phase 1
- **Action:**
  1. `npm run lint` và `npm run build` → không lỗi mới.
  2. Seed/dùng 1 task vendor đã hoàn thành; ghi lại `total_outflow` tháng đó (dashboard hoặc `SELECT SUM(amount) FROM expenses WHERE deleted_at IS NULL AND expense_date >= '<đầu tháng>' AND expense_date < '<đầu tháng sau>'`).
  3. Thực hiện 1 thanh toán vendor cho task đó qua `/finance/vendor-debts`.
  4. Đo lại `total_outflow` → **phải không tăng thêm**; bảng `expenses` **không** có dòng `[Auto-Vendor] Thanh toán công nợ ...` mới.
- **Acceptance:** outflow không đổi sau khi trả tiền; chỉ còn 1 expense accrual cho chi phí đó.

### T1.3 [P] Script thống kê dòng phiếu chi trùng (READ-ONLY)
- **File (NEW):** `scripts/vendor-expense-dupe-scan.sql`
- **Nội dung:**
  ```sql
  -- Read-only: đếm + tổng tiền các phiếu chi trùng (tạo lúc thanh toán, trước Phase 1)
  -- Dấu hiệu nhận diện CHÍNH XÁC dòng thừa: description '[Auto-Vendor] Thanh toán công nợ%'
  -- + work_task_id IS NULL + category_id IS NULL (dòng accrual luôn có 2 cột này).
  SELECT date_trunc('month', expense_date)::date AS thang,
         COUNT(*)        AS so_dong_thua,
         SUM(amount)     AS tong_tien_thua
  FROM public.expenses
  WHERE deleted_at IS NULL
    AND description LIKE '[Auto-Vendor] Thanh toán công nợ%'
    AND work_task_id IS NULL
    AND category_id IS NULL
  GROUP BY 1
  ORDER BY 1;
  ```
- **Acceptance:** chạy ra bảng theo tháng. **Không** sửa data. Đưa kết quả cho chủ dự án để quyết T1.4.

### T1.4 [GATE] Migration dọn data lịch sử (CHỜ DUYỆT — không tự chạy)
- **Tiền đề:** có kết quả T1.3 **và** chủ tài chính đồng ý.
- **Cảnh báo bắt buộc xử lý:** task hoàn thành **trước 2026-05-28** có thể KHÔNG có expense accrual → dòng phiếu chi lúc trả là expense DUY NHẤT. **KHÔNG soft-delete mù.** Chỉ soft-delete dòng thừa khi xác định vendor/kỳ đó đã có accrual tương ứng. Đụng kỳ đã khóa → cần override có kiểm soát.
- **Output mong đợi:** 1 migration `supabase/migrations/20260615xxxxxx_vendor_dupe_expense_cleanup.sql` set `deleted_at = NOW()` cho đúng tập dòng đã đối chiếu (kèm `WHERE expense_date >= '2026-05-28'` nếu chọn phương án an toàn theo mốc accrual).
- **Acceptance:** sau cleanup, `total_outflow` các tháng giảm đúng bằng `tong_tien_thua` đã đối chiếu; không tháng nào bị mất chi phí hợp lệ.

---

## W2 — Void Payment (Agent: A-VOID)

### T2.1 [P] Action `voidVendorPayment`
- **File:** `app/actions/vendor-payment-actions.ts` — **APPEND vào cuối file** (không đụng code có sẵn).
- **Code:**
  ```ts
  // ═══════════════════════════════════════════
  // Hủy thanh toán vendor
  // ═══════════════════════════════════════════

  const voidVendorPaymentSchema = z.object({
    payment_id: z.string().uuid("Payment ID không hợp lệ"),
  });

  /**
   * Hủy 1 thanh toán vendor. Hard-delete dòng vendor_payments → allocations tự xóa theo
   * ON DELETE CASCADE → công nợ vendor được tính lại đúng. (Phiếu chi lúc trả đã bỏ ở Phase 1
   * nên không còn expense nào phải dọn kèm.)
   */
  export async function voidVendorPayment(
    rawData: unknown
  ): Promise<ActionResult<{ payment_id: string }>> {
    const parsed = voidVendorPaymentSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
    }
    const { payment_id } = parsed.data;

    return withAdmin(async (supabase) => {
      const { data: payment, error: loadError } = await supabase
        .from("vendor_payments")
        .select("id, amount, payment_date, vendor_id, deleted_at")
        .eq("id", payment_id)
        .single();

      if (loadError || !payment) {
        throw new Error("Không tìm thấy thanh toán");
      }
      if (payment.deleted_at) {
        throw new Error("Thanh toán đã bị hủy trước đó");
      }

      // Không cho hủy trong kỳ kế toán đã khóa
      await checkPeriodLock(supabase, payment.payment_date);

      // Hard-delete → allocations cascade (vendor_payment_allocations ON DELETE CASCADE)
      const { error: delError } = await supabase
        .from("vendor_payments")
        .delete()
        .eq("id", payment_id);

      if (delError) {
        throw new Error(`Không thể hủy thanh toán: ${delError.message}`);
      }

      await writeAuditLog({
        action: "DELETE",
        tableName: "vendor_payments",
        recordId: payment_id,
        description: `Hủy thanh toán ${Number(payment.amount).toLocaleString()}đ`,
      });

      revalidatePath("/finance/vendor-debts");
      revalidatePath("/finance/salaries");
      revalidatePath("/finance/dashboard");

      return { payment_id };
    });
  }
  ```
- **Acceptance:** gọi với payment_id hợp lệ → payment + allocations biến mất, công nợ vendor tăng lại đúng phần đã phân bổ. Gọi trong kỳ khóa → throw "Kỳ kế toán đã khóa".

### T2.2 [P] Component `VendorPaymentHistoryDrawer`
- **File (NEW):** `components/finance/vendor-debts/vendor-payment-history-drawer.tsx`
- **Mirror:** [components/finance/debts/debt-history-drawer.tsx](../../components/finance/debts/debt-history-drawer.tsx) (cùng kiểu drawer + SWR + toast). Dùng:
  - `fetchVendorPaymentHistory(vendorId)` (đã có) để list.
  - Mỗi dòng hiển thị: `payment_date`, `amount` (format `formatVnd`), `payment_method`, `note`.
  - Nút **"Hủy"** mỗi dòng → confirm (dùng đúng pattern confirm có sẵn trong repo, vd `window.confirm` hoặc `ConfirmDialog` nếu debt-history-drawer dùng) → gọi `voidVendorPayment({ payment_id })` → nếu success: toast "Đã hủy thanh toán" + `mutate` lại SWR history + `onVoided?.()` để client cha revalidate danh sách công nợ.
  - Loading/empty state giống debts drawer.
- **Props:** `{ vendorId: string; vendorName: string; isOpen: boolean; onClose: () => void; onVoided?: () => void }`.
- **Acceptance:** mở drawer thấy danh sách payment; bấm Hủy → dòng biến mất, toast hiện, công nợ cập nhật.

### T2.3 [P] Mở drawer từ danh sách công nợ
- **Files:** `components/finance/vendor-debts/vendor-debts-client.tsx`, `vendor-debts-desktop-table.tsx`, `vendor-debts-mobile-list.tsx`
- **Action:**
  1. Trong `vendor-debts-client.tsx`: thêm state `historyVendor: VendorDebtItem | null`, render `<VendorPaymentHistoryDrawer vendorId={...} vendorName={...} isOpen onClose onVoided={revalidate} />`. Tái dùng `revalidate` (đã có cho SWR) làm `onVoided`.
  2. Desktop table + mobile list: thêm 1 action mỗi vendor row (icon "Lịch sử"/History) gọi `onShowHistory(vendor)` truyền lên client. Match style action sẵn có (nút "Thanh toán" hiện tại).
- **Acceptance:** mỗi vendor row có lối mở lịch sử; @768 + @1023 layout không vỡ.

### T2.4 [P] Verify W2
- `npm run lint` + `npm run build`. Render drawer @768/1023. Test luồng Hủy: công nợ quay lại đúng, dashboard `total_outflow` **không đổi** (vì payment không còn tạo expense).

---

## W3 — Overpay Guard (Agent: A-OVERPAY) — **Decision gate G-3 (default: CHẶN)**

### T3.1 [P] RPC chặn trả dư
- **File (NEW):** `supabase/migrations/20260615000001_vendor_payment_overpay_guard.sql`
- **Action:** `CREATE OR REPLACE FUNCTION public.record_vendor_payment_atomic(...)` — **giữ nguyên signature + toàn bộ body** copy từ [supabase/migrations/20260527000001_vendor_payment_rpcs.sql](../../supabase/migrations/20260527000001_vendor_payment_rpcs.sql) (dòng 112-282), CHỈ thêm 2 chỗ:
  1. Thêm vào khối `DECLARE`:
     ```sql
       v_total_remaining numeric := 0;
     ```
  2. Chèn ngay **SAU** block validate vendor (sau `END IF;` của "Validate vendor exists", **TRƯỚC** "Create payment record"):
     ```sql
       -- Chặn trả dư: số tiền không được vượt tổng công nợ còn lại của vendor
       SELECT COALESCE(SUM(GREATEST(COALESCE(wt.cost, 0) - COALESCE(a.allocated, 0), 0)), 0)
       INTO v_total_remaining
       FROM public.work_tasks wt
       LEFT JOIN (
         SELECT work_task_id, SUM(amount) AS allocated
         FROM public.vendor_payment_allocations
         GROUP BY work_task_id
       ) a ON a.work_task_id = wt.id
       WHERE wt.vendor_id = p_vendor_id
         AND wt.status = 'hoan_thanh'
         AND wt.cost > 0;

       IF p_amount > v_total_remaining THEN
         RAISE EXCEPTION 'Số tiền thanh toán vượt quá công nợ còn lại (còn %)', v_total_remaining;
       END IF;
     ```
  3. Giữ lại các dòng `GRANT EXECUTE ... TO authenticated;` ở cuối (copy từ source).
- **Acceptance:** gọi RPC với `p_amount > tổng remaining` → exception, không tạo payment. Bằng đúng remaining → OK.

### T3.2 [P] Modal chặn submit khi vượt công nợ
- **File:** `components/finance/vendor-debts/vendor-payment-modal.tsx`
- **Action:**
  1. Trong `handleSubmit`, sau check `amount <= 0`, thêm:
     ```ts
     if (amount > totalDebt) {
       toast.error("Số tiền vượt quá công nợ hiện tại");
       return;
     }
     ```
  2. Nút submit: đổi `disabled={isPending || amount <= 0 || isLoading}` → thêm `|| amount > totalDebt`.
  - (Giữ nguyên block cảnh báo `amount > totalDebt` đang có — giờ đồng bộ với việc chặn.)
- **Acceptance:** nhập số > tổng công nợ → nút disabled + submit báo lỗi, không gọi action.

### T3.3 [P] Verify W3
- `npm run lint` + `npm run build`. Test: trả dư bị chặn cả ở modal (UI) lẫn RPC (nếu gọi thẳng). Trả đúng/thiếu vẫn chạy bình thường.

---

## W4 — KPI Fix (Agent: A-KPI) — **Decision gate G-5 (default: REMOVE)**

### T4.1 [P] (DEFAULT) Bỏ ô KPI "Vendors quá hạn"
- **File:** `components/finance/vendor-debts/vendor-debts-stats-bar.tsx`
- **Action:**
  1. Xóa dòng 17-19 (`today` + `vendorsWithOverdueTasks`).
  2. Xóa object item thứ 4 (`label: "Vendors quá hạn"`, dòng 43-49).
  3. Xóa `AlertTriangle` khỏi import dòng 3 (giữ `Users, DollarSign, Calendar`).
- **Acceptance:** stats bar còn 3 ô (Vendors có nợ / Tổng công nợ / Tổng đã thanh toán); lint không báo unused import.

### T4.1-alt [OPTIONAL] Đổi sang KPI quá hạn THẬT (chỉ làm nếu chủ dự án muốn giữ)
> Nếu chọn alt: **chạy SAU A-VOID** vì cùng đụng `vendor-payment-actions.ts` (xem §4 plan).
- **File 1 (NEW):** `supabase/migrations/20260615000002_vendor_debt_oldest_unpaid.sql` — `CREATE OR REPLACE FUNCTION public.finance_vendor_debt_summary()` copy từ [20260527000001](../../supabase/migrations/20260527000001_vendor_payment_rpcs.sql) (dòng 16-96), thêm:
  - vào `RETURNS TABLE (...)`: `oldest_unpaid_task_date date`.
  - vào CTE `vendor_balances`: `MIN(tb.deadline) FILTER (WHERE tb.remaining > 0)::date AS oldest_unpaid_task_date`.
  - vào SELECT cuối: `vb.oldest_unpaid_task_date`.
  - Giữ `GRANT EXECUTE ... TO authenticated;`.
- **File 2:** `types/vendor.ts` **và** interface `VendorDebtItem` trong `app/actions/vendor-payment-actions.ts` — thêm `oldest_unpaid_task_date: string | null;`.
- **File 3:** `vendor-debts-stats-bar.tsx`:
  ```ts
  const THRESHOLD_DAYS = 30;
  const cutoff = new Date(Date.now() - THRESHOLD_DAYS * 86_400_000).toISOString().split("T")[0];
  const overdue = debts.filter((d) => d.oldest_unpaid_task_date && d.oldest_unpaid_task_date < cutoff).length;
  ```
  Ô KPI: `label: "Quá hạn > 30 ngày"`, `value: overdue.toString()`.
- **Acceptance:** ô KPI chỉ đếm vendor có task chưa trả với deadline cũ hơn 30 ngày (đúng nghĩa quá hạn thanh toán).

### T4.2 [P] Verify W4
- `npm run lint` + `npm run build`. Render stats bar @768/1023. Default: 3 ô hiển thị đúng. Alt: số "quá hạn" hợp lý với data.

---

## Tổng kết phụ thuộc

| Task | Depends on | Song song với |
|---|---|---|
| T1.2, T1.3 | T1.1 (done) | tất cả |
| T1.4 | T1.3 + DUYỆT | — (Wave B) |
| T2.1→T2.4 | — | W3, W4 |
| T3.1→T3.3 | — | W2, W4 |
| T4.1 (default) | — | W2, W3 |
| T4.1-alt | **A-VOID xong** (chung file actions) | W3 |
| Integration verify | Wave A merge | — |

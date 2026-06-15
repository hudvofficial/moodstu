# Vendor Debts — Business-Logic (Nghiệp vụ) Audit & Fix Brief

**Date:** 2026-06-15
**Feature:** `/finance/vendor-debts` (công nợ thợ ngoài / vendor)
**Scope:** Tính đúng đắn nghiệp vụ kế toán (KHÔNG phải perf/UI)
**Audience:** Agent thực thi fix (self-contained — không cần context hội thoại gốc)

> ⚠️ **2 doc cũ đã STALE — đừng tin:** [VENDOR_DEBTS_AUDIT_20260525.md](VENDOR_DEBTS_AUDIT_20260525.md) và
> [../reports/VENDOR_DEBTS_FIXES_20260525.md](../reports/VENDOR_DEBTS_FIXES_20260525.md) viết **trước** khi hệ
> accrual expense ra đời (28/05). Chúng kết luận "ready for production" nhưng **không thấy** bug double-count ở dưới.
> Tài liệu này thay thế chúng cho phần nghiệp vụ.

---

## ✅ ĐÃ XỬ LÝ — cập nhật 2026-06-15 (sau khi thực thi)

> **ĐÍNH CHÍNH QUAN TRỌNG:** Finding #1 bên dưới (lý thuyết *"double-count"*) **chỉ đúng ở mức rủi ro thiết kế**.
> Khi **query data thật** mới lòi ra sự thật **ngược lại**: accrual expense **CHƯA TỪNG chạy kể từ 28/05** →
> chi phí vendor bị **UNDER-count** (không phải đếm 2 lần). Bài học: phải đo data trước khi tin một giả thuyết kế toán.

**Root cause thật (verify bằng gọi trực tiếp RPC):** `upsert_vendor_expense` dùng
`CASE v_task.work_type WHEN 'hau_ky_phim' ...` nhưng `work_type_enum` **không có** `hau_ky_phim` (chỉ có:
bien_tap, cameraman, chup_anh, concept, dung_phim, hau_ky_anh, khac, kich_ban, makeup, premiere, quay_phim,
retouch, tro_ly). Simple `CASE` trên cột enum buộc Postgres coerce literal `WHEN` sang enum → ném `22P02` cho
**MỌI** task. Hàm throw mọi lần, `toggleTaskStatus` **nuốt lỗi** → **0 accrual expense**; contract-profit (đã loại
vendor khỏi `task_cost`, trông chờ accrual) **bỏ sót** chi phí vendor → lãi ảo.

**Đã fix + apply DB (qua pooler) + push `main` (commit `81afbd8`):**
- [`20260615000003`](../../supabase/migrations/20260615000003_fix_upsert_vendor_expense_work_type_cast.sql): `CASE v_task.work_type::text` (so text, hết coerce enum) + **backfill 6 task hoàn thành → 6.8M accrual**.
- [`20260615000002`](../../supabase/migrations/20260615000002_vendor_expense_accrual_trigger_and_backfill.sql): **trigger** `work_task_vendor_expense_sync` đồng bộ accrual trên **MỌI** path đổi status/vendor_id/cost (idempotent, nuốt lỗi để không chặn task) — vá gốc *"accrual chỉ gọi từ 1 path `toggleTaskStatus`"*.
- [`20260615000004`](../../supabase/migrations/20260615000004_remove_legacy_vendor_payment_expense.sql): xóa mềm 1 phiếu chi cũ (1.3M) giờ đã thừa.
- [`20260615000001`](../../supabase/migrations/20260615000001_vendor_payment_overpay_guard.sql): chặn trả dư ở RPC (Finding #3).
- **Reconcile cuối (đo DB):** vendor expense active = **6.800.000đ == tổng cost 6 task**; 0 dòng trùng; trigger idempotent (đã smoke-test).

**Tác động cần biết:** contract-profit giờ tính ĐÚNG chi phí vendor → lãi một số HĐ sẽ **giảm** đúng phần cost vendor (số đúng, không phải lỗi).

> Phần Finding #1 nguyên gốc giữ nguyên bên dưới để **lưu vết điều tra** — đã bị đính chính này thay thế.

---

## 0. Mô hình tiền (đọc trước khi sửa)

Hệ thống ghi nhận chi phí theo **accrual** (ghi nhận lúc phát sinh, không phải lúc trả tiền). Bảng `expenses` đóng
vai trò vừa là sổ chi phí (P&L) vừa là sổ chi.

- **work_task** = 1 đầu việc giao cho **vendor** (`vendor_id` set) hoặc **nhân viên** (`vendor_id` NULL). `cost` = số
  tiền phải trả thợ.
- Khi task `hoan_thanh` → ghi nhận **1 expense accrual** = `cost`. Đây là chi phí thật.
- **vendor_payments** + **vendor_payment_allocations** = theo dõi việc TRẢ tiền cho vendor (gán payment vào từng task).
  Đây chỉ là **tất toán công nợ**, KHÔNG phải phát sinh chi phí mới.
- Printing/lab cũng theo đúng mô hình này: expense lúc hoàn thành (`upsert_printing_expense`), còn lúc thanh toán **không**
  sinh expense. (Đã xác nhận: `app/actions/lab-*.ts` không hề insert vào `expenses`.)

**Hệ quả:** trả tiền vendor KHÔNG được tạo expense. Chi phí đã được ghi nhận lúc task hoàn thành rồi.

---

## 🔴 FINDING #1 — Chi phí vendor bị ĐẾM 2 LẦN trong P&L toàn cục (CRITICAL, phải fix)

> ⛔ **SUPERSEDED — xem §"ĐÃ XỬ LÝ" ở trên.** Trên data thật accrual chưa từng chạy (bug enum), nên hiện
> tượng thực tế là UNDER-count chứ không phải double-count. Phần dưới là phân tích gốc, giữ để lưu vết.

### Hiện tượng
Cùng một khoản chi phí thợ ngoài rơi vào bảng `expenses` **2 lần**:

| Thời điểm | Code tạo | Amount | Có `work_task_id`/`contract_id`/`category_id`? | Đúng/Sai |
|---|---|---|---|---|
| Task `hoan_thanh` | RPC `upsert_vendor_expense` | `= task.cost` | ✅ có đủ | ✅ Expense đúng (accrual) |
| Lúc trả tiền | `recordVendorPayment` | `= số tiền trả` | ❌ không có gì | 🔴 **Dòng thừa** |

### Bằng chứng (đường đi của tiền)

1. **Dòng accrual (đúng):** `toggleTaskStatus` gọi RPC khi task hoàn thành —
   [app/actions/work-task-actions.ts:305-331](../../app/actions/work-task-actions.ts#L305-L331):
   ```ts
   if (taskData?.vendor_id) {
     const { error: expenseError } = await supabase.rpc("upsert_vendor_expense", {
       p_work_task_id: taskId,
       p_actor_id: userId,
     });
   }
   ```
   RPC `upsert_vendor_expense` tạo expense `amount = task.cost`, `expense_date = completion_date`, set
   `work_task_id` + `contract_id` + `category_id` —
   [supabase/migrations/20260528000001_vendor_expense_tracking.sql:285-314](../../supabase/migrations/20260528000001_vendor_expense_tracking.sql#L285-L314)
   (bản đang chạy có thể là `20260528000003_..._safe.sql`, logic giống hệt).

2. **Dòng thừa (phải bỏ):** mỗi lần thanh toán lại insert thêm 1 phiếu chi —
   [app/actions/vendor-payment-actions.ts:146-158](../../app/actions/vendor-payment-actions.ts#L146-L158):
   ```ts
   // Tạo Phiếu chi (Auto-Expense)
   const { error: expenseError } = await supabase.from("expenses").insert({
     expense_date: input.payment_date,
     amount: input.amount,
     payment_method: input.payment_method,
     recipient: vendor.full_name,
     description: `[Auto-Vendor] Thanh toán công nợ - ${vendor.full_name}${input.note ? ` (${input.note})` : ""}`,
     created_by: userId
   });
   if (expenseError) {
     throw new Error(`Đã trừ công nợ nhưng lỗi khi tạo Phiếu chi: ${expenseError.message}`);
   }
   ```

3. **Nơi cộng dồn cả 2:** dashboard tính `total_outflow` bằng cách SUM **toàn bộ** bảng `expenses` trong tháng,
   không lọc gì —
   [supabase/migrations/20260421113000_finance_dashboard_production_hardening.sql:41-45](../../supabase/migrations/20260421113000_finance_dashboard_production_hardening.sql#L41-L45):
   ```sql
   INTO v_current_outflow
   FROM public.expenses
   WHERE deleted_at IS NULL
     AND expense_date >= v_start
     AND expense_date < v_end;
   ```
   → `total_outflow`, `profit`, **sổ cái thu chi (ledger)**, **cashflow timeline** đều phóng đại chi phí vendor.
   Grep toàn repo: **không chỗ nào** lọc chuỗi `[Auto-Vendor]` ra khỏi tổng hợp.

### Vì sao thành ra vậy
Hệ cũ (27/05) tính cash-basis (expense lúc trả). Ngày 28/05 thêm hệ accrual (mirror printing) nhưng **quên gỡ** phiếu chi
lúc trả → 2 hệ tồn tại song song. Vendor là module **duy nhất** bị trùng (printing/lab không tạo expense lúc thanh toán).

### Lưu ý: Báo cáo lợi nhuận hợp đồng KHÔNG dính (đã fix riêng)
[supabase/migrations/20260528000002_vendor_expense_profit_fix.sql](../../supabase/migrations/20260528000002_vendor_expense_profit_fix.sql)
đã loại vendor-task khỏi `task_cost` (`wt.vendor_id IS NULL`) và đếm chi phí vendor qua expense accrual. Phiếu chi lúc trả
**không có `contract_id`** nên không lọt vào profit report. → **KHÔNG đụng tới file/RPC profit này.** Nó đúng rồi.

### FIX (Phase 1 — chặn dòng thừa mới)
**File:** `app/actions/vendor-payment-actions.ts`
**Hành động:** XÓA nguyên block insert expense (dòng 146-158, đã trích ở trên).

Sau khi xóa, `recordVendorPayment` chỉ còn: validate → `checkPeriodLock` → fetch vendor → RPC
`record_vendor_payment_atomic` → audit log → revalidate. Đó là hành vi đúng (chỉ tất toán công nợ, không sinh expense).

⚠️ **Giữ nguyên** phần fetch `vendor` ([vendor-payment-actions.ts:110-119](../../app/actions/vendor-payment-actions.ts#L110-L119))
— vì `vendor.full_name` còn dùng ở audit log dòng 165. Đừng xóa nhầm. Đây là thay đổi phẫu thuật: chỉ bỏ đúng block expense.

### FIX (Phase 2 — dọn dữ liệu lịch sử, CẨN TRỌNG, làm sau & xác nhận với chủ tài chính)
Phase 1 chỉ chặn dòng mới. Các dòng phiếu chi trùng **đã nằm sẵn trong DB** vẫn làm sai P&L quá khứ.

**Bước 1 — đo quy mô (chạy read-only trước):**
```sql
SELECT date_trunc('month', expense_date) AS thang,
       COUNT(*) AS so_dong, SUM(amount) AS tong_tien
FROM public.expenses
WHERE deleted_at IS NULL
  AND description LIKE '[Auto-Vendor] Thanh toán công nợ%'
  AND work_task_id IS NULL          -- phiếu chi lúc trả KHÔNG set work_task_id
  AND category_id IS NULL           -- ...cũng không set category_id (khác hẳn dòng accrual)
GROUP BY 1 ORDER BY 1;
```
Predicate `description LIKE '[Auto-Vendor] Thanh toán công nợ%' AND work_task_id IS NULL AND category_id IS NULL` nhận
diện **chính xác** dòng phiếu chi lúc trả (dòng accrual luôn có `work_task_id` + `category_id`).

**Bước 2 — CẢNH BÁO trước khi xóa:** Task hoàn thành **trước 28/05** (hoặc lần nào `upsert_vendor_expense` lỗi) có thể
**không có** dòng accrual — khi đó phiếu chi lúc trả là expense DUY NHẤT cho chi phí đó. Xóa mù quáng sẽ làm **thiếu** chi phí
các tháng cũ. → KHÔNG `DELETE` hàng loạt. Cần đối chiếu theo từng vendor: so `SUM(accrual expense)` vs `SUM(phiếu chi lúc trả)`
rồi quyết định. Việc dọn lịch sử **đụng kỳ kế toán đã khóa** → phải có người duyệt, không tự ý.

---

## ✅ FINDING #2 — Void/sửa/xóa payment + bẫy soft-delete (HIGH) — ĐÃ LÀM

> ✅ Đã thêm `voidVendorPayment` (hard-delete `vendor_payments` → allocations cascade → công nợ tự tính lại) +
> drawer lịch sử thanh toán có nút **Hủy**. Tránh bẫy soft-delete bằng hard-delete đúng như đề xuất.

### Vấn đề (gốc)
- Grep toàn repo: **không có** `deleteVendorPayment` / `voidVendorPayment` / `editVendorPayment`. Nhập sai số tiền/
  vendor/ngày → không sửa được trong app.
- Schema đã *chuẩn bị sẵn* cho soft-delete nhưng dùng sẽ SAI:
  - `vendor_payments.deleted_at` tồn tại; RLS ghi "soft delete only"; history lọc `deleted_at`
    ([vendor-payment-actions.ts:310](../../app/actions/vendor-payment-actions.ts#L310)).
  - **NHƯNG** `vendor_payment_allocations` **không có cột `deleted_at`**
    ([20260527000000_vendor_payments.sql:23-31](../../supabase/migrations/20260527000000_vendor_payments.sql#L23-L31)),
    và RPC `finance_vendor_debt_summary` SUM allocations **không lọc** gì
    ([20260527000001_vendor_payment_rpcs.sql:34-40](../../supabase/migrations/20260527000001_vendor_payment_rpcs.sql#L34-L40)).
  - → Nếu ai void bằng cách set `deleted_at` trên `vendor_payments`, allocation **vẫn còn** → công nợ vẫn báo "đã trả".

### FIX đề xuất
Thêm action `voidVendorPayment(paymentId)` trong `app/actions/vendor-payment-actions.ts`:
- `withAdmin`, fetch payment → `checkPeriodLock(supabase, payment.payment_date)`.
- **HARD delete** dòng `vendor_payments` (allocations tự xóa theo `ON DELETE CASCADE` —
  [20260527000000_vendor_payments.sql:25](../../supabase/migrations/20260527000000_vendor_payments.sql#L25)). Đây là cách
  đúng & đơn giản nhất vì allocations không có `deleted_at`; debt summary tự tính lại đúng.
- Sau Finding #1 thì **không** còn phiếu chi lúc trả để dọn kèm — bớt 1 việc.
- Audit log + `revalidatePath("/finance/vendor-debts")` + `/finance/dashboard` + `/finance/salaries`.
- Tradeoff: hard-delete mất dấu vết payment. Nếu cần giữ lịch sử → phương án B: thêm cột `deleted_at` cho
  `vendor_payment_allocations`, cho debt-summary lọc `deleted_at`, rồi soft-delete cả 2 bảng. Nặng hơn, chỉ làm nếu cần audit trail.

---

## ✅ FINDING #3 — Trả dư + cột "Đã thanh toán" (HIGH) — ĐÃ LÀM (phương án a)

> ✅ Đã chặn trả dư: guard ở RPC `record_vendor_payment_atomic` (migration `20260615000001`) + modal chặn submit
> khi `amount > totalDebt`. Theo dõi tạm ứng/credit (b) = OUT OF SCOPE.

- Modal cho phép trả **vượt** công nợ, chỉ cảnh báo rồi vẫn submit —
  [vendor-payment-modal.tsx:277-282](../../components/finance/vendor-debts/vendor-payment-modal.tsx#L277-L282). FIFO phân bổ
  tới hạn, phần dư thành `unallocated_amount` (RPC vẫn trả về). Tiền **ra thật** (trước Finding #1 còn ghi expense = full
  amount) nhưng **không gắn vào công nợ nào** và **không có khái niệm tạm ứng/credit** cho vendor.
- `total_paid` hiển thị trên trang = tổng **allocated** (RPC
  [20260527000001:61-63](../../supabase/migrations/20260527000001_vendor_payment_rpcs.sql#L61-L63)), không phải tiền mặt đã
  trả → khi có trả dư, "Tổng đã thanh toán" **thấp hơn** thực chi.

### FIX đề xuất (chọn 1, hỏi nghiệp vụ trước)
- **(a) Đơn giản — chặn trả dư:** ở RPC `record_vendor_payment_atomic`, nếu `p_amount > tổng remaining của vendor` thì
  `RAISE EXCEPTION`. Và ở modal, chặn submit khi `amount > totalDebt` (hiện chỉ cảnh báo). Phù hợp nếu nghiệp vụ KHÔNG cho ứng trước.
- **(b) Đầy đủ — theo dõi tạm ứng:** thêm khái niệm vendor advance/credit (bảng riêng hoặc cột). Lớn hơn nhiều; chỉ làm nếu
  thực tế có ứng trước cho thợ.

---

## ✅ FINDING #4 — Payment ↔ phiếu chi không atomic — ĐÃ HẾT

> ✅ Phase 1 đã gỡ block insert expense lúc trả → không còn 2 bước tách rời → vấn đề tự hết.

RPC commit công nợ xong **rồi mới** insert expense ở tầng action; expense lỗi thì "đã trừ công nợ nhưng không có phiếu chi"
([vendor-payment-actions.ts:156-158](../../app/actions/vendor-payment-actions.ts#L156-L158)). **Bỏ block expense ở Finding #1
là hết vấn đề này** — không cần làm gì thêm.

---

## ✅ FINDING #5 — KPI "Vendors quá hạn" — ĐÃ LÀM (bỏ ô KPI)

> ✅ Đã bỏ ô "Vendors quá hạn" khỏi stats-bar (còn 3 ô). Phân tích gốc giữ bên dưới để tham khảo.

[vendor-debts-stats-bar.tsx:19](../../components/finance/vendor-debts/vendor-debts-stats-bar.tsx#L19):
```ts
const vendorsWithOverdueTasks = debts.filter((d) => d.last_task_date && d.last_task_date < today).length;
```
`last_task_date = MAX(deadline)` các task đã hoàn thành ([RPC dòng 64](../../supabase/migrations/20260527000001_vendor_payment_rpcs.sql#L64)).
Task đã xong thì deadline gần như luôn ở quá khứ → **gần như mọi vendor có việc đều bị tính "quá hạn"**. Bản fix 25/05 chỉ
**đổi tên label** chứ logic giữ nguyên. Hệ thống **không có** khái niệm *hạn thanh toán cho vendor*.

### FIX đề xuất
- Nhanh: bỏ ô KPI này (đỡ gây hiểu lầm), hoặc đổi thành cái có nghĩa (vd "Vendor có nợ > X ngày kể từ payment gần nhất" dựa
  trên `last_payment_date`).
- Đúng bài: thêm điều khoản hạn trả cho vendor rồi tính quá hạn theo đó. Chỉ làm nếu nghiệp vụ cần.

---

## 🟢 Lặt vặt (LOW — optional, không phải nghiệp vụ cốt lõi)

- **FIFO preview lệch tiebreaker:** modal sort chỉ theo `deadline` + NULL-last
  ([vendor-payment-modal.tsx:110-117](../../components/finance/vendor-debts/vendor-payment-modal.tsx#L110-L117)), backend
  tiebreak thêm `created_at, id`
  ([20260527000001:237](../../supabase/migrations/20260527000001_vendor_payment_rpcs.sql#L237)). Nhiều task cùng deadline →
  preview phân bổ từng task có thể khác thực tế (tổng/vendor vẫn đúng). Đồng bộ tiebreaker nếu muốn preview khớp 100%.
- **Manual mode không trả từng phần 1 task:** allocation luôn dùng `t.remaining` và validate `amount === selectedTasksTotal`
  ([vendor-payment-modal.tsx:204-209](../../components/finance/vendor-debts/vendor-payment-modal.tsx#L204-L209)) → không thể
  trả lẻ 1 task cụ thể. Chỉ FIFO mới để được phần dư ở task cuối.
- **`fetchVendorUnpaidTasks` 2 query** (tasks + allocations riêng) — perf nhỏ, đã ghi ở audit cũ, chưa làm.

---

## Verification — KẾT QUẢ THỰC TẾ (2026-06-15)

> Kịch bản seed bên dưới viết theo giả thuyết double-count. **Thực tế** đã verify bằng **đo data trực tiếp** (qua pooler):
> - Sau fix+backfill: `expenses` active `[Auto-Vendor]` = **6 dòng / 6.800.000đ** == tổng cost 6 task vendor hoàn thành; **0 dòng trùng**.
> - Trigger smoke-test: no-op update task → vẫn đúng 6 dòng (idempotent, không nhân bản).
> - Build: `tsc --noEmit` + `eslint` clean; `next build` pass.
>
> Kịch bản seed gốc (giữ để hồi quy về sau):

Theo chuẩn dự án: verify bằng render + đo số, không chỉ unit test.

1. **Seed:** tạo 1 contract + 1 work_task giao vendor, `cost = 1.000.000`, set `hoan_thanh`
   → kiểm tra `expenses` có **đúng 1** dòng `[Auto-Vendor] ... (HD: ...)` (accrual), `amount = 1.000.000`, `work_task_id` set.
2. **Đo trước:** mở `/finance/dashboard` tháng đó, ghi lại `total_outflow` (hoặc query
   `SELECT SUM(amount) FROM expenses WHERE deleted_at IS NULL AND expense_date >= ... AND < ...`).
3. **Trả tiền** task đó qua `/finance/vendor-debts` (FIFO, đủ 1.000.000).
4. **Đo sau:** `total_outflow` **KHÔNG được tăng thêm** (trước fix: tăng thêm 1.000.000 = double-count). `expenses` vẫn chỉ
   **1 dòng** cho chi phí này. Công nợ vendor về 0. Lịch sử thanh toán hiện payment 1.000.000.
5. **Build/lint:** `npm run lint` (dự án dùng **npm**, không phải pnpm).

---

## Tóm tắt ưu tiên

| # | Mức | Việc | Trạng thái |
|---|---|---|---|
| 1 | 🔴 | **Root cause thật:** accrual chết do `CASE` coerce enum `work_type` (`hau_ky_phim` không có trong enum) → 22P02 → 0 expense → under-count. Fix `::text` + trigger đồng bộ + backfill 6 task + xóa dupe. | ✅ DONE — migr `000002/000003/000004`, apply DB + push `81afbd8` |
| 2 | 🟠 | `voidVendorPayment` (hard-delete, cascade) + drawer lịch sử có nút Hủy. | ✅ DONE |
| 3 | 🟠 | Chặn trả dư: RPC guard (`000001`) + modal block. | ✅ DONE |
| 4 | 🟡 | Atomicity — tự hết khi Phase 1 gỡ expense lúc trả. | ✅ DONE |
| 5 | 🟡 | Bỏ ô KPI "Vendors quá hạn". | ✅ DONE |

**Tất cả đã apply DB + deploy (commit `81afbd8`).** Reconcile cuối: vendor expense = tổng cost task, 0 dupe.

**Chưa làm (optional):** §Lặt vặt (FIFO tiebreaker, manual partial, N+1) + vài latent ghi ở §"ĐÃ XỬ LÝ": `is_period_locked` dùng `CURRENT_DATE` thay vì `completion_date` khi tạo expense mới; lời gọi `upsert_vendor_expense` trong `toggleTaskStatus` giờ thừa (trigger lo); bỏ gán vendor khỏi task đã xong → expense cũ chưa tự xóa.

---

## Files đã review
- `app/actions/vendor-payment-actions.ts`
- `app/actions/work-task-actions.ts` (toggleTaskStatus → upsert_vendor_expense)
- `app/actions/finance-dashboard-queries.ts` (outflow/profit/ledger/contract-profit)
- `components/finance/vendor-debts/{vendor-debts-client,vendor-payment-modal,vendor-debts-stats-bar}.tsx`
- `types/vendor.ts`
- `supabase/migrations/20260527000000_vendor_payments.sql`
- `supabase/migrations/20260527000001_vendor_payment_rpcs.sql`
- `supabase/migrations/20260528000001_vendor_expense_tracking.sql` (+ `_003_safe`)
- `supabase/migrations/20260528000002_vendor_expense_profit_fix.sql`
- `supabase/migrations/20260421113000_finance_dashboard_production_hardening.sql`

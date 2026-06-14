# Implementation Plan — Vendor Debts Nghiệp Vụ Fixes

**Date:** 2026-06-15
**Source of truth (findings):** [../../docs/audits/VENDOR_DEBTS_AUDIT_20260615.md](../../docs/audits/VENDOR_DEBTS_AUDIT_20260615.md)
**Task list:** [task.md](task.md)
**Mục tiêu:** Sửa dứt điểm các lỗi nghiệp vụ của `/finance/vendor-debts`, chia thành các workstream **không đụng file của nhau** để chạy multi-agent song song.

---

## 1. Trạng thái hiện tại

| Finding | Mô tả | Trạng thái |
|---|---|---|
| #1 Phase 1 | Bỏ phiếu chi trùng lúc thanh toán (`recordVendorPayment`) | ✅ **DONE** (đã verify đọc code) — còn thiếu bước chạy verify (T1.2) |
| #1 Phase 2 | Dọn dữ liệu phiếu chi trùng đã có trong DB | ⛔ **GATED** — chờ thống kê + duyệt tài chính |
| #2 | Không có void/sửa payment + bẫy soft-delete | 🔲 Chưa làm (W2) |
| #3 | Trả dư không kiểm soát | 🔲 Chưa làm — **decision gate** (W3) |
| #4 | Payment↔expense không atomic | ✅ Tự hết khi #1 xong |
| #5 | KPI "Vendors quá hạn" vô nghĩa | 🔲 Chưa làm — **decision gate** (W4) |

---

## 2. Decision Gates (CHỐT trước khi merge các workstream tương ứng)

> Agent **được phép code theo default** ghi dưới đây, nhưng **không merge** cho tới khi chủ dự án xác nhận.

- **G-3 (Finding #3 — trả dư):** Default = **(a) CHẶN trả dư** (đơn giản, an toàn). Phương án (b) "theo dõi tạm ứng/credit cho vendor" là **epic riêng, OUT OF SCOPE** ở plan này.
- **G-5 (Finding #5 — KPI):** Default = **REMOVE** ô "Vendors quá hạn" (đang gây hiểu lầm). Phương án thay thế "đổi sang metric thật" (T4.1-alt) được đặc tả đầy đủ — chỉ làm nếu chủ dự án muốn giữ 1 ô KPI quá hạn.
- **G-1P2 (Finding #1 Phase 2 — dọn data):** Chỉ chạy **bước thống kê read-only (T1.3)** tự do. Bước xóa/migration (T1.4) **chỉ thực thi sau khi có người duyệt** vì đụng kỳ kế toán đã khóa + rủi ro task hoàn thành trước 28/05 không có expense accrual.

---

## 3. Phân chia Workstream cho Multi-Agent

4 workstream **độc lập về file** (trừ ghi chú ở §4). Mỗi workstream giao cho 1 agent.

| Agent | Workstream | Phạm vi | File sở hữu (CREATE/EDIT) |
|---|---|---|---|
| **A-FIN** | W1 — Finance Integrity | Verify Phase 1 + thống kê dupe (read-only) + (gated) cleanup | `scripts/vendor-expense-dupe-scan.sql` (NEW); (gated) migration mới |
| **A-VOID** | W2 — Void Payment | Action void + UI lịch sử thanh toán có nút Hủy | `app/actions/vendor-payment-actions.ts` (EDIT, **append**), `components/finance/vendor-debts/vendor-payment-history-drawer.tsx` (NEW), `vendor-debts-desktop-table.tsx` (EDIT), `vendor-debts-mobile-list.tsx` (EDIT), `vendor-debts-client.tsx` (EDIT) |
| **A-OVERPAY** | W3 — Overpay Guard | Chặn trả dư ở RPC + modal | `supabase/migrations/20260615000001_vendor_payment_overpay_guard.sql` (NEW), `components/finance/vendor-debts/vendor-payment-modal.tsx` (EDIT) |
| **A-KPI** | W4 — KPI Fix | Bỏ (default) hoặc đổi ô KPI quá hạn | `components/finance/vendor-debts/vendor-debts-stats-bar.tsx` (EDIT); (alt) migration + `types/vendor.ts` + actions interface |

### Hàm/đơn vị mỗi agent tạo hoặc sửa

**A-VOID (W2)**
- `voidVendorPayment(rawData): Promise<ActionResult<{payment_id}>>` — NEW server action (hard-delete, cascade allocations, check period lock).
- `<VendorPaymentHistoryDrawer>` — NEW component (list payments + nút "Hủy" mỗi dòng → confirm → `voidVendorPayment`). Mirror [debt-history-drawer.tsx](../../components/finance/debts/debt-history-drawer.tsx).
- Mở drawer từ desktop table + mobile list (thêm 1 action "Lịch sử / Hủy" mỗi vendor row).

**A-OVERPAY (W3)**
- `record_vendor_payment_atomic(...)` — CREATE OR REPLACE, thêm guard `v_total_remaining`. Signature giữ NGUYÊN.
- `vendor-payment-modal.tsx` — chặn submit khi `amount > totalDebt` (hiện chỉ cảnh báo).

**A-KPI (W4)**
- Default: xóa biến `vendorsWithOverdueTasks` + ô KPI thứ 4 + import `AlertTriangle`.
- Alt: `finance_vendor_debt_summary` thêm cột `oldest_unpaid_task_date` + cập nhật type + đổi logic đếm.

**A-FIN (W1)**
- `vendor-expense-dupe-scan.sql` — query read-only thống kê dòng phiếu chi trùng theo tháng.
- (Gated) migration soft-delete có điều kiện — **không tự chạy**.

---

## 4. Ma trận xung đột file (đọc kỹ trước khi chạy song song)

- **`app/actions/vendor-payment-actions.ts`**: chỉ **A-VOID** sửa (append `voidVendorPayment` ở cuối file). A-KPI **default KHÔNG đụng** file này → không xung đột. ⚠️ Nếu chọn **W4-alt**, A-KPI phải sửa interface `VendorDebtItem` (~dòng 33-44) trong cùng file → khi đó **chạy A-VOID xong rồi mới A-KPI-alt** (hoặc dùng worktree riêng rồi merge).
- **RPC migrations**: W3 sửa `record_vendor_payment_atomic`, W4-alt sửa `finance_vendor_debt_summary` → **2 function khác nhau, 2 file migration khác nhau** → an toàn song song.
- **UI**: mỗi workstream sở hữu file riêng (history-drawer / modal / stats-bar). A-VOID có sửa `vendor-debts-client.tsx` + 2 file table/list — **không workstream nào khác đụng** → an toàn.
- 🚫 **TUYỆT ĐỐI KHÔNG** sửa `supabase/migrations/20260528000002_vendor_expense_profit_fix.sql` hay RPC `finance_contract_profit_report` — báo cáo lợi nhuận hợp đồng **đã đúng**, đụng vào là vỡ.

---

## 5. Thứ tự thực thi (Waves)

```
Wave A (song song, 4 agent — không phụ thuộc nhau):
  ├─ A-FIN:     T1.2 (verify Phase 1)  →  T1.3 (dupe-scan, read-only)
  ├─ A-VOID:    T2.1 → T2.2 → T2.3 → T2.4
  ├─ A-OVERPAY: T3.1 → T3.2 → T3.3
  └─ A-KPI:     T4.1 (default REMOVE) → T4.2

Wave B (chỉ sau khi có DUYỆT — không tự động):
  └─ A-FIN: T1.4 (cleanup data lịch sử)

Wave C (sau khi Wave A merge):
  └─ Integration verify: render 4 module @768/1023 + đo lại dashboard total_outflow
```

---

## 6. Guardrails (bắt buộc tuân thủ — từ CLAUDE.md + memory dự án)

- **Package manager: `npm`** (KHÔNG phải pnpm). Verify build: `npm run lint`, `npm run build`.
- **Deploy = `git push origin main`** (Vercel auto-deploy). KHÔNG `npx vercel --prod` (CLI chưa auth).
- **Node PATH:** prepend `C:\Users\Admin\.nodejs\...` vào PATH trước khi chạy npm.
- **Finance giữ `revalidatePath`** — đã có sẵn trong các action, đừng gỡ.
- **Period lock:** mọi mutation tiền phải qua `checkPeriodLock` (JS) hoặc `is_period_locked` (SQL). Void/overpay đều phải tôn trọng.
- **Responsive 3-tier:** mọi đổi UI verify @768px (md) + @1023px. Density toggle ở `md:`.
- **Surgical:** chỉ sửa đúng phần thuộc task; không refactor/format code lân cận.

---

## 7. Verification & Definition of Done

**Mỗi workstream "done" khi:**
- `npm run lint` + `npm run build` pass (không lỗi mới).
- Render OK ở chrome-devtools/preview cho phần UI liên quan (W2/W3/W4), verify @768 + @1023.
- Hành vi đo được đúng (xem acceptance criteria từng task trong [task.md](task.md)).

**Integration DoD (Wave C):**
1. Seed 1 task vendor `cost = 1.000.000` → hoàn thành → `expenses` có **1** dòng accrual.
2. Trả tiền task đó → `total_outflow` dashboard **không tăng thêm** (chứng minh hết double-count); công nợ vendor về 0.
3. Vào lịch sử thanh toán → bấm **Hủy** → công nợ quay lại 1.000.000; payment biến mất khỏi lịch sử; `total_outflow` không đổi.
4. Thử trả **1.500.000** cho công nợ 1.000.000 → bị **chặn** (toast lỗi), không tạo payment.
5. Stats bar: còn 3 ô (default) hoặc ô "Quá hạn" hiển thị đúng (alt).

> ⚠️ "Done" = đã chạy verify ở trên, KHÔNG được nói "should work".

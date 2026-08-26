# T-20260826-cashflow-m2b-drop-legacy — M2b: drop 4 view tương thích + 4 bảng `_legacy` + wrapper `record_vendor_payment_atomic`; dọn script/test còn gọi mô hình thanh toán cũ

**Owner:** claude (fallback) · **Trạng thái:** spec — **chờ ≥ 2026-09-02 + user gật** (điều kiện ADR-016 phụ lục M2 §5: prod chạy M2 ổn ≥ 7 ngày) · **Branch:** `claude/cashflow-m2b` · **Module:** tai-chinh · in-an-lab · nha-cung-cap.

**Migration đã viết (26/08):** `supabase/migrations/20260826130000_cashflow_m2b_drop_legacy.sql` — pre-check (expenses di trú ≥ 26 lab + 5 vendor; 0 hàm DB còn đọc view), `DROP VIEW` ×4, `DROP TABLE … _legacy CASCADE` ×4 (kéo FK/policy/trigger `trigger_vendor_payments_updated_at`, `emit_realtime_signal`), `DROP FUNCTION update_vendor_payments_updated_at()`, `DROP FUNCTION record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid)`. **Giữ** `record_lab_payment_atomic` (LabPaymentModal ở `/printing`), `finance_lab_debt_summary` / `finance_vendor_debt_summary` (wrapper đọc, `/printing` + `verify:printing`).

**Locks:**
- `supabase/migrations/20260826130000_cashflow_m2b_drop_legacy.sql` (đã có — chỉ áp)
- `types/database.types.ts` (sinh lại) · `vault/30-du-lieu/*` (sinh lại)
- `tests/e2e/cashflow-m1.spec.ts` (test (c) gọi `record_vendor_payment_atomic` → đổi sang `record_payee_payment_atomic`)
- `scripts/vendor-expense-diagnostic.mjs`, `scripts/run-migration-overpay-guard.mjs`, `scripts/run-migration-indexes.mjs` (xoá — script một lần của mô hình cũ, đọc `vendor_payments`/`vendor_payment_allocations`)
- `vault/40-module/tai-chinh.md`, `in-an-lab.md`, `nha-cung-cap.md`, `vault/50-luong/luong-tien.md` (bỏ câu "view… drop ở M2b")
- `agent/DECISIONS.md` (ADR-016 phụ lục: M2b đã áp), `agent/TASKS.yaml`, `agent/CURRENT_STATE.md`

**KHÔNG đụng:** app code (đã không đọc view từ M2 — `grep -rn 'from("lab_payments"\|from("vendor_payments"\|lab_payment_allocations\|vendor_payment_allocations' app components lib` = 0, kiểm lại trước khi áp); `printing_lab_overview` (đã sửa M2); `LabPayment`/`LabPaymentHistoryItem` types (`types/printing.ts` — app định nghĩa, không phụ thuộc view).

---

## 0. Mục tiêu đo được
1. DB: `SELECT relname FROM pg_class WHERE relname IN (4 view, 4 _legacy)` → **0 dòng**; `record_vendor_payment_atomic`, `update_vendor_payments_updated_at` không còn.
2. `types/database.types.ts` không còn `lab_payments`, `vendor_payments`, `*_allocations`, `*_legacy`, `record_vendor_payment_atomic`; `npx tsc --noEmit` = 0.
3. Sổ thật không đổi trước/sau: `expenses` active (35 tại 26/08 — đối soát lại số lúc chạy), `finance_payable_summary()` (lab 1.905.000 tại 26/08), `printing_integrity_report` 4/4 = 0, `finance_month_summary(8,2026)` không đổi.
4. `verify:reports` · `verify:printing` · `verify:contracts` · `verify:inventory` xanh; Playwright `cashflow-m1` 4/4 + `cashflow-m2` 3/3 (local rồi prod).

## 1. Thứ tự làm (mỗi bước có kiểm)
1. **Điều kiện:** ngày ≥ 02/09; `agent/CURRENT_STATE.md` không ghi sự cố M2; grep app = 0 (mục KHÔNG đụng).
2. `tests/e2e/cashflow-m1.spec.ts` test (c): thay `db.rpc("record_vendor_payment_atomic", { p_vendor_id, p_amount, p_payment_method, p_payment_date, p_note, p_allocations: JSON.stringify([{ work_task_id, amount }]), p_actor_id })` bằng `db.rpc("record_payee_payment_atomic", { p_payee_type: "vendor", p_payee_id: s.vendorId, p_amount: 1200000, p_payment_method: "chuyen_khoan", p_payment_date: "2026-08-22", p_note: "E2E trả thợ", p_allocations: JSON.stringify([{ target_id: s.taskId, amount: 1200000 }]), p_actor_id: s.userId })` — **giữ dạng JSON string** để vẫn phủ nhánh RPC tự parse chuỗi (bug có sẵn M1 phát hiện); kết quả `{ expense_id, allocated_amount }` (không còn `payment_id`/`unallocated_amount` của wrapper) → sửa assert tương ứng. Chạy spec này **trước** khi áp migration (RPC mới đã có từ M1) → phải 4/4.
3. Xoá 3 script cũ (kiểm `package.json` không tham chiếu: `grep -n "vendor-expense-diagnostic\|run-migration-overpay-guard\|run-migration-indexes" package.json` = 0).
4. **Snapshot trước:** `node scripts/db-q.mjs` — `expenses` active, `finance_payable_summary()`, `finance_month_summary(8,2026)`, `printing_integrity_report()`, `count(*) lab_payments_legacy` (26), `vendor_payments_legacy` (5).
5. Áp: `node scripts/migrate-direct.mjs 20260826130000_cashflow_m2b_drop_legacy.sql` (transaction; pre-check trong file DỪNG nếu lệch). Đọc NOTICE "object cu con lai = 0".
6. `npm run db:types` → `npx tsc --noEmit` (kỳ vọng 0 — nếu có file còn dùng type view thì đó là chỗ M2 bỏ sót → sửa, ghi §5).
7. `node scripts/vault-gen-schema.mjs` (GROUPS đã bỏ 4 tên từ M2).
8. **Snapshot sau** = trước (mục 4) ± 0. Gate §0.4.
9. Docs §Locks; ADR-016 phụ lục M2 §5 → "đã áp <ngày>".

## 2. Rủi ro & lùi
`DROP TABLE _legacy` là **không lùi được** — dữ liệu gốc 26 + 5 dòng đã nằm trong `expenses` (`legacy_source`, `legacy_source_id`) và đã đối soát Σ tiền khớp ở M1. Trước khi áp, xuất backup 2 bảng: `node scripts/db-q.mjs "select * from lab_payments_legacy"` và `vendor_payments_legacy` (+ 2 bảng allocation) → lưu `docs/reports/backup_2026-09-xx_legacy_payments.json` (commit kèm) — rẻ, đủ để tra cứu nếu cần.

## 3. Kết quả
_(điền khi xong)_

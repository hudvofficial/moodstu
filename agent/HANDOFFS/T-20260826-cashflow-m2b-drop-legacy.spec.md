# T-20260826-cashflow-m2b-drop-legacy — M2b: dọn mô hình thanh toán cũ (4 view + 4 bảng `_legacy` + wrapper trả thợ + 3 script)

**Owner:** claude (fallback) · **Trạng thái:** spec — user duyệt 26/08, **áp ngày 02/09/2026** (prod chạy M2 ≥ 7 ngày, ADR-016 phụ lục M2 §5) · **Branch:** `claude/cashflow-m2b` · **Không đụng app code** (grep 26/08: app/components/lib = 0 tham chiếu view; chỉ còn 1 test + 3 script cũ).

**Đo 26/08:** `lab_payments_legacy` 26 · `vendor_payments_legacy` 5 (active) · `lab_payment_allocations_legacy` 26 · `vendor_payment_allocations_legacy` 10 · `expenses.legacy_source IN (lab_payments, vendor_payments)` = **31 = 26 + 5** ✓. Hàm DB còn đọc view: 0 (M2 đã sửa `printing_lab_overview`).

## Làm gì
| # | Việc | Kiểm |
|---|---|---|
| 1 | `tests/e2e/cashflow-m1.spec.ts` test (c): `record_vendor_payment_atomic(...)` → `record_payee_payment_atomic({ p_payee_type: "vendor", p_payee_id: s.vendorId, p_amount: 1200000, p_payment_method: "chuyen_khoan", p_payment_date: "2026-08-22", p_note: "E2E trả thợ", p_allocations: JSON.stringify([{ target_id: s.taskId, amount: 1200000 }]), p_actor_id: s.userId })` — giữ JSON string (phủ nhánh RPC tự parse); kết quả chỉ còn `{ expense_id, allocated_amount }` → bỏ assert `payment_id`/`unallocated_amount` | chạy `cashflow-m1` local **trước** khi áp → 4/4 |
| 2 | Xoá `scripts/vendor-expense-diagnostic.mjs`, `scripts/run-migration-overpay-guard.mjs`, `scripts/run-migration-indexes.mjs` (script một lần của mô hình cũ; `package.json` không tham chiếu — đã kiểm 26/08) | `grep -rn "vendor_payments\|lab_payments" scripts tests app components lib` = 0 |
| 3 | Backup: `node scripts/db-q.mjs "select * from lab_payments_legacy" > docs/reports/backup_2026-09-02_lab_payments_legacy.json` + 3 file tương tự cho `vendor_payments_legacy`, `lab_payment_allocations_legacy`, `vendor_payment_allocations_legacy` (commit kèm — DROP TABLE không lùi được) | 4 file, dòng = 26 / 5(+xoá mềm) / 26 / 10 |
| 4 | Snapshot trước: `expenses` active, `finance_payable_summary()`, `finance_month_summary(9,2026)`, `printing_integrity_report()` | ghi vào §Kết quả |
| 5 | Áp `node scripts/migrate-direct.mjs 20260826130000_cashflow_m2b_drop_legacy.sql` — file đã có: pre-check (31 ≥ 26 + 5; 0 hàm đọc view) DỪNG nếu lệch; `DROP VIEW` ×4; `DROP TABLE … _legacy CASCADE` ×4 (kéo FK/policy/trigger); `DROP FUNCTION update_vendor_payments_updated_at()`; `DROP FUNCTION record_vendor_payment_atomic(uuid, numeric, text, date, text, jsonb, uuid)`. **Giữ:** `record_lab_payment_atomic` (modal `/printing`), `finance_lab_debt_summary`, `finance_vendor_debt_summary` (wrapper đọc) | NOTICE "object cu con lai = 0" |
| 6 | `npm run db:types` → `npx tsc --noEmit` = 0 (nếu đỏ = chỗ M2 bỏ sót, sửa và ghi lại); `node scripts/vault-gen-schema.mjs` | `grep -c "_legacy\|lab_payments\|vendor_payments" types/database.types.ts` = 0 |
| 7 | Snapshot sau = trước ± 0; `verify:reports` · `verify:printing` · `verify:contracts` · `verify:inventory`; Playwright local `cashflow-m1` 4/4 + `cashflow-m2` 3/3 + `cashflow-m3` 3/3 | xanh |
| 8 | Docs: `vault/40-module/{tai-chinh,in-an-lab,nha-cung-cap}.md` + `vault/50-luong/luong-tien.md` bỏ câu "view … drop ở M2b"; `agent/DECISIONS.md` phụ lục M2 §5 → "đã áp 02/09"; `TASKS.yaml` → done; `CURRENT_STATE.md` | — |
| 9 | Merge + push (user gật) → chạy `cashflow-m1` + `m2` trên prod | 7/7 |

Thời lượng: ~20 phút (build + test là phần lâu). Không có màn hình nào thay đổi.

## Kết quả
_(điền 02/09)_

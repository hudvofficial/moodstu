# T-20260907-r2-ledger-hoan-tien — R2: hoàn tiền không phải chi phí (`finance_period_ledger` + `contract_financials`)

**Owner:** claude (spec → chủ duyệt → claude áp DB → chủ xem diff) · **Trạng thái:** ✅ ĐÃ ÁP PROD 07/09 (chủ "duyệt") — chờ xem diff repo (migration + vault + sổ) · **Chương trình:** GĐ1 Nền móng, bước #12 (`agent/GOALS.yaml`) — **bước DB đầu tiên** · **DB:** `CREATE OR REPLACE` 2 hàm, chữ ký giữ nguyên, không đổi bảng/RLS · **ADR:** không cần — đúng luật ADR-016 §2 (két ≠ lãi/lỗ), sửa để hàm làm đúng luật đã chốt · **Revert:** `agent/HANDOFFS/T-20260907-r2-ledger-hoan-tien.revert.sql` (thân hàm sống dump 07/09).

## 0. Vì sao

Sổ đối chiếu 🟡 "Hoàn tiền HĐ huỷ": `finance_period_ledger` cộng mọi phiếu chi `payee_type='other'` có `contract_id` vào **`cost_direct`** — kể cả **hoàn cọc** — trong khi doanh thu đã loại HĐ `da_huy`. Hoàn cọc là *trả lại tiền khách*, không phải chi phí sản xuất: tính vào cost thì lãi tháng bị trừ oan đúng số hoàn. `contract_financials` (lợi nhuận từng HĐ, cột "Lợi nhuận" bảng HĐ) cùng lỗi → HĐ huỷ có hoàn cọc hiện lãi **âm bằng số hoàn**.

Phán quyết hội đồng (PHUONG-AN §34): **R2 trước R1** — vá lưới trước, mở van sau. #13 (R1) sẽ làm huỷ HĐ chạy được → phiếu hoàn đầu tiên xuất hiện → nếu chưa vá, số sai ngay tuần sau.

## 1. Sự thật đã đo (07/09, chỉ đọc)

- Hoàn tiền được app ghi thế nào: `app/actions/contract-refund-actions.ts:63 ensureRefundCategory` → phiếu chi `payee_type='other'`, `contract_id` = HĐ, `category_id` = `transaction_categories.category_code IN ('contract_refund','refund','hoan_tien')` (danh mục `contract_refund` **đã tồn tại** trên DB, 0 dòng). `isRefundExpense()` phía app cũng nhận diện theo đúng 3 mã này → luật DB và app **cùng một khoá**.
- Hôm nay: `expenses other + contract_id` = **0** · phiếu hoàn = **0** · HĐ `da_huy` = **0** (5 HĐ kẹt không huỷ được vì R1) → vá bây giờ **không đổi số nào**; đây là vá phòng ngừa đúng thứ tự.
- `cancel_contract_cascade` (sẽ chạy được sau #13): task chưa xong → `da_huy`, task **đã xong giữ nguyên** (chi phí thật, vẫn tính — đúng); đơn in chưa xong → huỷ. Không đụng payments/expenses → cọc đã thu vẫn là `cash_in`, hoàn cọc là `cash_out` — **cả hai đúng là tiền**, chỉ sai ở chỗ hoàn cọc lọt vào **chi phí**.
- Backup đêm 07/09 02:13 **OK** (6,1 MB, 93 bảng). `revert.sql` dump từ `pg_get_functiondef` 07/09: `finance_period_ledger` 5.507 ký tự · `contract_financials` 1.813.

## 2. Phạm vi — 2 hàm, 1 migration, 0 bảng

`supabase/migrations/20260907090000_r2_ledger_hoan_tien_khong_phai_chi_phi.sql` — **sinh từ thân hàm sống** (`gen-r2-migration.py`, assert từng anchor), không gõ lại tay. Diff so với bản sống đúng 2 chỗ mỗi hàm:

| Hàm | Thêm | Điều kiện thêm vào |
|---|---|---|
| `finance_period_ledger` — CTE `exp` | `LEFT JOIN public.transaction_categories tc ON tc.id = e.category_id` | `direct` FILTER thêm `AND COALESCE(tc.category_code,'') NOT IN ('contract_refund','refund','hoan_tien')` |
| `contract_financials` — `direct_cost` | cùng `LEFT JOIN` trong subquery | cùng điều kiện |

- `all_out`, `settlement`, `salary_paid`, `overhead`, `fixed` **không đổi** → `cash_out` giữ nguyên (hoàn cọc vẫn là tiền ra).
- `revenue_*`, `tasks`, `prints`, `cogs`, `salary` không đổi. Chữ ký `RETURNS TABLE` không đổi → app không cần sửa; `finance_month_summary`, `finance_pnl_by_month`, `finance_reports_snapshot`, `finance_cashflow_timeline` đọc qua ledger nên tự đúng.
- Áp bằng `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260907090000_r2_ledger_hoan_tien_khong_phai_chi_phi.sql` (cửa S3, #10). Không dùng db-q.

## 3. Ngoài phạm vi
- Cọc **giữ lại** khi khách huỷ (phí huỷ) — hiện không được mô hình là thu nhập; ADR-016 chưa có luật. Ghi sổ đối chiếu 🟡 cho #29/#30: "HĐ da_huy có paid > refund → khoản giữ lại chưa vào doanh thu".
- Hoàn một phần trên HĐ **không huỷ** (giảm giá sau): sau vá, khoản này không còn là cost và cũng không trừ doanh thu → doanh thu tạm cao hơn số thật cho tới khi chủ sửa `total_amount`/giảm giá. Quy ước ghi vào `vault/50-luong/luong-tien.md`: hoàn trên HĐ còn sống = phải sửa giá HĐ, không dùng phiếu hoàn thay giảm giá.
- R1 (`cancel_contract_cascade` ghi `'da_huy'` vào đơn in) = #13, spec riêng.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| **Diễn tập trên Postgres cục bộ trước** (cluster `H:\backups\mood-studio\restore-test`, DB `mood_restore` từ dump 04/09) | áp migration vào local → tạo 1 HĐ giả `da_huy` + 1 phiếu hoàn 1.000.000 danh mục `contract_refund` + 1 phiếu `other` thường 200.000 cùng HĐ → gọi `finance_period_ledger(tháng)` trước/sau; `contract_financials([id])` | `cost_direct` **không tăng** khi thêm phiếu hoàn (chỉ +200.000 của phiếu thường) · `cash_out` **+1.200.000** · `direct_cost` HĐ = 200.000 |
| Prod trước/sau áp | `finance_pnl_by_month(2026)` 12 dòng + `finance_month_summary(9,2026)` + `contract_financials` 62 HĐ, lưu JSON trước và sau | **chênh 0 đ** mọi cột (vì 0 phiếu hoàn) |
| Gate | `npm run verify:reports` | xanh (assert month_summary = pnl_by_month = snapshot) |
| Vault không trôi | `npm run vault:db-truth` sau áp; `git diff vault/30-du-lieu/than-ham/hop-dong.md` | đúng 2 hàm đổi, đúng 2 chỗ |
| Thời gian chạy | `EXPLAIN ANALYZE finance_pnl_by_month(2026)` trước/sau | ≤ +5 ms (thêm 1 join nhỏ trên bảng danh mục ~10 dòng) |
| Đường lùi thử thật | trên **local**: chạy `revert.sql` → thân hàm về bản cũ (so `pg_get_functiondef` = dump 07/09) | khớp 100% |

## 5. Rủi ro & đường lùi
- Rủi ro thấp nhất trong các bước DB: 2 hàm STABLE đọc, không bảng, không trigger, không RLS; hôm nay 0 dòng bị ảnh hưởng.
- Nếu app đang giữ kết quả cũ trong cache (`unstable_cache` 120 s dashboard) → tự hết hạn.
- Đường lùi: `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs` với `revert.sql` (đã thử trên local ở §4) → về đúng thân hàm 07/09. Sau đó `vault:db-truth`.

## 6. Kết quả — 07/09/2026

| Kiểm | Kết quả |
|---|---|
| Diễn tập local (`mood_restore`, cluster restore-test) | BASE T9 `cost_direct` 0 → thêm HĐ giả `da_huy` + hoàn cọc 1.000.000 (`contract_refund`) + chi thường 200.000: **BUG** `cost_direct` 1.200.000 · `cash_out` 1.200.000 · lãi HĐ 3.800.000 → áp migration: **FIX** `cost_direct` **200.000** · `cash_out` **1.200.000** (giữ) · `direct_cost` HĐ 200.000 · lãi 4.800.000 → `revert.sql`: về **1.200.000** ✓ → áp lại: 200.000 |
| Áp prod | `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs …` → "Migration completed successfully"; `pg_get_functiondef` 2 hàm chứa `contract_refund` ✓ |
| Prod trước/sau | `finance_pnl_by_month(2026)` 12 dòng · `finance_month_summary(9,2026)` · `contract_financials` 62 HĐ — file JSON trước/sau **byte-khớp 100%** (đúng dự đoán: 0 phiếu hoàn) |
| Thời gian | `EXPLAIN ANALYZE finance_pnl_by_month(2026)`: 9,4 → 11,6 ms (+2,2 ms, ≤ +5 ms) |
| `npm run verify:reports` | **đỏ ở assert KHÔNG liên quan**: `finance_debt_stats.overdue` 3,3tr ≠ `finance_month_summary.receivable_due` 9,8tr. Nguyên nhân: HĐ-2026-0058 có mốc giao `hoan_thanh` nhưng **`event_date = NULL`** (đánh xong trong đợt dọn 06/09, không nhập ngày) → month_summary coi "đã giao" (đến hạn), debt_stats cần ngày để tính tuổi → không đến hạn. Cả 2 hàm không đổi trong R2; snapshot month_summary trước/sau khớp → lệch có sẵn trước khi áp. Ghi sổ đối chiếu 🟡 → #26 (CHECK: mốc `hoan_thanh` phải có ngày) / #30 (đóng HĐ ⇒ mốc giao có ngày). Các assert còn lại của verify:reports chạy tới dòng 212 mới dừng → month_summary = pnl_by_month = snapshot đã qua |
| `npm run vault:db-truth` | 149 hàm, `than-ham/hop-dong.md` có `contract_refund` ×2 (đúng 2 hàm) |
| Migration file | bỏ `BEGIN/COMMIT` vì `migrate-direct` tự bọc giao dịch (phát hiện khi đọc runner) |

Local cluster đã tắt sau diễn tập; dữ liệu giả chỉ nằm trong `mood_restore` (không phải prod).

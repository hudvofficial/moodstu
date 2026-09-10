# DB-CHANGELOG — sổ thay đổi lược đồ production

**Chuẩn S2 (chương trình tối ưu, GĐ1).** Từ 02/09/2026, MỌI thay đổi trên DB production (CREATE OR REPLACE · DROP · ALTER · CREATE POLICY · migration áp qua `migrate-direct.mjs`) phải có một dòng ở đây, ghi TRƯỚC KHI áp. Không có dòng = không được áp.

Mẫu dòng:
`| ngày | đối tượng | loại | file migration / spec | dump bản sống ở | revert ở | người duyệt |`

## Baseline 02/09/2026

| Ngày | Đối tượng | Loại | Nguồn | Dump | Revert | Duyệt |
|---|---|---|---|---|---|---|
| 2026-09-02 | *toàn bộ catalog* | BASELINE | `agent/inventory/18-diff-db-repo.md` + `vault/30-du-lieu/` (than-ham · rls-va-quyen · luoc-do-*) | sinh tự động, tái tạo bằng `npm run vault:db-truth` | — | — |

Trạng thái baseline: DB 149 hàm · 217 policy · 93 bảng · 81 trigger · 16 enum. Sổ Supabase dừng ở `20260621100000` (113 bản ghi); ~90 migration sau đó áp tay không sổ. Từ dòng này trở đi, sổ này là nguồn ghi nhận duy nhất.

## Thay đổi

| Ngày | Loại | Việc | Backup trước | Đường lùi |
|---|---|---|---|---|
| 2026-09-05 | dữ liệu (dọn rác test) | Xoá 6 `auth.users` `@test.local` tồn từ 08–28/08 (`tmp-verify-gallery`, `perf-probe-mtbpl9z5` — **admin active**, `e2e-m1/m3/pdf×2` mồ côi) + 2 dòng `employees` gắn với chúng (`PERF-bpl9z5`, `NV-7F39F7`). Không HĐ/task/lịch liên quan (đã kiểm). Qua API service-role, không SQL tay. Theo lệnh chủ "data test nhớ dọn" (#8). **Phát hiện thêm:** 4 user mồ côi bị FK chặn vì còn **4 phiếu chi E2E sống** (`expenses` 19–24/08: "E2E PDF" 100k ×2, "E2E trả lab" 300k, "E2E trả ekip" 1,2tr = **1.700.000đ giả trong sổ T8**, rác sự cố 28/08) + 2 `expense_allocations` trỏ đơn in đã xoá → xoá 2 phân bổ + 4 phiếu chi + 4 user. Đối soát chờ: `finance_pnl_by_month(2026)` T8 `cash_out` 19.796.400 → **18.096.400** (khớp CURRENT_STATE 26/08) — **đã đối soát sau xoá: 18.096.400 ✓**. Dọn thêm 1 `labs`, 2 `vendors`, 1 `inventory_items` tên E2E (không đơn/task/giao dịch). Quét 10 bảng: 0 dòng E2E. | `mood_20260905_0200.dump` OK | không cần — tài khoản test, tạo lại được |
| 2026-09-07 | hàm (CREATE OR REPLACE ×2) — **CHUẨN BỊ, chưa áp** | **#12 R2:** `finance_period_ledger` + `contract_financials` loại phiếu chi danh mục `contract_refund/refund/hoan_tien` khỏi `cost_direct`/`direct_cost` (hoàn cọc = tiền ra, không phải chi phí; HĐ `da_huy` đã bị loại khỏi doanh thu). Chữ ký giữ nguyên. File `supabase/migrations/20260907090000_r2_ledger_hoan_tien_khong_phai_chi_phi.sql`, sinh từ thân hàm sống. Hôm nay 0 phiếu hoàn → số không đổi; vá trước khi #13 mở van huỷ HĐ. | `mood_20260907_0212.dump` OK | `agent/HANDOFFS/T-20260907-r2-ledger-hoan-tien.revert.sql` (2 thân hàm sống) |
| 2026-09-07 | hàm (CREATE OR REPLACE ×2) — **ĐÃ ÁP** | **#12 R2 ĐÃ ÁP** qua `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260907090000_r2_ledger_hoan_tien_khong_phai_chi_phi.sql` (chủ "duyệt" 07/09). Diễn tập local trước: hoàn cọc 1tr → `cost_direct` 1.200.000 → 200.000, `cash_out` giữ 1.200.000, revert.sql quay về đúng. Prod trước/sau: `finance_pnl_by_month(2026)` 12 dòng · `finance_month_summary(9)` · `contract_financials` 62 HĐ **khớp 100%** (0 phiếu hoàn). EXPLAIN 9,4 → 11,6 ms. `vault:db-truth` chạy lại: 2 hàm mang R2. | `mood_20260907_0212.dump` | `revert.sql` đã thử trên local ✓ |
| 2026-09-07 | hàm (CREATE OR REPLACE ×1) — **CHUẨN BỊ, chưa áp** | **#13 R1:** `cancel_contract_cascade` ghi `printing_orders.status = 'huy_don'` (đúng CHECK `printing_orders_status_check` từ 24/08) thay `'da_huy'`; WHERE loại thêm `huy_don`. Đổi đúng 2 chữ, sinh từ thân hàm sống. Tái hiện trên local: 23514 check violation → sau fix HĐ `da_huy`, đơn `huy_don`, task `da_huy`. File `supabase/migrations/20260907100000_r1_cancel_cascade_huy_don.sql`. | `mood_20260907_0212.dump` OK | `agent/HANDOFFS/T-20260907-r1-cancel-cascade.revert.sql` |
| 2026-09-07 | hàm (CREATE OR REPLACE ×1) — **ĐÃ ÁP** | **#13 R1 ĐÃ ÁP** (chủ "duyệt" 07/09) qua `migrate-direct` cờ S3. Thân hàm sống: đơn in `huy_don` ✓ (`da_huy` còn lại chỉ ở `work_tasks`, đúng). Dữ liệu trước/sau (count HĐ + đơn in theo trạng thái) khớp 100%. Cửa thật: #14 chủ huỷ HĐ kẹt trên UI. `vault:db-truth` chạy lại. | `mood_20260907_0212.dump` | `revert.sql` (đã thử local) |
| 2026-09-10 | dữ liệu (dọn rác test) | Chủ: "data test đang rải rác trên production". Quét **370 cột text × mọi bảng** + mồ côi: còn **2 `employees` "E2E Finance" (28/08, department "Chưa phân bổ" → sweep cũ lọt, auth đã xoá)** · 1 `credit_cards` E2E-RT (0 debts) · 16 `login_attempts` (probe-anon-access/e2e) · 67 `audit_logs` mang dấu E2E (13/07–05/09; bảng append-only cho app, xoá qua service role). Xoá qua API, quét lại = 0. `realtime_signals` 100 dòng là tín hiệu hôm nay (ring buffer), không phải rác. **Vá gốc:** `tests/e2e/e2e-sweep.ts` quét thêm employees theo tên, expense_allocations→expenses, labs/vendors/inventory/credit_cards/login_attempts/audit_logs. | `mood_20260910_*.dump` | tài khoản/dòng test, tạo lại được |

_(dòng kế tiếp: #24/#26/#27 GĐ2 sau cổng G1)_

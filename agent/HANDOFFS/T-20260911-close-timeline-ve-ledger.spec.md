# T-20260911-close-timeline-ve-ledger — T1: `buildCloseSnapshot` + `finance_cashflow_timeline` thôi tự cộng tiền → đọc sổ kỳ (giữ `_legacy` 1 kỳ)

**Owner:** claude (spec → chủ duyệt → claude áp DB + sửa 1 file app + 1 script verify → commit ngay) · **Trạng thái:** ✅ IMPLEMENTED + VERIFIED — chủ "duyệt" 11/09 · ĐÃ ÁP PROD 11/09 · **Chương trình:** GĐ2 tuần 6, bước **#23** (`agent/GOALS.yaml`), gate **G1 ✅ (qua 10/09)** · **DB:** 2 hàm MỚI + `CREATE OR REPLACE` 2 hàm đang sống; 0 bảng, 0 dữ liệu · **ADR:** không cần — thi hành đúng ADR-016 M2 ("một sổ kỳ duy nhất"), không đổi luật · **Revert:** `agent/HANDOFFS/T-20260911-close-timeline-ve-ledger.revert.sql` (thân 2 hàm sống + gỡ 2 hàm mới, đã thử local).

## 0. Vì sao

ADR-016 M2 (`agent/DECISIONS.md:130`) chốt: *"`finance_period_ledger(start, end)` là hàm duy nhất cộng tiền vào/ra, doanh thu, từng loại chi phí theo luật ngày"*. Ba hàm đọc đúng nó (`finance_month_summary`, `finance_pnl_by_month`, `finance_reports_snapshot`). **Hai chỗ không đọc** và vẫn tự cộng lại:

| Chỗ | Tự cộng gì | Ghi ở đâu |
|---|---|---|
| `finance_cashflow_timeline` (DB) | `payments` + `receipts` + `expenses` | `agent/system-map/01-tien.md:304`, `SYSTEM_MAP.md:144`, `vault/50-luong/luong-tien.md:63` |
| `buildCloseSnapshot` (`app/actions/finance-close-actions.ts:30`) | `payments` + `receipts` + `expenses` + **`fixed_costs`** + `investments` | sổ đối chiếu `agent/inventory/00-lech-thiet-ke.md:86` |

Sổ đối chiếu gọi đúng tên: *"2 công thức tiền song song còn sống — đúng lớp lỗi M2 đã diệt · số lệch khi nghiệp vụ phức tạp lên"*. Vault còn **phát biểu sai** vì chuyện này: `vault/50-luong/luong-tien.md:54` viết "Bốn hàm đọc nó — không hàm nào tự cộng lại" trong khi `finance_cashflow_timeline` không đọc.

Đây là bước cuối của cụm "một số một nguồn" ở GĐ2: #17 (mục tiêu) ✅, #18 (health-score) ✅, #23 (chốt sổ + biểu đồ tiền) — rồi #28 dựng lưới `verify-numbers` chặn tái sinh.

## 1. Sự thật đã đo (11/09, chỉ đọc trên prod + diễn tập local)

**Hai công thức HÔM NAY vẫn ra cùng số** — vì trùng bộ lọc, không phải vì cùng nguồn:

| Kỳ | Sổ kỳ vào / ra | Biểu đồ Σ vào / ra | Lệch |
|---|---|---|---|
| 2026-05 | 32.165.000 / 3.270.000 | 32.165.000 / 3.270.000 | 0 |
| 2026-06 | 55.680.000 / 1.300.000 | 55.680.000 / 1.300.000 | 0 |
| 2026-07 | 72.325.000 / 0 | 72.325.000 / 0 | 0 |
| 2026-08 | 18.350.000 / 18.096.400 | 18.350.000 / 18.096.400 | 0 |
| 2026-09 | 85.995.000 / 0 | 85.995.000 / 0 | 0 |

**Chỗ hai công thức SẼ lệch (hiện ngủ đông vì bảng rỗng):**
- `fixed_costs` **0 dòng** · phiếu chi `[Auto-Fixed]` **0 dòng** · `investments` **0 dòng** · `finance_monthly_closes` **0 kỳ** (Mood chưa chốt sổ lần nào).
- `buildCloseSnapshot.fixedCost` đọc **bảng kế hoạch `fixed_costs`** (Σ `monthly_amount` của mọi dòng còn hiệu lực trong kỳ), rồi **loại** phiếu chi `[Auto-Fixed]` khỏi `operatingOutflow`. Sổ kỳ thì đọc **phiếu chi thật** (`cash_out_fixed`). ⇒ Ngay ngày chủ nhập 1 chi phí cố định (thuê nhà, internet), `totalOutflow` của bản chốt sổ **lệch khỏi két thật** đúng bằng (kế hoạch − phiếu chi đã sinh). Trái `vault/40-module/tai-chinh.md:70`: *"`fixed_costs` … không phải tiền → không vào két; chi phí cố định thật = phiếu chi `[Auto-Fixed]`"*.
- `expenses.payee_type` mặc định `'other'`, NOT NULL; `generateMonthlyFixedCosts` (`expense-actions.ts:315`) ghi `contract_id` trống ⇒ phiếu `[Auto-Fixed]` rơi đúng vào nhánh `cash_out_fixed` của sổ kỳ. Đã kiểm.

**Vì sao không cho biểu đồ gọi thẳng sổ kỳ theo từng ngày:** đo `EXPLAIN ANALYZE` trên prod — bản LATERAL 366 ngày **164,4 ms** so với **2,35 ms** hiện tại (×70), và còn phình theo số dòng `contracts`/`work_tasks`/`printing_orders`. ⇒ Tách phần **tiền** ra một hàm dùng chung thay vì gọi cả sổ kỳ 366 lần.

**ACL hôm nay** (trả lời câu để ngỏ ở `agent/system-map/09-…:405`): cả `finance_period_ledger` lẫn `finance_cashflow_timeline` đang là `{postgres=X, service_role=X}` — `anon`/`authenticated` **không** gọi được. Đã xác minh.

**Diễn tập cục bộ** (`mood_restore`, dump `mood_20260911_0200.dump`, cổng 5433): áp → **9/9 tháng 2026 số y nguyên** (sổ kỳ, biểu đồ, `finance_reports_snapshot` T8 từng trường) → revert → thân 2 hàm về bản cũ, 2 hàm mới biến mất, ACL giữ → áp lại → y nguyên → áp tiếp migration gỡ `_legacy` → pre-check "9 tháng trùng nhau" rồi gỡ sạch. `anon`/`authenticated` = false ở cả 4 hàm trong mọi trạng thái. Backup đêm `mood_20260911_0200.dump` **OK** (5,2 MB · 93 bảng).

## 2. Phạm vi

### 2.1 DB — `supabase/migrations/20260911160000_t1_close_timeline_ve_ledger.sql` (đã viết, đã diễn tập)

| # | Đối tượng | Việc |
|---|---|---|
| 1 | `finance_cashflow_timeline_legacy(date, date)` | **MỚI** — bản sao *nguyên văn* thân đang sống của biểu đồ tiền. Chỉ để so chéo 1 kỳ. |
| 2 | `finance_cash_entries(date, date)` | **MỚI** — định nghĩa **duy nhất** của "tiền vào / tiền ra **theo ngày**": trả `entry_date`, `cash_in_contract`, `cash_in_retail`, `cash_out`, `cash_out_settlement`, `cash_out_salary`, `cash_out_fixed`, `cost_direct`, `cost_overhead`. Bộ lọc **bê nguyên** từ sổ kỳ (kể cả luật hoàn tiền R2 của #12). |
| 3 | `finance_period_ledger(date, date)` | `CREATE OR REPLACE` — **đổi đúng 2 khối CTE** (`cash_in`, `exp`) sang cộng từ `finance_cash_entries`. 6 khối còn lại (`contracts_shot`, `signed`, `tasks`, `prints`, `cogs`, `month_ratios`, `salary`) và SELECT cuối **giữ nguyên văn**. Chữ ký, 20 cột trả về: **không đổi**. |
| 4 | `finance_cashflow_timeline(date, date)` | `CREATE OR REPLACE` — đọc `finance_cash_entries` thay vì tự cộng 3 bảng. Chữ ký, 3 cột trả về: **không đổi**. |
| 5 | ACL | 2 hàm mới: `REVOKE ALL … FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE … TO service_role` (schema `public` mặc định cấp cho PUBLIC với hàm MỚI). 2 hàm cũ: khẳng định lại. |
| 6 | Hàng rào trong chính migration | Khối `DO` cuối: với **mọi tháng từ 2026-01 tới tháng hiện tại**, bắt buộc `Σ timeline mới == Σ timeline legacy == sổ kỳ` (cả số dòng); và không vai `anon`/`authenticated` nào gọi được 4 hàm. Lệch 1 đồng → `RAISE EXCEPTION` → runner rollback toàn bộ. |

Kèm **`supabase/migrations/20260911170000_t1_drop_timeline_legacy.sql` — viết sẵn, KHÔNG áp lần này**: gỡ `_legacy`. Điều kiện áp (chủ gật): hết kỳ 09/2026 (≥ 01/10/2026) **và** `verify:cashflow-ledger` xanh ở lần chạy cuối. Tự pre-check trùng số trước khi gỡ.

Áp: `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260911160000_t1_close_timeline_ve_ledger.sql` → §4 → sửa app → verify → `npm run db:types` + `vault:db-truth` → **commit ngay**. Push chờ chủ "đẩy".

### 2.2 App — `app/actions/finance-close-actions.ts` (1 file)

`buildCloseSnapshot(supabase, period)`: thay 5 truy vấn tiền bằng **1 lần** `supabase.rpc("finance_period_ledger", { p_start, p_end })` (`p_end` = ngày cuối kỳ, bao gồm — hôm nay hàm dùng mốc `end` loại trừ).

| Trường | Cũ | Mới |
|---|---|---|
| `paymentRevenue` | Σ `payments.amount` | `cash_in_contract` |
| `standaloneReceiptRevenue` | Σ `receipts.receipt_amount` (contract null) | `cash_in_retail` |
| `totalInflow` | cộng tay 2 số trên | `cash_in_contract + cash_in_retail` |
| `operatingOutflow` | Σ `expenses` trừ `[Auto-Fixed]` | `cash_out − cash_out_fixed` |
| `salaryCost` | Σ `expenses` `payee_type='employee'` | `cash_out_salary` |
| **`fixedCost`** | **Σ `fixed_costs.monthly_amount` (KẾ HOẠCH)** | **`cash_out_fixed` (phiếu chi `[Auto-Fixed]` THẬT)** |
| `totalOutflow` | `operatingOutflow + fixedCost` | như cũ — nhưng giờ **bằng đúng** `cash_out` |
| `netCashflow` | `totalInflow − totalOutflow` | không đổi (số đầu vào đã đúng nguồn) |
| `depreciationCost` | khấu hao đường thẳng từ `investments` | **giữ nguyên** (sổ kỳ không có dòng khấu hao — xem §3) |
| `netProfit` | `netCashflow − depreciationCost` | không đổi |

Thêm 2 trường vào `snapshot_metrics` (jsonb, không đổi lược đồ bảng):
- `source: "finance_period_ledger"` — dấu vết nguồn.
- `legacy: { …11 số theo công thức CŨ… }` + `legacyDelta: { <trường lệch>: số }` — **giữ đúng 1 kỳ** theo PHUONG-AN T1 #23; gỡ cùng lúc áp `20260911170000`. Cờ `const GIU_BAN_LEGACY = true` + chú thích điều kiện gỡ ngay tại chỗ.

Dọn kèm (do chính thay đổi này làm thừa): bỏ `salaryResult: Promise.resolve({data:null,error:null})` và `void salaryResult` (xác chết ADR-016 M5).

**Không đụng** phần còn lại của file: `createMonthlyClose`, `updateCloseSnapshot`, 8 bước chốt sổ, `advance_close_task`, màn `/finance/closes`.

### 2.3 Lưới kiểm — `scripts/verify-cashflow-ledger.mjs` (mới) + `package.json` `verify:cashflow-ledger`

Chạy bằng service role, chỉ đọc, **không ghi**: với mỗi tháng 2026 tới nay —
1. `Σ finance_cashflow_timeline == finance_period_ledger.cash_in_* / cash_out` (từng tháng + cả năm).
2. `finance_cashflow_timeline == finance_cashflow_timeline_legacy` từng dòng, từng ngày.
3. Công thức chốt sổ MỚI (từ RPC) vs công thức CŨ (query thô như bản legacy) — in bảng lệch; `fixedCost` được phép lệch và phải **giải thích được** bằng (kế hoạch − phiếu chi).
4. `anon` không gọi được `finance_cash_entries` và `finance_cashflow_timeline_legacy`.

Đây là hạt giống của lưới `verify-numbers` ở **#28**, không phải chính nó.

## 3. Ngoài phạm vi
- **Khấu hao** (`depreciationCost`) vẫn là công thức thứ hai của `investmentBookValue()` (`finance-operations-queries.ts:160`). Nó **không phải tiền** nên không thuộc sổ kỳ; ghi 1 dòng mới vào sổ đối chiếu cho **#29** (Đọc số D), không vá ở đây.
- `get_cashflow_forecast`, `get_expense_breakdown`, `get_budget_vs_actual`, `get_finance_advanced_intelligence` — vẫn tự cộng ngoài sổ kỳ (và còn mở EXECUTE cho `anon`) → **chưa bước nào nhận**, đã trình chủ ở danh sách quyết định đang chờ.
- `finance_ledger` / `finance_ledger_range` (bảng kê từng dòng, không phải số tổng) — không đụng.
- Không chốt sổ hộ chủ, không sinh phiếu `[Auto-Fixed]`, không nhập `fixed_costs`. Kỳ nào chủ chốt là việc vận hành của chủ.
- Không đụng bảng, không đụng 1 dòng dữ liệu nào.

## 4. Verify — số chờ điền

| Kiểm | Cách | Chờ |
|---|---|---|
| Local | §1 diễn tập | ✅ 9/9 tháng y nguyên · revert ✓ · áp lại ✓ · gỡ legacy ✓ |
| Áp prod | `migrate-direct` | "completed" + NOTICE `#23 OK: timeline == legacy == sổ kỳ mọi tháng từ 2026-01; 0 vai công khai` |
| Số không đổi | 5 tháng ở §1, trước/sau | **0 đồng lệch** ở cả 5 kỳ (vào, ra, số ngày trên biểu đồ) |
| Một nguồn | `pg_get_functiondef` | `finance_period_ledger` **và** `finance_cashflow_timeline` đều chứa `finance_cash_entries`; `finance_cashflow_timeline` **hết** `FROM public.payments` |
| ACL | `has_function_privilege` | `anon` = false và `authenticated` = false ở cả **4** hàm |
| Chốt sổ | `buildCloseSnapshot` cho 2026-08 trước/sau (chỉ đọc, không tạo kỳ) | `totalInflow` 18.350.000 · `totalOutflow` 18.096.400 · `fixedCost` 0 · `legacyDelta` **rỗng** (vì `fixed_costs` = 0) |
| Lưới | `npm run verify:cashflow-ledger` | pass, in bảng 9 tháng |
| Hồi quy | `npm run verify:reports` · `verify:dashboard` · `verify:goals` | pass · *(`verify:dashboard` đã đỏ sẵn từ `6405ec6` 27/08 — không phải do bước này)* · pass |
| Tĩnh | `tsc` · `eslint` file đổi | 0 · 0 |
| Màn hình | Playwright admin tạm: `/finance/cashflow` | biểu đồ vẽ đúng số ngày như §1, 0 lỗi app console |
| Vault + sổ | `db:types` · `vault:db-truth` · `vault/50-luong/luong-tien.md:54,63` · `vault/40-module/tai-chinh.md:70` · `agent/system-map/01-tien.md` §5 · `SYSTEM_MAP.md:144` · `inventory/00-lech-thiet-ke.md:86` | sửa câu "bốn hàm đọc nó" thành đúng; gạch dòng 86 |
| Rác | `scripts/sweep-e2e-residue.sql` | 0 mọi bảng |

## 5. Rủi ro & đường lùi
- **Rủi ro lớn nhất: đụng vào `finance_period_ledger`** — hàm mà `/dashboard`, `/finance`, `/reports`, Moodie đều đọc. Giảm rủi ro: chỉ đổi 2 khối CTE, 6 khối còn lại bê nguyên văn; migration **tự kiểm 9 tháng** rồi mới cho commit; diễn tập local đã đối chiếu từng trường của `finance_reports_snapshot`.
- **Tốc độ**: sổ kỳ nay gọi thêm 1 hàm. Đo lại sau khi áp; nếu `/reports` chậm đi thấy được → lùi bằng `revert.sql` (một lệnh).
- **`fixedCost` đổi nghĩa**: hôm nay 0đ nên không ai thấy. Khi chủ nhập chi phí cố định, số chốt sổ sẽ là **tiền đã chi thật**, không phải kế hoạch — đúng luật M2, và `legacy` trong jsonb giữ số cũ để so trong 1 kỳ.
- **Đường lùi**: `agent/HANDOFFS/T-20260911-close-timeline-ve-ledger.revert.sql` — trả 2 thân hàm về bản đang sống + gỡ 2 hàm mới + tự kiểm sạch. Đã chạy thật trên cluster local.

## 6. Kết quả

**Áp prod 11/09** qua `ALLOW_PROD_WRITE=1 node scripts/migrate-direct.mjs 20260911160000_t1_close_timeline_ve_ledger.sql` → `Migration completed successfully` (hàng rào trong migration không nổ ⇒ 9 tháng đều trùng số).

### Số — không lệch một đồng

| Kỳ | Sổ kỳ vào / ra (trước = sau) | Biểu đồ Σ | Số ngày |
|---|---|---|---|
| 2026-05 | 32.165.000 / 3.270.000 | y hệt | 10 |
| 2026-06 | 55.680.000 / 1.300.000 | y hệt | 6 |
| 2026-07 | 72.325.000 / 0 | y hệt | 7 |
| 2026-08 | 18.350.000 / 18.096.400 | y hệt | 4 |
| 2026-09 | 85.995.000 / 0 | y hệt | 3 |

`finance_reports_snapshot('2026-08-01','2026-08-31').cashflowSummary` trước và sau **giống từng trường** (`totalInflow` 18.350.000 · `totalOutflow` 18.096.400 · `salaryCost` 0 · `fixedCost` 0 · `netAfterOverhead` 253.600).

### Một nguồn — kiểm trên thân hàm sống

- `finance_period_ledger` và `finance_cashflow_timeline` **đều chứa** `finance_cash_entries`; cả hai **hết** `FROM public.payments`.
- ACL 4 hàm (`finance_cash_entries`, `finance_cashflow_timeline`, `finance_cashflow_timeline_legacy`, `finance_period_ledger`): `{postgres=X, service_role=X}` — `anon` **false**, `authenticated` **false**.
- `vault:db-truth`: 152 → **154 hàm** (94 SECURITY DEFINER).

### Tốc độ — đo A/B trên cluster local cùng dữ liệu

| Phép đo | Bản cũ | Bản mới | Chênh mỗi lần gọi |
|---|---|---|---|
| sổ kỳ 1 tháng ×100 | 1.004 ms | 1.230 ms | +2,3 ms |
| biểu đồ 366 ngày ×100 | 181 ms | 404 ms | +2,2 ms |
| `finance_reports_snapshot` ×20 | 277,6 ms | 308,7 ms | +1,6 ms |

Chậm hơn thật, nhưng ở mức **1,6–2,3 ms/lần** — nhỏ hơn một vòng mạng tới sin1. Trên prod sau khi làm nóng: biểu đồ 366 ngày **1,8 ms** (bản `_legacy` 1,28 ms), sổ kỳ 1 tháng **5,4 ms**. Không mở lại đợt perf (ADR-005).

### App

- `app/actions/finance-close-actions.ts`: `buildCloseSnapshot` đọc `finance_period_ledger` (1 RPC + 1 truy vấn `investments`) thay 5 truy vấn; `fixedCost` = `cash_out_fixed`; thêm `source` + `legacy` + `legacyDelta`; tách `depreciationForPeriod()`; bỏ xác chết `salaryResult: Promise.resolve(...)` + `void salaryResult`.
- `types/database.types.ts`: sinh lại (`db:types`). ⚠️ Bản CLI mới (supabase 2.117.0) kéo theo thay đổi **ngoài** bước này — `PostgrestVersion` 14.17→14.5, thêm ngoặc ở 5 generic, bổ sung `normalize_phone`/`customer_phone_report`/`sync_employee_salary_paid` (sót từ #27) — và **xoá `| null`** khỏi `calendar_month_events.p_employee_id`; đã **trả lại `| null`** vì đó là vết có chủ đích của #24.

### Lưới kiểm

- `npm run verify:cashflow-ledger` (mới): **9 tháng**, biểu đồ == sổ kỳ == `_legacy`, chốt sổ lệch **0**, `anon` bị chặn.
- `npm run verify:reports`: pass — thêm `finance_cash_entries` + `finance_cashflow_timeline_legacy` vào vòng kiểm `anon`.
- `npm run verify:goals`: pass. `tsc` **0**, `eslint` **0**.
- Playwright `tests/e2e/cashflow-ledger-c23.spec.ts` (mới) trên `next start`: **2/2** — tab "Dòng tiền" của `/reports` vẽ được, hai nhãn Vào/Ra khớp sổ kỳ, 0 lỗi console/mạng; và DB: 9 tháng sổ kỳ == biểu đồ == `_legacy`.
  - Bẫy gặp phải: `ReportsFilters` render **cả hai** bản desktop + mobile ⇒ `getByText(...).first()` trúng bản ẩn → phải `.locator("visible=true")`.
  - Sweep lần đầu còn **2 dòng** `audit_logs` LOGIN của chính người dùng tạm trong spec này → đã xoá và **vá `afterAll`** để tự dọn (`performed_by` + mô tả + `login_attempts`). Quét lại: **0 rác trên 24 bảng** (ngoài `realtime_signals` = tín hiệu thật).

### Còn treo (không thuộc bước này)

- `finance_cashflow_timeline_legacy` sống thêm **1 kỳ**; gỡ bằng `20260911170000_t1_drop_timeline_legacy.sql` sau **01/10/2026** khi `verify:cashflow-ledger` còn xanh. Cùng lúc bỏ `GIU_BAN_LEGACY` trong `finance-close-actions.ts`.
- `depreciationCost` vẫn là công thức thứ hai của `investmentBookValue()` → đã ghi dòng mới trong `agent/inventory/00-lech-thiet-ke.md` cho **#29**.
- 4 RPC tài chính còn mở EXECUTE cho `anon` (`get_cashflow_forecast`, `get_expense_breakdown`, `get_budget_vs_actual`, `get_finance_advanced_intelligence`) — chưa bước nào nhận, vẫn chờ chủ quyết.

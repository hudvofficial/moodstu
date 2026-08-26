# T-20260826-tien-ekip-va-can-thu — Đóng kín đường tiền: (A) trả ekip theo task như thợ ngoài · (B) "Cần thu" theo mốc giao sản phẩm thay cho bảng `debts` rỗng

**Owner:** claude (fallback) · **Trạng thái:** spec — chờ user gật · **Branch:** `claude/tien-ekip-can-thu` · **Module:** tai-chinh (chính) · nhan-su (sheet lương) · hop-dong (RPC đọc) · **ADR:** ADR-016 (áp dụng, không cần ADR mới)

## 0. Vấn đề đo được (26/08, production)

| # | Số đo | Hệ quả |
|---|---|---|
| A1 | 12 task ekip nội bộ `hoan_thanh` có `cost` = **8.550.350** (Admin 5.100.350 · Trần Cao Cường 2.100.000 · Văn Đen 1.000.000 · Kim Chi 200.000 · Dung 150.000); phiếu chi `payee_type='employee'` = **0** | Tiền trả ekip **không có đường vào sổ**: hoặc két đang cao hơn thật ~8,5tr, hoặc Mood đang nợ ekip 8,5tr mà màn Phải trả không hiện |
| A2 | `record_payee_payment_atomic` từ chối `payee_type='employee'`; `payable_items('employee')` đọc `employee_salaries.net_salary` = 3 dòng (0 · **100.000.000 dòng test T6** · 0) | Không thể trả ekip qua `/finance/payables`; sheet lương tháng chưa từng dùng thật |
| A3 | `generateMonthlySalaries` tính `product_salary = Σ cost task` → `payEmployeeSalaryAction` tạo phiếu chi **không phân bổ** | Nếu bật cả hai đường (trả theo task + sheet) sẽ trả trùng |
| B1 | Trang **Công nợ KH** `/finance/debts`, tab Công nợ ở `/reports`, Moodie `get_debt_summary` đọc `finance_debt_stats()` ← bảng `debts` = **0 dòng** → hiện **0** | Trong khi HĐ còn phải thu **92.575.000** (20 HĐ) |
| B2 | `get_receivable_aging` tính tuổi nợ theo `contract_date` | Sai luật ngày ADR-016; 5 HĐ chụp >30 ngày còn nợ 31.500.000 **đều chưa giao sản phẩm** (`giao_san_pham: chua_lam`) → không phải "quá hạn", là "chờ giao" |
| B3 | `payment_plans`: 181 mốc `pending` (107,9tr), **65 quá hạn (103,9tr)** — lịch tự sinh không khớp cách Mood thu | Nhắc thu trên dashboard là nhiễu — **ngoài scope**, ghi cho M4 |

Kết luận: ba sổ đã đúng cho lab/thợ/NCC nhưng còn hở **ekip** (tiền ra) và **phải thu** (tiền vào chưa có mốc đúng).

## 1. Quyết định (theo uỷ quyền ADR-016)
1. **Ekip = thợ ngoài về mặt tiền:** cam kết là `work_tasks.cost` khi `hoan_thanh` (đã đúng trong lãi/lỗ), **phải trả** theo từng task, **trả** = phiếu chi `payee_type='employee'` + `expense_allocations(work_task)`. Một đường cho cả ekip và thợ ngoài.
2. **Sheet lương tháng chỉ còn lương cứng** (`base_salary` từ `employees.salary_info`) — `product_salary` = 0 với ghi chú "Công theo HĐ trả ở Phải trả › Ekip". Mood chưa có lương cứng → sheet tạm không dùng; M5 bật lại khi có nhân sự tháng.
3. **Phải thu theo mốc giao:** một HĐ được coi là "đến hạn thu" khi sự kiện `giao_san_pham` `hoan_thanh` mà `remaining_amount > 0`. Chưa giao = "chờ giao" (không phải quá hạn). Tuổi nợ đếm từ ngày giao. `debts` (khoản thủ công) vẫn cộng thêm nếu có.
4. Xoá dòng test `employee_salaries` `base_salary = 100.000.000` (T6/2026, `paid_amount = 0`) + cập nhật `monthly_salaries` BL-2026-06 tương ứng.

## 2. DB — `supabase/migrations/20260827100000_tien_ekip_va_can_thu.sql`
### 2.1 Ekip
- `payable_items(p_payee_type, p_payee_id)`: nhánh `'employee'` → **thay** nguồn `employee_salaries` bằng `work_tasks` (`assigned_to = p_payee_id AND vendor_id IS NULL AND status = 'hoan_thanh' AND cost > 0`), `target_type = 'work_task'`, `item_date = COALESCE(vn_date(ev.event_date), vn_date(deadline), vn_date(created_at))`, `label = work_type || ' ' || contract_code`. Nhánh `employee_salary` giữ trong `payable_remaining` (M5) nhưng không còn được liệt kê.
- `finance_payable_summary()`: thêm `UNION ALL SELECT 'employee', id, full_name FROM employees WHERE deleted_at IS NULL AND status = 'active'` (sau khi kiểm `employees.deleted_at` tồn tại; nếu không, bỏ điều kiện).
- `record_payee_payment_atomic`: thêm nhánh `p_payee_type = 'employee'` → `v_recipient` = `employees.full_name` (`status='active'`), `v_category_id` = `transaction_categories` `type='chi' AND name='Chi lương nhân viên'` (tạo nếu chưa có, `category_code='luong'`), `v_target_type := 'work_task'`; phần phân bổ/FIFO dùng chung (`payable_remaining('work_task', id, p_payee_id)` đã kiểm `wt.vendor_id = p_payee_id` → **sửa** thành `(wt.vendor_id = p_payee_id OR wt.assigned_to = p_payee_id)`).
- `void_payee_payment_atomic`: cho phép `payee_type IN ('lab','vendor','supplier','employee')`.
- `payee_payment_history`: không đổi (nhãn `work_task` đã có).
- `finance_month_summary`: thêm cột `payable_employee numeric` (từ `finance_payable_summary()` filter `employee`).
- Dữ liệu: `DELETE FROM employee_salaries WHERE base_salary = 100000000 AND paid_amount = 0` (pre-check đúng 1 dòng) + `UPDATE monthly_salaries SET total_employees = …, base_salary_total = 0, total_salary = 0 WHERE salary_code = 'BL-2026-06'` (tính lại từ các dòng còn lại).
### 2.2 Cần thu
- `finance_debt_stats()` viết lại, **giữ RETURNS**: 
  - `receivable` = Σ `contracts.remaining_amount` (`deleted_at IS NULL AND status <> 'da_huy' AND remaining_amount > 0`) + Σ `debts` receivable còn lại (như cũ);
  - `payable` = Σ `finance_payable_summary().remaining` + Σ `debts` payable còn lại;
  - mỗi HĐ có `delivered_at` = `MAX(vn_date(ce.event_date))` của `contract_events` `event_type='giao_san_pham' AND status='hoan_thanh'` (NULL nếu chưa giao); `overdue_days = CASE WHEN delivered_at IS NULL THEN 0 ELSE current_date - delivered_at END`; `overdue` = Σ remaining của HĐ đã giao; `aging.not_due` = Σ remaining HĐ chưa giao (+ debts chưa đến hạn), `days_1_30/31_60/61_90/over_90` theo `overdue_days`;
  - `net_debt = receivable − payable`.
- `get_receivable_aging()`: cùng luật (bucket theo `overdue_days` từ ngày giao; HĐ chưa giao vào `0_30` với `count`, hoặc thêm khoá `not_delivered` — **thêm khoá `not_delivered`**, giữ 4 khoá cũ để `AgingBarsChart` không vỡ).
- `finance_month_summary`: thêm `receivable_due numeric` (Σ remaining HĐ đã giao) và `receivable_waiting numeric` (Σ remaining HĐ chưa giao/chưa chụp).
- REVOKE/GRANT như M1/M2 cho mọi hàm thay.

## 3. App
- `types/payables.ts`: `PAYEE_TYPES` + `"employee"`, `PAYEE_TYPE_LABEL.employee = "Ekip"`; `payables-stats-bar` thêm chip Ekip; `payables-desktop-table`/`mobile-list` `TYPE_VARIANT.employee = "success"`; `recordPayeePaymentSchema`/`fetchPayableItems` chấp nhận `employee` (enum tự mở rộng). Modal/lịch sử/huỷ dùng chung — không sửa.
- `app/actions/salary-actions.ts` `generateMonthlySalaries`: `product_salary = 0` (giữ cảnh báo task chưa gán/0 cost để không mất tín hiệu); comment ADR-016 §1.2. `components/finance/salaries/*`: cột "Lương sản phẩm" hiện "— (trả ở Phải trả › Ekip)" khi 0 — chỉ đổi nhãn, không đổi cấu trúc.
- `types/finance-dashboard.ts` `MonthSummary.debt` + `payableEmployee`, `receivableDue`, `receivableWaiting`; `mapMonthSummary` tương ứng; `finance-compact-bar.tsx` khối Công nợ: dòng phụ "Phải thu" giữ, caption đổi thành `Đã giao chưa thu {receivableDue} · chờ giao {receivableWaiting}` + `Lab … · thợ … · ekip … · NCC …`.
- `getPendingCollections` (`finance-dashboard-queries.ts`): sắp `delivered` trước (HĐ đã giao chưa thu), rồi theo `work_date` cũ nhất — dùng RPC nhỏ `finance_pending_collections(p_limit int)` trả `(id, contract_code, customer, remaining_amount, work_date, delivered_at)` thay 1 query PostgREST không join được sự kiện; `PendingCollections` card hiện badge "Đã giao" / "Chờ giao".
- `components/finance/debts/debt-stats-bar.tsx`, `debt-aging-card.tsx`, `reports-debts-view.tsx`, Moodie `get_debt_summary`: **không đổi code** — chỉ nhãn: "Quá hạn" → "Đã giao chưa thu", "Chưa đến hạn" → "Chờ giao" (tìm chuỗi trong 3 file).

## 4. Verify
- Migration pre-check in NOTICE: Σ phải trả ekip theo task (kỳ vọng 8.550.350 tại 26/08 — đối soát lại), số dòng test xoá = 1, `finance_debt_stats().receivable` = Σ `contracts.remaining_amount` (92.575.000 tại 26/08), `overdue` = Σ HĐ đã giao chưa thu (đo lúc chạy).
- `npm run db:types` · tsc · eslint · build · `verify:reports` (thêm `finance_debt_stats` receivable > 0 khi có HĐ nợ; `finance_month_summary` có `payable_employee`, `receivable_due`) · `verify:printing` · `verify:contracts`.
- Playwright `tests/e2e/cashflow-m3.spec.ts` (seed riêng, `--workers=1`): (a) task ekip `hoan_thanh` 1.200.000 gán nhân viên seed → `finance_payable_summary` có dòng `employee` 1.200.000; trả 1.200.000 ngày 2026-08-25 qua `record_payee_payment_atomic('employee')` → phiếu chi `payee_type='employee'` + phân bổ, payable 0; `void` → nợ quay lại; (b) `finance_debt_stats`: HĐ seed 5.000.000 chưa giao → `receivable` +5.000.000, `overdue` +0, `aging.not_due` +5.000.000; đổi sự kiện `giao_san_pham` → `hoan_thanh` ngày 2026-08-01 → `overdue` +5.000.000, `days_1_30` (hoặc bucket đúng theo ngày chạy); (c) sheet lương T8 sinh ra `product_salary = 0` cho nhân viên seed (dù có task 1.200.000); (d) UI: `/finance/payables` lọc "Ekip" thấy nhân viên seed; `/finance/debts` stats bar "Phải thu" ≠ 0; `/finance` khối Công nợ caption "Đã giao chưa thu".
- Sau merge: `cashflow-m3` trên prod; đối soát két/lãi T8 không đổi (trả ekip là trả nợ, không phải chi phí mới).

## 5. Docs
`vault/50-luong/luong-tien.md` (bảng Tiền RA: dòng Lương → "Ekip: `work_tasks.cost` → phiếu chi employee + phân bổ task; sheet lương = lương cứng"; mục Phải thu theo mốc giao), `vault/40-module/tai-chinh.md`, `nhan-su.md`, `docs/design/dong-tien-mood-v2.md` §3.2 + §9 (M4/M5 thu hẹp: M4 = dọn `payment_plans`; M5 = lương cứng khi có), `agent/DECISIONS.md` (ADR-016 phụ lục M3), `TASKS.yaml`, `CURRENT_STATE.md`.

## 6. Kết quả (2026-08-26, branch `claude/tien-ekip-can-thu`)

| Gate | Kết quả |
|---|---|
| Migration `20260826180000_tien_ekip_va_can_thu.sql` | **ĐÃ ÁP prod**. Đối soát: phải trả **ekip 8.550.350** (Admin 5.100.350 · Cường 2.100.000 · Văn Đen 1.000.000 · Kim Chi 200.000 · Dung 150.000) hiện ở `finance_payable_summary`; phải thu 92.575.000 = **đã giao chưa thu 3.300.000** (HĐ-2026-0052, giao 10/08) + chờ giao 89.275.000 (19 HĐ); `finance_debt_stats` receivable 92.575.000 / payable 10.455.350 / overdue 3.300.000; `get_receivable_aging.not_delivered` 19 HĐ; dòng test lương 100.000.000 xoá (còn 2 dòng, Σ 0). Lần áp đầu lỗi `ORDER BY (delivered_at IS NULL)` trên alias output → bọc CTE. |
| App | `PAYEE_TYPES` + `employee` ("Ekip", chip + badge success); `MonthSummary.debt` + `receivableDue/receivableWaiting/payableEmployee`; khối Công nợ caption "Đã giao chưa thu · chờ giao · nợ lab/thợ/ekip/NCC"; `getPendingCollections` → RPC `finance_pending_collections` + badge "Đã giao chưa thu"/"Chờ giao"; `/finance/debts` stats "Đã giao chưa thu", aging "Chờ giao / Đã giao 1-30…"; `aging-bars-chart` thêm cột "Chờ giao"; Moodie nhãn; sheet lương `product_salary = 0` + cột "— Phải trả › Ekip". |
| tsc · eslint (17 file) · build | 0 (1 lỗi `TD` không nhận `title` → chuyển vào span) |
| `verify:reports` (+ debt_stats = Σ HĐ, overdue = receivable_due, pending_collections, aging anon-denied) · `verify:printing` · `verify:contracts` | xanh |
| Playwright local (`--workers=1`) | **`cashflow-m3` 3/3** (task ekip → phải trả 1.200.000 → trả `record_payee_payment_atomic('employee')` → phiếu chi employee + phân bổ + lịch sử nhãn `chup_anh` → void hoàn nợ; debt_stats/month_summary delta: chưa giao +5.000.000 chờ giao, giao xong → overdue/receivable_due +5.000.000; `finance_pending_collections` delivered_at 2026-08-01; UI payables lọc Ekip, `/finance/debts`, `/finance`) · **`cashflow-m2` 3/3** · **`cashflow-m1` 4/4**. Seed dọn sạch (E2E 0, expenses 35, ekip 8.550.350, due 3.300.000). |
| Production | **MERGED main `f079223 → 288ce14`** (ff, user "merge + push"); Vercel lên bình thường. **Playwright `cashflow-m3` trên `stu.moodwedding.com`: 3/3 PASS.** Sau test: E2E 0, expenses 35, ekip 8.550.350, đã giao chưa thu 3.300.000, két T8 không đổi. |

---
title: "Luồng — Dòng tiền"
tags: [luong, tai-chinh]
cap-nhat: 2026-09-10
trang-thai: da-kiem-2026-09-10
doi-chieu: agent/system-map/01-tien.md · vault/30-du-lieu/than-ham/tai-chinh.md
---

# Dòng tiền

Trả lời một câu hỏi: **con số nào là chân lý, và nó tính từ đâu.**

## Tiền VÀO

```
Hợp đồng ──create_default_payment_schedule_v2──► payment_plans (kế hoạch, chưa là tiền)
                                                        │
Khách trả ──process_contract_payment_v2──► payments ────┤
                                                        ▼
                                          payment_plan_allocations
                                                        │
                                            payment_plans.status
                                        pending → partial → paid
```

Bán lẻ (vật tư, dịch vụ rời): `create_sale_receipt_atomic` → **`receipts`**.

**Phân biệt:**
- `payment_plans` = *dự kiến thu*, chưa phải tiền thật.
- `payments` = tiền đã nhận theo hợp đồng.
- `receipts` = phiếu thu (bán lẻ / thu khác).

## Tiền RA — ADR-016 (2026-08-25): "Ba sổ"

**Sổ CAM KẾT** (không phải bảng — là bản ghi gốc): `work_tasks.cost` (ekip + thợ ngoài, khi `hoan_thanh`), `printing_orders.total_amount` (lab), `inventory_transactions` (`stock_in` = phải trả NCC phôi; `stock_out.total_cost` = giá vốn), overhead.
**Sổ TIỀN RA** = `expenses` — **chỉ ghi khi tiền thật rời két**, có `payee_type` (`lab`·`vendor`·`supplier`·`employee`·`other`) + `payee_id`; phân bổ vào bản ghi gốc qua **`expense_allocations`** (`target_type` `printing_order`·`work_task`·`inventory_transaction`·`employee_salary`).

| Nguồn | Cam kết ở | Trả tiền (phiếu chi) qua |
|---|---|---|
| Thợ ngoài | `work_tasks.cost` khi `hoan_thanh` | `/finance/payables` › Thợ ngoài → `record_payee_payment_atomic('vendor')` → `expenses` + `expense_allocations(work_task)` (wrapper `record_vendor_payment_atomic` đã drop M2b) |
| Lab in ấn | `printing_orders.total_amount` khi tạo | `record_lab_payment_atomic` (wrapper) → `record_payee_payment_atomic('lab')` → `expenses` + `expense_allocations(printing_order)`; `payment_status` **dẫn xuất** (`recompute_printing_payment_status`) |
| Phôi thiệp / vật tư | `inventory_transactions.stock_in` | `inventory_stock_in_atomic(p_paid=true)` tạo phiếu chi `supplier` ngay trong transaction (Mood trả ngay khi nhập) |
| **Ekip nội bộ** (M3, 2026-08-26) | `work_tasks.cost` khi `hoan_thanh` (`assigned_to`, `vendor_id IS NULL`) — cùng luật thợ ngoài | `/finance/payables` › Ekip → `record_payee_payment_atomic('employee')` → `expenses` (`payee_type='employee'`) + `expense_allocations(work_task)`; huỷ = `void_payee_payment_atomic` |
| Lương cứng (M5, 27/08/2026) | sheet tháng `employee_salaries` (chỉ người có `salary_info.base_salary > 0`; `total_salary` = cơ bản + thưởng − phạt, `product_salary = 0`) — là **overhead accrual** `cost_salary_base`, không chạm lợi nhuận từng HĐ | `/finance/salaries` › Thanh toán (`payEmployeeSalaryAction`) **hoặc** `/finance/payables › Ekip` → `record_payee_payment_atomic('employee')` → `expenses` + `expense_allocations(employee_salary)`; `paid/remaining` dòng lương dẫn xuất từ phân bổ (`sync_employee_salary_paid`), huỷ phiếu chi → nợ quay lại |
| Chi trực tiếp / vận hành | = chính phiếu chi | `expenses` `payee_type='other'` (có `contract_id` = chi trực tiếp cho HĐ) |

**Luật:** phiếu chi **có** phân bổ = trả nợ (không phải chi phí mới); `payee_type='other'` = chi phí thật phát sinh. **Không còn phiếu chi "trích trước"** — `upsert_printing_expense`, `upsert_vendor_expense`, trigger `work_task_vendor_expense_sync` đã bỏ (43 dòng cũ xoá mềm, mô tả gắn `[ADR-016…]`). `lab_payments`/`vendor_payments` (+2 bảng phân bổ) **không còn tồn tại** — M1 đổi thành view + bảng `_legacy`, M2b (26/08/2026) drop hẳn; dữ liệu cũ nằm ở `docs/reports/backup_2026-08-26_*.json` và đã di trú vào `expenses` (`legacy_source`/`legacy_id`).

**Công nợ phải trả** = `finance_payable_summary()` (lab + thợ ngoài + NCC phôi); `finance_lab_debt_summary`/`finance_vendor_debt_summary` là wrapper giữ chữ ký cũ.
**Lợi nhuận hợp đồng** = `contract_financials(uuid[])` — nguồn duy nhất cho `finance_contract_profit_report`, `get_contract_list_v2`, drawer lợi nhuận: `total_amount − Σ work_tasks.cost (mọi task không da_huy) − Σ printing_orders.total_amount (không hủy) − Σ giá vốn xuất kho gắn HĐ − Σ expenses other gắn HĐ`.

**Luật ngày ghi sổ (ADR-016 §2):** doanh thu theo `contracts.work_date` (fallback `contract_date`, loại `da_huy`); chi phí task theo `contract_events.event_date`; đơn in theo `order_date`; thu/chi theo `payment_date`/`expense_date` nhập trên phiếu — **không bao giờ theo `updated_at`/ngày bấm trạng thái** (user hay cập nhật muộn).

## Ba số, một bộ sổ (ADR-016 M2, 2026-08-26)

Một hàm sổ kỳ **`finance_period_ledger(p_start, p_end)`** tính mọi cột (tiền vào/ra, doanh thu, từng loại chi phí) theo luật ngày ở trên. **Từ 11/09/2026 (#23) cả bốn hàm đều đọc chung một nguồn:**

| Hàm | Dùng ở | Đọc ledger? | Trả |
|---|---|:---:|---|
| `finance_month_summary(m, y)` | `/finance` 3 khối | ✅ 2 lần (kỳ này + kỳ trước) | két (`cash_*`), lãi/lỗ (`revenue`, `cost_*`, `profit`), công nợ (`receivable`, `payable_*`), `contracts_missing_work_date` |
| `finance_pnl_by_month(y)` | chart 12 tháng | ✅ LATERAL × 12 | `revenue`, `cost`, `profit`, `cash_in`, `cash_out`, `signed_revenue` |
| `finance_reports_snapshot(start, end)` | `/reports`, Moodie `financial_summary` | ✅ | JSON cũ + `signedRevenue`; `cashflowSummary.totalOutflow` = Σ `expenses` |
| `finance_cashflow_timeline(start, end)` | biểu đồ tiền | ✅ qua `finance_cash_entries` (#23, `20260911160000`) | `date`, `inflow`, `outflow` theo ngày |

**Tiền vào/ra có đúng MỘT định nghĩa** kể từ #23 (11/09/2026): hàm `finance_cash_entries(start, end)` trả tiền vào/ra **theo ngày** (9 cột, cùng bộ lọc cũ kể cả luật hoàn tiền R2 của #12). `finance_period_ledger` cộng nó lại theo kỳ; `finance_cashflow_timeline` vẽ thẳng từng ngày của nó. Đổi bộ lọc ở một chỗ là cả hai đổi theo — không còn cảnh "số khớp nhờ may".

| Chỗ từng tự cộng | Trước #23 | Sau #23 |
|---|---|---|
| `finance_cashflow_timeline` | tự query `payments` + `receipts` + `expenses` (`20260826120000:324-336`) | đọc `finance_cash_entries` |
| `buildCloseSnapshot` (`app/actions/finance-close-actions.ts`) | tự cộng 5 bảng trong TypeScript; `fixedCost` lấy từ **bảng kế hoạch** `fixed_costs` (ledger đếm phiếu chi `[Auto-Fixed]` thật) | đọc `finance_period_ledger`; `fixedCost` = `cash_out_fixed` |

Cửa an toàn: `finance_cashflow_timeline_legacy` (bản sao công thức cũ) **giữ đúng 1 kỳ** để so chéo; `npm run verify:cashflow-ledger` đối chiếu từng tháng; migration gỡ `20260911170000` đã viết sẵn, áp sau 01/10/2026. `buildCloseSnapshot` cũng ghi khối `legacy` + `legacyDelta` vào `snapshot_metrics`.

⚠️ Vẫn còn **ngoài** sổ kỳ: `depreciationCost` của bản chốt sổ (khấu hao đường thẳng từ `investments`, trùng công thức `investmentBookValue()`) — không phải tiền mặt nên không thuộc sổ kỳ, để **#29** xử lý.

Còn 4 chỗ tự cộng khác **chỉ chạy fallback / không phải nguồn tổng**: `calculateFallbackSnapshot` (chỉ khi `NODE_ENV !== 'production'`), `get_finance_intelligence` / `_advanced_` / `get_cashflow_forecast` (card sức khoẻ, runway, hoà vốn — nhãn "biên lợi nhuận" vẫn tính theo két), `getServiceDistributionFallback` (lọc `contract_date` thay vì `work_date`), `fetchLedgerFallback`. → `agent/system-map/01-tien.md` §5.

Két ≠ lãi/lỗ: tháng 8/2026 két +203.600 (thu 18,3tr − chi 18,1tr toàn bộ là **trả nợ** lab/thợ của tháng trước) nhưng lãi +37,1tr (14 HĐ chụp trong tháng). Trước M2 dashboard gọi 203.600 là "Tồn quỹ" và `/reports` cộng 18,1tr trả nợ thành "chi phí" lần hai.

**Phải trả** hợp nhất ở `/finance/payables` (lab · thợ · NCC phôi): danh sách `finance_payable_summary()`, khoản còn nợ `payable_items()`, trả `record_payee_payment_atomic` (một modal cho 3 loại), lịch sử `payee_payment_history()` (phân bổ có nhãn), huỷ `void_payee_payment_atomic` (xoá mềm + dẫn xuất lại `payment_status` đơn in).

## Ba câu hỏi hay hỏi sai

**"Doanh thu tháng này bao nhiêu?"** *(từ 05/09, #8: `/dashboard` 3 thẻ Doanh thu · Đã thu (két) · Lãi/lỗ đọc `finance_pnl_by_month` — cùng sổ kỳ, 16 ms; thẻ cũ đọc `dashboard_critical_kpis.current_revenue` = tiền két gọi là doanh thu, T8 lệch 27,98tr.)*
→ `finance_month_summary(m, y).revenue` — theo **ngày chụp**. Muốn tiền đã thu: `.cash_in`. **Đừng cộng tay `payment_plans`** — đó là kế hoạch, không phải tiền.

**"Hợp đồng này lãi bao nhiêu?"**
→ `contract_financials(uuid[])` / `finance_contract_profit_report`. Nó trừ **bốn** khoản: chi phí task (mọi task ≠ `da_huy`, **gồm cả ekip nội bộ**) + in ấn + giá vốn kho + chi trực tiếp (`expenses` `other` gắn HĐ). Tự tính tay sẽ sót nhánh. Σ lãi theo tháng = Σ lãi theo HĐ vì cùng luật.
⚠️ [[vong-doi-hop-dong]] §8 từng ghi công thức này **thiếu khoản chi trực tiếp** — đã sửa 31/08.

**"Còn phải thu / phải trả bao nhiêu?"**
→ phải thu: `finance_debt_stats()` (M3 — đọc **hợp đồng**, không phải bảng `debts` rỗng); một HĐ thì đọc thẳng `contracts.remaining_amount` · phải trả: `finance_payable_summary()` (lab · thợ · NCC · **ekip**).
⚠️ **Đừng dùng `get_contract_balance`** — hàm tồn tại trên DB nhưng **không có `CREATE` trong `supabase/migrations/`** và **0 call-site** trong `app/`+`lib/`+`components/`. Trang này từng khuyên dùng nó; đó là hàm chết.

**"HĐ nào đến hạn thu?"** (M3)
→ **đến hạn = đã giao sản phẩm** (`contract_events` `giao_san_pham` `hoan_thanh`) mà `remaining_amount > 0`; tuổi nợ đếm từ ngày giao (`finance_debt_stats().aging`, `get_receivable_aging().not_delivered` + 4 bucket). Chưa giao = **chờ giao**, không phải quá hạn. Danh sách: `finance_pending_collections(limit)` — HĐ đã giao lên đầu. `finance_month_summary` tách `receivable_due` / `receivable_waiting`. Đo 26/08: phải thu 92.575.000 = đã giao chưa thu 3.300.000 (1 HĐ) + chờ giao 89.275.000 (19 HĐ). `payment_plans` (lịch tự sinh) **không** phải nguồn đến hạn — M4 (27/08/2026): dashboard "Cần thu tiền" cũng đọc `finance_pending_collections`; lịch thu mặc định chỉ còn Cọc + Tất toán (Đợt 1/2 0đ đã bỏ khỏi generator và xoá 119 dòng rỗng).

## Khoá sổ

`finance_monthly_closes.period = 'YYYY-MM'`, `status = 'locked'` → `is_period_locked(date)` trả true.
Quy trình đi qua `finance_close_tasks` + `advance_close_task`.

## Rủi ro tiền đã đo — chưa vá (31/08/2026)

~~**Hoàn tiền HĐ đã huỷ làm lệch lãi/lỗ.**~~ ✅ **ĐÃ SỬA 07/09/2026 (#12, R2, `T-20260907-r2-ledger-hoan-tien`):** `finance_period_ledger.cost_direct` và `contract_financials.direct_cost` loại phiếu chi danh mục `contract_refund/refund/hoan_tien` (JOIN `transaction_categories`); `cash_out` giữ nguyên. Diễn tập local: hoàn cọc 1tr → `cost_direct` 1.200.000 → 200.000. Hôm áp: 0 phiếu hoàn → số không đổi. Thân sống: [[than-ham/hop-dong]] (`finance_period_ledger`, `contract_financials`). Còn mở: cọc **giữ lại** khi khách huỷ chưa là thu nhập (#29/#30).
⇒ Chi phí vào sổ, doanh thu không → tháng đó lỗ oan.
**[DB] hiện 0 phiếu / 0đ** vì chưa có HĐ nào huỷ được — nó sẽ **nổ cùng lúc** với lỗi huỷ hợp đồng ở [[vong-doi-hop-dong]] (5 HĐ đang không huỷ được). → `agent/SYSTEM_MAP.md` §6 R2.

**Phiếu chi thủ công có thể vào két mà không giảm công nợ.** `payee_type` **không xuất hiện trong bất kỳ component nào** ở `components/finance/expenses/` ⇒ form phiếu chi thủ công luôn để mặc định `'other'`. Nhưng `createExpenseSchema` **cho phép** truyền `lab/vendor/supplier/employee` (`lib/validations/finance.schema.ts:39`) — một phiếu như vậy sẽ vào `cash_out` mà **không có phân bổ**, tức không trừ nợ ai cả.

> ⚠️ CHƯA KIỂM (2026-08-31): có dòng `expenses` nào `payee_type <> 'other'` mà **không** có `expense_allocations` trên DB không.
> ⚠️ CHƯA KIỂM (2026-08-31): `finance_period_ledger.cost_salary_base` cộng `employee_salaries.total_salary`, còn `payable_items`/`sync_employee_salary_paid` dùng `net_salary` (= `total_salary − advance_payment`). Khi `advance_payment > 0` thì **accrual chi phí lương ≠ nợ lương phải trả**. Chưa đo có dòng nào `advance_payment > 0`.

## Ba luật cứng

1. **Số tiền luôn tính lại ở server.** Không optimistic, không patch cache. → [[cache-va-realtime]]
2. **`revalidatePath` ở finance giữ nguyên 100%.** Realtime chỉ là chuông báo `router.refresh()`.
3. **Tiền không đi qua realtime payload.** Bảng finance không vào publication, không grant.

## Bẫy đã cháy: lỗi bị nuốt

Chi phí vendor **under-count suốt 18 ngày** vì `CASE` ép enum sai kiểu → `22P02` → lỗi bị nuốt, accrual im lặng không sinh. Không ai thấy vì không có gì báo đỏ.

→ **Nghi số tiền sai thì query dữ liệu trước, đừng tin giả thuyết.** Ở lần đó giả thuyết ban đầu ("double-count") sai ngược hướng hoàn toàn.

## Liên quan

[[tai-chinh]] · [[vong-doi-hop-dong]] · [[nha-cung-cap]] · [[in-an-lab]] · [[nhan-su]]

---
title: "Luồng — Dòng tiền"
tags: [luong, tai-chinh]
cap-nhat: 2026-08-07
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
| Thợ ngoài | `work_tasks.cost` khi `hoan_thanh` | `record_vendor_payment_atomic` (wrapper) → `record_payee_payment_atomic('vendor')` → `expenses` + `expense_allocations(work_task)` |
| Lab in ấn | `printing_orders.total_amount` khi tạo | `record_lab_payment_atomic` (wrapper) → `record_payee_payment_atomic('lab')` → `expenses` + `expense_allocations(printing_order)`; `payment_status` **dẫn xuất** (`recompute_printing_payment_status`) |
| Phôi thiệp / vật tư | `inventory_transactions.stock_in` | `inventory_stock_in_atomic(p_paid=true)` tạo phiếu chi `supplier` ngay trong transaction (Mood trả ngay khi nhập) |
| Lương | `work_tasks.cost` (theo HĐ) *hoặc* lương cứng (overhead) — không cả hai | `payEmployeeSalaryAction` → `expenses` (`payee_type='employee'`); phân bổ vào `employee_salaries` → M5 |
| Chi trực tiếp / vận hành | = chính phiếu chi | `expenses` `payee_type='other'` (có `contract_id` = chi trực tiếp cho HĐ) |

**Luật:** phiếu chi **có** phân bổ = trả nợ (không phải chi phí mới); `payee_type='other'` = chi phí thật phát sinh. **Không còn phiếu chi "trích trước"** — `upsert_printing_expense`, `upsert_vendor_expense`, trigger `work_task_vendor_expense_sync` đã bỏ (43 dòng cũ xoá mềm, mô tả gắn `[ADR-016…]`). `lab_payments`/`vendor_payments` (+2 bảng phân bổ) giờ là **VIEW** trên `expenses`; bảng gốc đổi tên `_legacy` (drop ở M2).

**Công nợ phải trả** = `finance_payable_summary()` (lab + thợ ngoài + NCC phôi); `finance_lab_debt_summary`/`finance_vendor_debt_summary` là wrapper giữ chữ ký cũ.
**Lợi nhuận hợp đồng** = `contract_financials(uuid[])` — nguồn duy nhất cho `finance_contract_profit_report`, `get_contract_list_v2`, drawer lợi nhuận: `total_amount − Σ work_tasks.cost (mọi task không da_huy) − Σ printing_orders.total_amount (không hủy) − Σ giá vốn xuất kho gắn HĐ − Σ expenses other gắn HĐ`.

**Luật ngày ghi sổ (ADR-016 §2):** doanh thu theo `contracts.work_date` (fallback `contract_date`, loại `da_huy`); chi phí task theo `contract_events.event_date`; đơn in theo `order_date`; thu/chi theo `payment_date`/`expense_date` nhập trên phiếu — **không bao giờ theo `updated_at`/ngày bấm trạng thái** (user hay cập nhật muộn).

## Ba câu hỏi hay hỏi sai

**"Doanh thu tháng này bao nhiêu?"**
→ `finance_revenue_by_month` / `finance_dashboard_metrics`. **Đừng cộng tay `payment_plans`** — đó là kế hoạch, không phải tiền.

**"Hợp đồng này lãi bao nhiêu?"**
→ `finance_contract_profit_report`. Nó trừ chi phí vendor + in ấn + vật tư. Tự tính tay sẽ sót nhánh.

**"Còn phải thu bao nhiêu?"**
→ `get_receivable_aging` hoặc `get_contract_balance`. Không lấy `total_amount − sum(payments)` — không tính huỷ/hoàn.

## Khoá sổ

`finance_monthly_closes.period = 'YYYY-MM'`, `status = 'locked'` → `is_period_locked(date)` trả true.
Quy trình đi qua `finance_close_tasks` + `advance_close_task`.

## Ba luật cứng

1. **Số tiền luôn tính lại ở server.** Không optimistic, không patch cache. → [[cache-va-realtime]]
2. **`revalidatePath` ở finance giữ nguyên 100%.** Realtime chỉ là chuông báo `router.refresh()`.
3. **Tiền không đi qua realtime payload.** Bảng finance không vào publication, không grant.

## Bẫy đã cháy: lỗi bị nuốt

Chi phí vendor **under-count suốt 18 ngày** vì `CASE` ép enum sai kiểu → `22P02` → lỗi bị nuốt, accrual im lặng không sinh. Không ai thấy vì không có gì báo đỏ.

→ **Nghi số tiền sai thì query dữ liệu trước, đừng tin giả thuyết.** Ở lần đó giả thuyết ban đầu ("double-count") sai ngược hướng hoàn toàn.

## Liên quan

[[tai-chinh]] · [[vong-doi-hop-dong]] · [[nha-cung-cap]] · [[in-an-lab]] · [[nhan-su]]

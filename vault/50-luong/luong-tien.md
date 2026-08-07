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

## Tiền RA

| Nguồn | Đường đi |
|---|---|
| Thuê ngoài | `work_tasks` → `upsert_vendor_expense` → `expenses` → `vendor_payments` + `vendor_payment_allocations` |
| Lab in ấn | `printing_orders` → `expenses` → `lab_payments` + `lab_payment_allocations` |
| Vật tư | `inventory_transactions` (nhập) → `expenses` |
| Lương | `work_tasks` → `employee_salaries` → `monthly_salaries` → `expenses` |
| Chi phí cố định | `fixed_costs` → `expenses` |
| Hoàn tiền khách | `contract-refund-actions.ts` → `expenses` |

**`expenses` là điểm hội tụ của mọi khoản chi.** Phân loại bằng `transaction_categories`.

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

---
title: "Module In ấn & Lab"
tags: [module, in-an]
cap-nhat: 2026-08-07
---

# Module In ấn & Lab

Đơn in (album, ảnh phóng) gửi lab đối tác, theo dõi tiến độ và công nợ lab. Quyền: admin, manager.

Quy mô: 29 đơn in, 1 lab, 22 dịch vụ lab.

## Route

`/printing` · `/printing/labs` · công nợ ở `/finance/lab-debts`

## Trạng thái đơn (số liệu thật hôm nay)

`cho_xu_ly` 9 · `dat_coc` 2 · `dang_in` 4 · `da_in` 4 · `da_nhan` 4 · `hoan_thanh` 5 · `huy_don` 1

Mỗi lần đổi trạng thái ghi vào `printing_order_status_history` (26 dòng).

## Ghi qua RPC atomic

`create_printing_order_atomic` · `update_printing_order_atomic` · `delete_printing_order_atomic` · `record_lab_payment_atomic` · `upsert_printing_expense` · `resolve_printing_expense_category_id` · `printing_integrity_report` · `printing_items_total` · `printing_lab_overview` · `printing_stats`

## ⚠️ `printing-workflow-mutations.ts` là action chạm nhiều bảng nhất

Nó viết vào: `printing_orders`, `receipts`, `order_payments`, `inventory_reservations`, `inventory_transactions`, `inventory_items`, `expenses` — tức **in ấn kéo theo cả kho lẫn tài chính**.

Đây cũng là file dùng `revalidatePath` nhiều thứ hai (18 lần). Sửa nó = chạm 3 module. Đọc [[bang-doc-ghi]] trước.

## Công nợ lab

`lab_payments` + `lab_payment_allocations` (phân bổ tiền trả cho từng đơn). Tổng hợp bằng `finance_lab_debt_summary`.
Hai bảng này **RLS bật, 0 policy** → chỉ chạm được qua server action. Đúng chủ đích.

## Bảng

[[luoc-do-in-an-lab]] — `printing_orders` · `printing_order_status_history` · `labs` · `lab_services` · `lab_payments` · `lab_payment_allocations`

## Từ vựng phương thức thanh toán — ĐÃ THỐNG NHẤT 08/08

UI module In ấn dùng `cash | transfer | card | other` (types/printing.ts) làm giá trị nội bộ, nhưng **mọi điểm ghi DB quy đổi qua `toPaymentMethodEnum()`** (printing-workflow-mutations) → DB chỉ còn `tien_mat | chuyen_khoan` ở `order_payments.payment_method`, `receipts.payment_type`, `expenses.payment_method`. Display (payment-history-section) nhận cả hai từ vựng phòng dữ liệu cũ. **Thêm điểm ghi mới → nhớ quy đổi.**

## Kỹ thuật

SWR (5 file), **0 realtime** → dựa hoàn toàn vào `revalidatePath`. Đừng bỏ.

## Liên quan

[[tai-chinh]] · [[vat-tu]] · [[hop-dong]]

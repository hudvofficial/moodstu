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

## Tiền (ADR-014 + ADR-016, 2026-08-24/25)

In ấn là Mood ⇄ Lab thuần tuý: **không cọc, không kho, không giao khách ở đơn in** (ADR-014). Chi phí lab là **cam kết** = `printing_orders.total_amount` ngay khi tạo đơn — **không còn phiếu chi trích trước** (`upsert_printing_expense` đã bỏ; `create/update/delete_printing_order_atomic` không chạm `expenses`).

## Công nợ lab

Trả lab = **phiếu chi thật**: `record_lab_payment_atomic` (wrapper giữ chữ ký cũ, thêm `p_payment_date`) → `record_payee_payment_atomic('lab')` → `expenses` (`payee_type='lab'`) + `expense_allocations(printing_order)`. `printing_orders.payment_status` **dẫn xuất** từ phân bổ (`recompute_printing_payment_status`), không ghi tay. Tổng hợp: `finance_payable_summary()` (wrapper `finance_lab_debt_summary` giữ RETURNS cũ cho `/printing`). **M2 (2026-08-26):** app đọc **thẳng** `expenses` (`payee_type='lab'`) + `expense_allocations` (`target_type='printing_order'`, join `expenses!inner` lọc `deleted_at`) — view `lab_payments`/`lab_payment_allocations` + bảng `_legacy` **đã drop** ở M2b (26/08/2026). `target_id` đa hình không FK → tra `order_code` bằng query riêng. Màn công nợ lab = `/finance/payables` (chung lab · thợ · NCC); modal trả lab ở `/printing` giữ nguyên. Xoá đơn đã có phiếu chi → RPC chặn.

## Bảng

[[luoc-do-in-an-lab]] — `printing_orders` · `printing_order_status_history` · `labs` · `lab_services` (phiếu chi trả lab nằm ở `expenses`/`expense_allocations` — [[tai-chinh]])

## Từ vựng phương thức thanh toán — ĐÃ THỐNG NHẤT 08/08

UI module In ấn dùng `cash | transfer | card | other` (`types/printing.ts` `PaymentMethod`) làm từ vựng nội bộ của modal trả lab; DB chỉ nhận `tien_mat | chuyen_khoan` (`expenses.payment_method`, `receipts.payment_type`) → **quy đổi trước khi ghi**. Điểm ghi tiền in ấn duy nhất còn lại là phiếu chi trả lab (`record_lab_payment_atomic` → `expenses`); `order_payments` + `toPaymentMethodEnum()` (printing-workflow-mutations) đã drop/xoá ở ADR-017. **Thêm điểm ghi mới → nhớ quy đổi.**

## Kỹ thuật

SWR (5 file), **0 realtime** → dựa hoàn toàn vào `revalidatePath`. Đừng bỏ.

## Liên quan

[[tai-chinh]] · [[vat-tu]] · [[hop-dong]]

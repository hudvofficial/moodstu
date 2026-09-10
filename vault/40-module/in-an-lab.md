---
title: "Module In ấn & Lab"
tags: [module, in-an]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/03-in-kho-vay.md · vault/30-du-lieu/than-ham/in-an-lab.md · ham-mo-coi.md
---

# Module In ấn & Lab

Đơn in (album, ảnh phóng) gửi lab đối tác, theo dõi tiến độ và công nợ lab. Quyền: admin, manager.

Quy mô (**ảnh chụp**, số sống ở [[luoc-do-in-an-lab]]): 35 đơn in, 1 lab, 22 dịch vụ lab.

## Route

`/printing` · `/printing/labs` · công nợ ở `/finance/lab-debts`

## Trạng thái đơn (ADR-014)

Trục thật — nguồn chân lý duy nhất là `types/printing-constants.ts`, cả server action lẫn dropdown UI đều đọc từ đó:

```
cho_xu_ly → dang_in → da_in → hoan_thanh
      ↘ huy_don · gap_su_co (từ mọi bước)
```

`gap_su_co` quay lại được mọi trạng thái (`PRINTING_VALID_TRANSITIONS`, `printing-constants.ts:28`); `hoan_thanh` và `huy_don` là terminal.

⚠️ **`dat_coc` KHÔNG còn tồn tại.** Migration `20260824120000…:15-18` chuyển hết sang `hoan_thanh`, CHECK constraint chặn (`:22-25`). `da_nhan` và `da_huy` là **legacy chỉ để đọc** audit-log cũ — terminal, không transition nào tới (`printing-constants.ts:13-14`, `:29-30`). Phân bố trạng thái ở bản cũ của trang này (có `dat_coc` 2 đơn) là ảnh chụp **trước ADR-014** — đã gỡ.

Mỗi lần đổi trạng thái ghi vào `printing_order_status_history` (ảnh chụp **66 dòng** ở [[luoc-do-in-an-lab]]; con số 26 ở bản cũ đã lỗi thời).

## Hàm DB của module

**Ghi (atomic):** `create_printing_order_atomic` · `update_printing_order_atomic` · `delete_printing_order_atomic` · `record_lab_payment_atomic` (wrapper của `record_payee_payment_atomic('lab')`).

**Đọc / phụ trợ:** `printing_stats` · `printing_lab_overview` · `printing_items_total` · `get_printing_cost_stats` · `nextval_printing_order_code` · `resolve_printing_expense_category_id` · `recompute_printing_payment_status` · `printing_integrity_report`.

⚠️ **`upsert_printing_expense` đã DROP** (`20260825200000_cashflow_m1_expense_allocations.sql:178`) — không còn trên DB: không có thân hàm trong `vault/30-du-lieu/than-ham/`, cũng không nằm trong [[ham-mo-coi]] (bản kiểm 149 hàm sống, 31/08). Bản cũ của trang này vừa liệt kê nó ở đây vừa nói "đã bỏ" ở mục Tiền — mâu thuẫn nội bộ, nay đã gỡ.

> ⚠️ CHƯA KIỂM (2026-08-31): `printing_integrity_report()` không có caller nào trong `app/` hay `components/` — chưa rà `scripts/` để biết nó chạy tay hay đã chết.

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

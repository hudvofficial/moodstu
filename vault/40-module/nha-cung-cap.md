---
title: "Module Nhà cung cấp"
tags: [module, nha-cung-cap]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/01-tien.md · 03-in-kho-vay.md · vault/30-du-lieu/than-ham/nha-cung-cap.md
---

# Module Nhà cung cấp

Thuê ngoài (CTV/đối tác) làm việc trong hợp đồng → sinh chi phí phải trả. Route: `/admin/vendors`, công nợ ở `/finance/vendor-debts`.

Quy mô (**ảnh chụp**, số sống ở [[luoc-do-nha-cung-cap]]): 10 vendor.

## Cơ chế (ADR-016, 2026-08-25)

`vendors` = **đối tác ngoài** với `vendor_type`: `tho_ngoai` (giao việc qua `work_tasks`) · `nha_cung_cap` (phôi/vật tư, `inventory_items.supplier_id`). Picker giao việc (`getActiveVendors`) chỉ lấy `tho_ngoai`; form nhập kho (`getSupplierOptions`) chỉ lấy `nha_cung_cap`.

Chi phí thợ ngoài = **cam kết** `work_tasks.cost`, tính khi `hoan_thanh`. **Không còn `upsert_vendor_expense`/trigger trích trước.**
Thanh toán = phiếu chi thật qua **một** đường: màn `/finance/payables` (ADR-016 M2, thay `/finance/vendor-debts`) → `recordPayeePayment` (`app/actions/payable-actions.ts`) → `record_payee_payment_atomic('vendor')` → `expenses` (`payee_type='vendor'`) + `expense_allocations(work_task)`; khoản còn nợ từ `payable_items()`, lịch sử từ `payee_payment_history()`, huỷ = `void_payee_payment_atomic` (xoá mềm `expenses`). Wrapper `record_vendor_payment_atomic` và view/bảng `vendor_payments`/`vendor_payment_allocations` (+`_legacy`) **đã drop** ở M2b (26/08/2026). Báo cáo chi phí thợ theo tháng = `vendor_cost_report(p_month, p_year)` — theo **ngày sự kiện** của task (trước: `deadline`).
Tổng hợp công nợ: `finance_payable_summary()` (wrapper `finance_vendor_debt_summary` giữ RETURNS cũ).

## ⚠️ Sự cố đã xảy ra — đọc trước khi đụng

**Chi phí vendor bị đếm thiếu suốt 18 ngày** (28/05 → 15/06).

- **Triệu chứng ban đầu bị hiểu nhầm** là "double-count".
- **Nguyên nhân thật:** `CASE` ép enum `work_type` sang chuỗi `'hau_ky_phim'` → lỗi Postgres `22P02` (invalid input syntax for enum). **Lỗi bị nuốt** → accrual expense im lặng không sinh → under-count.
- **Fix:** sửa `CASE` dùng `enum::text`, backfill dữ liệu thiếu, thêm trigger.

**Hai bài học:**
1. **Query dữ liệu thật trước khi tin một giả thuyết** — giả thuyết "double-count" sai hoàn toàn và suýt dẫn tới fix ngược hướng.
2. `CASE` trên cột enum phải ép `enum::text`, nếu không lỗi runtime không lộ ra.

Script chẩn đoán còn giữ: `scripts/vendor-expense-diagnostic.mjs`, `vendor-accrual-preview.mjs`, `vendor-expense-dupe-report.mjs`.

## Bảng

[[luoc-do-nha-cung-cap]] — `vendors` (`vendor_type` thợ ngoài / NCC phôi; phiếu chi ở `expenses`/`expense_allocations` — [[tai-chinh]])

**Nay chỉ còn một bảng.** `vendor_payments` và `vendor_payment_allocations` (+ 2 bảng `_legacy` của chúng) **đã drop** ở M2b — `20260826130000_cashflow_m2b_drop_legacy.sql:33-40`, cùng với `record_vendor_payment_atomic` (`:46`) và `update_vendor_payments_updated_at` (`:42`). Ghi chú cũ "ba bảng từng vắng mặt trong `types/database.types.ts`, đã bổ sung 2026-08-07" giờ chỉ còn áp cho `vendors`. → [[canh-bao-schema]]

## Liên quan

[[tai-chinh]] · [[nhan-su]] · [[hop-dong]]

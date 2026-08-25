---
title: "Module Nhà cung cấp"
tags: [module, nha-cung-cap]
cap-nhat: 2026-08-07
---

# Module Nhà cung cấp

Thuê ngoài (CTV/đối tác) làm việc trong hợp đồng → sinh chi phí phải trả. Route: `/admin/vendors`, công nợ ở `/finance/vendor-debts`.

Quy mô: 8 vendor, 1 lần thanh toán.

## Cơ chế (ADR-016, 2026-08-25)

`vendors` = **đối tác ngoài** với `vendor_type`: `tho_ngoai` (giao việc qua `work_tasks`) · `nha_cung_cap` (phôi/vật tư, `inventory_items.supplier_id`). Picker giao việc (`getActiveVendors`) chỉ lấy `tho_ngoai`; form nhập kho (`getSupplierOptions`) chỉ lấy `nha_cung_cap`.

Chi phí thợ ngoài = **cam kết** `work_tasks.cost`, tính khi `hoan_thanh`. **Không còn `upsert_vendor_expense`/trigger trích trước.**
Thanh toán = phiếu chi thật: `record_vendor_payment_atomic` (wrapper giữ chữ ký) → `record_payee_payment_atomic('vendor')` → `expenses` (`payee_type='vendor'`) + `expense_allocations(work_task)`. Huỷ thanh toán = xoá mềm `expenses`. `vendor_payments`/`vendor_payment_allocations` là **VIEW**.
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

[[luoc-do-nha-cung-cap]] — `vendors` · `vendor_payments` · `vendor_payment_allocations`

Ba bảng này từng **vắng mặt trong `types/database.types.ts`** suốt một thời gian dài; đã bổ sung ngày 2026-08-07 → [[canh-bao-schema]].

## Liên quan

[[tai-chinh]] · [[nhan-su]] · [[hop-dong]]

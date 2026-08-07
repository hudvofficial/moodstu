---
title: "Module Nhà cung cấp"
tags: [module, nha-cung-cap]
cap-nhat: 2026-08-07
---

# Module Nhà cung cấp

Thuê ngoài (CTV/đối tác) làm việc trong hợp đồng → sinh chi phí phải trả. Route: `/admin/vendors`, công nợ ở `/finance/vendor-debts`.

Quy mô: 8 vendor, 1 lần thanh toán.

## Cơ chế

`work_tasks` giao cho vendor → **`upsert_vendor_expense`** sinh/ cập nhật dòng `expenses` (chi phí trích trước).
Thanh toán: `record_vendor_payment_atomic` → `vendor_payments` + `vendor_payment_allocations` (phân bổ cho từng task).
Tổng hợp công nợ: `finance_vendor_debt_summary`.

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

⚠️ Ba bảng này **không có trong `types/database.types.ts`** (file types đang lệch DB) → [[canh-bao-schema]].

## Liên quan

[[tai-chinh]] · [[nhan-su]] · [[hop-dong]]

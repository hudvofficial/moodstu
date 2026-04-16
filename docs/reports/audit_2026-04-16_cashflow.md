# Audit Report — Module Cashflow (Sổ cái thu chi)

**Ngày:** 16/04/2026
**Phạm vi:** Full Audit — Security, Code Quality, Data Integrity
**Route:** `/finance/cashflow`

---

## Summary

| Mức độ | Số lượng |
|--------|----------|
| 🔴 Critical | 0 |
| 🟡 Warning | 3 |
| 🟢 Suggestion | 2 |

**Files scanned:** 8 files (1 route, 3 components, 2 actions, 1 dashboard card, 1 types)

---

## 🔴 Critical Issues

Không tìm thấy lỗi critical. Module cashflow architecture clean và resilient.

---

## 🟡 Warnings

### W1. `getCashflowTimeline` không filter `deleted_at` cho bảng `receipts`

- **File:** `app/actions/finance-cashflow-timeline.ts:14-19`
- **Vấn đề:** Query `payments` và `expenses` đều filter `.is("deleted_at", null)` nhưng `receipts` thì **không**. Nếu bảng receipts có soft delete → data timeline bao gồm cả receipts đã xóa.
- **Hậu quả:** Biểu đồ cashflow timeline hiển thị inflow cao hơn thực tế.
- **Cách sửa:** Thêm `.is("deleted_at", null)` cho query receipts (nếu bảng có cột này).

### W2. `fetchLedgerFallback` — pagination client-side trên toàn bộ dataset

- **File:** `app/actions/finance-dashboard-queries.ts:240-322`
- **Vấn đề:** Fallback kéo **tất cả** payments + receipts + expenses của tháng về server action, rồi mới slice pagination. Với studio lớn (nhiều giao dịch/tháng) sẽ tốn memory.
- **Hậu quả:** Performance chậm khi data lớn. Chấp nhận được vì chỉ là fallback (khi RPC chưa deploy).
- **Cách sửa:** Nếu RPC `finance_ledger` đã deploy → không cần action, fallback hiếm khi chạy. Nếu cần tối ưu: `.order().range()` trên từng table trước khi merge.

### W3. `LedgerClient` thiếu `Breadcrumb` — không nhất quán với modules khác

- **File:** `components/finance/cashflow/ledger-client.tsx:74`
- **Vấn đề:** Return `<>` (fragment) thay vì `<div>` wrapper với Breadcrumb. Các module Receipts/Expenses đều có Breadcrumb `Tài chính > Phiếu thu/chi`.
- **Hậu quả:** UX không nhất quán — user vào Cashflow không có breadcrumb navigation.
- **Cách sửa:** Thêm `<Breadcrumb items={[{label:"Tài chính", href:"/finance"}, {label:"Sổ cái thu chi"}]} />`.

---

## 🟢 Suggestions

### S1. `getContractFinanceDetails` hardcode `discount: 0`

- **File:** `app/actions/finance-dashboard-queries.ts:539`
- **Vấn đề:** Khi build `ContractProfitDetailData`, field `discount` luôn = 0 thay vì đọc từ `contract.discount_amount`.
- **Đề xuất:** `discount: asNumber((contract as RpcRow).discount_amount)`.

### S2. Expense code format thiếu prefix nhất quán

- **File:** `app/actions/finance-dashboard-queries.ts:304`
- **Vấn đề:** Expense code dùng format `EXP-{8 chars}` (fallback). Nhưng payments dùng `receipt_code` gốc, receipts dùng `contract_code`. Không thống nhất.
- **Đề xuất:** Tùy business — có thể chấp nhận vì ledger hiển thị nhiều nguồn khác nhau.

---

## ✅ Điểm tốt

| Hạng mục | Đánh giá |
|----------|----------|
| **Resilient Fallback** | ✅ Mọi RPC call đều có `isMissingRpcError` → auto fallback sang query thường |
| **SSR + SWR** | ✅ Page dùng SSR fetch initial → client SWR cho navigation/filter |
| **Authorization** | ✅ Tất cả actions dùng `withAuth` |
| **Soft Delete** | ✅ Filter `deleted_at IS NULL` ở payments và expenses |
| **Type Safety** | ✅ Dùng `satisfies` pattern cho return types |
| **File Size** | ✅ Tất cả component files < 120 lines |
| **Responsive** | ✅ Desktop table `hidden lg:block`, mobile list `lg:hidden` |

---

## Next Steps

1️⃣ Sửa W1 + W3 (nhỏ, auto-fixable)
2️⃣ Fix S1 (discount: 0 hardcode)
3️⃣ Bỏ qua, lưu báo cáo
4️⃣ 🔧 FIX ALL

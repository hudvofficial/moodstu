# Audit Report — Module Phiếu Chi (Expenses)

**Ngày:** 16/04/2026
**Phạm vi:** Full Audit — Security, Code Quality, Performance
**Đường dẫn mẫu:** `/finance/expenses/693794f2-35c0-4c10-90b3-b76bfcd7f9bc`

---

## Summary

| Mức độ | Số lượng |
|--------|----------|
| 🔴 Critical | 2 |
| 🟡 Warning | 4 |
| 🟢 Suggestion | 3 |

**Files scanned:** 11 files (actions, queries, schema, 7 components, 1 route page)

---

## 🔴 Critical Issues (Phải sửa ngay)

### C1. `getExpenseDetail()` trả `null` thay vì throw → detail page vẫn hoạt động nhưng detail modal không hiển thị lỗi đúng

- **File:** `app/actions/finance-operations-queries.ts:543-544`
- **Vấn đề:** Khi expense không tìm thấy (hoặc đã bị xóa), hàm `getExpenseDetail()` trả `null` thay vì `throw Error`. Ở route page `[id]/page.tsx` thì check OK (`notFound()`), nhưng ở `expense-detail-modal.tsx:51-57` check hai lần:
  - `!expenseRes.success` → sẽ **không trigger** vì `withAuth` wraps null thành `{ success: true, data: null }`
  - `!expenseRes.data` → trigger đúng nhưng error message generic
- **Hậu quả:** Modal detail có thể show "Dữ liệu phiếu chi trống" thay vì "Phiếu chi đã bị xóa hoặc không tồn tại" — UX mơ hồ.
- **Cách sửa:** Thống nhất: `getExpenseDetail` nên `throw new Error(...)` khi không tìm thấy (giống `getReceiptDetail` ở line 510), hoặc modal nên merge 2 check thành 1 message rõ ràng.

### C2. `ExpenseFormModal` không gửi `contract_id` khi tạo/sửa phiếu chi

- **File:** `components/finance/expenses/expense-form-modal.tsx:86-96`
- **Vấn đề:** Form có state `contract_id` nhưng payload submit (line 86-93) **không include** `contract_id`. Contract liên kết sẽ bị mất khi sửa phiếu chi.
- **Hậu quả:** Nếu phiếu chi đã gắn HĐ, khi user sửa bất kỳ field nào → `contract_id` bị gửi là `undefined` → Zod `.partial()` bỏ qua field → giữ nguyên DB value. **Không mất data khi sửa** (vì partial). Nhưng khi **tạo mới**, user không có cách nào gắn HĐ từ form.
- **Cách sửa:** Thêm UI chọn HĐ (SimpleSelect với `contractOptions`) hoặc loại bỏ `contract_id` khỏi form state nếu không cần.

---

## 🟡 Warnings (Nên sửa)

### W1. `ExpenseMobileSwipeCard` tạo `ExpenseDetailModal` instance cho MỖI card

- **File:** `components/finance/expenses/expense-mobile-swipe-card.tsx:131-135`
- **Vấn đề:** Mỗi swipe card render 1 `ExpenseDetailModal` riêng. Nếu danh sách có 12 phiếu chi → 12 modal instances trong DOM (dù ẩn).
- **Hậu quả:** Tốn memory + DOM nodes thừa. Với danh sách lớn có thể giật lag trên mobile.
- **Cách sửa:** Lift modal lên `ExpensesClient` level (đã có pattern ở `handleView` nhưng navigate sang route thay vì mở modal). Dùng 1 modal duy nhất + truyền `expenseId` xuống.

### W2. `handleView` navigate sang route detail thay vì mở modal

- **File:** `components/finance/expenses/expenses-client.tsx:122-124`
- **Vấn đề:** Desktop table dùng `router.push(/finance/expenses/${id})` → reload trang mới. Nhưng mobile swipe card lại mở modal tại chỗ. Hành vi không nhất quán.
- **Hậu quả:** UX lộn xộn: cùng nút "Xem" nhưng desktop chuyển trang, mobile mở modal.
- **Cách sửa:** Thống nhất: hoặc cả hai dùng modal, hoặc cả hai navigate route. Recommend: desktop dùng modal (đã có `ExpenseDetailModal`), mobile giữ nguyên modal.

### W3. Hardcode fallback data trong branding

- **File:** `expense-detail-modal.tsx:154-155` và `[id]/page.tsx:123-124`
- **Vấn đề:** Fallback `"123 Nguyễn Văn Linh, Quận 7, TP.HCM"` và `"0909 123 456"` là dữ liệu test.
- **Hậu quả:** Nếu studio chưa cấu hình `address/hotline`, phiếu chi in ra sẽ hiện địa chỉ giả.
- **Cách sửa:** Fallback thành empty string hoặc "Chưa cập nhật" thay vì mock data.

### W4. `approveExpense` dùng `withAdmin` — chỉ Admin mới duyệt được

- **File:** `app/actions/expense-actions.ts:27`
- **Vấn đề:** Tất cả các mutation (create, update, delete, approve) đều dùng `withAdmin`. Đúng với approve/delete, nhưng có thể quá strict cho create/update.
- **Hậu quả:** Staff không thể tạo phiếu chi mà phải chờ Admin. Tùy business logic.
- **Cách sửa:** Xem xét cho phép role `staff` tạo phiếu chi (dùng `withAuth`), chỉ giữ `withAdmin` cho approve/delete.

---

## 🟢 Suggestions (Tùy chọn)

### S1. `image_url` có trong schema nhưng không hiển thị ở detail

- **Files:** `expense-detail-modal.tsx`, `[id]/page.tsx`
- **Vấn đề:** Schema cho phép đính kèm ảnh (`image_url`), form cũng có field, nhưng cả detail modal và detail page đều **không render ảnh**.
- **Đề xuất:** Thêm section hiển thị ảnh chứng từ nếu `image_url` tồn tại.

### S2. Thiếu `payment_method` trên detail page/modal

- **Files:** `expense-detail-modal.tsx`, `[id]/page.tsx`
- **Vấn đề:** Phiếu chi có thể thanh toán bằng "Tiền mặt" hoặc "Chuyển khoản", nhưng cả hai view detail đều **không hiển thị phương thức thanh toán**.
- **Đề xuất:** Thêm row "Phương thức thanh toán" vào phần Content Fields.

### S3. Code trùng lặp giữa `expense-detail-modal.tsx` và `[id]/page.tsx`

- **Vấn đề:** ~80% logic và UI layout giữa 2 file gần như giống nhau (branding, stamp, signatures, footer). Chỉ khác wrapper (modal vs page).
- **Đề xuất:** Extract shared component `ExpenseVoucher` chứa phần nội dung phiếu, dùng chung cho cả modal và page.

---

## ✅ Điểm tốt

| Hạng mục | Đánh giá |
|----------|----------|
| **Zod Validation** | ✅ Input được validate qua schema trước khi insert/update |
| **Soft Delete** | ✅ Dùng `deleted_at` thay vì hard delete |
| **Audit Log** | ✅ Mọi mutation đều ghi audit log |
| **Period Lock** | ✅ Check `checkPeriodLock` trước khi thay đổi data kỳ đã khóa |
| **Optimistic Lock** | ✅ `updateExpense` check `updated_at` để tránh concurrent edit |
| **Authorization** | ✅ Dùng `withAdmin` cho mutations, `withAuth` cho queries |
| **RLS Filter** | ✅ Luôn filter `deleted_at IS NULL` ở cả query và mutation |

---

## Next Steps

Anh muốn làm gì tiếp theo?

1️⃣ Xem báo cáo chi tiết trước
2️⃣ Sửa lỗi Critical ngay (C1 + C2)
3️⃣ Sửa Warning W1 + W2 (thống nhất modal pattern)
4️⃣ Bỏ qua, lưu báo cáo
5️⃣ 🔧 FIX ALL - Tự động sửa TẤT CẢ lỗi có thể sửa

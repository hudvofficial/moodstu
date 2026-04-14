# Phase 04: Real Operational Pipeline & UI Expansion
Created: 2026-04-13
Status: 📝 Planned

## Mục tiêu
Loại bỏ hoàn toàn mock data hardcode trong logic. Xây dựng tool sinh test data chuẩn (seed) ở Database. Fix architecture về đúng với V1: Contract receipts và general receipts đều đi chung vào bảng `receipts`, để trigger tự tính `paid_amount` cho Contract. Dựng form "Bán vật tư" có chọn sản phẩm theo chuẩn V1/Inventory.

## Files to modify

### 1. `scripts/seed-finance-demo.ts` (NEW)
- **Hành động:** Tạo một kịch bản Node script (hoặc raw SQL trigger) để bơm dữ liệu vào bảng `contracts`, `receipts`, `expenses`, `inventory_items` dùng cho mục đích "Chạy Demo".
- Mọi record tạo ra có tracking prefix `DEMO-*`.
- Cover các flow: Phiếu thu Hợp đồng (có cập nhật Trigger), Phiếu thu khác, Bán vật tư (trừ tồn kho).

### 2. `app/actions/finance-dashboard-queries.ts`
- **Hành động:** Xóa bỏ constant `USE_MOCK`.
- Backend luôn luôn đọc từ Supabase RPC & bảng thật. Update `.is("deleted_at", null)` ở toàn bộ query.

### 3. `app/actions/receipt-actions.ts`
- **Hành động:** 
  - `createReceipt`: Ở V1, mọi thu tiền đều chỉ Insert vào `receipts`, sau đó `update_contract_financials()` trigger sẽ xử lý update `paid_amount` của hợp đồng. **V2 GIỮ NGUYÊN BẢN CHẤT NÀY**. Tuy nhiên không lấy `previous_paid` từ UI gửi lên nữa mà query current `paid_amount` trong action để snapshot vào Phiếu thu.
  - `updateReceipt`: Thêm Optimistic Locking (Select check updated_at affected row).
  - Thêm `source: "server_action"` vào `audit_logs`.

### 4. `app/(protected)/finance/page.tsx` (Dashboard UI)
- **Hành động:** 
  - Check biến môi trường `NEXT_PUBLIC_FINANCE_DEMO_MODE === "true"`.
  - Hiển thị Banner màu cam cảnh báo "ĐANG Ở CHẾ ĐỘ DEMO DATA" ở đỉnh trang.

### 5. `components/finance/receipts/receipt-form-modal.tsx`
- **Hành động:**
  - Bổ sung UI nhánh "Bán vật tư" (hiện UI đang bị ẩn/thiếu component).
  - Tích hợp Item Selector (danh sách Inventory) cho phép chọn hàng hóa + nhập số lượng.
  - Gọi hàm `createSaleReceipt(data, items)`.

## Verification (Acceptance Test)
1. **Chế độ thật:** Tắt demo mode (ENV=false) -> `/finance` đọc dữ liệu thật, không có mock.
2. **Chế độ demo:** Chạy file DB seeded demo -> Hệ thống phải tính đúng số KPI, Revenue chart, Ledger, Profit phản ánh đúng database theo realtime (không lag). Thống kê bỏ qua các record `deleted_at IS NOT NULL`.
3. **Thu hợp đồng:** Tạo thu Hợp đồng -> `paid_amount` tăng, `remaining_amount` giảm. Khoản thu vào ledger đúng loại hợp đồng, revenue cũng tính vào package revenue.
4. **Thu khác:** Tạo thu khác (other_income) -> Nằm ở `receipts` table, lên Dashboard Revenue đúng hạng mục addon.
5. **Soft delete:** Xóa Phiếu thu -> Record bị mark `deleted_at`, Ledger mất record này, KPI Profit Report và KPI card tự động sụt giảm tương ứng.
6. **Bán vật tư:** Bán vật tư -> Inventory tự trừ kho (tạo lịch sử stock-out) và sinh Phiếu thu hiển thị trên bảng.
7. **Quality:** Build/typecheck/lint pass, zero `any` warnings.

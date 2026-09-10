---
title: "Module Vật tư & thiết bị"
tags: [module, vat-tu]
cap-nhat: 2026-08-31
trang-thai: da-kiem-2026-08-31
doi-chieu: agent/system-map/03-in-kho-vay.md · vault/30-du-lieu/than-ham/vat-tu.md
---

# Module Vật tư & thiết bị

Kho vật tư — thực tế là **xương sống mảng thiệp cưới tự in** (ADR-016): Mood nhập phôi thiệp lô lớn (SKU = mẫu phôi `HD527/HD513/HD394`), tồn kho, tự in theo đơn khách, xuất theo đơn (bán lẻ `create_sale_receipt_atomic` hoặc "Bán thêm HĐ"). Không có tồn kho ảnh/album — thứ đó đi lab. Quyền: admin, manager.

Quy mô (**ảnh chụp**, số sống ở [[luoc-do-vat-tu]]): 3 vật tư (đều là thiệp), 9 giao dịch. `equipment` rỗng — và không tìm thấy action/route/component nào đọc hoặc ghi nó. (`inventory_reservations` + cột `inventory_transactions.reservation_id` — di sản "giữ chỗ cho đơn in", 0 dòng từ khi tạo — **đã drop** ADR-017, 26/08/2026.)

## Tiền (ADR-016)

Nhập lô = **phải trả nhà cung cấp** (`inventory_items.supplier_id → vendors` `vendor_type='nha_cung_cap'`). Mood trả ngay khi nhập → `inventory_stock_in_atomic(p_paid=true, p_supplier_id, p_payment_method, p_paid_date)` tạo **phiếu chi** `payee_type='supplier'` + `expense_allocations(inventory_transaction)` trong cùng transaction (form nhập kho mặc định "Đã trả"). Giá vốn `stock_out.total_cost` vào lãi/lỗ (`contract_financials` khi xuất cho HĐ). Công nợ NCC: `finance_payable_summary()`.

## Khách HĐ mua thiệp → "Bán thêm HĐ" / "Xuất HĐ" (M3b, 26/08/2026)

Modal **Xuất kho** (`components/inventory/stock-out-modal.tsx`) 4 chế độ: Bán lẻ (`create_sale_receipt_atomic`) · Xuất HĐ (`inventory_stock_out_atomic` có `contract_id`, thiệp nằm trong gói — chỉ giá vốn) · Bán thêm HĐ (`create_contract_inventory_addon_sale_atomic` → hạng mục phát sinh + `payments` + `stock_out` gắn HĐ) · Nội bộ. Ba lối vào: `/inventory` (nút Xuất, dòng, chi tiết) và **ô "Thiệp" trong Thao tác nhanh của trang HĐ** (modal mở sẵn HĐ, mặc định Bán thêm HĐ, prop `initialMode`/`initialContract`/`onSuccess`). Ở chế độ Bán lẻ, gõ đủ SĐT trùng khách HĐ → banner gợi ý chuyển sang Bán thêm HĐ (khớp chính xác chữ số). Ô chọn HĐ tìm theo mã · tên · **SĐT** (`fetchInventoryContractOptions`, ≥ 4 chữ số). Giá vốn gắn HĐ = `contract_financials.cogs` (chỉ `contract_fulfillment` + `contract_addon_sale`) → drawer lợi nhuận "Giá vốn vật tư". Đo 26/08: 4 lần bán thiệp trước đó đều khách lẻ thật (SĐT không khớp khách HĐ) — không di trú.

## Route

`/inventory` · `/inventory/[id]`

## Mọi thay đổi tồn kho đi qua RPC atomic

**Ghi:** `inventory_stock_in_atomic` · `inventory_stock_out_atomic` · `create_contract_inventory_addon_sale_atomic` · `create_sale_receipt_atomic` · `add_fulfillment_transaction_atomic` · `update_fulfillment_transaction_atomic` · `delete_fulfillment_transaction_atomic` · `restore_inventory_from_transaction` · `nextval_inventory_code`

**Đọc:** `inventory_list` · `inventory_detail_v2` · `inventory_stats` · `inventory_item_transaction_totals`

Bảy hàm mà bản cũ của trang này **bỏ sót** đều đang được code gọi: 3 hàm `*_fulfillment_transaction_atomic` (`inventory-mutations.ts:560,705,715,784,794`) và 4 hàm đọc (`inventory-queries.ts:90,130,158,242`).

(`check_inventory_conflict` hỏng sẵn, 0 caller — **đã drop** ADR-017; xác nhận lại: không có thân hàm trong `vault/30-du-lieu/than-ham/`.)

**Tồn kho và giá nhập bình quân do server tính** → cấm optimistic-patch. Mẫu: đóng modal + revalidate.

## `inventory-mutations.ts` = file `revalidatePath` nhiều nhất app (**40 lần**, đếm 31/08/2026)

Vì một thao tác kho lan sang: `approval_requests`, `notification_queue`, `receipts` (bán hàng), hợp đồng (bán kèm). Sửa file này phải verify rộng.

## Nhãn UI đã chốt

- "Nhập kho mới" → **"Khai báo vật tư mới"**
- "Giá nhập TB" → **"Giá nhập"**

Ô nhập số dùng state string + `placeholder="0"` (mẫu gốc là `stock-in-modal`).

## Bảng

[[luoc-do-vat-tu]] — `inventory_items` · `inventory_transactions` · `equipment`

## Kỹ thuật

RSC + server action, không SWR. Có 2 chỗ realtime qua **signal** (bảng bị REVOKE SELECT nên không subscribe trực tiếp được) → [[cache-va-realtime]].

## Liên quan

[[in-an-lab]] · [[tai-chinh]] · [[hop-dong]]

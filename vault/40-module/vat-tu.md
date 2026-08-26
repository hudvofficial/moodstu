---
title: "Module Vật tư & thiết bị"
tags: [module, vat-tu]
cap-nhat: 2026-08-07
---

# Module Vật tư & thiết bị

Kho vật tư — thực tế là **xương sống mảng thiệp cưới tự in** (ADR-016): Mood nhập phôi thiệp lô lớn (SKU = mẫu phôi `HD527/HD513/HD394`), tồn kho, tự in theo đơn khách, xuất theo đơn (bán lẻ `create_sale_receipt_atomic` hoặc "Bán thêm HĐ"). Không có tồn kho ảnh/album — thứ đó đi lab. Quyền: admin, manager.

Quy mô: 3 vật tư (đều là thiệp), 9 giao dịch. `equipment` rỗng. (`inventory_reservations` + cột `inventory_transactions.reservation_id` — di sản "giữ chỗ cho đơn in", 0 dòng từ khi tạo — **đã drop** ADR-017, 26/08/2026.)

## Tiền (ADR-016)

Nhập lô = **phải trả nhà cung cấp** (`inventory_items.supplier_id → vendors` `vendor_type='nha_cung_cap'`). Mood trả ngay khi nhập → `inventory_stock_in_atomic(p_paid=true, p_supplier_id, p_payment_method, p_paid_date)` tạo **phiếu chi** `payee_type='supplier'` + `expense_allocations(inventory_transaction)` trong cùng transaction (form nhập kho mặc định "Đã trả"). Giá vốn `stock_out.total_cost` vào lãi/lỗ (`contract_financials` khi xuất cho HĐ). Công nợ NCC: `finance_payable_summary()`.

## Route

`/inventory` · `/inventory/[id]`

## Mọi thay đổi tồn kho đi qua RPC atomic

`inventory_stock_in_atomic` · `inventory_stock_out_atomic` · `create_contract_inventory_addon_sale_atomic` · `create_sale_receipt_atomic` · `restore_inventory_from_transaction` · `nextval_inventory_code` (`check_inventory_conflict` hỏng sẵn, 0 caller — đã drop ADR-017)

**Tồn kho và giá nhập bình quân do server tính** → cấm optimistic-patch. Mẫu: đóng modal + revalidate.

## `inventory-mutations.ts` = file `revalidatePath` nhiều nhất app (35 lần)

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

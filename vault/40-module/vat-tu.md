---
title: "Module Vật tư & thiết bị"
tags: [module, vat-tu]
cap-nhat: 2026-08-07
---

# Module Vật tư & thiết bị

Kho vật tư (album phôi, khung, phụ kiện): nhập, xuất, bán kèm hợp đồng. Quyền: admin, manager.

Quy mô: 3 vật tư, 9 giao dịch. `inventory_reservations` và `equipment` rỗng.

## Route

`/inventory` · `/inventory/[id]`

## Mọi thay đổi tồn kho đi qua RPC atomic

`inventory_stock_in_atomic` · `inventory_stock_out_atomic` · `create_contract_inventory_addon_sale_atomic` · `create_sale_receipt_atomic` · `restore_inventory_from_transaction` · `check_inventory_conflict` · `nextval_inventory_code`

**Tồn kho và giá nhập bình quân do server tính** → cấm optimistic-patch. Mẫu: đóng modal + revalidate.

## `inventory-mutations.ts` = file `revalidatePath` nhiều nhất app (35 lần)

Vì một thao tác kho lan sang: `approval_requests`, `notification_queue`, `receipts` (bán hàng), hợp đồng (bán kèm). Sửa file này phải verify rộng.

## Nhãn UI đã chốt

- "Nhập kho mới" → **"Khai báo vật tư mới"**
- "Giá nhập TB" → **"Giá nhập"**

Ô nhập số dùng state string + `placeholder="0"` (mẫu gốc là `stock-in-modal`).

## Bảng

[[luoc-do-vat-tu]] — `inventory_items` · `inventory_transactions` · `inventory_reservations` · `equipment`

## Kỹ thuật

RSC + server action, không SWR. Có 2 chỗ realtime qua **signal** (bảng bị REVOKE SELECT nên không subscribe trực tiếp được) → [[cache-va-realtime]].

## Liên quan

[[in-an-lab]] · [[tai-chinh]] · [[hop-dong]]

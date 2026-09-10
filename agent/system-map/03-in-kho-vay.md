# Bản đồ kiến trúc — Miền IN ẤN/LAB + VẬT TƯ/KHO + VÁY CƯỚI

> Gốc repo: `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio`. Mọi đường dẫn dưới đây tính từ gốc đó.
> Phương pháp: **chỉ đọc file** (code + migration + vault). **Không chạm DB.** Mọi khẳng định kèm `file:dòng`.
> Ngày lập: 2026-08-31. Migration mới nhất trong repo: `20260827160000_contract_discount_percent_datafix.sql` (203 file).

---

## 1. Bảng dữ liệu

### 1.1 Miền In ấn / Lab

| Bảng | Vai trò | Cột **dẫn xuất** (server tính) | Cột **nhập tay / do RPC ghi** | Ai ghi | Bằng chứng |
|---|---|---|---|---|---|
| `printing_orders` | Đơn in gửi Lab đối tác, gắn 1 hợp đồng | `total_amount` ← `printing_items_total(items)`; `payment_status` ← `recompute_printing_payment_status()`; `order_code` ← `nextval_printing_order_code()` | `contract_id`, `lab_id`, `items`(jsonb), `expected_date`, `notes`, `status`, `cancelled_at`, `cancellation_reason`, `issue_reason/_at/_by`, `print_file_url` | RPC `create/update/delete_printing_order_atomic` (`supabase/migrations/20260825200000_cashflow_m1_expense_allocations.sql:645,671,700`); server action `updatePrintingOrderStatus` ghi **trực tiếp bảng** (`app/actions/printing-mutations.ts:215-218`); `updatePrintOrderFileUrl` ghi `print_file_url` trực tiếp (`app/actions/printing-actions.ts:48-54`) | `vault/30-du-lieu/luoc-do-in-an-lab.md:21-64` |
| `printing_order_status_history` | Nhật ký đổi trạng thái (velocity + audit) | — | `order_id, from_status, to_status, changed_by, changed_at, reason, source` | Chỉ 1 nơi: `app/actions/printing-mutations.ts:225-239` (insert **non-blocking**, lỗi chỉ `console.error`) | `vault/30-du-lieu/luoc-do-in-an-lab.md:85-100` |
| `labs` | Lab đối tác (1 dòng thật) | — | `lab_name, contact_person, phone, address, status` | `app/actions/lab-mutations.ts:35,92,137,175` (insert/update trực tiếp, không RPC) | `vault/30-du-lieu/luoc-do-in-an-lab.md:110-127` |
| `lab_services` | Bảng giá dịch vụ của lab | — | `item_name, cost_price` | `app/actions/lab-mutations.ts:215,252,280` | `vault/30-du-lieu/luoc-do-in-an-lab.md:135-148` |

**Cột "chết" trên `printing_orders`** — có trong schema nhưng **không code nào ghi** sau ADR-014/016/017:
`deposit_amount`, `final_amount`, `paid_amount`, `remaining_amount`, `inventory_status`, `delivered_date`, `delivered_at`.
Bằng chứng: grep toàn `app/ components/ lib/ types/` chỉ ra `received_date`/`delivered_date` (đọc) và **không có** write nào cho 7 cột trên; ADR-017 nói rõ **cố ý không drop** (`agent/DECISIONS.md`, khối ADR-017, mục quyết định (c)).
`received_date` **chỉ được ghi ở 1 nhánh chết**: `app/actions/printing-mutations.ts:211-213` chỉ chạy khi `to = 'da_nhan'`, mà `da_nhan` **không phải đích của bất kỳ transition nào** (`types/printing-constants.ts:22-32`). `delivered_date` chỉ đọc (`app/actions/printing-queries.ts:124,360`).

### 1.2 Miền Vật tư / Kho

| Bảng | Vai trò | Cột **dẫn xuất** | Cột **nhập tay** | Ai ghi | Bằng chứng |
|---|---|---|---|---|---|
| `inventory_items` | SKU vật tư (thực tế = phôi thiệp) | `current_stock` (mọi RPC kho cộng/trừ); `average_unit_price` (bình quân gia quyền, chỉ đổi khi **nhập**); `purchase_price` = đơn giá lô nhập gần nhất; `item_code` ← `nextval_inventory_code()` | `name, category, unit, min_stock, sale_price, supplier, supplier_id, image_url, notes, status` | Tạo/sửa/xoá mềm: `app/actions/inventory-mutations.ts:56,177,246`; tồn + giá bình quân: **chỉ RPC** (`inventory_stock_in_atomic` `…20260825200000…:771-774`, `inventory_stock_out_atomic` `…20260507103000…:223-227`, `create_sale_receipt_atomic` `…:370-374`, `create_contract_inventory_addon_sale_atomic` `…20260507123000…:299-303`, `restore_inventory_from_transaction` `…:66-70`, `add_fulfillment_transaction_atomic` `…20260808110000…:175-178`) **+ 1 ngoại lệ ghi tay** `app/actions/inventory-mutations.ts:659-666` | `vault/30-du-lieu/luoc-do-vat-tu.md:20-51` |
| `inventory_transactions` | Sổ cái kho: nhập / xuất / hoàn | `unit_cost` khi xuất = `average_unit_price` tại thời điểm xuất (giá vốn); `total_cost` = cột generated (xem §7) | `quantity, transaction_type, contract_id, reason, notes, customer_*, source_type, source_id, receipt_id, sale_unit_price, sale_total, payment_method, parent_transaction_id` | Tất cả đi qua RPC ở trên; **xoá** đi qua `app/actions/inventory-mutations.ts:639-642` (hard DELETE) | `vault/30-du-lieu/luoc-do-vat-tu.md:74-114` |
| `equipment` | Thiết bị (0 dòng) | — | — | **Không tìm thấy server action nào ghi** — xem §8 | `vault/30-du-lieu/luoc-do-vat-tu.md:137-165` |
| `receipts` (phần bán lẻ) | Phiếu thu bán vật tư `receipt_type='sale_receipt'` | `status='confirmed'` hard-code | `receipt_date, payment_type, receipt_amount, notes, category_*, customer_*` | `create_sale_receipt_atomic` (`…20260507103000…:314-330`); xoá mềm `app/actions/receipt-actions.ts:67-73` | — |

**Cột `inventory_transactions.reservation_id` đã DROP** ở `supabase/migrations/20260826200000_drop_printing_inventory_payment_legacy.sql:35`. Vault `luoc-do-vat-tu.md:104` **không còn liệt kê** cột này → vault đã đúng.

### 1.3 Miền Váy cưới

| Bảng | Vai trò | Cột **dẫn xuất** | Cột **nhập tay** | Ai ghi | Bằng chứng |
|---|---|---|---|---|---|
| `dresses` | Danh mục váy/trang phục | `status` — **dẫn xuất** từ `dress_rentals` + `dress_reservations` qua `refresh_dress_status_atomic` (`supabase/migrations/20260429110000_dresses_audit_fix.sql:269-325`); `blur_hash`/`blur_data_url` backfill nền (`app/actions/dress-mutations.ts:43-54`) | `name, item_code, category, size, color, condition, rental_price, sale_price, purchase_price, min_stock, image_url, notes` | Catalog: `app/actions/dress-mutations.ts:150,235,252,325`; status: RPC + 2 nhánh fallback ghi tay (`app/actions/dress-mutations.ts:110-113`, `app/actions/rental-mutations.ts:230-233,272-275`) | `vault/30-du-lieu/luoc-do-vay-cuoi.md:21-53` |
| `dress_rentals` | Thuê lẻ (đơn thuê độc lập, có thể gắn HĐ) | `actual_return_date` = `CURRENT_DATE` khi trả | `item_id, contract_id, customer_name, phone, pickup_date, return_date, rental_price, deposit, deposit_returned, damage_fee, accessories, notes, return_condition, status` | RPC `create_standalone/start/return/cancel_dress_rental_atomic` (`…20260429110000…:352,411,448,510`); fallback ghi tay `app/actions/rental-mutations.ts:97,216,314,341` | `vault/30-du-lieu/luoc-do-vay-cuoi.md:75-105` |
| `dress_reservations` | Đặt giữ váy **gắn hợp đồng** | — | `dress_id, contract_id, contract_item_id, customer_id, start_date, end_date, export_type, status, notes` | RPC `create_dress_contract_reservation_atomic` / `update_dress_reservation_status_atomic` / `release_dress_reservation_atomic` (`…20260429110000…:628,728,793`); fallback `app/actions/dress-mutations.ts:440`; **và `cancel_contract_cascade`** (`…20260422160000…:356-360`) | `vault/30-du-lieu/luoc-do-vay-cuoi.md:142-165` |
| `dress_rental_accessories` | Phụ kiện đi kèm đơn thuê | — | `rental_id, name, quantity, returned, condition_note` | **Không tìm thấy code nào ghi** — xem §8 | `vault/30-du-lieu/luoc-do-vay-cuoi.md:119-133` |

---

## 2. RPC & hàm DB

Cột "còn sống" = tìm migration **mới nhất** chạm tới object. Không chạy DB → dựa hoàn toàn vào file migration.

### 2.1 In ấn / Lab

| Tên | Bảng chạm | Atomic | Gọi từ đâu | Trạng thái + migration mới nhất |
|---|---|---|---|---|
| `create_printing_order_atomic(jsonb, uuid)` | `printing_orders` (INSERT), đọc `contracts`, `labs` | ✅ (1 INSERT) | `app/actions/printing-mutations.ts:58` | **Còn sống** — `20260825200000_cashflow_m1_expense_allocations.sql:645`. Bản này **bỏ** `upsert_printing_expense` (ADR-016) → không còn tạo `expenses` |
| `update_printing_order_atomic(uuid, jsonb, timestamptz, uuid)` | `printing_orders` (UPDATE + `FOR UPDATE`), gọi `recompute_printing_payment_status` | ✅ | `app/actions/printing-mutations.ts:109` | **Còn sống** — `…20260825200000…:671`. Có **optimistic lock** qua `p_expected_updated_at` (`:681-683`) |
| `delete_printing_order_atomic(uuid, uuid)` | `printing_orders` (soft delete), đọc `expense_allocations`+`expenses` | ✅ | `app/actions/printing-mutations.ts:261` | **Còn sống** — `…20260825200000…:700`. **Chặn xoá nếu đã có phiếu chi** (`:706-709`) |
| `recompute_printing_payment_status(uuid)` | `printing_orders.payment_status` | ✅ | Chỉ từ DB: `update_printing_order_atomic` (`…:696`), `record_payee_payment_atomic` (`20260827130000_luong_cung_m5.sql:234`), `void_payee_payment_atomic` (`…luong_cung_m5.sql:263`), backfill 1 lần (`…20260825200000…:789`) | **Còn sống** — định nghĩa mới nhất `…20260825200000…:226`. Ngưỡng `<= 0.01` = `da_thanh_toan` |
| `record_lab_payment_atomic(uuid, numeric, text, text, jsonb, uuid, date)` | wrapper → `record_payee_payment_atomic('lab')` | ✅ | `app/actions/lab-mutations.ts:311` | **Còn sống** — chữ ký mới `…20260825200000…:306`; M2b **cố ý giữ** (`20260826130000_cashflow_m2b_drop_legacy.sql:45`) |
| `record_payee_payment_atomic(text,uuid,numeric,text,date,text,jsonb,uuid)` | `expenses` (INSERT) + `expense_allocations` (INSERT) + `recompute_printing_payment_status` | ✅ | Qua wrapper lab; và `/finance/payables` | **Còn sống** — bản mới nhất `20260827130000_luong_cung_m5.sql:165` (M5, thêm nhánh employee↔salary). Trước đó: `…20260826180000…:109`, gốc `…20260825200000…:239` |
| `void_payee_payment_atomic(uuid, uuid)` | `expenses.deleted_at` + `recompute_printing_payment_status` + `sync_employee_salary_paid` | ✅ | `/finance/payables` (ngoài miền này) | **Còn sống** — mới nhất `20260827130000_luong_cung_m5.sql:244` |
| `payable_remaining(text, uuid, uuid)` | đọc `printing_orders` / `work_tasks` / `inventory_transactions` / `employee_salaries` + `expense_allocations` | STABLE | Trong `record_payee_payment_atomic` | **Còn sống** — mới nhất `20260826180000_tien_ekip_va_can_thu.sql:26` |
| `payable_items(text, uuid)` | như trên | STABLE | `record_payee_payment_atomic` (FIFO), `finance_payable_summary` | **Còn sống** — mới nhất `20260827130000_luong_cung_m5.sql:124` |
| `finance_payable_summary()` | tổng hợp | STABLE | `finance_lab_debt_summary` | **Còn sống** — mới nhất `20260826180000_tien_ekip_va_can_thu.sql:84` |
| `finance_lab_debt_summary()` | wrapper giữ RETURNS cũ | STABLE | `app/actions/printing-reference-queries.ts:96`; `printing_lab_overview` (`…20260826120000…:438`) | **Còn sống** — `…20260825200000…:349` |
| `printing_lab_overview()` | `labs` + `lab_services` + `expenses` + `finance_lab_debt_summary()` | STABLE | `app/actions/lab-queries.ts:97` | **Còn sống** — bản mới nhất `20260826120000_cashflow_m2_ba_so.sql:432` (**bỏ đọc view `lab_payments`**) |
| `printing_stats()` | `printing_orders` | STABLE | `app/actions/printing-queries.ts:225,299` | **Còn sống** — DROP + CREATE lại ở `20260824120000_printing_workflow_redesign.sql:35-56`; REVOKE anon ở `20260825150000_printing_stats_revoke_anon.sql` |
| `printing_integrity_report()` | `printing_orders` + `expense_allocations` + `expenses` | STABLE | (chưa tìm thấy caller trong `app/`) | **Còn sống** — `…20260825200000…:714` |
| `printing_items_total(jsonb)` · `nextval_printing_order_code()` · `resolve_printing_expense_category_id()` | helper | — | trong RPC đơn in / `record_payee_payment_atomic` | **Còn sống** — `…20260825200000…` (`resolve_printing_expense_category_id` được nhắc lại ở `…20260826180000…`, `…20260827130000…`) |
| ~~`upsert_printing_expense(uuid, uuid)`~~ | — | — | — | **ĐÃ DROP** — `20260825200000_cashflow_m1_expense_allocations.sql:178` |
| ~~`lab_payments`, `lab_payment_allocations` (VIEW)~~ | — | — | — | **ĐÃ DROP** — `20260826130000_cashflow_m2b_drop_legacy.sql:31-33` ✅ *(xác minh đúng như đề bài nghi ngờ)* |
| ~~`lab_payments_legacy`, `lab_payment_allocations_legacy` (BẢNG)~~ | — | — | — | **ĐÃ DROP CASCADE** — `…m2b…:37,39` |
| ~~`vendor_payments`, `vendor_payment_allocations` (VIEW) + 2 bảng `_legacy`~~ | — | — | — | **ĐÃ DROP** — `…m2b…:32,34,38,40` ✅ |
| ~~`record_vendor_payment_atomic`~~ · ~~`update_vendor_payments_updated_at`~~ | — | — | — | **ĐÃ DROP** — `…m2b…:42,46` |
| ~~`order_payments` (bảng)~~ · ~~`order_payment_summary` (view)~~ | — | — | — | **ĐÃ DROP** — `20260826200000_drop_printing_inventory_payment_legacy.sql:31,37` |

### 2.2 Vật tư / Kho

| Tên | Bảng chạm | Atomic | Gọi từ đâu | Trạng thái + migration mới nhất |
|---|---|---|---|---|
| `inventory_stock_in_atomic(uuid,int,numeric,text,text,text,uuid, uuid,bool,text,date)` | `inventory_items` (UPDATE `FOR UPDATE`) + `inventory_transactions` (INSERT) + **`record_payee_payment_atomic('supplier')`** khi `p_paid` | ✅ (phiếu chi cùng transaction) | `app/actions/inventory-mutations.ts:288` (nhập kho); `:82` (tồn đầu kỳ, `p_paid:false` — `:94`) | **Còn sống, chữ ký MỚI 11 tham số** — `20260825200000_cashflow_m1_expense_allocations.sql:743-784`. Chữ ký 7 tham số cũ đã `DROP` (`:743`) |
| `inventory_stock_out_atomic(uuid,int,uuid,text,text,text,text,uuid)` | `inventory_items` (trừ tồn) + `inventory_transactions` | ✅ | `app/actions/inventory-mutations.ts:359` | **Còn sống** — mới nhất `20260507103000_inventory_sale_stockout_source_contract.sql:159`. **Không** đổi `average_unit_price` |
| `create_sale_receipt_atomic(jsonb, jsonb)` | `receipts` (INSERT) + N×`inventory_transactions` + N×`inventory_items` | ✅ (2 vòng lặp: kiểm tra hết rồi mới ghi) | `app/actions/inventory-mutations.ts:418` (Bán lẻ ở /inventory); `app/actions/receipt-actions.ts:305` (phiếu thu tài chính) | **Còn sống** — mới nhất `…20260507103000…:242-379` |
| `create_contract_inventory_addon_sale_atomic(uuid,uuid,int,numeric,payment_method_enum,date,text,uuid)` | `contract_items` + `payments` + `inventory_transactions` + `inventory_items` + `contracts` | ✅ | `app/actions/inventory-mutations.ts:490` | **Còn sống** — chỉ 1 migration `20260507123000_inventory_contract_addon_reports.sql:121-331` |
| `restore_inventory_from_transaction(text,uuid,text,uuid)` | `inventory_transactions` (INSERT type `stock_in`, `source_type='return'`) + `inventory_items` (cộng tồn) | ✅ | **Chỉ từ 2 trigger DB** (không caller trong `app/`) | **Còn sống** — `20260507123000…:6-73` |
| `restore_inventory_on_receipt_void()` → **TRIGGER `trg_restore_inventory_on_receipt_void`** trên `receipts` | như trên | ✅ | `AFTER UPDATE OF deleted_at ON receipts WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)` | **CÒN SỐNG** — `20260507123000…:91-96`; grep toàn bộ 203 migration: **không có DROP TRIGGER nào khác** trên `receipts` |
| `restore_inventory_on_contract_payment_void()` → **TRIGGER `trg_restore_inventory_on_contract_payment_void`** trên `payments` | như trên, `source_type='contract_addon_sale'` | ✅ | `AFTER UPDATE OF deleted_at ON payments` | **CÒN SỐNG** — `20260507123000…:114-119`; không có DROP nào sau đó |
| `add_fulfillment_transaction_atomic(...)` | `inventory_items` + `inventory_transactions` (có `parent_transaction_id`) + (có thể) `receipts`/`payments` | ✅ | `app/actions/inventory-mutations.ts:560` | **Còn sống** — mới nhất `20260808110000_fix_add_fulfillment_retail_category_id.sql` |
| `update_fulfillment_transaction_atomic` · `delete_fulfillment_transaction_atomic` | `inventory_transactions` + tồn | ✅ | `app/actions/inventory-mutations.ts:705,715,784,794` (luồng duyệt) | **Còn sống** — mới nhất `20260808100000_fix_update_fulfillment_rpc_columns.sql`, `20260808120000_fix_delete_fulfillment_receipt_fk_order.sql` |
| `inventory_list` · `inventory_stats` · `inventory_item_transaction_totals` · `nextval_inventory_code` | đọc | STABLE/— | `app/actions/inventory-queries.ts:90,242,158,254`; `inventory-mutations.ts:23` | **Còn sống** — `20260428200000_inventory_security_hardening.sql` |
| `inventory_detail_v2(uuid)` | đọc | STABLE | `app/actions/inventory-queries.ts:130` (có fallback 3-query `:145-174`) | **Còn sống** — `20260508171641_inventory_detail_v2_rpc.sql:1` |
| ~~`inventory_reservations` (bảng)~~ · ~~`inventory_available_stock` (view)~~ · ~~`expire_old_reservations()`~~ · ~~`check_inventory_conflict(...)`~~ | — | — | — | **ĐÃ DROP** — `20260826200000_drop_printing_inventory_payment_legacy.sql:32-36` |

### 2.3 Váy cưới — **tất cả** định nghĩa mới nhất nằm ở `supabase/migrations/20260429110000_dresses_audit_fix.sql`

| Tên | Bảng chạm | Atomic | Gọi từ đâu | Dòng |
|---|---|---|---|---|
| `is_dress_available(uuid,date,date,uuid,uuid)` | đọc `dresses`+`dress_reservations`+`dress_rentals` | STABLE | RPC khác + `app/actions/dress-queries.ts:210` | `:61-112` |
| `refresh_dress_status_atomic(uuid,uuid)` | `dresses.status` (`FOR UPDATE`) | ✅ | mọi RPC váy; `app/actions/dress-mutations.ts:73`; `app/actions/rental-mutations.ts:320` | `:269-325` |
| `refresh_dress_status(uuid)` | wrapper SECURITY DEFINER | ✅ | 2 trigger + `cancel_contract_cascade` | `:327-332` |
| **TRIGGER `trg_refresh_dress_status_from_rental`** trên `dress_rentals` | `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW` | ✅ | tự động | **CÒN SỐNG** — `:334-350`, không có DROP nào sau đó |
| **TRIGGER `trg_refresh_dress_status_from_reservation`** trên `dress_reservations` | `AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW` | ✅ | tự động | **CÒN SỐNG** — định nghĩa duy nhất ở `20260422160000_contracts_business_logic_backfill.sql:130-150` |
| `create_standalone_dress_rental_atomic(11 tham số)` | `dress_rentals` INSERT + refresh | ✅ | `app/actions/rental-mutations.ts:34` | `:352-409` |
| `start_dress_rental_atomic(uuid,uuid)` | `dress_rentals.status='renting'` | ✅ | `app/actions/rental-mutations.ts:137` | `:411-446` |
| `return_dress_rental_atomic(uuid,text,numeric,bool,text,uuid)` | `dress_rentals`→`returned` + **`dresses.status='cleaning'` ghi thẳng** (không qua refresh) | ✅ | `app/actions/rental-mutations.ts:193` | `:448-508` |
| `cancel_dress_rental_atomic(uuid,uuid)` | `dress_rentals.status='cancelled'` + refresh | ✅ | `app/actions/rental-mutations.ts:295` | `:510-542` |
| `mark_dress_cleaned_atomic(uuid,uuid)` | `dresses.status='available'` rồi refresh | ✅ | `app/actions/rental-mutations.ts:251` | `:544-574` |
| `delete_dress_atomic(uuid,uuid)` | `dresses` → `retired` **hoặc** `deleted_at` | ✅ | `app/actions/dress-mutations.ts:285` | `:576-626` |
| `create_dress_contract_reservation_atomic(11 tham số)` | `contract_items` (nếu addon) + `dress_reservations` + `recalc_contract_totals` + refresh | ✅ | `app/actions/dress-mutations.ts:356` | `:628-726` |
| `update_dress_reservation_status_atomic(uuid,text,uuid)` | `dress_reservations` + (nếu `cancelled`) soft-delete `contract_items` + `recalc_contract_totals` + refresh | ✅ | `app/actions/dress-mutations.ts:483` | `:728-791` |
| `release_dress_reservation_atomic(uuid,uuid)` | `dress_reservations`→`returned` + soft-delete `contract_items` addon + refresh | ✅ | `app/actions/dress-mutations.ts:518` | `:793-844` |
| `dress_list` · `dress_stats` · `dress_rental_list` | đọc | STABLE | `app/actions/dress-queries.ts:65,166`; `app/actions/rental-queries.ts:60` | `:131,114,206`; `dress_rental_list` bản mới nhất `20260429113000_dress_rental_item_filter.sql` |

**Hàm liên miền (thuộc Hợp đồng nhưng ghi vào 2 miền này):** `cancel_contract_cascade(uuid,text,uuid)` — bản mới nhất `20260422160000_contracts_business_logic_backfill.sql:300-375`. Ghi `printing_orders.status='da_huy'` (`:348-354`) + `dress_reservations.status='cancelled'` (`:356-360`) + `refresh_dress_status` (`:362-368`). Gọi từ `app/actions/contract-lifecycle.ts:113`. **Xem §6/§7 — có mâu thuẫn CHECK constraint.**

---

## 3. Server action & route

### 3.1 In ấn

| Action | File:dòng | Route / UI | RPC hoặc bảng |
|---|---|---|---|
| `createPrintingOrder` | `app/actions/printing-mutations.ts:43` | `/printing` (modal), `/contracts/[id]` | `create_printing_order_atomic` |
| `updatePrintingOrder` | `app/actions/printing-mutations.ts:94` | `/printing` drawer sửa đơn | `update_printing_order_atomic` |
| **`updatePrintingOrderStatus`** (SSOT đổi trạng thái, kể cả huỷ — ADR-017) | `app/actions/printing-mutations.ts:142` | `/printing` dropdown (`components/printing/printing-list-page.tsx:242`), `CancelOrderModal` (`components/printing/cancel-order-modal.tsx:43`), `/contracts/[id]` (`components/contracts/detail/print-orders-block.tsx:112`) | **Ghi trực tiếp** `printing_orders` + `printing_order_status_history` — **không RPC** |
| `deletePrintingOrder` | `app/actions/printing-mutations.ts:257` | `/printing` | `delete_printing_order_atomic` |
| `updatePrintOrderFileUrl` | `app/actions/printing-actions.ts:34` | `/contracts/[id]` | UPDATE trực tiếp `printing_orders.print_file_url` |
| `createLab / updateLab / deleteLab / toggleLabStatus` | `app/actions/lab-mutations.ts:23,78,119,164` | `/printing/labs` | UPDATE/INSERT trực tiếp `labs`. `deleteLab` chặn nếu còn đơn in (`:122`) |
| `createLabService / updateLabService / deleteLabService` | `app/actions/lab-mutations.ts:202,238,276` | `/printing/labs` | `lab_services` |
| **`recordLabPayment`** | `app/actions/lab-mutations.ts:299` | `/printing/labs` (LabPaymentModal) | `record_lab_payment_atomic` → `expenses` + `expense_allocations` |
| `getPrintingBootstrap` / `fetchPrintingOrders` / `getPrintingOrderStats` / `getPrintingOrderDetail` | `app/actions/printing-queries.ts:253,138,221,332` | `app/(protected)/printing/page.tsx:13` | `printing_orders` + `printing_stats()` |
| `getPrintingOrderLabRemaining` | `app/actions/printing-queries.ts:385` | drawer badge công nợ lab | Đọc **thẳng** `expense_allocations` join `expenses!inner` lọc `deleted_at` (`:402-407`) — đúng ADR-016 M2 |
| `fetchLabsList / getLabDetail / fetchLabUnpaidOrders / fetchLabPaymentHistory` | `app/actions/lab-queries.ts:95,121,234,322` | `/printing/labs` | `printing_lab_overview()`, `expenses`, `expense_allocations` |
| `getLabDebts` | `app/actions/printing-reference-queries.ts:91` | KPI `/printing` | `finance_lab_debt_summary()` |

**Guard:** mọi action in ấn bọc `withPrintingAccess` → `requirePrintingAccess` → `canAccess(role,"printing")` (`lib/auth_utils.ts:605-613,615`).

### 3.2 Vật tư / Kho

| Action | File:dòng | Route / UI | RPC |
|---|---|---|---|
| `createInventoryItem` | `app/actions/inventory-mutations.ts:36` | `/inventory` "Khai báo vật tư mới" | INSERT `inventory_items` + `inventory_stock_in_atomic(p_paid:false)` nếu có tồn đầu |
| `updateInventoryItem` | `:140` | `/inventory` | UPDATE `inventory_items` |
| `deleteInventoryItem` | `:206` | `/inventory` | Soft delete; chặn nếu `current_stock>0` (`:226`) hoặc có giao dịch (`:240`) |
| **`stockIn`** | `:277` | `StockInModal` | `inventory_stock_in_atomic` (mặc định `paid=true`, `lib/validations/inventory.schema.ts:114`) |
| **`stockOut`** (Xuất HĐ / Nội bộ) | `:330` | `StockOutModal` | `inventory_stock_out_atomic`. Chặn "khách vãng lai không có HĐ" (`:351-353`), bắt buộc lý do nếu không có HĐ (`:355-357`) |
| **`createInventoryRetailSale`** (Bán lẻ) | `:398` | `StockOutModal` mode Bán lẻ | `create_sale_receipt_atomic` |
| **`createInventoryContractAddonSale`** (Bán thêm HĐ) | `:471` | `StockOutModal` mode Bán thêm + ô "Thiệp" trang HĐ | `create_contract_inventory_addon_sale_atomic` |
| `addFulfillmentTransaction` | `:550` | drawer đơn xuất | `add_fulfillment_transaction_atomic` |
| `deleteInventoryTransaction` | `:596` | `components/inventory/inventory-list-client.tsx:256` | **DELETE cứng** + tự cộng/trừ tồn tay (`:650-666`) — xem §7 |
| `requestFulfillmentAction` / `approveFulfillmentRequest` / `rejectFulfillmentRequest` | `:698,766,850` | tab Duyệt | `update/delete_fulfillment_transaction_atomic` + `approval_requests` + `notification_queue` |
| `createSaleReceipt` | `app/actions/receipt-actions.ts:280` | `/finance/receipts` | `create_sale_receipt_atomic` (đường thứ 2 vào cùng RPC) |
| `deleteReceipt` | `app/actions/receipt-actions.ts:46` | `/finance/receipts` | Soft delete `receipts` → **kích trigger hoàn kho** |
| Queries | `app/actions/inventory-queries.ts:78,122,181,238,251,271,290,346,394,434` | `/inventory`, `/inventory/[id]` | `inventory_list`, `inventory_detail_v2`, `inventory_stats`, … |

**Guard:** `withInventoryAccess` → `canAccess(role,"inventory")` (`lib/auth_utils.ts:653-661,663`).

### 3.3 Váy cưới

| Action | File:dòng | Route / UI | RPC |
|---|---|---|---|
| `createDress` / `updateDress` | `app/actions/dress-mutations.ts:133,222` | `/dresses` | INSERT/UPDATE `dresses` (guard **catalog write**) |
| `deleteDress` | `:281` | `/dresses` | `delete_dress_atomic` (+ fallback `:292-327`) |
| `reserveDressForContract` | `:343` | `/contracts/[id]` chọn váy | `create_dress_contract_reservation_atomic` (+ fallback `:377-456`) |
| `updateReservationStatus` | `:470` | `/dresses`, `/contracts/[id]` | `update_dress_reservation_status_atomic` |
| `releaseReservation` | `:514` | như trên | `release_dress_reservation_atomic` |
| `uploadDressImage` / `deleteDressImage` | `:571,596` | `/dresses` | Storage bucket `dresses` |
| `createRental` | `app/actions/rental-mutations.ts:22` | `/dresses/rentals` | `create_standalone_dress_rental_atomic` |
| `startRental` | `:135` | `/dresses/rentals` | `start_dress_rental_atomic` |
| `returnDressRental` | `:181` | `ReturnModal` | `return_dress_rental_atomic` |
| `markCleaned` | `:249` | `/dresses` | `mark_dress_cleaned_atomic` |
| `cancelRental` | `:293` | `/dresses/rentals` | `cancel_dress_rental_atomic` |
| `refundDeposit` | `:339` | `/dresses/rentals` | **UPDATE trực tiếp** `dress_rentals.deposit_returned=true` — không RPC, không ghi tiền vào sổ nào |
| Queries | `app/actions/dress-queries.ts:55,131,164,204,260,291`; `app/actions/rental-queries.ts:31,45,125` | `app/(protected)/dresses/page.tsx:36`, `.../rentals/page.tsx:23` | `dress_list`, `dress_stats`, `is_dress_available`, `dress_rental_list` |

**Guard 3 tầng** (`lib/auth_utils.ts:677,687,704`): `requireDressesAccess` (theo ma trận) → `requireDressesBookingAccess` (admin/manager/sale) → `requireDressesCatalogWriteAccess` (**chỉ admin/manager**, `:710-712`).

### 3.4 `components/contracts/print/**` — KHÔNG thuộc miền in ấn

`components/contracts/print/contract-template.tsx` và `print-contract-client.tsx` là **mẫu in hợp đồng ra giấy**. Grep `printing_order|printing|inventory|dress` trong 2 file: 0 kết quả liên quan (chỉ trùng chuỗi "ĐC:"/"address"). Không đụng `printing_orders`.

---

## 4. Luồng nghiệp vụ

### (a) Vòng đời đơn in — **KHÁC với đề bài**

Đề bài mô tả `cho_xu_ly → dat_coc → dang_in → da_in → da_nhan → hoan_thanh`. **Code + DB không còn như vậy** kể từ ADR-014 (2026-08-24). `dat_coc` và `da_giao` đã **bị xoá khỏi từ vựng**; `da_nhan`/`da_huy` chỉ còn là **legacy read-only**.

Trục thật (`types/printing-constants.ts:22-32`, CHECK ở `20260824120000_printing_workflow_redesign.sql:22-25`):

```
                       [TẠO ĐƠN]
  createPrintingOrder  →  create_printing_order_atomic
  ghi: printing_orders (INSERT, status='cho_xu_ly', payment_status='chua_thanh_toan',
       total_amount = printing_items_total(items), order_code = nextval_printing_order_code())
  KHÔNG ghi expenses  (ADR-016 — bỏ phiếu chi trích trước)
       │
       ▼
 ┌────────────┐        ┌──────────┐        ┌────────┐        ┌────────────┐
 │ cho_xu_ly  │───────▶│ dang_in  │───────▶│ da_in  │───────▶│ hoan_thanh │ (terminal)
 └─────┬──┬───┘        └────┬──┬──┘        └──┬─┬─┬─┘        └────────────┘
       │  │                 │  │              │ │ └────────── da_in → dang_in (LÙI, bắt buộc lý do)
       │  │                 │  │              │ │
       │  └──────┐          │  └────┐         │ └────┐
       ▼         ▼          ▼       ▼         ▼      ▼
   ┌────────┐ ┌───────────┐      (huy_don / gap_su_co từ cả 3 bước)
   │huy_don │ │ gap_su_co │
   └────────┘ └─────┬─────┘
   (terminal)       │  gap_su_co → cho_xu_ly | dang_in | da_in | hoan_thanh | huy_don
                    └──▶ (quay lại bất kỳ bước nào)

  Legacy terminal, KHÔNG ghi mới:  da_nhan → []   ·   da_huy → []
```

**Mỗi bước ghi gì** — tất cả nằm trong `updatePrintingOrderStatus` (`app/actions/printing-mutations.ts:142-255`):

| Bước | Ghi `printing_orders` | Ghi `printing_order_status_history` | Ghi bảng khác |
|---|---|---|---|
| bất kỳ | `status, updated_at, updated_by` (`:186-190`) | 1 dòng `{order_id, from_status, to_status, changed_by, changed_at, reason, source:'manual'}` (`:225-235`) — **non-blocking**, lỗi chỉ log (`:236-239`) | audit_logs qua `fireAuditLog` (`:241-250`) |
| → `gap_su_co` | + `issue_reason, issue_reported_at, issue_reported_by` (`:193-196`) | " | — |
| rời `gap_su_co` | xoá 3 cột issue (`:197-202`) | " | — |
| → `huy_don` | + `cancelled_at, cancellation_reason` (`:206-209`) — ADR-017 gộp 2 đường huỷ về 1 | " | — |
| → `da_nhan` | + `received_date` (`:211-213`) | **NHÁNH CHẾT** — không transition nào tới `da_nhan` | — |

**Chốt chặn trước khi ghi** (thứ tự trong code):
1. `printingStatusSchema` (`lib/validations/printing.schema.ts:30`) — giá trị phải nằm trong `PRINTING_ORDER_STATUSES`.
2. Nếu `currentStatus === newStatus` → return sớm, no-op (`:170-172`).
3. `printingStatusRequiresReason(from,to)` → bắt buộc `reason` (`:175-178`).
4. `VALID_TRANSITIONS[current].includes(to)` (`:180-183`).
5. CHECK constraint DB (`20260824120000…:22-25`).

**Ai tính lại `payment_status`** — **KHÔNG PHẢI** bước trạng thái. `payment_status` là **cột dẫn xuất**, chỉ được `recompute_printing_payment_status(order_id)` ghi, và hàm này chỉ được gọi từ 3 chỗ:

```
  ┌── update_printing_order_atomic (…20260825200000…:696)  ← đổi items ⇒ total_amount đổi
  │
  ├── record_payee_payment_atomic (…luong_cung_m5.sql:234) ← ghi phiếu chi trả lab
  │
  └── void_payee_payment_atomic  (…luong_cung_m5.sql:263)  ← huỷ phiếu chi trả lab

  công thức: total_amount − Σ(expense_allocations.amount WHERE target_type='printing_order'
                              AND target_id = po.id AND expenses.deleted_at IS NULL) <= 0.01
             ⇒ 'da_thanh_toan'  ngược lại 'chua_thanh_toan'
             (…20260825200000…:226-238)
```

**Trục tiền (Trục B) — độc lập hoàn toàn với trục trạng thái:**

```
  /printing/labs  LabPaymentModal
        │  recordLabPayment (app/actions/lab-mutations.ts:299)
        ▼
  record_lab_payment_atomic (wrapper, …20260825200000…:306)
        │  map {printing_order_id → target_id}
        ▼
  record_payee_payment_atomic('lab', …)  (luong_cung_m5.sql:165)
        ├─ kiểm is_period_locked(date) → chặn nếu kỳ đã khoá
        ├─ INSERT expenses (payee_type='lab', payee_id=lab_id, category=resolve_printing_expense_category_id())
        ├─ với mỗi phân bổ: payable_remaining('printing_order', id, lab_id) → chặn vượt công nợ
        ├─ INSERT expense_allocations (target_type='printing_order', target_id=order_id)
        │  (nếu không truyền allocations → tự FIFO theo payable_items())
        └─ PERFORM recompute_printing_payment_status(mỗi target_id)
```

`payable_items('lab')` **loại** đơn `huy_don`/`da_huy` khỏi công nợ (`…20260825200000…:198-225`, dòng `WHERE … NOT IN ('huy_don','da_huy')`).

### (b) Nhập kho / xuất kho / giá vốn bình quân

```
NHẬP KHO  —  stockIn (inventory-mutations.ts:277) → inventory_stock_in_atomic (…20260825200000…:744)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ SELECT … FROM inventory_items WHERE id=? AND deleted_at IS NULL FOR UPDATE│ (:754-756)
  │ chặn: quantity<=0, unit_cost<0, item không tồn tại, status<>'active'      │ (:752-758)
  │ chặn: p_paid=true & tiền>0 & không có supplier_id → EXCEPTION             │ (:760-762)
  ├──────────────────────────────────────────────────────────────────────────┤
  │ new_stock = current_stock + qty                                          │ (:764)
  │ new_avg   = (current_stock × old_avg + qty × unit_cost) / new_stock       │ (:765)
  │             ← BÌNH QUÂN GIA QUYỀN DI ĐỘNG, chỉ đổi khi NHẬP              │
  ├──────────────────────────────────────────────────────────────────────────┤
  │ INSERT inventory_transactions (type='stock_in', source_type='stock_in',   │ (:767-769)
  │        unit_cost = giá lô này)                                            │
  │ UPDATE inventory_items SET current_stock=new_stock,                       │ (:771-774)
  │        average_unit_price=ROUND(new_avg,2), purchase_price=unit_cost,     │
  │        supplier_id=COALESCE(p_supplier_id, cũ)                            │
  ├──────────────────────────────────────────────────────────────────────────┤
  │ IF p_paid AND qty×cost > 0:                                               │ (:776-780)
  │   record_payee_payment_atomic('supplier', supplier_id, qty×cost, …,        │
  │     allocations=[{target_id: txn_id, amount: qty×cost}])                   │
  │   → INSERT expenses(payee_type='supplier') + expense_allocations           │
  │     (target_type='inventory_transaction')  ← CÙNG 1 TRANSACTION            │
  └──────────────────────────────────────────────────────────────────────────┘
  Ngoại lệ: "Khai báo vật tư mới" có tồn đầu kỳ → p_paid=false (inventory-mutations.ts:94)
            = số dư kê khai, KHÔNG tạo phiếu chi.

XUẤT KHO  —  4 đường, tất cả lấy giá vốn = average_unit_price TẠI THỜI ĐIỂM XUẤT,
             KHÔNG đường nào sửa average_unit_price:

  1) stockOut → inventory_stock_out_atomic (…20260507103000…:159)
       chặn: qty<=0, item không tồn tại, status<>'active', current_stock<qty (:179-199)
       source_type = contract_id IS NOT NULL ? 'contract_fulfillment' : 'internal_use' (:201)
       INSERT txn(unit_cost = average_unit_price)   (:204-221)
       UPDATE current_stock -= qty                  (:223-227)
       cảnh báo nếu new_stock < min_stock           (:229-231)
       ⇒ CHỈ giá vốn. Không doanh thu, không phiếu thu.

  2) createInventoryRetailSale → create_sale_receipt_atomic (…20260507103000…:242) — §(c)
  3) createInventoryContractAddonSale → create_contract_inventory_addon_sale_atomic — §(c)
  4) addFulfillmentTransaction → add_fulfillment_transaction_atomic (in bổ sung phát sinh)
```

Ràng buộc app: **cấm optimistic-patch tồn kho / giá bình quân** — do server tính (`vault/40-module/vat-tu.md:29`).

### (c) Bán vật tư kèm hợp đồng (và bán lẻ để đối chiếu)

```
        StockOutModal (components/inventory/stock-out-modal.tsx) — 4 chế độ
        ┌────────────┬──────────────┬─────────────────┬──────────┐
        │  Bán lẻ    │   Xuất HĐ    │  Bán thêm HĐ    │ Nội bộ   │
        └─────┬──────┴──────┬───────┴────────┬────────┴────┬─────┘
              │             │                │             │
              ▼             ▼                ▼             ▼
   create_sale_receipt  inventory_stock  create_contract_  inventory_stock
     _atomic            _out_atomic      inventory_addon_  _out_atomic
                        (có contract_id)  sale_atomic       (không contract_id,
                                                             bắt buộc lý do)

─── BÁN LẺ (create_sale_receipt_atomic, …20260507103000…:242-379) ───
  vòng 1 (:272-308): kiểm MỌI item — qty>0, giá>0, item tồn tại + active, đủ tồn; cộng tổng
  chốt   (:310-312): |receipt_amount − Σ(qty×giá)| <= 0.01 nếu không → EXCEPTION
  ghi    (:314-330): INSERT receipts (receipt_type='sale_receipt', status='confirmed')
  vòng 2 (:332-375): mỗi item →
        INSERT inventory_transactions (type='stock_out', source_type='retail_sale',
               source_id = receipt_id, receipt_id = receipt_id,
               unit_cost = average_unit_price   ← giá vốn
               sale_unit_price, sale_total      ← doanh thu)
        UPDATE inventory_items.current_stock -= qty
  ⇒ 2 sổ: receipts (tiền vào) + inventory_transactions (giá vốn). KHÔNG chạm contracts.

─── BÁN THÊM HĐ (create_contract_inventory_addon_sale_atomic, …20260507123000…:121-331) ───
  chặn (:145-206): thiếu actor / contract / item, qty<=0, giá<=0, thiếu ngày;
                   finance_monthly_closes locked (:165-172);
                   contract không tồn tại / da_huy (:174-187);
                   item không tồn tại / không active / không đủ tồn (:189-206)
  ghi 5 bảng, 1 transaction:
   1. contract_items   INSERT type='phat_sinh', is_addon=true, addon_category='khac',
                       item_name = "Vat tu: <tên> (<mã>)"            (:213-241)
   2. payments         INSERT amount = qty×giá, is_contract_adjustment=true,
                       contract_adjustment_item_id = contract_item_id,
                       receipt_code = contract_payment_receipt_code() (:243-272)
   3. inventory_transactions INSERT type='stock_out',
                       source_type='contract_addon_sale', source_id = PAYMENT_ID,
                       unit_cost = average_unit_price, sale_unit_price/sale_total (:274-297)
   4. inventory_items  current_stock -= qty                           (:299-303)
   5. contracts        total_amount += tổng ; paid_amount += tổng ;
                       remaining = GREATEST(0, total−paid) ;
                       payment_status = contract_payment_status_v2()  (:305-317)
      ⇒ GIẢ ĐỊNH: khách trả đủ ngay tại thời điểm bán thêm.
  Giá vốn gắn HĐ vào lãi/lỗ qua contract_financials.cogs (chỉ 'contract_fulfillment'
  + 'contract_addon_sale') — vault/40-module/vat-tu.md:19.
```

### (d) Đặt váy → thuê → trả → trạng thái váy

`dresses.status` **luôn là dẫn xuất**. Nguồn chân lý: `refresh_dress_status_atomic` (`…20260429110000…:269-325`).

```
  ƯU TIÊN TÍNH status (dừng ở nhánh đầu tiên đúng) — :288-315
  ┌────────────────────────────────────────────────────────────────────────┐
  │ 0. deleted_at ≠ NULL  hoặc  status ∈ {maintenance, retired, cleaning}   │
  │    → GIỮ NGUYÊN, thoát (3 trạng thái này "khoá" khỏi tự động)          │
  │ 1. ∃ dress_rentals.status='overdue'                    → 'overdue'      │
  │ 2. ∃ rentals='renting'  ∨ ∃ reservations∈{in_use,rented} → 'rented'     │
  │ 3. ∃ rentals='reserved' ∨ ∃ reservations='reserved'      → 'reserved'   │
  │ 4. còn lại                                               → 'available'  │
  └────────────────────────────────────────────────────────────────────────┘

  HAI TRIGGER tự gọi refresh sau MỌI thay đổi 2 bảng con:
    trg_refresh_dress_status_from_rental      (dress_rentals,      :334-350)
    trg_refresh_dress_status_from_reservation (dress_reservations, 20260422160000…:130-150)
    → AFTER INSERT/UPDATE/DELETE FOR EACH ROW, refresh cả OLD.dress_id lẫn NEW.dress_id


  ĐƯỜNG A — THUÊ LẺ (dress_rentals)
  createRental                startRental              returnDressRental      markCleaned
  create_standalone_          start_dress_             return_dress_          mark_dress_
  dress_rental_atomic         rental_atomic            rental_atomic          cleaned_atomic
        │                          │                        │                      │
        ▼                          ▼                        ▼                      ▼
   ┌──────────┐   start      ┌──────────┐   return   ┌──────────┐  cleaned  ┌───────────┐
   │ reserved │─────────────▶│ renting  │───────────▶│ returned │──────────▶│ available │
   └────┬─────┘              └──────────┘            └──────────┘           └───────────┘
        │ cancelRental            ▲                        ▲
        ▼                         │ (chỉ từ reserved)      │ (chỉ từ renting|overdue)
   ┌───────────┐                  │                        │
   │ cancelled │                 (overdue ─────────────────┘  ← KHÔNG AI GHI, xem §8)
   └───────────┘

   dress.status:  reserved ──▶ rented ──▶ **cleaning** ──▶ available
                    ▲            ▲            ▲                ▲
                    │            │            │                │
              refresh (trigger)  │      return_dress_rental_atomic:499-504
                                 │      GHI THẲNG dresses.status='cleaning'
                                 │      (KHÔNG qua refresh — vì refresh
                                 │       không có nhánh nào ra 'cleaning')
                                 └── refresh (trigger)

   Kiểm tra trước khi ghi:
     create: dates hợp lệ (:369-371); dress tồn tại + FOR UPDATE (:373-382);
             status ∉ {maintenance,retired,cleaning} (:384-386);
             is_dress_available(khoảng ngày) (:388-390)
     start : rental.status phải = 'reserved' (:428-430)
     return: rental.status ∈ {renting, overdue} (:470-472);
             dress.status ∉ {maintenance, retired} (:485-487)
     cancel: rental.status phải = 'reserved' (:527-529)
     cleaned: dress.status phải = 'cleaning' (:562-564)

   refundDeposit (app/actions/rental-mutations.ts:339): chỉ set deposit_returned=true,
   KHÔNG ghi tiền vào expenses/receipts.


  ĐƯỜNG B — ĐẶT GIỮ THEO HỢP ĐỒNG (dress_reservations)
  reserveDressForContract → create_dress_contract_reservation_atomic (:628-726)
     kiểm: contract bắt buộc (:646); dates (:650-652); dress FOR UPDATE (:654-659);
           status ∉ {maintenance,retired,cleaning} (:665-667); is_dress_available (:669-671)
     ghi:  (nếu is_addon & rental_price>0 & chưa có contract_item_id)
             INSERT contract_items type='trang_phuc', addon_category='trang_phuc',
             dress_id, export_type                                       (:673-693)
           INSERT dress_reservations status='reserved'                   (:695-711)
           recalc_contract_totals(contract_id) nếu có contract_item      (:713-715)
           refresh_dress_status_atomic                                   (:717)

     reserved ──update_dress_reservation_status_atomic──▶ in_use | rented | returned | cancelled
              (kiểm is_dress_available lại nếu đích ∈ {reserved,in_use,rented}, :755-763)
     reserved/in_use/rented ──release_dress_reservation_atomic──▶ returned (:819-822)

     Khi 'cancelled' HOẶC 'release': soft-delete contract_items addon
       (deleted_at = now(), chỉ khi is_addon=true) + recalc_contract_totals
       (:770-780 và :824-834)


  XOÁ VÁY — delete_dress_atomic (:576-626)  ⚠ "xoá" có thể là "về hưu"
     chặn nếu đang có booking sống (reservations ∈ {reserved,in_use,rented}
        hoặc rentals ∈ {reserved,renting,overdue})                       (:595-603)
     có lịch sử (∃ reservation ∨ ∃ rental ∨ ∃ contract_items.dress_id)?  (:605-607)
        CÓ  → status='retired', deleted_at VẪN NULL → vẫn hiện trong danh sách (:609-616)
        KHÔNG → deleted_at = now()                                        (:618-622)
     ⇒ vault/40-module/vay-cuoi.md:27-34: cấm optimistic-remove ở UI.
```

### (e) Mọi nhánh VOID / huỷ và cái gì được hoàn lại

```
1) HUỶ ĐƠN IN  (updatePrintingOrderStatus → 'huy_don')
   ghi:    printing_orders.status='huy_don' + cancelled_at + cancellation_reason
           + 1 dòng printing_order_status_history + audit WARNING
   hoàn:   ❌ KHÔNG hoàn kho (đơn in không có kho — ADR-014/017)
           ❌ KHÔNG hoàn tiền khách (khách không trả Mood qua đơn in — ADR-015 (c))
   hiệu ứng tiền: đơn rơi khỏi payable_items('lab') (…20260825200000…:198-225 loại
           'huy_don','da_huy') ⇒ công nợ lab GIẢM. payment_status KHÔNG được tính lại
           (recompute không được gọi ở đường này) — xem §6 BB-4.

2) XOÁ ĐƠN IN  (delete_printing_order_atomic)
   CHẶN CỨNG nếu đã có expense_allocations còn sống (…20260825200000…:706-709)
   ngược lại: soft delete (deleted_at). Không hoàn gì.

3) HUỶ PHIẾU CHI TRẢ LAB  (void_payee_payment_atomic, luong_cung_m5.sql:244)
   chặn: phiếu đã huỷ; payee_type ∉ {lab,vendor,supplier,employee}; kỳ đã khoá
   ghi:  expenses.deleted_at = now()
   hoàn: công nợ lab quay lại (allocations bị loại vì join expenses.deleted_at IS NULL)
         + recompute_printing_payment_status cho mọi target_type='printing_order'
   ⚠ KHÔNG xoá dòng expense_allocations — chỉ xoá mềm expenses (mọi hàm đọc đều
     join expenses!inner lọc deleted_at).

4) HUỶ PHIẾU THU BÁN LẺ VẬT TƯ  (deleteReceipt, receipt-actions.ts:46)
   chặn: id bắt đầu "payment:" (:48); receipt có contract_id (:59); kỳ đã khoá (:65)
   ghi:  receipts.deleted_at = now()  (:67-73)
         ↓ TRIGGER trg_restore_inventory_on_receipt_void (…20260507123000…:91-96)
         ↓ restore_inventory_from_transaction('retail_sale', receipt_id, …)
   HOÀN: mỗi stock_out có source_type='retail_sale' AND source_id=receipt_id
         → INSERT stock_in mới (source_type='return', giữ nguyên unit_cost/
           sale_unit_price/sale_total/receipt_id) + current_stock += qty  (:41-70)
   ❌ KHÔNG hoàn average_unit_price (dòng 'return' không đi qua công thức bình quân)
   ✅ chống hoàn 2 lần: NOT EXISTS dòng stock_in source_type='return'
      cùng source_id + item_id (:22-29)  — xem §6 BB-8 (giới hạn của guard này)

5) HUỶ PHIẾU BÁN THÊM HỢP ĐỒNG  (payments.deleted_at ← module Hợp đồng)
         ↓ TRIGGER trg_restore_inventory_on_contract_payment_void (…:114-119)
         ↓ restore_inventory_from_transaction('contract_addon_sale', payment_id, …)
   HOÀN: tồn kho về (cùng cơ chế như (4))
   ❓ contracts.total_amount/paid_amount + contract_items addon có được đảo ngược không
      → thuộc miền Hợp đồng, KHÔNG xác minh trong phạm vi này (§8)

6) HUỶ ĐƠN THUÊ VÁY  (cancel_dress_rental_atomic)
   chỉ từ 'reserved' (:527-529) → status='cancelled' → refresh → dress về 'available'
   ❌ deposit KHÔNG được xử lý (refundDeposit là hành động tay riêng)

7) HUỶ ĐẶT GIỮ VÁY  (update_dress_reservation_status_atomic → 'cancelled'
                     hoặc release_dress_reservation_atomic)
   HOÀN: soft-delete contract_items addon (chỉ is_addon=true) + recalc_contract_totals
         + refresh_dress_status → váy về 'available'

8) HUỶ HỢP ĐỒNG  (cancel_contract_cascade, …20260422160000…:300-375)
   ghi:  contracts→'da_huy'; work_tasks→'da_huy'; **printing_orders→'da_huy'**;
         dress_reservations→'cancelled'; refresh_dress_status cho mọi váy liên quan;
         payment_plans→'cancelled'
   ❌ KHÔNG hoàn kho (không gọi restore_inventory_from_transaction)
   ⚠ 'da_huy' cho printing_orders MÂU THUẪN CHECK constraint — xem §6 BB-3 / §7.

9) XOÁ GIAO DỊCH KHO  (deleteInventoryTransaction, inventory-mutations.ts:596)
   chặn: source_type ≠ NULL và ≠ 'manual' (:619-623); có giao dịch con (:634-636)
   ghi:  DELETE CỨNG (:639-642) + tự cộng/trừ current_stock bằng tay (:650-666)
   ❌ KHÔNG tính lại average_unit_price (comment tự thừa nhận, :649)
   ⚠ thực tế bất khả thi — xem §6 BB-9.
```

---

## 5. Enum & máy trạng thái

### 5.1 In ấn

| Enum | Giá trị | Nơi khai | Nơi ép |
|---|---|---|---|
| `printing_orders.status` | `cho_xu_ly · dang_in · da_in · hoan_thanh · huy_don · gap_su_co` (+ legacy `da_nhan · da_huy` chỉ đọc) | `types/printing-constants.ts:6-15` | (1) zod `printingStatusSchema` `lib/validations/printing.schema.ts:30` · (2) **`PRINTING_VALID_TRANSITIONS`** `types/printing-constants.ts:22-32` · (3) CHECK DB `20260824120000…:22-25` (**chỉ áp cho `deleted_at IS NULL`**, và **không có** `da_nhan`/`da_huy`) |
| `printing_orders.payment_status` | `chua_thanh_toan · da_thanh_toan` | `types/printing-constants.ts:34-37` | CHECK DB `20260824120000…:27-30`; app **không bao giờ ghi tay** — chỉ `recompute_printing_payment_status` |
| `labs.status` | `active · inactive` | `types/printing-constants.ts:42` | Không thấy CHECK trong migration |
| `printing_orders.inventory_status` | `none · reserved · stocked_out · cancelled` | CHECK DB (`vault/30-du-lieu/luoc-do-in-an-lab.md:64`) | **Chết** — 0 code ghi |
| `PaymentMethod` (UI in ấn) | `cash · transfer · card · other` | `types/printing.ts:142` | DB chỉ nhận `tien_mat/chuyen_khoan` — quy đổi ở `record_payee_payment_atomic` (`luong_cung_m5.sql`, dòng `CASE WHEN p_payment_method IN ('tien_mat','cash') THEN 'tien_mat' ELSE 'chuyen_khoan'`) ⇒ **`card`/`other`/`transfer` đều rơi vào `chuyen_khoan`** |

**`VALID_TRANSITIONS` ở đâu:** `types/printing-constants.ts:22-32` (`PRINTING_VALID_TRANSITIONS`) — SSOT dùng chung 3 nơi:
- server: `app/actions/printing-mutations.ts:21,180-183`
- dropdown UI: `components/ui/status-select.tsx:60` (`selectablePrintOrderStatusOptions`)
- 2 client hỏi lý do: `components/printing/printing-list-page.tsx:261`, `components/contracts/detail/print-orders-block.tsx:112`

**Quy tắc bắt buộc lý do:** `PRINTING_REASON_REQUIRED_STATUSES = ['gap_su_co','huy_don']` + mọi bước LÙI trong `['cho_xu_ly','dang_in','da_in','hoan_thanh']` (`types/printing-constants.ts:163-183`).

**CHỖ KHÔNG ÉP:**
- `cancel_contract_cascade` (`…20260422160000…:348-354`) UPDATE thẳng `printing_orders.status='da_huy'` — **không đi qua `VALID_TRANSITIONS`, không ghi `status_history`, không ghi `cancelled_at`**.
- `updatePrintOrderFileUrl` (`app/actions/printing-actions.ts:48`) UPDATE thẳng bảng — không liên quan status nhưng cũng không qua RPC.
- `printing_order_status_history.from_status/to_status/source` là `text` trần, **không CHECK, không FK** (`vault/30-du-lieu/luoc-do-in-an-lab.md:89-98`).
- Insert `status_history` là **non-blocking** (`printing-mutations.ts:236-239`) ⇒ có thể mất dòng lịch sử mà không ai biết.

### 5.2 Vật tư

| Enum | Giá trị | Nơi khai | Nơi ép |
|---|---|---|---|
| `inventory_items.status` | `active · discontinued` | `lib/validations/inventory.schema.ts:32-35` | zod ở create/update; **RPC chỉ kiểm `= 'active'`** (`…20260825200000…:758`, `…20260507103000…:193,299`). **Không thấy CHECK DB** |
| `inventory_items.category` | 9 giá trị `in_an…trang_tri` | `lib/validations/inventory.schema.ts:16-26` | zod only |
| `inventory_items.unit` | `cai · bo · hop · cuon · met · to` | `lib/validations/inventory.schema.ts:63-70` | zod only |
| `inventory_transactions.transaction_type` | `stock_in · stock_out` | `types/inventory-constants.ts:56-59` | **Không CHECK DB**; chỉ RPC hard-code |
| `inventory_transactions.source_type` | `stock_in · contract_fulfillment · retail_sale · contract_addon_sale · internal_use · loss_adjustment · correction · return` | `types/inventory-constants.ts:61-70` | **KHÔNG ÉP Ở ĐÂU** — text trần, không CHECK, không enum. Giá trị do RPC hard-code. `loss_adjustment` và `correction` **không RPC nào ghi**; `'manual'` mà `deleteInventoryTransaction:619` kiểm **không tồn tại trong bảng đối chiếu này** |
| `inventory_transactions.payment_method` | text trần | — | Nhận `tien_mat/chuyen_khoan` (bán lẻ, `…20260507103000…:365`) hoặc `payment_method_enum::text` (bán thêm HĐ, `…20260507123000…:294`) |
| CHECK thật trên `inventory_transactions` | `sale_total >= 0`, `sale_unit_price >= 0` — **cả hai `NOT VALID`** | `20260507103000…:22-36` | Chỉ áp cho dòng mới |

### 5.3 Váy cưới

| Enum | Giá trị | Nơi khai | Nơi ép |
|---|---|---|---|
| `dresses.status` | `available · reserved · rented · maintenance · cleaning · overdue · retired` | `lib/validations/dress.schema.ts:16-24`; nhãn `types/dress-constants.ts:19-27` | **Không CHECK DB tìm thấy**. `refresh_dress_status_atomic` chỉ sinh ra 4 giá trị: `overdue/rented/reserved/available` (`…20260429110000…:296,304,312,314`); `cleaning` do `return_dress_rental_atomic:500`; `retired` do `delete_dress_atomic:611`; **`maintenance` không code/RPC nào ghi** |
| `dresses.condition` | `new · good · fair · worn` | `lib/validations/dress.schema.ts:28` | zod only |
| `dresses.category` | 8 giá trị `vay_cuoi…khac` | `lib/validations/dress.schema.ts:3-12` | zod; prefix mã `types/dress-constants.ts:58-67` |
| `dress_rentals.status` | `reserved · renting · returned · overdue · cancelled` | `lib/validations/rental.schema.ts:3-9`; nhãn `types/dress-constants.ts:80-86` | **Không CHECK DB**. Máy trạng thái ép **trong từng RPC** (`:428,470,527`), không có bảng `VALID_TRANSITIONS` tập trung như in ấn |
| `dress_reservations.status` | `reserved · in_use · rented · returned · cancelled` | Ép trong RPC: `update_dress_reservation_status_atomic:736-738` (`IF p_status NOT IN (...)`) ; nhãn UI chỉ có **4** giá trị (`types/dress-constants.ts:71-76`, **thiếu `in_use`**) và `components/ui/status-select.tsx:64-69` `RESERVATION_STATUS_OPTIONS` có 4 (`reserved,in_use,returned,cancelled`, **thiếu `rented`**) | Chỉ ở RPC. **Không CHECK DB**, và **không có bảng transition** — từ bất kỳ trạng thái nào cũng nhảy được sang bất kỳ trạng thái nào trong 5 giá trị |
| `dress_reservations.export_type` | `export_type_enum` (`xuat_ban · xuat_thue`) | ENUM DB thật (`vault/30-du-lieu/luoc-do-vay-cuoi.md:155`); zod `lib/validations/dress.schema.ts:63` | ✅ ENUM Postgres — miền duy nhất trong 3 miền dùng enum thật |
| `return_condition` | `good · minor_damage · major_damage` | `lib/validations/rental.schema.ts:33` | zod only; cột DB là `text` |
| CHECK thật trên `dress_reservations` | `end_date >= start_date` | `vault/30-du-lieu/luoc-do-vay-cuoi.md:165` | ✅ |

**Tóm tắt "chỗ KHÔNG ép":**
1. **`dress_reservations.status` không có máy trạng thái** — `update_dress_reservation_status_atomic` cho phép mọi chuyển đổi, kể cả `returned → reserved`, `cancelled → rented`.
2. **`dress_rentals.status` không có bảng transition tập trung** — luật rải trong 4 RPC; nếu gọi qua fallback ghi tay (`rental-mutations.ts:216,314`) thì luật nằm ở TS chứ không ở DB.
3. **`inventory_transactions.source_type` / `transaction_type` không CHECK** — chỉ dựa vào RPC.
4. **`inventory_items.status` không CHECK** — chỉ zod ở tầng app.
5. **`printing_orders` CHECK có điều kiện `deleted_at IS NOT NULL OR …`** ⇒ dòng đã xoá mềm ghi được giá trị bất kỳ.
6. Mọi fallback `isMissingRpc` trong `dress-mutations.ts` / `rental-mutations.ts` **bỏ qua toàn bộ kiểm tra của RPC** (khoá `FOR UPDATE`, `is_dress_available`, atomicity) — xem §6 BB-10.

---

## 6. Bất biến

Cột "SQL kiểm" là câu để **con người chạy sau**, tôi **không chạy**.

**BB-1. `printing_orders.payment_status` luôn khớp phân bổ phiếu chi.**
Căn cứ: `…20260825200000…:226-238` (công thức) + `printing_integrity_report()` check `payment_status_mismatch` (`…:728-731`).
```sql
SELECT po.id, po.order_code, po.payment_status, po.total_amount,
       COALESCE(SUM(a.amount),0) AS allocated
FROM printing_orders po
LEFT JOIN expense_allocations a ON a.target_type='printing_order' AND a.target_id=po.id
LEFT JOIN expenses e ON e.id=a.expense_id AND e.deleted_at IS NULL
WHERE po.deleted_at IS NULL AND COALESCE(po.status,'') NOT IN ('huy_don','da_huy')
GROUP BY po.id
HAVING (po.payment_status='da_thanh_toan' AND po.total_amount - COALESCE(SUM(a.amount),0) > 0.01)
    OR (po.payment_status='chua_thanh_toan' AND po.total_amount - COALESCE(SUM(a.amount),0) <= 0.01);
-- kỳ vọng 0 dòng
```

**BB-2. `printing_orders.total_amount` = `printing_items_total(items)`.**
Căn cứ: `…20260825200000…:662,690`; client tự tính lại để audit (`printing-mutations.ts:29-33`) nhưng **không ghi**.
```sql
SELECT id, order_code, total_amount, printing_items_total(items) AS computed
FROM printing_orders WHERE deleted_at IS NULL
  AND ABS(COALESCE(total_amount,0) - COALESCE(printing_items_total(items),0)) > 0.01;
```

**BB-3. Mọi đơn in `deleted_at IS NULL` phải có `status` ∈ 6 giá trị của CHECK.**
Căn cứ: `20260824120000…:22-25`. **XUNG ĐỘT:** `cancel_contract_cascade` ghi `'da_huy'` (`…20260422160000…:348-354`).
```sql
SELECT id, order_code, status FROM printing_orders
WHERE deleted_at IS NULL
  AND status NOT IN ('cho_xu_ly','dang_in','da_in','hoan_thanh','huy_don','gap_su_co');
-- kỳ vọng 0. Nếu >0 ⇒ có đường ghi vòng qua CHECK (constraint NOT VALID?) — kiểm pg_constraint.convalidated
```

**BB-4. Mọi đơn `huy_don` không còn nằm trong công nợ lab.**
Căn cứ: `payable_items` loại `('huy_don','da_huy')` (`…20260825200000…:198-225`). **Nhưng `payment_status` của đơn đó không được tính lại khi huỷ** (`updatePrintingOrderStatus` không gọi `recompute_…`) ⇒ đơn `huy_don` có thể còn mang nhãn `chua_thanh_toan` vĩnh viễn.
```sql
SELECT status, payment_status, COUNT(*), SUM(total_amount)
FROM printing_orders WHERE deleted_at IS NULL AND status IN ('huy_don','da_huy')
GROUP BY 1,2;
```

**BB-5. Mọi đơn in đã xoá mềm KHÔNG có phiếu chi còn sống.**
Căn cứ: `delete_printing_order_atomic:706-709`.
```sql
SELECT po.id, po.order_code FROM printing_orders po
JOIN expense_allocations a ON a.target_type='printing_order' AND a.target_id=po.id
JOIN expenses e ON e.id=a.expense_id AND e.deleted_at IS NULL
WHERE po.deleted_at IS NOT NULL;
```

**BB-6. `inventory_items.current_stock` = Σ nhập − Σ xuất.**
Căn cứ: mọi RPC cộng/trừ đối xứng (§4b); **rủi ro**: `deleteInventoryTransaction:639-666` DELETE cứng rồi tự bù tay.
```sql
SELECT i.id, i.item_code, i.current_stock,
       COALESCE(SUM(CASE WHEN t.transaction_type='stock_in' THEN t.quantity
                         WHEN t.transaction_type='stock_out' THEN -t.quantity END),0) AS computed
FROM inventory_items i LEFT JOIN inventory_transactions t ON t.item_id = i.id
WHERE i.deleted_at IS NULL GROUP BY i.id
HAVING i.current_stock <> COALESCE(SUM(CASE WHEN t.transaction_type='stock_in' THEN t.quantity
                                            WHEN t.transaction_type='stock_out' THEN -t.quantity END),0);
```

**BB-7. `current_stock` không bao giờ âm.**
Căn cứ: 4 chỗ chặn `current_stock < qty` (`…20260507103000…:197,303`; `…20260507123000…:204`; `…20260808110000…:64`).
```sql
SELECT id, item_code, current_stock FROM inventory_items
WHERE deleted_at IS NULL AND COALESCE(current_stock,0) < 0;
```

**BB-8. Mỗi `stock_out` bị void được hoàn **đúng một lần**.**
Căn cứ: guard `NOT EXISTS` ở `…20260507123000…:22-29` — nhưng guard đối chiếu theo **(source_id, item_id)**, không theo **transaction id**. Nếu 1 phiếu thu có **2 dòng stock_out cùng `item_id`** (ví dụ 2 dòng cùng SKU), guard có thể chỉ hoàn 1 dòng ⇒ thiếu tồn.
```sql
-- (a) tìm phiếu có >1 dòng cùng item
SELECT source_type, source_id, item_id, COUNT(*) FROM inventory_transactions
WHERE transaction_type='stock_out' AND source_type IN ('retail_sale','contract_addon_sale')
GROUP BY 1,2,3 HAVING COUNT(*) > 1;
-- (b) đối chiếu số lượng hoàn vs số lượng xuất của các phiếu đã void
SELECT o.source_id, o.item_id, SUM(o.quantity) AS out_qty,
       COALESCE((SELECT SUM(r.quantity) FROM inventory_transactions r
                 WHERE r.transaction_type='stock_in' AND r.source_type='return'
                   AND r.source_id=o.source_id AND r.item_id=o.item_id),0) AS restored_qty
FROM inventory_transactions o
WHERE o.transaction_type='stock_out' AND o.source_type IN ('retail_sale','contract_addon_sale')
  AND (EXISTS (SELECT 1 FROM receipts x WHERE x.id=o.source_id AND x.deleted_at IS NOT NULL)
    OR EXISTS (SELECT 1 FROM payments y WHERE y.id=o.source_id AND y.deleted_at IS NOT NULL))
GROUP BY o.source_id, o.item_id
HAVING SUM(o.quantity) <> COALESCE((SELECT SUM(r.quantity) FROM inventory_transactions r
        WHERE r.transaction_type='stock_in' AND r.source_type='return'
          AND r.source_id=o.source_id AND r.item_id=o.item_id),0);
```

**BB-9. `deleteInventoryTransaction` trên thực tế không xoá được gì.**
Căn cứ: chặn `source_type ≠ NULL và ≠ 'manual'` (`inventory-mutations.ts:619`); **không RPC nào ghi `'manual'`** (`…20260825200000…:768` = `'stock_in'`; `…20260507103000…:218` = `'contract_fulfillment'|'internal_use'`, `:360` = `'retail_sale'`; `…20260507123000…:290` = `'contract_addon_sale'`; `…20260808110000…` = 3 giá trị hợp đồng/bán lẻ); và migration `20260507103000…:48-55` đã backfill mọi `source_type IS NULL`.
```sql
SELECT COUNT(*) FROM inventory_transactions WHERE source_type IS NULL OR source_type='manual';
-- kỳ vọng 0 ⇒ nút "Xoá giao dịch" ở /inventory luôn báo lỗi
SELECT source_type, COUNT(*) FROM inventory_transactions GROUP BY 1 ORDER BY 2 DESC;
```

**BB-10. Không váy nào có 2 booking chồng ngày.**
Căn cứ: `is_dress_available` (`…20260429110000…:93-110`) gọi trong `create_standalone_dress_rental_atomic:388`, `create_dress_contract_reservation_atomic:669`, `update_dress_reservation_status_atomic:755`. **Rủi ro**: 2 nhánh fallback ghi tay bỏ qua khoá `FOR UPDATE` (`dress-mutations.ts:389-412`, `rental-mutations.ts:67-97`).
```sql
SELECT a.dress_id, a.id, b.id FROM dress_reservations a JOIN dress_reservations b
  ON a.dress_id=b.dress_id AND a.id<b.id
WHERE a.status IN ('reserved','in_use','rented') AND b.status IN ('reserved','in_use','rented')
  AND a.start_date <= b.end_date AND a.end_date >= b.start_date;
-- và giao chéo reservation ↔ rental
SELECT r.dress_id, r.id, t.id FROM dress_reservations r JOIN dress_rentals t
  ON t.item_id = r.dress_id
WHERE r.status IN ('reserved','in_use','rented') AND t.status IN ('reserved','renting','overdue')
  AND r.start_date <= t.return_date AND r.end_date >= t.pickup_date;
```

**BB-11. `dresses.status` luôn = kết quả `refresh_dress_status_atomic`, TRỪ 3 trạng thái khoá.**
Căn cứ: `…20260429110000…:288-315` + 2 trigger.
```sql
SELECT d.id, d.item_code, d.status,
  CASE
    WHEN EXISTS (SELECT 1 FROM dress_rentals WHERE item_id=d.id AND status='overdue') THEN 'overdue'
    WHEN EXISTS (SELECT 1 FROM dress_rentals WHERE item_id=d.id AND status='renting')
      OR EXISTS (SELECT 1 FROM dress_reservations WHERE dress_id=d.id AND status IN ('in_use','rented')) THEN 'rented'
    WHEN EXISTS (SELECT 1 FROM dress_rentals WHERE item_id=d.id AND status='reserved')
      OR EXISTS (SELECT 1 FROM dress_reservations WHERE dress_id=d.id AND status='reserved') THEN 'reserved'
    ELSE 'available' END AS expected
FROM dresses d
WHERE d.deleted_at IS NULL AND d.status NOT IN ('maintenance','retired','cleaning')
  AND d.status IS DISTINCT FROM (…biểu thức CASE ở trên…);
```

**BB-12. `retired` ≠ soft delete: váy `retired` vẫn có `deleted_at IS NULL`.**
Căn cứ: `delete_dress_atomic:609-616`; hệ quả UI ở `vault/40-module/vay-cuoi.md:27-34`.
```sql
SELECT COUNT(*) FILTER (WHERE status='retired' AND deleted_at IS NULL) AS retired_visible,
       COUNT(*) FILTER (WHERE status='retired' AND deleted_at IS NOT NULL) AS retired_deleted
FROM dresses;
```

**BB-13. Mọi `expense_allocations` trỏ tới target tồn tại.**
Căn cứ: `printing_integrity_report()` check `allocation_to_missing_target` (`…20260825200000…:733-737`); `target_id` **đa hình, không FK** (`vault/40-module/in-an-lab.md:33`).
```sql
SELECT * FROM printing_integrity_report();  -- kỳ vọng 4 dòng đều = 0
```

**BB-14. Bán thêm HĐ: `contracts.total_amount` tăng đúng bằng `Σ contract_items` phát sinh.**
Căn cứ: `…20260507123000…:305-317` cộng thẳng (không gọi `recalc_contract_totals`), trong khi đường váy (`create_dress_contract_reservation_atomic:714`) thì gọi `recalc_contract_totals` ⇒ **2 cách cập nhật tổng HĐ khác nhau**.
```sql
SELECT c.id, c.contract_code, c.total_amount,
       (SELECT COALESCE(SUM(ci.total_amount),0) FROM contract_items ci
        WHERE ci.contract_id=c.id AND ci.deleted_at IS NULL) AS items_sum
FROM contracts c WHERE c.deleted_at IS NULL AND c.status <> 'da_huy'
  AND ABS(c.total_amount - (SELECT COALESCE(SUM(ci.total_amount),0) FROM contract_items ci
        WHERE ci.contract_id=c.id AND ci.deleted_at IS NULL)) > 0.01;
```

**BB-15. Phiếu chi NCC phôi khớp đúng lô nhập.**
Căn cứ: `…20260825200000…:776-780` phân bổ đúng `qty × unit_cost` vào chính `txn_id`.
```sql
SELECT t.id, t.total_cost, COALESCE(SUM(a.amount),0) AS paid
FROM inventory_transactions t
LEFT JOIN expense_allocations a ON a.target_type='inventory_transaction' AND a.target_id=t.id
LEFT JOIN expenses e ON e.id=a.expense_id AND e.deleted_at IS NULL
WHERE t.transaction_type='stock_in' GROUP BY t.id
HAVING COALESCE(SUM(a.amount),0) > COALESCE(t.total_cost,0) + 0.01;
```

---

## 7. Mâu thuẫn tài liệu

> Luật: **CODE THẮNG**.

**MT-1 — `vault/40-module/in-an-lab.md:19` liệt kê trạng thái đơn in gồm `dat_coc` (2 đơn) và `da_nhan` (4 đơn).**
Code: `dat_coc` **không tồn tại** trong `PRINTING_ORDER_STATUSES` (`types/printing-constants.ts:6-15`), bị migration `20260824120000…:15-18` chuyển sang `hoan_thanh` và bị CHECK constraint chặn (`:22-25`). `da_nhan` là legacy read-only (`types/printing-constants.ts:13`), **terminal** (`:30`), không transition nào tới. → Vault đoạn này là **ảnh chụp trước ADR-014**, đã lỗi thời. Cùng vấn đề: `vault/40-module/in-an-lab.md:21` nói `printing_order_status_history` có 26 dòng, `vault/30-du-lieu/luoc-do-in-an-lab.md:87` nói 66 dòng.

**MT-2 — Đề bài (task) mô tả vòng đời `cho_xu_ly → dat_coc → dang_in → da_in → da_nhan → hoan_thanh`.**
Sai theo code hiện tại. Trục thật: `cho_xu_ly → dang_in → da_in → hoan_thanh` + nhánh `huy_don`/`gap_su_co` (§4a). ADR-014 (`agent/DECISIONS.md`) là căn cứ.

**MT-3 — `vault/40-module/in-an-lab.md:25` liệt kê `upsert_printing_expense` trong danh sách "ghi qua RPC atomic".**
Đã DROP ở `20260825200000_cashflow_m1_expense_allocations.sql:178`. Đoạn `:29` cùng file vault **đã nói đúng** là "đã bỏ" ⇒ mâu thuẫn **nội bộ trong chính file vault**.

**MT-4 — `vault/40-module/in-an-lab.md:33` nói view `lab_payments`/`lab_payment_allocations` + bảng `_legacy` "đã drop ở M2b (26/08/2026)".**
✅ **Xác minh ĐÚNG** — `20260826130000_cashflow_m2b_drop_legacy.sql:31-40`. Cùng migration cũng drop `vendor_payments`, `vendor_payment_allocations` + 2 bảng `_legacy` của chúng, `record_vendor_payment_atomic` (`:46`), `update_vendor_payments_updated_at` (`:42`). **`record_lab_payment_atomic` được giữ lại có chủ ý** (`:45`).

**MT-5 — `vault/40-module/vat-tu.md:27` liệt kê `check_inventory_conflict` là "hỏng sẵn, 0 caller — đã drop ADR-017".**
✅ Đúng — `20260826200000…:34`. Cùng migration drop `inventory_reservations` (`:36`), `order_payments` (`:37`), `inventory_available_stock` (`:32`), `order_payment_summary` (`:31`), `expire_old_reservations` (`:33`), cột `inventory_transactions.reservation_id` (`:35`).

**MT-6 — `vault/40-module/vat-tu.md:27` không liệt kê `add_fulfillment_transaction_atomic`, `update_fulfillment_transaction_atomic`, `delete_fulfillment_transaction_atomic`, `inventory_detail_v2`, `inventory_list`, `inventory_stats`, `inventory_item_transaction_totals`.**
Cả 7 hàm này **đang được code gọi** (`app/actions/inventory-mutations.ts:560,705,715,784,794`; `app/actions/inventory-queries.ts:90,130,158,242`). Vault thiếu.

**MT-7 — `vault/40-module/vay-cuoi.md:38` liệt kê `dress_list`, `dress_stats`, `dress_rental_list`, `is_dress_available` là "RPC atomic".**
Chúng là hàm **đọc** (`STABLE`, `…20260429110000…:112,129,206`), không phải RPC ghi. Phân loại sai (nhỏ).

**MT-8 — `vault/40-module/vay-cuoi.md:40` "Vòng đời váy: đặt giữ → bắt đầu thuê → trả → giặt xong → sẵn sàng. Mỗi bước một RPC riêng, đừng UPDATE `status` tay."**
Code **có** UPDATE tay: `return_dress_rental_atomic:499-504` ghi thẳng `dresses.status='cleaning'`; và 3 nhánh fallback trong app cũng ghi tay (`dress-mutations.ts:110-113`, `rental-mutations.ts:230-233,272-275`). Nguyên tắc đúng, mô tả "không có UPDATE tay" thì không.

**MT-9 — `vault/30-du-lieu/luoc-do-vat-tu.md:104` vẫn liệt kê `parent_transaction_id`, và **không** liệt kê `reservation_id`.**
✅ Nhất quán với `20260826200000…:35` (cột đã drop). Nhưng file vault ghi `cap-nhat: 2026-08-07` — **trước** cả M1/M2/M2b/ADR-017. Số dòng trong vault (`printing_orders` 35, `inventory_transactions` 9, `dresses` 2, `dress_rentals` 0) là ảnh chụp 07/08, **không tin được** cho hiện tại.

**MT-10 — MÂU THUẪN CODE↔CODE (không phải vault), nghiêm trọng nhất:**
`cancel_contract_cascade` (`…20260422160000…:348-354`, định nghĩa **mới nhất**, không migration nào sau đó thay) ghi:
```sql
UPDATE public.printing_orders SET status = 'da_huy' …
WHERE contract_id = p_contract_id AND deleted_at IS NULL
  AND COALESCE(status,'') NOT IN ('hoan_thanh','da_huy');
```
Trong khi CHECK constraint thêm sau đó (`20260824120000_printing_workflow_redesign.sql:22-25`) chỉ cho phép
`('cho_xu_ly','dang_in','da_in','hoan_thanh','huy_don','gap_su_co')` khi `deleted_at IS NULL`.
⇒ **Huỷ một hợp đồng còn đơn in đang hoạt động sẽ vi phạm CHECK và làm `cancel_contract_cascade` (và cả `cancelContract` ở `app/actions/contract-lifecycle.ts:113`) fail toàn bộ transaction.** Không tìm thấy migration nào sửa hàm này sau 24/08. Cần kiểm `pg_constraint.convalidated` trên prod để biết constraint có `VALIDATED` không.

---

## 8. Chưa xác minh

**CX-1. Trạng thái thật của DB.** Không chạm database (đúng luật §1). Mọi kết luận "còn sống / đã drop" suy ra từ **file migration trong repo**. Repo này đã có tiền lệ **file migration khác với DB thật** — ADR-016 phụ lục M4 điểm 3 và M5 điểm 4 ghi rõ *"tin DB, không tin file"* (`agent/DECISIONS.md`). Cần `pg_proc`/`pg_class`/`pg_trigger`/`pg_constraint` để chốt.

**CX-2. MT-10 (`cancel_contract_cascade` ghi `'da_huy'`).** Chưa biết constraint `printing_orders_status_check` trên prod là `VALIDATED` hay `NOT VALID`; chưa biết có đơn in nào đang mang `status='da_huy'` với `deleted_at IS NULL`. Chưa biết đã có ai huỷ hợp đồng có đơn in sau 24/08 chưa. **Đây là hạng mục cần xác minh đầu tiên.**

**CX-3. `dress_rentals.status = 'overdue'` không có người ghi.** Grep toàn `app/`, `lib/`, `components/`, `supabase/migrations/`: chỉ có **đọc** (`dress-mutations.ts:25,103`; `rental-queries.ts:131`; `standalone-rentals-views.tsx:59,121`) và **kiểm tra** (`…20260429110000…:294,470`). Không `UPDATE … SET status='overdue'` ở đâu, không cron/pg_cron. ⇒ nhánh `overdue` của `refresh_dress_status_atomic:292-296` **không bao giờ chạy**; bộ lọc "Quá hạn" (`standalone-rentals-client.tsx:54`) luôn rỗng. Chưa xác minh có job ngoài repo (Vercel cron / Supabase Edge Function) hay không.

**CX-4. `dresses.status = 'maintenance'` không có người ghi.** Cùng cách tìm như CX-3: chỉ xuất hiện trong **điều kiện chặn** (`…20260429110000…:89,288,384,485,665`) và nhãn UI (`types/dress-constants.ts:23`). Không tìm thấy đường ghi.

**CX-5. `dress_rental_accessories` (0 dòng).** Không tìm thấy server action / RPC nào INSERT. Có cột `dress_rentals.accessories` (text) được dùng thay (`create_standalone_dress_rental_atomic:399`). Chưa xác minh bảng này có phải di sản chưa dùng.

**CX-6. `equipment` (0 dòng).** Nằm trong lược đồ vật tư (`vault/30-du-lieu/luoc-do-vat-tu.md:137`) nhưng không tìm thấy action/route/component nào đọc hoặc ghi. Chưa rà hết `components/` cho chắc.

**CX-7. `inventory_transactions.total_cost`.** Vault ghi kiểu `numeric` không default (`luoc-do-vat-tu.md:85`); tên migration `20260502073000_fix_inventory_generated_total_cost_rpcs.sql` gợi ý đây là **GENERATED column**, và `payable_items` đọc `t.total_cost` (`…20260825200000…:210`). **Chưa mở file `20260502073000…` để xác minh** cột là generated hay do RPC ghi. Ảnh hưởng BB-15.

**CX-8. Trigger `emit_realtime_signal` trên `printing_orders`/`inventory_items`/`inventory_transactions`/`dresses`/`dress_rentals`/`dress_reservations`.** Vault liệt kê (`luoc-do-in-an-lab.md:62`, `luoc-do-vat-tu.md:51,112`, `luoc-do-vay-cuoi.md:53,105,163`) nhưng tôi **không đọc thân hàm** `emit_realtime_signal()`. Không biết nó ghi bảng nào.

**CX-9. Trigger `audit_inventory → log_audit_action()` trên `dresses`** (`vault/30-du-lieu/luoc-do-vay-cuoi.md:53`) — không đọc thân hàm; không rõ vì sao trigger audit chỉ có trên `dresses` mà không có trên `inventory_items`.

**CX-10. RLS policy.** Vault ghi số lượng policy mỗi bảng (`printing_orders` 4, `inventory_items` 1, `inventory_transactions` 1, `dresses` 4, `dress_reservations` 4…) nhưng **tôi không đọc nội dung policy nào**. Đặc biệt: `vault/40-module/vay-cuoi.md:48` nói `dresses` bị `REVOKE SELECT` khỏi `authenticated`, `vault/40-module/vat-tu.md:48` nói bảng kho cũng bị REVOKE — chưa xác minh trong migration.

**CX-11. Void phiếu bán thêm HĐ có đảo ngược `contracts.total_amount`/`paid_amount` và `contract_items` không.** Trigger `trg_restore_inventory_on_contract_payment_void` **chỉ** hoàn kho (`…20260507123000…:98-119`). Phần đảo ngược hợp đồng thuộc miền Hợp đồng (`map-hopdong`) — **không xác minh**.

**CX-12. `printing_integrity_report()` có caller trong app không.** Grep `app/`, `components/` không ra. Có thể chỉ chạy tay hoặc qua `scripts/`. Chưa rà `scripts/`.

**CX-13. `components/inventory/stock-out-modal.tsx` (4 chế độ) và `components/printing/printing-detail-drawer.tsx`, `printing-group-drawer.tsx`, `dress-drawer-content.tsx`.** Tôi đọc **hành vi server** đầy đủ nhưng chỉ đọc lướt tầng UI. Ràng buộc chỉ tồn tại ở client (ví dụ: mode nào gọi action nào) chưa được xác minh dòng-theo-dòng.

**CX-14. Số liệu trong vault (số dòng mỗi bảng).** `cap-nhat: 2026-08-07` cho cả 3 file lược đồ; đã qua M1/M2/M2b/M3/M3b/M4/M5 + ADR-014/015/016/017. Cần chạy lại `scripts/vault-gen-schema.mjs` (không chạy — chạm DB).

**CX-15. Fallback `isMissingRpc` có bao giờ chạy thật không.** `dress-mutations.ts:32-35` và `rental-mutations.ts` có nhánh dự phòng ghi tay đầy đủ cho **9 RPC váy**. Nếu RPC luôn tồn tại thì đây là dead code (~250 dòng); nếu không thì đây là lỗ hổng bỏ qua mọi kiểm tra atomic. Chỉ xác minh được bằng `pg_proc`.

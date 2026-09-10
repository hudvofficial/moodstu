---
title: "Hàm DB không được code gọi"
tags: [sinh-tu-dong, db, ham, no-ky-thuat]
cap-nhat: 2026-09-10
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Hàm DB không được code gọi

Tổng 149 hàm trên DB · **119** được nhắc tới trong code ứng dụng · **30** không.

Quét theo tên hàm xuất hiện dạng chuỗi trong `app/ components/ lib/ hooks/ scripts/ types/ tests/`. Trùng tên có thể gây dương tính giả — dùng file này để **khoanh vùng cần kiểm**, không dùng để xoá thẳng.

## Hàm trigger — 10

Không code nào gọi là **đúng** — chúng chạy bằng trigger. Đối chiếu với danh sách trigger trong `luoc-do-*.md`.

| Hàm | Trả về | Quyền |
|---|---|---|
| `handle_new_user` | `trigger` | **DEFINER** |
| `log_audit_action` | `trigger` | **DEFINER** |
| `restore_inventory_on_contract_payment_void` | `trigger` | invoker |
| `restore_inventory_on_receipt_void` | `trigger` | invoker |
| `sync_ai_conversation_message_count` | `trigger` | **DEFINER** |
| `trg_contract_payment_status_v2` | `trigger` | invoker |
| `trg_refresh_dress_status_from_rental` | `trigger` | **DEFINER** |
| `trg_refresh_dress_status_from_reservation` | `trigger` | **DEFINER** |
| `update_contract_checklists_updated_at` | `trigger` | invoker |
| `update_updated_at_column` | `trigger` | invoker |

## Được hàm SQL khác gọi — 15

Không lộ ra ứng dụng nhưng vẫn sống — là hàm phụ trợ bên trong DB.

| Hàm | Trả về | Quyền |
|---|---|---|
| `contract_payment_receipt_code` | `text` | invoker |
| `contract_payment_status_v2` | `text` | invoker |
| `create_default_payment_schedule_v2` | `uuid` | **DEFINER** |
| `get_current_employee_id` | `uuid` | **DEFINER** |
| `get_current_employee_role` | `employee_role_enum` | **DEFINER** |
| `moodie_jsonb_cosine_similarity` | `double precision` | invoker |
| `nextval_printing_order_code` | `text` | **DEFINER** |
| `payment_stage_display_label_v2` | `text` | invoker |
| `printing_items_total` | `numeric` | invoker |
| `resolve_printing_expense_category_id` | `uuid` | **DEFINER** |
| `resolve_vendor_expense_category_id` | `uuid` | **DEFINER** |
| `restore_inventory_from_transaction` | `void` | invoker |
| `rls_auto_enable` | `event_trigger` | **DEFINER** |
| `sync_payment_plan_statuses_v2` | `void` | **DEFINER** |
| `vn_date` | `date` | invoker |

## KHÔNG ai gọi — cần kiểm — 5

Không code gọi, không hàm SQL nào gọi, không phải trigger. Đây là danh sách **ứng viên chết** — mỗi cái cần xác nhận trước khi kết luận.

| Hàm | Trả về | Quyền |
|---|---|---|
| `backfill_payment_plan_ssot_v2` | `json` | **DEFINER** |
| `decrement_goal_amount` | `void` | invoker |
| `finance_receipt_stats` | `TABLE(total_receipts bigint, total_amount numeric, completed_count bigint, pending_count bigint)` | **DEFINER** |
| `get_contract_balance` | `json` | **DEFINER** |
| `get_customer_ltv` | `TABLE(customer_id uuid, ltv numeric)` | **DEFINER** |

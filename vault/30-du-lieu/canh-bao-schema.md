---
title: "Cảnh báo schema — chỗ code lệch DB"
tags: [du-lieu, bay]
cap-nhat: 2026-08-07
---

# Cảnh báo schema

Đo bằng cách diff `types/database.types.ts` với DB production ngày 2026-08-07.

## ⚠️ `types/database.types.ts` ĐANG LỆCH DB

**Đừng dùng file này làm nguồn chân lý về schema.** Dùng `30-du-lieu/luoc-do-*.md` (sinh từ DB thật) hoặc query trực tiếp:

```bash
node scripts/db-q.mjs "SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='<bang>' ORDER BY ordinal_position"
```

### 16 bảng có trong DB, thiếu trong types

`approval_requests` · `gallery_password_attempts` · `google_sync_queue` · `inventory_reservations` · `moodie_action_approvals` · `moodie_brave_audit_events` · `moodie_brave_usage_daily` · `moodie_memory_relations` · `moodie_observations` · `order_payments` · `printing_order_status_history` · `push_subscriptions` · `realtime_signals` · **`vendors`** · **`vendor_payments`** · **`vendor_payment_allocations`**

Đáng chú ý: cả cụm **nhà cung cấp** ([[nha-cung-cap]]) và bảng tín hiệu **`realtime_signals`** (lõi của cơ chế Signal≠Data) đều vắng mặt.

### 30 hàm có trong DB, thiếu trong types

Gồm nhiều hàm đang chạy thật:
`upsert_vendor_expense` · `record_vendor_payment_atomic` · `finance_vendor_debt_summary` · `resolve_vendor_expense_category_id` · `get_gallery_data_v2` / `v3` · `get_gallery_summaries_by_contract` · `get_contract_detail_v3` · `contract_stats_simple` · `add_/update_/delete_fulfillment_transaction_atomic` · `emit_realtime_signal` · `is_active_employee` · `log_audit_action` · `expire_old_reservations` · `get_customer_ltv` · `restore_inventory_on_contract_payment_void` · `restore_inventory_on_receipt_void` · `reserve_moodie_brave_call` · `rls_auto_enable` · `sync_ai_conversation_message_count` · các trigger function (`trg_*`, `handle_new_user`, `update_updated_at_column`…)

Không có bảng nào **thừa** trong types. Hai hàm `show_limit`/`show_trgm` là của extension `pg_trgm`, bỏ qua.

**Kết luận:** file types được sinh ra ở một thời điểm rồi ngừng cập nhật; DB đã đi tiếp. Chạm bảng/hàm trong danh sách trên thì phải tự khai kiểu, TypeScript sẽ không giúp.

## Cột dễ đoán nhầm

Những chỗ **đã đoán sai trong thực tế**:

| Đoán | Thật |
|---|---|
| `galleries.share_links` | không tồn tại — dùng `custom_slug`, và bảng riêng `gallery_share_links` |
| `gallery_images.deleted_at` | **không có soft delete** ở bảng này |
| `employees.user_id` | không tồn tại (tên khác) |
| `employee_salaries.deleted_at` | **cố ý không có** — hard delete, dữ liệu dẫn xuất |

## RLS: 9 bảng bật RLS nhưng 0 policy

`gallery_albums` · `gallery_comments` · `gallery_password_attempts` · `gallery_reactions` · `lab_payment_allocations` · `lab_payments` · `salary_adjustments` · `service_bundles` · `system_settings`

= deny-all cho mọi vai trừ service role. **Đúng chủ đích** — chỉ chạm qua server action. Đừng "sửa" bằng cách thêm policy. → [[bao-mat-du-lieu-rls]]

## `service_type` = 4 nguồn chân lý

Thêm một giá trị phải sửa: `types/contract.ts` + `types/service-constants.ts` + `contract.schema.ts` + `types/database.types.ts` (2 vị trí).
`SERVICE_TYPE_GROUPS` (mảng) và `database.types.ts` **compiler không bắt** → dễ sót. → [[dich-vu]]

## Cách kiểm lại

```bash
node scripts/vault-gen-schema.mjs   # sinh lại toàn bộ 30-du-lieu/ từ DB thật
```

## Liên quan

[[bay-du-lieu]] · [[bay-trien-khai]] · [[rpc-va-enum]]

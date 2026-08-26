---
title: "Lược đồ DB — Nhà cung cấp"
tags: [du-lieu, schema, nha-cung-cap]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Nhà cung cấp

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[nha-cung-cap]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `vendors` | 10 | ✅ | 3 |

## `vendors`

10 dòng · RLS bật · 3 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `full_name` | text | NOT NULL |  |
| `phone` | text |  |  |
| `service_type` | text |  |  |
| `status` | text |  | `'active'` |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `deleted_at` | timestamptz |  |  |
| `vendor_type` | text | NOT NULL | `'tho_ngoai'` |

**Bị trỏ tới bởi:** `inventory_items.supplier_id` · `work_tasks.vendor_id`

**CHECK:** `CHECK ((vendor_type = ANY (ARRAY['tho_ngoai', 'nha_cung_cap'])))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (regexp_replace(phone, '[^0-9]'::text, ''::text, 'g'::text)) WHERE ((deleted_at IS NULL) AND (status = 'active'::text) AND (phone IS NOT NULL) AND (regexp_replace(phone, '[^0-9]'::text, ''::text, 'g'::text) <> ''::text))`
- `btree (lower(TRIM(BOTH FROM full_name))) WHERE ((deleted_at IS NULL) AND (status = 'active'::text))`

</details>

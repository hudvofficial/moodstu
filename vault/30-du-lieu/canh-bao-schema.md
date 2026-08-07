---
title: "Cảnh báo schema — chỗ code lệch DB"
tags: [du-lieu, bay]
cap-nhat: 2026-08-07
---

# Cảnh báo schema

Đo bằng cách diff `types/database.types.ts` với DB production ngày 2026-08-07.

## `types/database.types.ts` — đã đồng bộ 2026-08-07

Trước đó file này lệch DB rất xa (82 bảng / 1 view / 115 RPC). Đã sinh lại, hiện khớp DB:
**98 bảng · 4 view · 130 RPC · 16 enum.**

### Giữ đồng bộ như thế nào

```bash
npm run db:types                    # sinh lại từ DB production (Management API)
node scripts/vault-gen-schema.mjs   # sinh lại note lược đồ trong vault
```

**Chạy CẢ HAI sau mỗi migration.** Hai lệnh đọc cùng một DB nhưng phục vụ hai chỗ khác nhau: một cho TypeScript, một cho người/agent đọc.

⚠️ **Đừng dùng `supabase gen types --db-url`** — biến thể đó cần Docker (máy này không chạy Docker Desktop). Bản `--project-id` đi qua Management API với token `supabase login`, không cần Docker.

⚠️ Script `db:types` sinh ra file `.tmp` rồi mới đổi tên. Đừng rút gọn thành `> types/database.types.ts` — shell cắt rỗng file **trước khi** lệnh chạy, nên lệnh lỗi là mất luôn file. Đã dẫm.

### Hai chỗ types vẫn KHÔNG phủ được

**1. `get_gallery_data_v2` — hàm overload nên bị bỏ qua.**
DB có 2 bản: `get_gallery_data_v2(p_gallery_id uuid)` và `get_gallery_data_v2(p_gallery_id uuid, p_limit int, p_offset int)`. Supabase CLI bỏ qua hàm overload → types có `v3` nhưng không có `v2`.
`app/actions/gallery-composite-actions.ts:42` dùng `v2` làm fallback khi tắt `NEXT_PUBLIC_RPC_V3` — vẫn chạy được vì file đó dùng client không gắn generic. Muốn phủ thì phải drop overload 1 tham số.

**2. Trigger function không bao giờ có trong types.**
14 hàm trả `trigger`/`event_trigger` (`emit_realtime_signal`, `handle_new_user`, `log_audit_action`, `trg_*`, `update_updated_at_column`…) — PostgREST không phơi ra, nên **vắng mặt là đúng**, không phải lệch. Tra chúng ở [[rpc-va-enum]].

### Type chỉ bảo vệ được một phần app

Phần lớn server action dùng `createAdminClient()` trả `SupabaseClient` **trần, không generic** → `Database` không áp vào. Chỉ nhánh [[moodie-ai]] và vài file `lib/` (`studio-info`, `system-settings`, `settings-studio-admin`, `productivity-transforms`) dùng `SupabaseClient<Database>`.

Nghĩa là: sinh lại types **không** tự động bắt lỗi ở contracts/finance/gallery. Muốn thế phải gắn generic cho client — dự án riêng, cần ADR (sẽ đẻ ra hàng trăm lỗi type cần sửa từng module).

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

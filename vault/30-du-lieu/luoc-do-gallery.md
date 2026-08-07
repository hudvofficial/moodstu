---
title: "Lược đồ DB — Gallery ảnh"
tags: [du-lieu, schema, gallery]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Gallery ảnh

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[gallery]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `galleries` | 76 | ✅ | 1 |
| `gallery_images` | 17704 | ✅ | 1 |
| `gallery_reactions` | 1229 | ✅ | 0 |
| `gallery_comments` | 169 | ✅ | 0 |
| `gallery_share_links` | 219 | ✅ | 1 |
| `gallery_albums` | 0 | ✅ | 0 |
| `gallery_selection_batches` | 0 | ✅ | 1 |
| `gallery_selection_batch_items` | 0 | ✅ | 1 |
| `gallery_filter_jobs` | 0 | ✅ | 2 |
| `gallery_password_attempts` | 0 | ✅ | 0 |

## `galleries`

76 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `contract_id` | uuid | NOT NULL |  |
| `title` | text |  |  |
| `access_url` | text |  |  |
| `password` | text |  |  |
| `status` | text |  | `'draft'` |
| `selection_deadline` | date |  |  |
| `shared_at` | timestamptz |  |  |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz |  | `now()` |
| `drive_folder_id` | text |  |  |
| `drive_folder_url` | text |  |  |
| `folder_type` | text |  | `NULL` |
| `password_hash` | text |  |  |
| `password_updated_at` | timestamptz |  |  |
| `access_version` | int | NOT NULL | `1` |
| `cover_image_id` | uuid |  |  |
| `og_title` | text |  |  |
| `og_description` | text |  |  |
| `og_image_url` | text |  |  |
| `share_version` | int | NOT NULL | `1` |
| `selection_limit` | int |  |  |
| `allow_comments` | bool | NOT NULL | `true` |
| `allow_download` | bool | NOT NULL | `false` |
| `download_unlocked_at` | timestamptz |  |  |
| `download_unlocked_by` | uuid |  |  |
| `custom_slug` | text |  |  |
| `client_name` | text |  |  |
| `tags` | text[] |  |  |
| `enable_watermark` | bool |  | `false` |
| `show_namecard` | bool |  | `true` |

**Trỏ ra:** `contract_id` → `contracts.id` · `cover_image_id` → `gallery_images.id` (ON DELETE SET NULL)

**Bị trỏ tới bởi:** `gallery_password_attempts.gallery_id` · `gallery_albums.gallery_id` · `gallery_comments.gallery_id` · `gallery_reactions.gallery_id` · `gallery_filter_jobs.gallery_id` · `gallery_images.gallery_id` · `gallery_selection_batches.gallery_id` · `gallery_share_links.gallery_id`

**Trigger:** `update_galleries_updated_at` → `update_updated_at_column()`

**CHECK:** `CHECK (((selection_limit IS NULL) OR (selection_limit > 0)))` · `CHECK (((status)= ANY ((ARRAY['draft', 'shared', 'completed']))))`

<details><summary>7 index</summary>

- `UNIQUE btree (id)`
- `btree (contract_id)`
- `btree (contract_id)`
- `UNIQUE btree (access_url) WHERE (access_url IS NOT NULL)`
- `btree (folder_type)`
- `btree (access_url) WHERE ((status)::text = 'shared'::text)`
- `UNIQUE btree (custom_slug)`

</details>

## `gallery_images`

17704 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `gallery_id` | uuid | NOT NULL |  |
| `image_url` | text | NOT NULL |  |
| `thumbnail_url` | text |  |  |
| `sort_order` | int |  | `0` |
| `is_selected` | bool |  | `false` |
| `client_note` | text |  |  |
| `created_at` | timestamptz |  | `now()` |
| `drive_file_id` | text |  |  |
| `file_name` | text |  |  |
| `selected_at` | timestamptz |  |  |
| `file_group` | text |  | `NULL` |
| `album_id` | uuid |  |  |
| `is_starred` | bool |  | `false` |
| `starred_at` | timestamptz |  |  |
| `width` | int |  |  |
| `height` | int |  |  |
| `blur_hash` | text |  |  |
| `blur_data_url` | text |  |  |

**Trỏ ra:** `album_id` → `gallery_albums.id` (ON DELETE SET NULL) · `gallery_id` → `galleries.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `gallery_albums.cover_image_id` · `gallery_comments.image_id` · `gallery_reactions.image_id` · `gallery_selection_batch_items.image_id` · `galleries.cover_image_id`

<details><summary>10 index</summary>

- `UNIQUE btree (id)`
- `btree (gallery_id)`
- `btree (drive_file_id)`
- `btree (file_group)`
- `btree (album_id)`
- `btree (width, height) WHERE ((width IS NOT NULL) AND (height IS NOT NULL))`
- `btree (id) WHERE (blur_hash IS NOT NULL)`
- `btree (gallery_id, sort_order)`
- `btree (gallery_id, is_selected, sort_order)`
- `btree (gallery_id, is_starred, sort_order)`

</details>

## `gallery_reactions`

1229 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `image_id` | uuid | NOT NULL |  |
| `gallery_id` | uuid | NOT NULL |  |
| `reaction_type` | text | NOT NULL |  |
| `client_identifier` | text | NOT NULL |  |
| `created_at` | timestamptz |  | `now()` |

**Trỏ ra:** `gallery_id` → `galleries.id` (ON DELETE CASCADE) · `image_id` → `gallery_images.id` (ON DELETE CASCADE)

**CHECK:** `CHECK (((reaction_type)= ANY ((ARRAY['heart', 'star']))))`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (image_id, client_identifier, reaction_type)`
- `btree (image_id)`
- `btree (gallery_id)`

</details>

## `gallery_comments`

169 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `image_id` | uuid | NOT NULL |  |
| `gallery_id` | uuid | NOT NULL |  |
| `content` | text | NOT NULL |  |
| `author_name` | text |  |  |
| `client_identifier` | text | NOT NULL |  |
| `created_at` | timestamptz |  | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `gallery_id` → `galleries.id` (ON DELETE CASCADE) · `image_id` → `gallery_images.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((length(content) <= 500))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (image_id)`
- `UNIQUE btree (image_id, client_identifier)`

</details>

## `gallery_share_links`

219 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `gallery_id` | uuid | NOT NULL |  |
| `slug` | text | NOT NULL |  |
| `capability` | text | NOT NULL |  |
| `status` | text | NOT NULL | `'active'` |
| `expires_at` | timestamptz |  |  |
| `access_version` | int | NOT NULL | `1` |
| `created_by` | uuid |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `gallery_id` → `galleries.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((access_version > 0))` · `CHECK ((capability = ANY (ARRAY['select', 'view', 'download'])))` · `CHECK ((status = ANY (ARRAY['active', 'disabled'])))`

<details><summary>5 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (slug)`
- `UNIQUE btree (gallery_id, capability)`
- `btree (gallery_id, capability)`
- `btree (slug) WHERE (status = 'active'::text)`

</details>

## `gallery_albums`

0 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` |
| `gallery_id` | uuid | NOT NULL |  |
| `title` | text | NOT NULL |  |
| `description` | text |  |  |
| `cover_image_id` | uuid |  |  |
| `sort_order` | int |  | `0` |
| `created_at` | timestamptz |  | `now()` |

**Trỏ ra:** `cover_image_id` → `gallery_images.id` (ON DELETE SET NULL) · `gallery_id` → `galleries.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `gallery_images.album_id`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (gallery_id)`

</details>

## `gallery_selection_batches`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `gallery_id` | uuid | NOT NULL |  |
| `contract_id` | uuid | NOT NULL |  |
| `status` | text | NOT NULL | `'draft'` |
| `selected_count` | int | NOT NULL | `0` |
| `created_by_client` | text |  |  |
| `locked_by` | uuid |  |  |
| `locked_at` | timestamptz |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `contract_id` → `contracts.id` (ON DELETE CASCADE) · `gallery_id` → `galleries.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `gallery_selection_batch_items.batch_id`

**CHECK:** `CHECK ((selected_count >= 0))` · `CHECK ((status = ANY (ARRAY['draft', 'client_submitted', 'studio_locked', 'drive_copied', 'local_exported', 'retouching', 'delivered'])))`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (gallery_id, status, created_at DESC)`

</details>

## `gallery_selection_batch_items`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `batch_id` | uuid | NOT NULL |  |
| `image_id` | uuid | NOT NULL |  |
| `file_name` | text |  |  |
| `drive_file_id` | text |  |  |
| `sort_order` | int |  |  |
| `client_note` | text |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `image_id` → `gallery_images.id` (ON DELETE CASCADE) · `batch_id` → `gallery_selection_batches.id` (ON DELETE CASCADE)

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (batch_id, image_id)`
- `btree (batch_id, sort_order)`

</details>

## `gallery_filter_jobs`

0 dòng · RLS bật · 2 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `gallery_id` | uuid | NOT NULL |  |
| `folder_id` | text | NOT NULL |  |
| `folder_name` | text |  |  |
| `status` | text | NOT NULL | `'pending'` |
| `total_files` | int | NOT NULL | `0` |
| `copied_files` | int | NOT NULL | `0` |
| `current_file_name` | text |  |  |
| `error_log` | jsonb |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `gallery_id` → `galleries.id` (ON DELETE CASCADE)

**Trigger:** `update_gallery_filter_jobs_updated_at` → `update_updated_at_column()`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (folder_id)`
- `btree (gallery_id)`

</details>

## `gallery_password_attempts`

0 dòng · RLS bật · 0 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `gallery_id` | uuid | NOT NULL |  |
| `window_start` | timestamptz | NOT NULL | `now()` |
| `fail_count` | int | NOT NULL | `0` |

**Trỏ ra:** `gallery_id` → `galleries.id` (ON DELETE CASCADE)

<details><summary>1 index</summary>

- `UNIQUE btree (gallery_id)`

</details>

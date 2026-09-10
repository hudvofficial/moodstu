---
title: "Kiểm kê — Gallery"
lat-cat: 10-gallery
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Gallery

10 bảng · 6 hàm DB

## Bảng dữ liệu

### `galleries`

**Số dòng (ước):** 90 · **RLS:** bật · **Policy:** 1

**Policy:** galleries_service_role_all:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `contract_id` | uuid | không | — |
| `title` | character varying | có | — |
| `access_url` | text | có | — |
| `password` | character varying | có | — |
| `status` | character varying | có | `'draft'::character varying` |
| `selection_deadline` | date | có | — |
| `shared_at` | timestamp with time zone | có | — |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | có | `now()` |
| `drive_folder_id` | character varying | có | — |
| `drive_folder_url` | text | có | — |
| `folder_type` | character varying | có | `NULL::character varying` |
| `password_hash` | text | có | — |
| `password_updated_at` | timestamp with time zone | có | — |
| `access_version` | integer | không | `1` |
| `cover_image_id` | uuid | có | — |
| `og_title` | text | có | — |
| `og_description` | text | có | — |
| `og_image_url` | text | có | — |
| `share_version` | integer | không | `1` |
| `selection_limit` | integer | có | — |
| `allow_comments` | boolean | không | `true` |
| `allow_download` | boolean | không | `false` |
| `download_unlocked_at` | timestamp with time zone | có | — |
| `download_unlocked_by` | uuid | có | — |
| `custom_slug` | text | có | — |
| `client_name` | text | có | — |
| `tags` | ARRAY | có | — |
| `enable_watermark` | boolean | có | `false` |
| `show_namecard` | boolean | có | `true` |

**Trỏ ra:** `cover_image_id`→`gallery_images` (SET NULL) · `contract_id`→`contracts` · `created_by`→`auth.users`

**Bị trỏ tới bởi (8):** `gallery_share_links` · `gallery_selection_batches` · `gallery_images` · `gallery_filter_jobs` · `gallery_reactions` · `gallery_comments` · `gallery_albums` · `gallery_password_attempts`

**Trigger:** `update_galleries_updated_at`→update_updated_at_column()

**CHECK:** `CHECK (((selection_limit IS NULL) OR (selection_limit > 0)))` · `CHECK (((status)= ANY ((ARRAY['draft', 'shared', 'completed'))))`

**GHI qua RPC (2):** `prepare_gallery_share` · `set_gallery_password`

**ĐỌC qua RPC (2):** `get_gallery_summaries_by_contract` · `verify_gallery_password`

**Chạm từ mã nguồn (14):** `app/actions/gallery-admin-actions.ts` · `app/actions/gallery-core.ts` · `app/actions/gallery-dimensions-actions.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/gallery-public-actions.ts` · `app/actions/gallery-selection-actions.ts` · `app/actions/moodie-action-actions.ts` · `lib/gallery/blurhash.ts` · `lib/gallery/image-dimensions.ts` · `lib/moodie/domain/gallery-context.ts` … +4


### `gallery_albums`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 0 ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `gallery_id` | uuid | không | — |
| `title` | character varying | không | — |
| `description` | text | có | — |
| `cover_image_id` | uuid | có | — |
| `sort_order` | integer | có | `0` |
| `created_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `gallery_id`→`galleries` (CASCADE) · `cover_image_id`→`gallery_images` (SET NULL)

**Bị trỏ tới bởi (1):** `gallery_images`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (2):** `get_gallery_data_v2` · `get_gallery_data_v3`

**Chạm từ mã nguồn (2):** `app/actions/gallery-album-actions.ts` · `app/actions/gallery-composite-actions.ts`


### `gallery_comments`

**Số dòng (ước):** 240 · **RLS:** bật · **Policy:** 0 ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `image_id` | uuid | không | — |
| `gallery_id` | uuid | không | — |
| `content` | text | không | — |
| `author_name` | character varying | có | — |
| `client_identifier` | character varying | không | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `image_id`→`gallery_images` (CASCADE) · `gallery_id`→`galleries` (CASCADE)

**CHECK:** `CHECK ((length(content) <= 500))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (2):** `get_gallery_data_v2` · `get_gallery_data_v3`

**Chạm từ mã nguồn (2):** `app/actions/gallery-composite-actions.ts` · `app/actions/gallery-reaction-actions.ts`


### `gallery_filter_jobs`

**Số dòng (ước):** 9 · **RLS:** bật · **Policy:** 2

**Policy:** Service role full access:ALL, Studio can view filter jobs of their galleries:SELECT

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `gallery_id` | uuid | không | — |
| `folder_id` | character varying | không | — |
| `folder_name` | character varying | có | — |
| `status` | character varying | không | `'pending'::character varying` |
| `total_files` | integer | không | `0` |
| `copied_files` | integer | không | `0` |
| `current_file_name` | character varying | có | — |
| `error_log` | jsonb | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `gallery_id`→`galleries` (CASCADE)

**Trigger:** `update_gallery_filter_jobs_updated_at`→update_updated_at_column()

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/gallery-drive-actions.ts`


### `gallery_images`

**Số dòng (ước):** 20701 · **RLS:** bật · **Policy:** 1

**Policy:** gallery_images_service_role_all:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `gallery_id` | uuid | không | — |
| `image_url` | text | không | — |
| `thumbnail_url` | text | có | — |
| `sort_order` | integer | có | `0` |
| `is_selected` | boolean | có | `false` |
| `client_note` | text | có | — |
| `created_at` | timestamp with time zone | có | `now()` |
| `drive_file_id` | character varying | có | — |
| `file_name` | character varying | có | — |
| `selected_at` | timestamp with time zone | có | — |
| `file_group` | character varying | có | `NULL::character varying` |
| `album_id` | uuid | có | — |
| `is_starred` | boolean | có | `false` |
| `starred_at` | timestamp with time zone | có | — |
| `width` | integer | có | — |
| `height` | integer | có | — |
| `blur_hash` | text | có | — |
| `blur_data_url` | text | có | — |

**Trỏ ra:** `gallery_id`→`galleries` (CASCADE) · `album_id`→`gallery_albums` (SET NULL)

**Bị trỏ tới bởi (5):** `galleries` · `gallery_selection_batch_items` · `gallery_reactions` · `gallery_comments` · `gallery_albums`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (3):** `get_gallery_data_v2` · `get_gallery_data_v3` · `get_gallery_summaries_by_contract`

**Chạm từ mã nguồn (25):** `app/actions/blurhash-actions.ts` · `app/actions/gallery-admin-actions.ts` · `app/actions/gallery-album-actions.ts` · `app/actions/gallery-composite-actions.ts` · `app/actions/gallery-core.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/gallery-image-helpers.ts` · `app/actions/gallery-reaction-actions.ts` · `app/actions/gallery-selection-actions.ts` · `app/api/gallery-download/[token]/[imageId]/route.ts` … +15


### `gallery_password_attempts`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 0 ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `gallery_id` | uuid | không | — |
| `window_start` | timestamp with time zone | không | `now()` |
| `fail_count` | integer | không | `0` |

**Trỏ ra:** `gallery_id`→`galleries` (CASCADE)

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/gallery-public-actions.ts`


### `gallery_reactions`

**Số dòng (ước):** 1672 · **RLS:** bật · **Policy:** 0 ⚠️ bật RLS nhưng 0 policy ⇒ anon key bị chặn hoàn toàn

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `uuid_generate_v4()` |
| `image_id` | uuid | không | — |
| `gallery_id` | uuid | không | — |
| `reaction_type` | character varying | không | — |
| `client_identifier` | character varying | không | — |
| `created_at` | timestamp with time zone | có | `now()` |

**Trỏ ra:** `image_id`→`gallery_images` (CASCADE) · `gallery_id`→`galleries` (CASCADE)

**CHECK:** `CHECK (((reaction_type)= ANY ((ARRAY['heart', 'star'))))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (2):** `get_gallery_data_v2` · `get_gallery_data_v3`

**Chạm từ mã nguồn (5):** `app/actions/gallery-admin-actions.ts` · `app/actions/gallery-composite-actions.ts` · `app/actions/gallery-drive-actions.ts` · `app/actions/gallery-image-helpers.ts` · `app/actions/gallery-reaction-actions.ts`


### `gallery_selection_batch_items`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** gallery_selection_batch_items_service_role_all:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `batch_id` | uuid | không | — |
| `image_id` | uuid | không | — |
| `file_name` | text | có | — |
| `drive_file_id` | text | có | — |
| `sort_order` | integer | có | — |
| `client_note` | text | có | — |
| `created_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `batch_id`→`gallery_selection_batches` (CASCADE) · `image_id`→`gallery_images` (CASCADE)

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/gallery-selection-actions.ts`


### `gallery_selection_batches`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** gallery_selection_batches_service_role_all:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `gallery_id` | uuid | không | — |
| `contract_id` | uuid | không | — |
| `status` | text | không | `'draft'::text` |
| `selected_count` | integer | không | `0` |
| `created_by_client` | text | có | — |
| `locked_by` | uuid | có | — |
| `locked_at` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `gallery_id`→`galleries` (CASCADE) · `contract_id`→`contracts` (CASCADE)

**Bị trỏ tới bởi (1):** `gallery_selection_batch_items`

**CHECK:** `CHECK ((selected_count >= 0))` · `CHECK ((status = ANY (ARRAY['draft', 'client_submitted', 'studio_locked', 'drive_copied', 'local_exported', 'retouching', 'delivered')))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/gallery-selection-actions.ts`


### `gallery_share_links`

**Số dòng (ước):** 261 · **RLS:** bật · **Policy:** 1

**Policy:** gallery_share_links_service_role_all:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `gallery_id` | uuid | không | — |
| `slug` | text | không | — |
| `capability` | text | không | — |
| `status` | text | không | `'active'::text` |
| `expires_at` | timestamp with time zone | có | — |
| `access_version` | integer | không | `1` |
| `created_by` | uuid | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `gallery_id`→`galleries` (CASCADE)

**CHECK:** `CHECK ((access_version > 0))` · `CHECK ((capability = ANY (ARRAY['select', 'view', 'download')))` · `CHECK ((status = ANY (ARRAY['active', 'disabled')))`

**GHI qua RPC (1):** `prepare_gallery_share`

**ĐỌC qua RPC (1):** `get_gallery_summaries_by_contract`

**Chạm từ mã nguồn (3):** `.openclaw/tmp/check-rpc.js` · `app/actions/gallery-admin-actions.ts` · `app/actions/gallery-core.ts`


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `get_gallery_data_v2(p_gallery_id uuid, p_limit integer, p_offset integer)` | `jsonb` | invoker | STABLE | gallery_albums, gallery_comments, gallery_images, gallery_reactions | 6 file |
| `get_gallery_data_v3(p_gallery_id uuid, p_limit integer, p_offset integer)` | `jsonb` | invoker | STABLE | gallery_albums, gallery_comments, gallery_images, gallery_reactions | 2 file |
| `get_gallery_summaries_by_contract(p_contract_id uuid)` | `jsonb` | invoker | STABLE | galleries, gallery_images, gallery_share_links | 1 file |
| `prepare_gallery_share(p_gallery_id uuid, p_user_id uuid)` | `jsonb` | **DEFINER** | VOLATILE | galleries, gallery_share_links | 3 file |
| `set_gallery_password(p_gallery_id uuid, p_password text)` | `jsonb` | **DEFINER** | VOLATILE | galleries | 3 file |
| `verify_gallery_password(p_gallery_id uuid, p_password text)` | `boolean` | **DEFINER** | VOLATILE | galleries | 3 file |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.

# Bản đồ kiến trúc — GALLERY + MOODIE AI

> Gốc repo: `C:\Users\Admin\Desktop\Ai\mood saas\mood-studio`. Mọi đường dẫn dưới đây là tương đối so với gốc đó.
> Phương pháp: đọc code thật + migration. KHÔNG chạy lệnh nào chạm DB, không gọi API AI, không sửa file.

---

## 1. Bảng dữ liệu

### 1.1 Miền GALLERY

| Bảng | Vai trò | Cột thật (đã đối chiếu code) | Ai ghi | file:dòng |
|---|---|---|---|---|
| `galleries` | Album gắn với 1 hợp đồng | `id`, `contract_id`, `title`, `access_url`, `custom_slug`, `password`, `password_hash`, `password_updated_at`, `status` (`draft`/`shared`/`completed`), `selection_deadline`, `shared_at`, `created_by`, `drive_folder_id`, `drive_folder_url`, `folder_type` (`goc`/`da_sua`/…), `access_version`, `share_version`, `cover_image_id`, `og_title`, `og_description`, `og_image_url`, `selection_limit`, `allow_comments`, `allow_download`, `download_unlocked_at`, `download_unlocked_by`, `client_name`, `tags` (text[]), `enable_watermark`, `show_namecard`, `created_at`, `updated_at`. **KHÔNG có cột `share_links`** — link chia sẻ nằm ở bảng riêng `gallery_share_links`; slug tuỳ chỉnh là `custom_slug`. | admin (`createGallery`, `updateGallerySettings`, `shareGallery`), RPC `prepare_gallery_share`/`set_gallery_password`, **và KHÁCH có select-token qua `setGalleryCoverImage`** | `app/actions/gallery-admin-actions.ts:65`, `:160`, `:196`, `:252-282`; `vault/30-du-lieu/luoc-do-gallery.md:31-64` |
| `gallery_images` | Metadata ảnh (ảnh gốc nằm trên Google Drive) | `id`, `gallery_id`, `image_url`, `thumbnail_url`, `sort_order`, `is_selected`, `selected_at`, `is_starred`, `starred_at`, `client_note`, `drive_file_id`, `file_name`, `file_group`, `album_id`, `width`, `height`, `blur_hash`, `blur_data_url`, `created_at`. **KHÔNG có `deleted_at`** → xoá là hard-delete. | admin: `createGallery`, `syncDriveFolder`, `createMultiFolderGalleries`, `reorderImages`, backfill dimensions/blurhash. khách: `is_selected`/`selected_at` (`toggleImageSelection`), `is_starred`/`starred_at` (`toggleImageStar`) | `app/actions/gallery-core.ts:18-19` (IMAGE_COLS); `gallery-admin-actions.ts:101`, `:362`, `:137-144` (hard delete); `gallery-selection-actions.ts:39`, `:99-105`, `:366`; `gallery-drive-actions.ts:73` |
| `gallery_reactions` | Tim/sao của khách (xã giao) | `id`, `image_id`, `gallery_id`, `reaction_type` (`heart`\|`star`), `client_identifier`, `created_at`. UNIQUE `(image_id, client_identifier, reaction_type)` | khách qua `toggleReaction` (view-token đủ) | `app/actions/gallery-reaction-actions.ts:72-97` |
| `gallery_comments` | Ghi chú khách theo ảnh (chỉ dẫn hậu kỳ) | `id`, `image_id`, `gallery_id`, `content` (CHECK ≤500), `author_name`, `client_identifier`, `created_at`, `updated_at`. UNIQUE `(image_id, client_identifier)` | khách qua `upsertComment` / `deleteComment` (**cần select-token**) | `app/actions/gallery-reaction-actions.ts:282-323`; `supabase/migrations/20260716000000_gallery_comments_upsert.sql:1-20` |
| `gallery_share_links` | 3 link chia sẻ / gallery | `id`, `gallery_id`, `slug`, `capability` (`select`\|`view`\|`download`), `status` (`active`\|`disabled`), `expires_at`, `access_version`, `created_by`, `created_at`, `updated_at`. UNIQUE `(gallery_id, capability)`, UNIQUE `slug` | admin qua `prepare_gallery_share` RPC hoặc fallback TS `ensureAllGalleryShareLinks` | `app/actions/gallery-core.ts:590-712`; `supabase/migrations/20260519090000_gallery_v2_data_contract_permissions.sql:47-66` |
| `gallery_albums` | Nhóm ảnh trong gallery (0 dòng prod) | `id`, `gallery_id`, `title`, `description`, `cover_image_id`, `sort_order`, `created_at` | `app/actions/gallery-album-actions.ts` | `app/actions/gallery-album-actions.ts` (161 dòng, chưa đọc chi tiết) |
| `gallery_selection_batches` | Chốt "lô ảnh khách chọn" (0 dòng prod) | `id`, `gallery_id`, `contract_id`, `status`, `selected_count`, `created_by_client`, `locked_by`, `locked_at`, `created_at`, `updated_at` | chỉ `createSelectionBatchFromCurrentSelection` (admin) | `app/actions/gallery-selection-actions.ts:269-282` |
| `gallery_selection_batch_items` | Ảnh trong lô (0 dòng prod) | `id`, `batch_id`, `image_id`, `file_name`, `drive_file_id`, `sort_order`, `client_note`, `created_at` | cùng action trên | `app/actions/gallery-selection-actions.ts:287-303` |
| `gallery_filter_jobs` | Theo dõi job chép ảnh sang thư mục Drive mới | `id`, `gallery_id`, `folder_id` (NOT NULL, Drive folder), `folder_name`, `status`, `total_files`, `copied_files`, `current_file_name`, `error_log` (jsonb), `created_at`, `updated_at`. **KHÔNG có `batch_id`/`job_type`/`total_count`/`processed_count`** | `initDriveCopyJob` (insert), `finalizeDriveCopyJob` (update) — đều admin | `app/actions/gallery-drive-actions.ts:355-366`, `:470-478`; `supabase/migrations/20260520090100_create_gallery_filter_jobs.sql:5-17` |
| `gallery_password_attempts` | Chống dò mật khẩu (10 sai / 15 phút / gallery) | `gallery_id` (PK), `window_start`, `fail_count` | chỉ service-role trong `verifyGalleryPassword` | `app/actions/gallery-public-actions.ts:213-260`; `supabase/migrations/20260721000000_gallery_password_attempts.sql:6-16` |

### 1.2 Miền MOODIE AI

| Bảng | Vai trò | Cột thật (điểm mấu chốt) | Ai ghi | file:dòng |
|---|---|---|---|---|
| `ai_conversations` | Hội thoại Moodie theo user | `id`, `user_id`, `title`, `last_message_preview`, `locked_until`, `locked_by`, `version`, `message_count`, `summary`, `summary_updated_at`, `active_leaf_message_id`, `created_at`, `updated_at` | `moodie-mutations.ts` (admin client, lọc `user_id`) | `app/actions/moodie-mutations.ts:118`, `:153`, `:176`, `:217` |
| `ai_messages` | Tin nhắn (cây nhánh, có revision) | `id`, `conversation_id`, `role` (`user`\|`assistant`), `content`, `metadata` (jsonb: `activity_history`, `sources_v2`, `response_ui_version`), `parent_message_id`, `revision`, `status`, `request_id`, `created_at` | `moodie-mutations.ts` | `app/actions/moodie-mutations.ts:326`, `:356`, `:382`, `:448-460` |
| `ai_turns` | Lượt chạy (idempotency theo `request_id`) | `id`, `request_id` (UNIQUE), `conversation_id`, `user_id`, `status`, `last_sequence`, `error`, `started_at`, `completed_at`, `updated_at` | `sendMoodieMessage` | `app/actions/moodie-mutations.ts:307-314`, `:493`, `:537` |
| `moodie_memories` | Bộ nhớ dài hạn 3 scope (`user`/`studio`/`conversation`) | `id`, `scope`, `user_id`, `conversation_id`, `memory_type`, `content` (≤1000), `subject`, `predicate`, `value`, `confidence`, `importance`, `status`, `source_message_id(+_ids)`, `source_voice_turn_id`, `supersedes_memory_id`, `consolidated_into_memory_id`, `embedding` (jsonb), `embedding_model`, `last_used_at`, `use_count`, `expires_at`, `review_after`, `deleted_at`, `archived_reason` | `createPendingMoodieMemory`, `moodie-memory-actions.ts` | `lib/moodie/memory-store.ts:164`, `:193-206`; `app/actions/moodie-memory-actions.ts:77`, `:106` |
| `moodie_memory_relations` | Quan hệ giữa memory (`supersedes`/`extends`/…) | `id`, `user_id`, `source_memory_id`, `target_memory_id`, `relation_type`, `confidence` | `createPendingMoodieMemory` khi archive bản cũ | `lib/moodie/memory-store.ts:203` |
| `moodie_observations` | "Working memory" ngắn hạn trong hội thoại | (chưa liệt kê cột đầy đủ) | `recordMoodieObservation` | `lib/moodie/observation-store.ts:35`, `:133` |
| `moodie_agent_runs` | Job nền (deep research / task / action) có lease + retry | `id`, `user_id`, `conversation_id`, `voice_session_id`, `parent_turn_id`, `kind`, `title`, `request`, `status`, `requires_confirmation`, `confirmation_token_hash`, `progress`, `result`, `error`, `source_refs`, `idempotency_key`, `lease_token`, `lease_owner`, `lease_expires_at`, `heartbeat_at`, `attempt_count`, `max_attempts`, `next_attempt_at` | `lib/moodie/runs/repository.ts` + RPC worker | `lib/moodie/runs/repository.ts:42`, `:66`, `:88` |
| `moodie_agent_run_events` | Nhật ký sự kiện của run (UNIQUE `(run_id, sequence)`) | `id` (bigint), `run_id`, `user_id`, `sequence`, `event_type`, `message`, `payload` | `repository.ts` / `worker.ts` | `lib/moodie/runs/repository.ts:52`, `:79`, `:97`; `lib/moodie/runs/worker.ts:88`, `:120`, `:149` |
| `moodie_action_approvals` | Cổng duyệt cho thao tác CÓ tác dụng phụ | `id`, `user_id`, `conversation_id`, `action_kind`, `action_label`, `payload`, `risk`, `status`, `expires_at` (mặc định +10 phút), `approved_at`, `executed_at` | `requestMoodieActionApproval` / `approveAndExecuteMoodieAction` | `app/actions/moodie-action-actions.ts:31-44`, `:94-128` |
| `moodie_message_feedback` | 👍/👎 theo message | `id`, `user_id`, `conversation_id`, `message_id`, `rating` (±1), `note` | `moodie-mutations.ts` | `app/actions/moodie-mutations.ts:586` |
| `moodie_voice_sessions` / `_turns` / `_events` | Phiên giọng nói realtime + telemetry | (xem `vault/30-du-lieu/luoc-do-moodie-ai.md`) | route voice | `app/api/moodie/voice/token/route.ts:84`, `:97`; `app/api/moodie/voice/events/route.ts:22`, `:32`, `:85`, `:101` |
| `moodie_brave_audit_events` / `moodie_brave_usage_daily` | Quota + audit khi gọi Brave Search | `mode`, `query_fingerprint`, `status`, `result_count`, `estimated_cost_microusd`… | `lib/moodie/brave-usage.ts` | `lib/moodie/brave-usage.ts:31`, `:53`, `:60` |

**Bảng ngoài miền mà Moodie ĐỌC:** `contracts`, `contract_events`, `customers`, `employees`, `work_tasks`, `services`, `galleries`, `gallery_images`, `system_settings` — xem mục 5.

---

## 2. RPC & hàm DB

| Tên | Bảng chạm | Gọi từ đâu | Còn sống? | file:dòng |
|---|---|---|---|---|
| `prepare_gallery_share(p_gallery_id, p_user_id)` | `galleries` (UPDATE → `shared`), `gallery_share_links` (upsert 3 capability) | `prepareGalleryShareViaRpc` | **Còn sống**; `SECURITY DEFINER`, `REVOKE ALL … FROM PUBLIC, anon, authenticated`, chỉ `GRANT … TO service_role` | `supabase/migrations/20260520170000_prepare_gallery_share_rpc.sql:9-109`; gọi tại `app/actions/gallery-core.ts:722` |
| Fallback TS `prepareGalleryShareFallback` | như trên | dùng khi RPC thiếu (`isMissingRpcError`) | Còn sống — có cờ nhớ `prepareGalleryShareRpcAvailable` | `app/actions/gallery-core.ts:739-808`, cờ tại `:29` |
| `set_gallery_password(p_gallery_id, p_password)` | `galleries` (`password_hash` bcrypt, `password=NULL`, `access_version+1`) | `updateGallerySettings`, `setGalleryPassword` | Còn sống, `SECURITY DEFINER`, service_role only | `supabase/migrations/20260429170000_contracts_audit_fix_max.sql:35-77`; gọi `gallery-admin-actions.ts:197`, `:222` |
| `verify_gallery_password(p_gallery_id, p_password)` | `galleries` (SELECT, ép `status='shared'`) | `verifyGalleryPassword` | Còn sống, `SECURITY DEFINER`, service_role only | `supabase/migrations/20260429170000_contracts_audit_fix_max.sql:80-110`; gọi `gallery-public-actions.ts:237` |
| `get_gallery_data_v3(uuid, int, int)` | `gallery_images`, `gallery_reactions`, `gallery_comments`, `gallery_albums` | `getGalleryDataV2` (đường chính, admin) | Còn sống; `SECURITY INVOKER`, `GRANT … TO authenticated` | `supabase/migrations/20260606000000_gallery_data_v3_with_blur.sql:10-138`; gọi `gallery-composite-actions.ts:44-49` |
| `get_gallery_data_v2(uuid, int, int)` | như trên (thiếu blur) | fallback khi v3 chưa migrate | Còn sống (bản **3 tham số**) | `supabase/migrations/20260529000001_gallery_data_v2_dynamic_pagination.sql`; gọi `gallery-composite-actions.ts:55-59` |
| `get_gallery_data_v2(uuid)` — overload 1 tham số | — | không ai gọi | **ĐÃ DROP** | `supabase/migrations/20260807000000_drop_gallery_data_v2_single_arg_overload.sql:18` |
| `get_gallery_summaries_by_contract(p_contract_id)` | `galleries` + đếm ảnh/đã chọn + `gallery_share_links` | `getGallerySummariesByContract` | Còn sống (`LANGUAGE sql`) | `supabase/migrations/20260530000001_gallery_summaries_rpc.sql:5-7`; gọi `gallery-admin-actions.ts:394` |
| Trigger `update_gallery_filter_jobs_updated_at` → `update_updated_at_column()` | `gallery_filter_jobs` BEFORE UPDATE | tự động | Còn sống | `supabase/migrations/20260520090100_create_gallery_filter_jobs.sql:37-40` |
| Trigger `update_galleries_updated_at` | `galleries` | tự động | Còn sống | `vault/30-du-lieu/luoc-do-gallery.md:70` (introspect prod) |
| `finance_reports_snapshot(p_start_date, p_end_date)` | miền tài chính | **Moodie tool `get_financial_summary`** | Còn sống | `lib/moodie/tools.ts:548-552` |
| `finance_debt_stats()` | miền tài chính | **Moodie tool `get_debt_summary`** | Còn sống | `lib/moodie/tools.ts:650` |
| `match_moodie_memories(p_user_id, p_conversation_id, p_query_text, p_query_embedding, p_limit)` | `moodie_memories` | `loadMoodieMemoryContext` (có fallback TS nếu RPC lỗi) | Còn sống; scoring recency đổi sang `last_used_at` ở migration 20260717 | `lib/moodie/memory-store.ts:44-50`; `supabase/migrations/20260712100000_moodie_memory_hybrid_retrieval.sql`, `20260717000000_moodie_memory_recency_last_used.sql` |
| `claim_moodie_agent_run` / `heartbeat_moodie_agent_run` / `finish_moodie_agent_run` | `moodie_agent_runs` (lease) | `lib/moodie/runs/worker.ts` | Còn sống | `supabase/migrations/20260712091000_moodie_agent_run_worker.sql`; gọi `worker.ts:12`, `:56`, `:108` |
| `retry_moodie_agent_run` | `moodie_agent_runs` | `worker.ts:139` | Còn sống | `supabase/migrations/20260712095000_moodie_agent_run_retry.sql` |
| Trigger `sync_ai_conversation_message_count` trên `ai_messages` | `ai_conversations.message_count` (+1 INSERT / −1 DELETE, kẹp ≥0) | tự động | Còn sống, `SECURITY DEFINER` | `supabase/migrations/20260710170000_add_moodie_message_count.sql:13-38` |
| Trigger `emit_realtime_signal` trên `moodie_memories` | kênh realtime | tự động | Còn sống | `supabase/migrations/20260714030000_moodie_memory_realtime_signal.sql` |

**RLS:** `galleries` + `gallery_images` bị DROP hết policy cũ rồi chỉ còn `*_service_role_all` (`supabase/migrations/20260429173500_contracts_gallery_rls_hardening.sql:12-42`); `gallery_share_links`, `gallery_selection_batches(+items)`, `gallery_filter_jobs` cũng chỉ `service_role` (`20260519090000…:151-190`). `gallery_password_attempts` không có policy nào và bị `revoke all … from anon, authenticated`. → **Toàn bộ quyền thực chất do code server action quyết định, không phải RLS**, vì `withAuth` đưa admin client (service-role) vào mọi action (`lib/auth_utils.ts:411`).

---

## 3. Server action & route

### 3.1 Route

| Route | Công khai? | Ghi chú | file:dòng |
|---|---|---|---|
| `/gallery/[accessUrl]` (page) | **CÔNG KHAI, không đăng nhập** | `force-dynamic`; nhận cả `custom_slug`, `share_link.slug`, `access_url` cũ | `app/gallery/[accessUrl]/page.tsx:5`, `:71-106` |
| `/api/og/gallery/[slug]` | **CÔNG KHAI** | sinh ảnh OG từ `getGalleryPreviewMetadata` | `app/api/og/gallery/[slug]/route.tsx:5-19` |
| `/api/gallery-download/[token]/[imageId]` | **CÔNG KHAI có token** (hoặc `token === "admin"` + session) | trả JSON `{url}` trỏ thẳng `lh3…=s0`, KHÔNG stream byte qua Vercel | `app/api/gallery-download/[token]/[imageId]/route.ts:26-199` |
| `/api/gallery-download-batch/[token]` | như trên | trả danh sách URL để trình duyệt tự zip | `app/api/gallery-download-batch/[token]/route.ts:29-215` |
| `/api/drive-download/[fileId]` | **CÔNG KHAI, KHÔNG token, KHÔNG kiểm tra gì** | 302 sang `lh3…=s{size}`; chỉ chặn `fileId.length < 10` | `app/api/drive-download/[fileId]/route.ts:22-46` |
| `/contracts/[id]/gallery` | Cần đăng nhập (layout `(protected)`) | shell client-first; dữ liệu lấy qua server action | `app/(protected)/contracts/[id]/gallery/page.tsx:8-22`; `app/(protected)/layout.tsx:10-17` |
| `/moodie` | Cần đăng nhập **+ `canAccess(role,"moodie")`** | mọi role đều có `moodie` trong `ROLE_PERMISSIONS` | `app/(protected)/moodie/layout.tsx:11-16`; `types/roles.ts:7-47` |
| `POST /api/moodie/messages/stream` | Route **không tự kiểm auth**; gate nằm trong `sendMoodieMessage` (`withAuth` + `requireMoodieAccess`) | SSE, heartbeat 15s, huỷ theo `request.signal` | `app/api/moodie/messages/stream/route.ts:4`, `:36`, `:52`; `app/actions/moodie-mutations.ts:269`, `:277` |
| `POST /api/moodie/voice/token`, `/voice/ask`, `/voice/events` | Cần session (`supabase.auth.getUser()`), thêm kiểm `employees.status='active'` ở token route | | `app/api/moodie/voice/token/route.ts:19-21`, `:49-55`; `app/api/moodie/voice/ask/route.ts:11-18` |
| `POST /api/moodie/runs/worker` | **Chỉ internal**: so `CRON_SECRET`/`INTERNAL_API_KEY` trong header `authorization` | | `app/api/moodie/runs/worker/route.ts:7-11` |

### 3.2 Ranh giới bảo mật của link chia sẻ (chỗ ép trong code)

Mô hình 2 token, ký HMAC-SHA256 (`GALLERY_ACCESS_SECRET` → fallback `SUPABASE_SERVICE_ROLE_KEY` → `NEXTAUTH_SECRET`), TTL **12 giờ**, payload gồm `{scope, galleryId, accessUrl, accessVersion, capability, exp}`:
`lib/gallery-access.ts:3-65`. So sánh capability là **EXACT hai chiều** (`normalizeCapability(payload) === normalizeCapability(expected)`): `lib/gallery-access.ts:99`.

| Hành động khách | Cần capability | Chỗ ép | file:dòng |
|---|---|---|---|
| Mở trang, xem 30 ảnh SSR | không cần token — server tự cấp | album có mật khẩu **và** capability link = `select` → chỉ cấp **view-token**; ngược lại cấp token theo đúng capability của link | `app/actions/gallery-public-actions.ts:59-61` |
| Cuộn tải thêm ảnh | `view` **hoặc** token mặc định (thử 2 lần) | `assertGalleryProof(…, "view") \|\| assertGalleryProof(…)` | `gallery-public-actions.ts:141-149` |
| Thả tim | `view` hoặc token mặc định (try/catch 2 lần) | `toggleReaction` | `gallery-reaction-actions.ts:59-64` |
| Đọc ghi chú / tab GHI CHÚ / tab ĐÃ CHỌN | `view` hoặc token mặc định | `getGalleryComments`, `getPublicNotedImages`, `getPublicSelectedImages(Full)` | `gallery-reaction-actions.ts:178-182`, `:219-223`; `gallery-selection-actions.ts:178-182`, `:211-215` |
| **CHỌN ảnh (`is_selected`)** | **`select` (EXACT) + deadline** | `requirePublicGalleryImageAccess(…, "select", {enforceDeadline:true})` | `gallery-selection-actions.ts:31-38`; gate thật ở `gallery-core.ts:359-368` |
| **Đánh sao (`is_starred`)** | **`select` + deadline** | `toggleImageStar` | `gallery-selection-actions.ts:91-98` |
| **Ghi/xoá ghi chú** | **`select` + deadline** | `upsertComment` / `deleteComment` | `gallery-reaction-actions.ts:291`, `:314` |
| Đổi ảnh bìa album | `select` | `setGalleryCoverImage` nhánh public | `gallery-admin-actions.ts:252-282` |
| Tải ảnh gốc | `view` → **403**; `select` → cần `allow_download` hoặc `download_unlocked_at`; `download` → cần unlock **hoặc** hợp đồng đã thanh toán (`payment_status='da_thanh_toan'` hoặc `remaining_amount<=0`), nếu không → **402** | 2 route download | `app/api/gallery-download/[token]/[imageId]/route.ts:139-189`; `…-batch/[token]/route.ts:132-179` |
| Nhập mật khẩu để lên select-token | RPC `verify_gallery_password` + rate-limit 10 sai/15 phút | `verifyGalleryPassword` | `gallery-public-actions.ts:213-260`, cấp token tại `:275` |

Gate phía client chỉ là UX (mở modal mật khẩu khi `needsPassword && clientCapability === "view"`): `components/gallery/public-gallery-client.tsx:287-292` (chọn) và `:419-423` (ghi chú); select-token lưu trong `sessionStorage` và được xác thực lại qua `getPublicGalleryWithAccess` khi reload (`public-gallery-client.tsx:113-130`).

### 3.3 Server action gallery (nhóm)

| Nhóm | Action tiêu biểu | Gate | file |
|---|---|---|---|
| Công khai (khách) | `getPublicGallery`, `getPublicGalleryPreview`, `getPublicGalleryImagesPaginated`, `getPublicGalleryWithAccess`, `verifyGalleryPassword`, `getGalleryPreviewMetadata`, `getPublicGalleryStats` | token (trừ 2 cái cuối) | `app/actions/gallery-public-actions.ts` |
| Khách ghi | `toggleImageSelection`, `toggleImageStar`, `toggleReaction`, `upsertComment`, `deleteComment`, `setGalleryCoverImage` | token theo bảng 3.2 | `gallery-selection-actions.ts`, `gallery-reaction-actions.ts`, `gallery-admin-actions.ts` |
| Admin | `createGallery`, `createMultiFolderGalleries`, `syncDriveFolder`, `updateGallerySettings`, `setGalleryPassword`, `shareGallery`, `prepareGalleryShare`, `ensureGalleryShareLinks`, `deleteGallery`, `reorderImages`, `getSelectedImages`, `getGalleryDataV2`, `getGalleryMetadataAll`, `initDriveCopyJob`, `processDriveCopyChunk`, `finalizeDriveCopyJob`, `getGalleryFilterJobProgress`, `getRetouchProgress` | `withAuth` + `requireContractAccess` | `gallery-admin-actions.ts`, `gallery-drive-actions.ts`, `gallery-composite-actions.ts` |
| **Không gate gì** | `getPublicGalleryStats(galleryId)`, `getReactionCounts(galleryId)`, `getClientReactions(galleryId, clientId)`, `getCommentCountsPerImage(galleryId)` | chỉ cần biết UUID gallery | `gallery-public-actions.ts:168-180`; `gallery-reaction-actions.ts:106`, `:137`, `:326` |
| Dead-end cố ý | `createGalleryFilterJob` — luôn `throw`, viết theo schema không tồn tại | — | `gallery-selection-actions.ts:343-354` |

---

## 4. Luồng nghiệp vụ

```
┌─ ADMIN ────────────────────────────────────────────────────────────────────┐
│ Google Drive (ảnh gốc — KHÔNG lưu ở Supabase)                              │
│   │ parseDriveFolderUrl + fetchDriveFiles                                   │
│   │ gallery-admin-actions.ts:45-99 · gallery-drive-actions.ts:24-131        │
│   ▼                                                                         │
│ galleries (status='draft', access_url random)                               │
│   + gallery_images (drive_file_id, image_url=lh3/d/<id>, thumbnail =s400)   │
│   │                                                                          │
│   ├──[NỀN, fire-and-forget]──► backfillGalleryDimensionsInternal            │
│   │                            backfillGalleryBlurhashesInternal            │
│   │   (gallery-admin-actions.ts:111-116 — .catch(log), KHÔNG có bảng job)   │
│   │                                                                          │
│   ▼ shareGallery / prepareGalleryShare (gallery-admin-actions.ts:504,546)   │
│ RPC prepare_gallery_share  → galleries.status='shared', shared_at           │
│                            → gallery_share_links × 3 (select/view/download) │
└────────────────────────────────────────────────────────────────────────────┘
                       │  3 URL: /gallery/select-xxxx · view-xxxx · download-xxxx
                       │  (hoặc /gallery/<custom_slug>, /gallery/<access_url> cũ)
                       ▼
┌─ KHÁCH (KHÔNG đăng nhập) ──────────────────────────────────────────────────┐
│ getPublicGallery → cấp token 12h (gallery-public-actions.ts:28-74)          │
│   ├─ XEM (view-token, tự do)  ─ 30 ảnh SSR, cuộn 20/50/100 tuỳ mạng         │
│   ├─ TIM (view-token, tự do)  ─► gallery_reactions                          │
│   └─ CHỌN / GHI CHÚ ── cần mật khẩu ──► verify_gallery_password             │
│                         (10 sai/15' → gallery_password_attempts)            │
│                         ──► SELECT-token ──► gallery_images.is_selected      │
│                                              gallery_images.is_starred       │
│                                              gallery_comments                │
│   TẢI ẢNH: view→403 · select→cần allow_download/unlock · download→cần       │
│            unlock hoặc contract đã thanh toán (nếu không → 402)             │
└────────────────────────────────────────────────────────────────────────────┘
                       │  admin mở modal "Lọc ảnh" (3 chế độ: selected/hearted/both)
                       ▼
┌─ LỌC VỀ DRIVE (chuẩn bị hậu kỳ) ───────────────────────────────────────────┐
│ initDriveCopyJob(galleryId, contractId, folderName, filterMode)             │
│   gallery-drive-actions.ts:236-380                                          │
│   1. studio_info.google_oauth + scope drive → nếu thiếu: {error:"needs_..."}│
│   2. selectAllRows(gallery_reactions heart) + selectAllRows(gallery_images) │
│      → lọc bằng Set trong JS (né trần 1000 dòng & header 16KB)             │
│   3. chỉ giữ .jpg/.jpeg CÓ drive_file_id                                    │
│   4. findOrCreateDriveFolder → TẠO THƯ MỤC THẬT trên Drive khách            │
│   5. INSERT gallery_filter_jobs (status='processing', total_files=N)        │
│   ▼                                                                          │
│ processDriveCopyChunk × nhiều lượt (client chia chunk, chạy song song)      │
│   → createDriveShortcut (shortcut, KHÔNG copy byte); 401 → refresh token    │
│   → KHÔNG cập nhật job từng chunk (P7)                                      │
│   ▼                                                                          │
│ finalizeDriveCopyJob → UPDATE gallery_filter_jobs (copied_files, status,    │
│   error_log jsonb) — trigger update_gallery_filter_jobs_updated_at chạy     │
└────────────────────────────────────────────────────────────────────────────┘
                       ▼
      Hậu kỳ (gallery folder_type='da_sua') · getRetouchProgress so
      "ảnh đã chọn ở gallery 'goc'" ÷ "tổng ảnh ở gallery 'da_sua'"
      (gallery-drive-actions.ts:167-209) ─► in ấn (miền khác)
```

**Bước chạy nền / có bảng theo dõi:**

| Bước | Chạy nền? | Bảng theo dõi |
|---|---|---|
| Backfill `width`/`height`/`blur_hash` | Có — promise thả trôi trong cùng request, `.catch(console.error)` | **KHÔNG có** — không thể biết đã xong hay chưa | `gallery-admin-actions.ts:110-116`, `:367-375` |
| Chép ảnh sang Drive | Không phải queue thật: **client** điều phối chunk qua nhiều lần gọi server action | `gallery_filter_jobs` (chỉ ghi lúc bắt đầu + kết thúc) | `gallery-drive-actions.ts:355`, `:456-483` |
| Moodie deep research / task | Có — hàng đợi thật với lease + retry | `moodie_agent_runs` + `moodie_agent_run_events`, worker `POST /api/moodie/runs/worker` | `lib/moodie/runs/worker.ts`; `app/api/moodie/runs/worker/route.ts` |

**Không có cron/webhook nào ghi vào `gallery_images`.** Nhưng xem mục 7 — có đường ghi gián tiếp qua Moodie.

---

## 5. Moodie AI

### 5.1 Kiến trúc runtime

- **Chạy 100% ở server.** Client chỉ POST `/api/moodie/messages/stream`; route mở `ReadableStream` SSE và gọi server action `sendMoodieMessage` — `app/api/moodie/messages/stream/route.ts:10-77`. Không có API key model nào lộ ra client (key giải mã từ `system_settings` bằng `decryptSecret`, `lib/moodie/providers/registry.ts:73-79`, `:108`).
- **Chuỗi gọi:** `stream route` → `sendMoodieMessage` (`moodie-mutations.ts:264`) → `runMoodieEngine` (`lib/moodie/engine.ts`) → `getActiveMoodieProvider(params.model)` → adapter Gemini/OpenAI-compatible → `executeMoodieTool` (`lib/moodie/tools.ts`). Có `core-engine.ts` (789 dòng) làm đường lùi khi không có provider nào cấu hình (`registry.ts:92-94` trả `null`).
- **Model:** không hard-code. Provider đọc từ `system_settings` (`moodie_provider_id`/`_model`/`_api_key`/`_models`/`_embedding_model`). Mặc định Gemini `gemini-2.5-flash` (`registry.ts:28`, `:72`); OpenAI-compatible mặc định `gpt-4o-mini` (`registry.ts:55`). Người dùng chọn model ở composer → `model` đi kèm request → `getActiveMoodieProvider(modelOverride)` (`registry.ts:85-100`).
- **Giọng nói:** riêng — Gemini Live hoặc OpenAI Realtime, token cấp qua `POST /api/moodie/voice/token` (`app/api/moodie/voice/token/route.ts:18-46`); chế độ `cascade` = tắt Live.

**Ràng buộc do `scripts/verify-moodie-runtime-policy.mjs` áp** (đọc tĩnh 2 file, không chạy DB — `scripts/verify-moodie-runtime-policy.mjs:1-27`):
1. `lib/moodie/engine.ts` **phải chứa** các token: `bufferUntilFinal`, `executionPlan.shouldForceTool`, `route.research.required`, `route.orchestration.mode === "background_run"`, `toolUsedInTurn`.
2. `engine.ts` phải có chuỗi `streamedThisStep && !bufferUntilFinal` — nếu không, "bước tool/research có thể xoá trắng text đã stream cho người dùng".
3. `app/api/moodie/messages/stream/route.ts` phải có `HEARTBEAT_INTERVAL_MS` **và** `request.signal.aborted` (heartbeat + huỷ).

`scripts/verify-moodie-chat-ui.mjs:18-33` khoá thêm 13 bất biến UI, đáng chú ý: model picker phải là listbox có ô tìm (không dùng `<select>`), `model: params.model` phải được gửi lên stream route, `engine.ts` phải gọi `getActiveMoodieProvider(params.model)`, và `docs/moodie-chat-ui-contract.md` phải còn câu "One state, one surface".

### 5.2 Moodie ĐỌC được dữ liệu nghiệp vụ nào

Mọi tool nhận `context.supabase` = **admin client (service-role)** vì `withAuth` cấp admin client (`lib/auth_utils.ts:411`) → **RLS không bảo vệ gì**; gate duy nhất là `canAccess(context.role, <module>)` trong từng tool (`lib/moodie/tools.ts:34`).

| Tool | Nguồn dữ liệu | Quyền cần |
|---|---|---|
| `get_financial_summary` | **RPC `finance_reports_snapshot(p_start_date, p_end_date)`** → doanh thu, tổng chi, lợi nhuận ròng, biên LN, số HĐ, doanh thu addon, giá trị TB/HĐ, **chi phí lương**, top 5 dịch vụ | `canAccess(role,"finance")` → `admin`/`manager` | `lib/moodie/tools.ts:541-552` |
| `get_debt_summary` | RPC `finance_debt_stats()` → phải thu/phải trả/quá hạn/net + aging 5 bucket | `finance` | `tools.ts:646-650` |
| `get_pending_collections` | `contracts` | `finance` | `tools.ts:743-749` |
| `search_contracts` | `contracts` | `contracts` | `tools.ts:825-832` |
| `get_calendar_agenda`, `get_upcoming_schedules` | `contract_events` + `contracts` | `calendar` | `tools.ts:87`, `:940-962` |
| `get_contract_delivery_assets` | `galleries` + `contract_events` + đếm `gallery_images` | `contracts` | `tools.ts:1030-1040`; `lib/moodie/domain/gallery-context.ts:67-115` |
| `list_contract_gallery_images` | `galleries` + `gallery_images` (thumbnail đã **sanitize**: chỉ nhận `/api/…`, `drive.google.com/thumbnail`, `lh3.googleusercontent.com`) | `contracts` | `tools.ts:1109-1121`; `gallery-context.ts:28-34`, `:153-194` |
| `get_team_summary`, `get_overdue_tasks` | `employees`, `work_tasks` | `employees` | `tools.ts:1167-1179`, `:1243-1249` |
| `get_services_catalog` | `services` | `services` | `tools.ts:1328-1333` |
| `get_financial_goals` | miền tài chính | `finance` | `tools.ts:1398` |
| `get_repo_map`, `read_file`, `list_symbols`, `grep_code`, `get_schema` | mã nguồn repo | **chỉ `admin`** | `lib/moodie/capability-registry.ts:83-87` |
| `search_web/news/local`, `browse_page`, `start_deep_research` | Brave Search / trình duyệt ngoài | mọi role, có quota + audit | `tools.ts:508-510`; `lib/moodie/brave-usage.ts` |

→ **Về `financial_summary`:** Moodie đọc được **toàn bộ** snapshot tài chính studio (doanh thu, chi phí, lợi nhuận, lương) và công nợ, nhưng **chỉ khi `role ∈ {admin, manager}`** (`types/roles.ts:8-43`: `sale`/`media`/`viewer` không có `"finance"`). Role `viewer` vẫn vào được Moodie (`ROLE_PERMISSIONS.viewer` có `"moodie"`, `types/roles.ts:46`) nhưng mọi tool tiền trả `buildPermissionDeniedResult` (`tools.ts:542-544`).

### 5.3 Moodie có GHI được gì không

**Có — nhưng chỉ 3 loại thao tác, và phải qua cổng duyệt tường minh** (`app/actions/moodie-action-actions.ts`):

| `action_kind` | Thực thi gì | Ghi vào bảng nào | risk | file:dòng |
|---|---|---|---|---|
| `sync_drive_gallery` | gọi `syncDriveFolder(galleryId)` | **`gallery_images` (INSERT ảnh mới từ Drive)** | `low` | `moodie-action-actions.ts:102` → `gallery-admin-actions.ts:362` |
| `refresh_gallery_share` | gọi `shareGallery(galleryId)` | `galleries.status='shared'` + `gallery_share_links` | `medium` | `moodie-action-actions.ts:104` → `gallery-admin-actions.ts:504` |
| `sync_google_calendar` | đọc `schedules`, đẩy `google_sync_queue` | `google_sync_queue` | `low` | `moodie-action-actions.ts:107-119` |

Cơ chế: `requestMoodieActionApproval` kiểm quyền (`requireContractWriteAccess` / `requireCalendarAccess`) + xác nhận target tồn tại → tạo dòng `moodie_action_approvals` `status='pending'`, hết hạn sau 10 phút. `approveAndExecuteMoodieAction` yêu cầu đúng `user_id`, `status='pending'`, chưa hết hạn → chạy → `status='executed'` + `fireAuditLog` (`:129-137`). UI khởi phát: `components/moodie/moodie-action-previews.tsx:30`, `:42`.

Ngoài ra, chính sách `getMoodieApprovalState`: chỉ `kind==="navigate"` + `risk==="none"` + `!requires_approval` mới tự chạy; mọi kind khác → `pending_approval` (`lib/moodie/action-policy.ts:5-16`). Điều hướng do `planMoodieSafeNavigation` sinh và còn bị lọc theo `canAccess(role, module)` (`lib/moodie/action-planner.ts:24-41`).

Moodie **luôn ghi** dữ liệu của chính nó: `ai_conversations`/`ai_messages`/`ai_turns`, `moodie_memories`, `moodie_observations`, `moodie_agent_runs(+events)`, `moodie_voice_*`, `moodie_brave_*` — xem mục 1.2.

### 5.4 Bộ nhớ hội thoại lưu ở đâu

| Tầng | Lưu ở | Nạp lúc nào | file:dòng |
|---|---|---|---|
| Lịch sử thô | `ai_messages` (cây `parent_message_id` + `revision`) | `fetchConversationHistory` trước mỗi lượt | `moodie-mutations.ts:413` |
| Tóm tắt hội thoại | `ai_conversations.summary` / `summary_updated_at` | `buildMoodieConversationSummary` sau mỗi lượt | `moodie-mutations.ts:206`; `lib/moodie/conversation-summary.ts` |
| Bộ nhớ dài hạn 3 scope | `moodie_memories` (`user` / `studio` / `conversation`) + `moodie_memory_relations` | RPC `match_moodie_memories` top-5 (hybrid embedding + text), có fallback TS query 3 scope (20+20+10) | `lib/moodie/memory-store.ts:32-137` |
| Working memory | `moodie_observations` | `loadMoodieWorkingContext` | `lib/moodie/observation-store.ts:55` |
| Gộp lại thành context packet | (trong RAM 1 lượt) `identity + conversationSummary + memory + workingMemory + retrieval` | `planMoodieContext` | `lib/moodie/context-planner.ts:35-93`; bản cho voice: `:95-102` |
| Bộ nhớ do khách nói "hãy nhớ…" | ghi **trước** khi gọi model để không mất khi provider lỗi; `status='pending'` chờ user duyệt | `moodie-mutations.ts:397-411`; `lib/moodie/memory-store.ts:151-211` |

Supersession: memory mới trùng `subject`+`predicate` (EXACT) với bản cũ → archive bản cũ + ghi quan hệ `supersedes`, **không hard-delete** (`memory-store.ts:193-206`; ADR-010 tại `agent/DECISIONS.md:76-81`).

---

## 6. Bất biến

| # | Phát biểu | Căn cứ | Câu SQL kiểm (KHÔNG chạy) |
|---|---|---|---|
| I1 | Mỗi gallery có tối đa 1 link/1 capability và slug là duy nhất toàn hệ thống | `UNIQUE (gallery_id, capability)`, `UNIQUE (slug)` — `20260519090000…:64-65`, `vault/30-du-lieu/luoc-do-gallery.md:207-209` | `SELECT gallery_id, capability, count(*) FROM gallery_share_links GROUP BY 1,2 HAVING count(*)>1;` |
| I2 | Chỉ gallery `status='shared'` mới truy cập được qua link công khai | `.eq("status","shared")` ở cả 3 nhánh tra cứu — `gallery-public-actions.ts:348`, `:367`; `fetchSharedGalleryBaseById` `gallery-core.ts:253` | `SELECT count(*) FROM gallery_share_links l JOIN galleries g ON g.id=l.gallery_id WHERE l.status='active' AND g.status<>'shared';` |
| I3 | Ảnh chỉ thuộc đúng 1 gallery, và mọi ghi của khách phải kiểm `image.gallery_id === gallery.id` | `requirePublicGalleryImageAccess` — `gallery-core.ts:370-382` | `SELECT count(*) FROM gallery_comments c JOIN gallery_images i ON i.id=c.image_id WHERE c.gallery_id<>i.gallery_id;` (cùng câu cho `gallery_reactions`) |
| I4 | `is_selected=true` ⇒ `selected_at` khác NULL (và ngược lại) | `updateGalleryImageSelection` set cặp — `gallery-core.ts:393-399` | `SELECT count(*) FROM gallery_images WHERE (is_selected AND selected_at IS NULL) OR (NOT is_selected AND selected_at IS NOT NULL);` |
| I5 | Một `client_identifier` chỉ có **1** ghi chú / ảnh, và tối đa 1 reaction / (ảnh, loại) | UNIQUE index — `20260716000000…:6-7`; `luoc-do-gallery.md:151`, `:180` | `SELECT image_id, client_identifier, count(*) FROM gallery_comments GROUP BY 1,2 HAVING count(*)>1;` |
| I6 | Album đã đặt mật khẩu thì `password_hash` khác NULL và `password` (plaintext) phải NULL | `set_gallery_password` luôn `password=NULL` — `20260429170000…:30-34`; chặn ở app `gallery-public-actions.ts:203-208` | `SELECT count(*) FROM galleries WHERE password IS NOT NULL;` |
| I7 | Đổi mật khẩu ⇒ `access_version` tăng ⇒ mọi token cũ vô hiệu | `access_version+1` trong RPC — `20260429170000…:39`; token gắn `accessVersion` — `lib/gallery-access.ts:58`, `:98` | `SELECT id, access_version, password_updated_at FROM galleries WHERE password_hash IS NOT NULL AND access_version < 2;` |
| I8 | `gallery_filter_jobs.copied_files <= total_files` | `finalizeDriveCopyJob` ghi `copied_files=successCount` với `success+failed<=total` — `gallery-drive-actions.ts:463-475` | `SELECT count(*) FROM gallery_filter_jobs WHERE copied_files > total_files;` |
| I9 | Job lọc chỉ chứa file JPG/JPEG có `drive_file_id` | lọc trước khi insert — `gallery-drive-actions.ts:329-337` | `SELECT count(*) FROM gallery_images WHERE drive_file_id IS NULL AND lower(file_name) LIKE '%.jpg';` (đối chiếu thủ công) |
| I10 | Ảnh RAW (arw/cr2/cr3/nef/raf/dng/rw2/orf/pef) **không** xuất hiện trên lưới công khai | `applyPublicImageFilter` — `gallery-core.ts:21`, `:415-421`, dùng ở `:526` | `SELECT count(*) FROM gallery_images WHERE lower(file_name) ~ '\.(arw\|cr2\|cr3\|nef\|raf\|dng\|rw2\|orf\|pef)$';` |
| I11 | `ai_conversations.message_count` = số dòng `ai_messages` của hội thoại đó | trigger `sync_ai_conversation_message_count` — `20260710170000…:13-38` | `SELECT c.id FROM ai_conversations c LEFT JOIN (SELECT conversation_id, count(*) n FROM ai_messages GROUP BY 1) m ON m.conversation_id=c.id WHERE c.message_count <> coalesce(m.n,0);` |
| I12 | `ai_turns.request_id` là duy nhất (idempotency 1 lượt = 1 request) | UNIQUE index — `luoc-do-moodie-ai.md:124` | `SELECT request_id, count(*) FROM ai_turns GROUP BY 1 HAVING count(*)>1;` |
| I13 | `moodie_memories` scope hợp lệ: `studio`⇒`user_id IS NULL`; `user`⇒`user_id NOT NULL`; `conversation`⇒cả `user_id` và `conversation_id` NOT NULL | CHECK — `luoc-do-moodie-ai.md:332` | `SELECT count(*) FROM moodie_memories WHERE NOT ((scope='studio' AND user_id IS NULL) OR (scope='user' AND user_id IS NOT NULL) OR (scope='conversation' AND user_id IS NOT NULL AND conversation_id IS NOT NULL));` |
| I14 | Mọi `moodie_action_approvals` đã `executed` đều từng `pending` và chưa hết hạn lúc duyệt | `approveAndExecuteMoodieAction` — `moodie-action-actions.ts:87-98` | `SELECT count(*) FROM moodie_action_approvals WHERE status='executed' AND (approved_at IS NULL OR approved_at > expires_at);` |
| I15 | Không có `moodie_agent_runs` nào `attempt_count > max_attempts` | CHECK + RPC retry — `luoc-do-moodie-ai.md:229` | `SELECT count(*) FROM moodie_agent_runs WHERE attempt_count > max_attempts;` |

---

## 7. Mâu thuẫn tài liệu (vault ↔ code — **CODE THẮNG**)

| # | Vault nói | Code thật | Kết luận |
|---|---|---|---|
| M1 | `luong-gallery.md:36` — "`prepare_gallery_share` → `gallery_share_links` (219 dòng)" | Migration `20260520170000_prepare_gallery_share_rpc.sql` chỉ **111 dòng**; hàm RPC 9→106 | Số dòng sai, nội dung đúng. |
| M2 | `luong-gallery.md:71` + `gallery.md:89` — 'Chế độ "tim" hiện dựng `.in("id",[…])` → **vỡ khi >~400 ảnh tim**' | `initDriveCopyJob` đã đổi sang `selectAllRows` + lọc bằng `Set` trong JS; comment tại `gallery-drive-actions.ts:300-304` nói rõ "**Bản cũ** dùng `.in(...)`" | **Nợ này đã trả.** Vault lỗi thời. |
| M3 | `luong-gallery.md:81-84` + `gallery.md:79-83` — "`gallery_images` **chỉ admin** ghi, đúng **3 nơi**: thêm ảnh · import Drive · kéo thả `sort_order`" | (a) Khách có select-token ghi `is_selected`/`selected_at` (`gallery-selection-actions.ts:39`) **và** `is_starred`/`starred_at` (`:99-105`); (b) `createMultiFolderGalleries` insert ảnh (`gallery-drive-actions.ts:73`) — nơi thứ 4; (c) **Moodie** có thể chạy `syncDriveFolder` sau khi user duyệt (`moodie-action-actions.ts:102`) → INSERT `gallery_images` | Câu "chỉ admin ghi" **sai với `is_starred`**; và có **đường ghi qua Moodie**. Kết luận "không có tác nhân thứ hai" cần đọc lại: vẫn không có cron/webhook, nhưng có tác nhân **Moodie có người duyệt**. |
| M4 | `luong-gallery.md:82` + `gallery.md:81` — "Khách chỉ ghi được `gallery_reactions`/`gallery_comments`/`is_selected`" | Khách có select-token còn ghi được `gallery_images.is_starred` (`gallery-selection-actions.ts:91-113`) và `galleries.cover_image_id` (`gallery-admin-actions.ts:252-282`) | Danh sách vault thiếu 2 mục. |
| M5 | `gallery.md:9` — "76 gallery / 17.704 ảnh"; `luoc-do-gallery.md:16-18` — 89 gallery / 20.719 ảnh | Hai con số trong cùng vault đã lệch nhau (module doc cũ hơn schema doc) | Dùng `luoc-do-gallery.md` (introspect mới hơn); cả hai đều chỉ là snapshot. |
| M6 | `gallery.md:88` — "Đang còn nợ ở `getReactionCounts`" (trần 1000 dòng) | `getReactionCounts` **đã** dùng `selectAllRows` (`gallery-reaction-actions.ts:112-119`); `getGallerySummariesByContract` cũng đã vá (`gallery-admin-actions.ts:414-422`). Nợ **còn lại** ở chỗ khác: `getAllHeartedImagesForAction` (`gallery-image-helpers.ts:118-122`), `getGalleryComments` (`gallery-reaction-actions.ts:183-187`), `getCommentCountsPerImage` (`:330-333`), `getClientReactions` (`:141-145`), `getGalleryMetadataAll` (`gallery-composite-actions.ts:108-117`) — đều select 1 phát không phân trang | Vault chỉ sai **địa chỉ** của nợ, không sai bản chất. |
| M7 | `luoc-do-gallery.md` liệt kê `gallery_filter_jobs` có `folder_id/total_files/…` | Migration `20260519090000…:106-127` từng tạo bảng này với `batch_id`/`job_type`/`total_count`; nhưng `20260520090100:3` **DROP TABLE … CASCADE** rồi tạo lại theo schema hiện tại | Vault **đúng**; ghi lại đây để không ai đọc nhầm migration cũ hơn. |
| M8 | `luong-gallery.md:19` sơ đồ chỉ có 3 nhánh XEM/TIM/CHỌN | Còn nhánh **TẢI** với 3 mức gate riêng (view/select/download + payment gate 402) — `gallery-download*/route.ts` | Sơ đồ vault thiếu nhánh tải. |

---

## 8. Chưa xác minh

1. **Số dòng thật của mọi bảng.** Toàn bộ con số ở mục 1 lấy từ `vault/30-du-lieu/luoc-do-*.md` (introspect ngày 2026-08-07), **không** truy vấn lại DB theo lệnh cấm. Có thể đã lệch.
2. **Nội dung đầy đủ của các RPC tài chính** `finance_reports_snapshot`, `finance_debt_stats` — mới xác minh **chỗ gọi** (`tools.ts:548`, `:650`), chưa đọc migration định nghĩa (thuộc miền tiền, để agent `map-tien`).
3. **`get_gallery_summaries_by_contract`** — mới xác minh có tồn tại và `LANGUAGE sql` (`20260530000001…:5-7`); chưa đọc thân hàm nên chưa biết chính xác nó đếm gì và có bị trần 1000 không.
4. **`gallery_albums` + `gallery-album-actions.ts` (161 dòng)** — chưa đọc; bảng 0 dòng trên prod nên chưa rõ tính năng còn sống hay dead.
5. **`gallery_selection_batches` / `_items`** — có đường ghi (`createSelectionBatchFromCurrentSelection`) nhưng **chưa tìm thấy nơi gọi nó** và chưa tìm thấy nơi đọc. Có thể là tính năng chết. Chưa grep kỹ toàn repo.
6. **`components/gallery/password-gate.tsx` (176 dòng)** — vault nói là "dead code cố ý"; **chưa xác minh** trong code là nó thật sự không được import ở đâu.
7. **`lib/moodie/engine.ts` (640 dòng) + `core-engine.ts` (789 dòng)** — mới đọc 120 dòng đầu + xác minh chuỗi mà verify-script yêu cầu. Chưa trace hết vòng lặp tool-calling, `bufferUntilFinal`, `executionPlan.shouldForceTool`, hay khi nào rơi về `core-engine`.
8. **`lib/moodie/workflows/financial-health-review.ts`** — tên gợi ý workflow đọc dữ liệu tiền, **chưa đọc file**. Không kết luận gì về nó.
9. **`lib/moodie/mcp/**` + `code-tools.ts` (567 dòng)** — Moodie có tool đọc mã nguồn (`read_file`, `grep_code`) giới hạn `admin`; chưa xác minh có sandbox đường dẫn hay không.
10. **RLS thực tế trên prod** — chỉ đọc migration. Chưa đối chiếu `pg_policies` thật (lệnh cấm). Vault ghi `gallery_reactions`/`gallery_comments` có RLS bật + **0 policy** → mọi truy cập buộc phải qua service-role; không tìm thấy migration nào tạo policy cho 2 bảng này.
11. **Sự cố có thật đã ghi ở `agent/CURRENT_STATE.md:141`** — trang gallery công khai load 1 `<script>` bị trả về trang `/login` (MIME text/html). Chưa trace, chưa biết route nào.
12. **Rủi ro bảo mật chưa kết luận** (phát hiện được, chưa đánh giá tác động thật):
    - `getPublicGalleryStats` / `getReactionCounts` / `getClientReactions` / `getCommentCountsPerImage` là server action **không kiểm token**, chỉ cần biết UUID gallery (`gallery-public-actions.ts:168`; `gallery-reaction-actions.ts:106`, `:137`, `:326`).
    - `/api/gallery-download-batch/[token]` **không** áp `applyPublicImageFilter` → danh sách trả về có thể gồm cả file RAW mà lưới công khai đã giấu (`route.ts:183-192`).
    - `/api/drive-download/[fileId]` redirect thẳng tới Drive **không kiểm gì** — nhất quán với ADR-011 (cổng tải là UX-gate) nhưng cần xác nhận đây là chủ ý.
    - Trong 2 route download, `capability` dùng làm `expected` lại lấy chính từ payload token (`route.ts:96`, `:109-114`) → phép so capability là **tautology**; an toàn vẫn nhờ chữ ký HMAC phủ luôn `capability`, nhưng đây là chỗ dễ hiểu nhầm khi sửa sau này.

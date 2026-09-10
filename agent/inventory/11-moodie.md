---
title: "Kiểm kê — Moodie AI"
lat-cat: 11-moodie
cap-nhat: 2026-09-01
trang-thai: sinh-tu-dong
nguon: pg_class · pg_proc · pg_policies · pg_trigger · pg_constraint · quét mã nguồn
---

> ⚙️ **Sinh bởi `scripts/vault-gen-kiem-ke.mjs` từ database production. ĐỪNG sửa tay.**
> Cột *vận hành thực tế* ở đây là dữ kiện đo được (ai ghi, ai đọc, còn sống hay không).
> Phần diễn giải *thiết kế ban đầu ↔ thực tế lệch nhau chỗ nào* nằm ở [[00-lech-thiet-ke]].

# Kiểm kê — Moodie AI

15 bảng · 9 hàm DB

## Bảng dữ liệu

### `ai_conversations`

**Số dòng (ước):** 61 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie conversations:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `user_id` | uuid | không | — |
| `title` | text | không | `'Cuộc trò chuyện mới'::text` |
| `last_message_preview` | text | có | — |
| `locked_until` | timestamp with time zone | có | — |
| `locked_by` | uuid | có | — |
| `version` | integer | không | `1` |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |
| `message_count` | integer | không | `0` |
| `summary` | text | có | — |
| `summary_updated_at` | timestamp with time zone | có | — |
| `active_leaf_message_id` | uuid | có | — |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE) · `locked_by`→`auth.users` · `active_leaf_message_id`→`ai_messages` (SET NULL)

**Bị trỏ tới bởi (8):** `ai_messages` · `moodie_memories` · `moodie_action_approvals` · `ai_turns` · `moodie_message_feedback` · `moodie_voice_sessions` · `moodie_agent_runs` · `moodie_observations`

**GHI qua RPC (1):** `sync_ai_conversation_message_count`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (4):** `app/actions/moodie-mutations.ts` · `app/actions/moodie-queries.ts` · `app/api/moodie/voice/token/route.ts` · `lib/moodie/runs/executor.ts`


### `ai_messages`

**Số dòng (ước):** 373 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie messages:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `conversation_id` | uuid | không | — |
| `role` | text | không | — |
| `content` | text | không | — |
| `metadata` | jsonb | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `parent_message_id` | uuid | có | — |
| `revision` | integer | không | `1` |
| `status` | text | không | `'completed'::text` |
| `request_id` | uuid | có | — |

**Trỏ ra:** `conversation_id`→`ai_conversations` (CASCADE) · `parent_message_id`→`ai_messages` (SET NULL)

**Bị trỏ tới bởi (4):** `ai_messages` · `ai_conversations` · `moodie_memories` · `moodie_message_feedback`

**Trigger:** `sync_ai_conversation_message_count`→sync_ai_conversation_message_count()

**CHECK:** `CHECK ((role = ANY (ARRAY['user', 'assistant')))` · `CHECK ((status = ANY (ARRAY['pending', 'streaming', 'completed', 'failed', 'cancelled')))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (5):** `app/actions/moodie-mutations.ts` · `app/actions/moodie-observability-actions.ts` · `app/actions/moodie-queries.ts` · `lib/moodie/runs/executor.ts` · `tests/e2e/moodie-memory-runtime.spec.ts`


### `ai_turns`

**Số dòng (ước):** 147 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie turns:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | — |
| `request_id` | uuid | không | — |
| `conversation_id` | uuid | có | — |
| `user_id` | uuid | không | — |
| `status` | text | không | `'accepted'::text` |
| `last_sequence` | integer | không | `0` |
| `error` | text | có | — |
| `started_at` | timestamp with time zone | không | `now()` |
| `completed_at` | timestamp with time zone | có | — |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `conversation_id`→`ai_conversations` (CASCADE) · `user_id`→`auth.users` (CASCADE)

**Bị trỏ tới bởi (1):** `moodie_agent_runs`

**CHECK:** `CHECK ((status = ANY (ARRAY['accepted', 'running', 'saving', 'completed', 'failed', 'cancelled')))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `app/actions/moodie-mutations.ts` · `app/actions/moodie-queries.ts`


### `moodie_action_approvals`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie action approvals:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `user_id` | uuid | không | — |
| `conversation_id` | uuid | có | — |
| `action_kind` | text | không | — |
| `action_label` | text | không | — |
| `payload` | jsonb | không | `'{}'::jsonb` |
| `risk` | text | không | — |
| `status` | text | không | `'pending'::text` |
| `expires_at` | timestamp with time zone | không | `(now() + '00:10:00'::interval)` |
| `approved_at` | timestamp with time zone | có | — |
| `executed_at` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE) · `conversation_id`→`ai_conversations` (SET NULL)

**CHECK:** `CHECK (((char_length(action_label) >= 1) AND (char_length(action_label) <= 160)))` · `CHECK ((risk = ANY (ARRAY['none', 'low', 'medium', 'high')))` · `CHECK ((status = ANY (ARRAY['pending', 'approved', 'rejected', 'executed', 'expired')))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/moodie-action-actions.ts`


### `moodie_agent_run_events`

**Số dòng (ước):** 22 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie agent run events:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | bigint | không | — |
| `run_id` | uuid | không | — |
| `user_id` | uuid | không | — |
| `sequence` | integer | không | — |
| `event_type` | text | không | — |
| `message` | text | có | — |
| `payload` | jsonb | không | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `run_id`→`moodie_agent_runs` (CASCADE) · `user_id`→`auth.users` (CASCADE)

**CHECK:** `CHECK ((sequence > 0))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (3):** `app/api/moodie/runs/route.ts` · `lib/moodie/runs/repository.ts` · `lib/moodie/runs/worker.ts`


### `moodie_agent_runs`

**Số dòng (ước):** 22 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie agent runs:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `user_id` | uuid | không | — |
| `conversation_id` | uuid | có | — |
| `voice_session_id` | uuid | có | — |
| `parent_turn_id` | uuid | có | — |
| `kind` | text | không | — |
| `title` | text | không | — |
| `request` | jsonb | không | `'{}'::jsonb` |
| `status` | text | không | `'proposed'::text` |
| `requires_confirmation` | boolean | không | `false` |
| `confirmation_token_hash` | text | có | — |
| `confirmation_expires_at` | timestamp with time zone | có | — |
| `confirmed_at` | timestamp with time zone | có | — |
| `confirmed_by` | uuid | có | — |
| `started_at` | timestamp with time zone | có | — |
| `completed_at` | timestamp with time zone | có | — |
| `progress` | integer | không | `0` |
| `result` | jsonb | có | — |
| `error` | text | có | — |
| `source_refs` | jsonb | không | `'[]'::jsonb` |
| `idempotency_key` | text | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |
| `lease_token` | uuid | có | — |
| `lease_owner` | text | có | — |
| `lease_expires_at` | timestamp with time zone | có | — |
| `heartbeat_at` | timestamp with time zone | có | — |
| `attempt_count` | integer | không | `0` |
| `max_attempts` | integer | không | `3` |
| `next_attempt_at` | timestamp with time zone | có | — |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE) · `conversation_id`→`ai_conversations` (SET NULL) · `voice_session_id`→`moodie_voice_sessions` (SET NULL) · `parent_turn_id`→`ai_turns` (SET NULL) · `confirmed_by`→`auth.users` (SET NULL)

**Bị trỏ tới bởi (1):** `moodie_agent_run_events`

**CHECK:** `CHECK ((attempt_count >= 0))` · `CHECK ((kind = ANY (ARRAY['task', 'research', 'action')))` · `CHECK (((max_attempts >= 1) AND (max_attempts <= 10)))` · `CHECK (((progress >= 0) AND (progress <= 100)))` · `CHECK ((status = ANY (ARRAY['proposed', 'awaiting_confirmation', 'queued', 'running', 'completed', 'failed', 'cancelled', 'expired')))`

**GHI qua RPC (4):** `claim_moodie_agent_run` · `finish_moodie_agent_run` · `heartbeat_moodie_agent_run` · `retry_moodie_agent_run`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (5):** `app/api/moodie/runs/route.ts` · `app/api/moodie/runs/[runId]/retry/route.ts` · `lib/moodie/runs/repository.ts` · `lib/moodie/runs/worker.ts` · `tests/e2e/moodie-background-retry.spec.ts`


### `moodie_brave_audit_events`

**Số dòng (ước):** 9 · **RLS:** bật · **Policy:** 1

**Policy:** Users read own Moodie Brave audit:SELECT

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `user_id` | uuid | không | — |
| `mode` | text | không | — |
| `query_fingerprint` | text | không | — |
| `status` | text | không | — |
| `result_count` | integer | không | `0` |
| `duration_ms` | integer | có | — |
| `estimated_cost_microusd` | bigint | không | `0` |
| `error_code` | text | có | — |
| `created_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE)

**CHECK:** `CHECK ((mode = ANY (ARRAY['web', 'news', 'local')))` · `CHECK ((status = ANY (ARRAY['reserved', 'completed', 'failed')))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**

> 🔴 **Không đường ghi nào tìm thấy** — bảng này có thể đã chết hoặc chỉ nhận dữ liệu từ ngoài hệ thống.


### `moodie_brave_usage_daily`

**Số dòng (ước):** 2 · **RLS:** bật · **Policy:** 1

**Policy:** Users read own Moodie Brave usage:SELECT

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `usage_date` | date | không | `CURRENT_DATE` |
| `user_id` | uuid | không | — |
| `call_count` | integer | không | `0` |
| `result_count` | integer | không | `0` |
| `estimated_cost_microusd` | bigint | không | `0` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE)

**CHECK:** `CHECK ((call_count >= 0))` · `CHECK ((estimated_cost_microusd >= 0))` · `CHECK ((result_count >= 0))`

**GHI qua RPC (1):** `reserve_moodie_brave_call`

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (0):** — **không file nào truy vấn trực tiếp**


### `moodie_memories`

**Số dòng (ước):** 1 · **RLS:** bật · **Policy:** 2

**Policy:** Moodie memories read scoped:SELECT, Moodie memories write own or managed studio:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `scope` | text | không | — |
| `user_id` | uuid | có | — |
| `conversation_id` | uuid | có | — |
| `memory_type` | text | không | — |
| `content` | text | không | — |
| `source_message_id` | uuid | có | — |
| `confidence` | numeric | không | `0.70` |
| `status` | text | không | `'pending'::text` |
| `expires_at` | timestamp with time zone | có | — |
| `last_confirmed_at` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |
| `subject` | text | có | — |
| `predicate` | text | có | — |
| `value` | jsonb | có | — |
| `importance` | numeric | không | `0.50` |
| `source_message_ids` | ARRAY | không | `'{}'::uuid[]` |
| `supersedes_memory_id` | uuid | có | — |
| `last_used_at` | timestamp with time zone | có | — |
| `use_count` | integer | không | `0` |
| `embedding` | jsonb | có | — |
| `embedding_model` | text | có | — |
| `embedding_updated_at` | timestamp with time zone | có | — |
| `reconfirmation_interval_days` | integer | có | — |
| `review_after` | timestamp with time zone | có | — |
| `archived_reason` | text | có | — |
| `deleted_at` | timestamp with time zone | có | — |
| `consolidated_into_memory_id` | uuid | có | — |
| `source_voice_turn_id` | uuid | có | — |

**Trỏ ra:** `source_voice_turn_id`→`moodie_voice_turns` (SET NULL) · `user_id`→`auth.users` (CASCADE) · `conversation_id`→`ai_conversations` (SET NULL) · `source_message_id`→`ai_messages` (SET NULL) · `supersedes_memory_id`→`moodie_memories` (SET NULL) · `consolidated_into_memory_id`→`moodie_memories` (SET NULL)

**Bị trỏ tới bởi (2):** `moodie_memories` · `moodie_memory_relations`

**Trigger:** `emit_realtime_signal`→emit_realtime_signal()

**CHECK:** `CHECK ((((scope = 'studio') AND (user_id IS NULL)) OR ((scope = 'user') AND (user_id IS NOT NULL)) OR ((scope = 'conversation') AND (user_id IS NOT NULL) AND (conversation_id IS NOT NULL))))` · `CHECK (((confidence >= (0)) AND (confidence <= (1))))` · `CHECK (((char_length(content) >= 1) AND (char_length(content) <= 1000)))` · `CHECK (((importance >= (0)) AND (importance <= (1))))` · `CHECK ((memory_type = ANY (ARRAY['identity', 'preference', 'instruction', 'goal', 'project', 'decision', 'relationship', 'episodic', 'studio_knowledge', 'fact', 'summary')))` · `CHECK (((reconfirmation_interval_days >= 1) AND (reconfirmation_interval_days <= 3650)))` · `CHECK ((scope = ANY (ARRAY['user', 'studio', 'conversation')))` · `CHECK ((status = ANY (ARRAY['pending', 'active', 'needs_confirmation', 'archived', 'deleted')))` · `CHECK ((use_count >= 0))`

**GHI qua RPC (2):** `finalize_moodie_memory_consolidation` · `maintain_moodie_memory_lifecycle`

**ĐỌC qua RPC (1):** `match_moodie_memories`

**Chạm từ mã nguồn (5):** `app/actions/moodie-memory-actions.ts` · `lib/moodie/memory-consolidator.ts` · `lib/moodie/memory-store.ts` · `tests/e2e/moodie-memory-runtime.spec.ts` · `tests/integration/moodie-memory-runtime-live.test.ts`


### `moodie_memory_relations`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie memory relations:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `user_id` | uuid | không | — |
| `source_memory_id` | uuid | không | — |
| `target_memory_id` | uuid | không | — |
| `relation_type` | text | không | — |
| `confidence` | numeric | không | `0.80` |
| `created_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE) · `source_memory_id`→`moodie_memories` (CASCADE) · `target_memory_id`→`moodie_memories` (CASCADE)

**CHECK:** `CHECK ((source_memory_id <> target_memory_id))` · `CHECK (((confidence >= (0)) AND (confidence <= (1))))` · `CHECK ((relation_type = ANY (ARRAY['supersedes', 'extends', 'contradicts', 'related')))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `lib/moodie/memory-store.ts` · `tests/integration/moodie-memory-runtime-live.test.ts`


### `moodie_message_feedback`

**Số dòng (ước):** 0 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie feedback:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `user_id` | uuid | không | — |
| `conversation_id` | uuid | không | — |
| `message_id` | uuid | không | — |
| `rating` | smallint | không | — |
| `note` | text | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE) · `conversation_id`→`ai_conversations` (CASCADE) · `message_id`→`ai_messages` (CASCADE)

**CHECK:** `CHECK ((rating = ANY (ARRAY['-1', 1])))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/actions/moodie-mutations.ts`


### `moodie_observations`

**Số dòng (ước):** 65 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie observations:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `user_id` | uuid | không | — |
| `conversation_id` | uuid | có | — |
| `turn_id` | uuid | có | — |
| `route_intent` | text | có | — |
| `prompt_summary` | text | không | — |
| `outcome_summary` | text | có | — |
| `tool_names` | ARRAY | không | `'{}'::text[]` |
| `succeeded` | boolean | không | `true` |
| `reflected_at` | timestamp with time zone | có | — |
| `created_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE) · `conversation_id`→`ai_conversations` (CASCADE)

**CHECK:** `CHECK (((outcome_summary IS NULL) OR (char_length(outcome_summary) <= 1000)))` · `CHECK (((char_length(prompt_summary) >= 1) AND (char_length(prompt_summary) <= 600)))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (3):** `lib/moodie/observation-store.ts` · `tests/e2e/moodie-memory-runtime.spec.ts` · `tests/integration/moodie-memory-runtime-live.test.ts`


### `moodie_voice_events`

**Số dòng (ước):** 3436 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie voice events:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | bigint | không | — |
| `session_id` | uuid | không | — |
| `turn_id` | uuid | có | — |
| `user_id` | uuid | không | — |
| `event_type` | text | không | — |
| `sequence` | integer | không | — |
| `payload` | jsonb | không | `'{}'::jsonb` |
| `occurred_at` | timestamp with time zone | không | `now()` |
| `created_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `session_id`→`moodie_voice_sessions` (CASCADE) · `turn_id`→`moodie_voice_turns` (SET NULL) · `user_id`→`auth.users` (CASCADE)

**CHECK:** `CHECK ((sequence > 0))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `app/api/moodie/voice/events/route.ts` · `app/api/moodie/voice/token/route.ts`


### `moodie_voice_sessions`

**Số dòng (ước):** 43 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie voice sessions:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `user_id` | uuid | không | — |
| `conversation_id` | uuid | có | — |
| `engine` | text | không | `'live'::text` |
| `model` | text | không | — |
| `voice` | text | không | — |
| `status` | text | không | `'issued'::text` |
| `policy_version` | integer | không | `1` |
| `memory_packet_version` | integer | không | `1` |
| `reconnect_count` | integer | không | `0` |
| `client_metadata` | jsonb | không | `'{}'::jsonb` |
| `last_event_at` | timestamp with time zone | không | `now()` |
| `started_at` | timestamp with time zone | không | `now()` |
| `connected_at` | timestamp with time zone | có | — |
| `ended_at` | timestamp with time zone | có | — |
| `error` | text | có | — |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `user_id`→`auth.users` (CASCADE) · `conversation_id`→`ai_conversations` (SET NULL)

**Bị trỏ tới bởi (3):** `moodie_voice_turns` · `moodie_voice_events` · `moodie_agent_runs`

**CHECK:** `CHECK ((engine = ANY (ARRAY['live', 'cascade')))` · `CHECK ((reconnect_count >= 0))` · `CHECK ((status = ANY (ARRAY['issued', 'connecting', 'connected', 'ended', 'failed')))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (2):** `app/api/moodie/voice/events/route.ts` · `app/api/moodie/voice/token/route.ts`


### `moodie_voice_turns`

**Số dòng (ước):** 148 · **RLS:** bật · **Policy:** 1

**Policy:** Users manage own Moodie voice turns:ALL

| Cột | Kiểu | Null | Mặc định / dẫn xuất |
|---|---|---|---|
| `id` | uuid | không | `gen_random_uuid()` |
| `session_id` | uuid | không | — |
| `user_id` | uuid | không | — |
| `sequence` | integer | không | — |
| `user_transcript` | text | có | — |
| `assistant_transcript` | text | có | — |
| `first_input_at` | timestamp with time zone | có | — |
| `first_input_transcript_at` | timestamp with time zone | có | — |
| `first_assistant_audio_at` | timestamp with time zone | có | — |
| `playback_started_at` | timestamp with time zone | có | — |
| `completed_at` | timestamp with time zone | có | — |
| `interrupted` | boolean | không | `false` |
| `delegated_run_ids` | ARRAY | không | `'{}'::uuid[]` |
| `metrics` | jsonb | không | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | không | `now()` |
| `updated_at` | timestamp with time zone | không | `now()` |

**Trỏ ra:** `session_id`→`moodie_voice_sessions` (CASCADE) · `user_id`→`auth.users` (CASCADE)

**Bị trỏ tới bởi (2):** `moodie_memories` · `moodie_voice_events`

**CHECK:** `CHECK ((sequence > 0))`

**GHI qua RPC (0):** — không hàm DB nào ghi

**ĐỌC qua RPC (0):** —

**Chạm từ mã nguồn (1):** `app/api/moodie/voice/events/route.ts`


## Hàm DB

| Hàm | Trả về | Quyền | Tính chất | Bảng chạm | Gọi từ mã nguồn |
|---|---|---|---|---|---|
| `claim_moodie_agent_run(p_worker_id text, p_lease_seconds integer)` | `SETOF moodie_agent_runs` | **DEFINER** | VOLATILE | moodie_agent_runs | 1 file |
| `finalize_moodie_memory_consolidation(p_user_id uuid, p_source_ids uuid[], p_content text, p_value jsonb, p_)` | `uuid` | **DEFINER** | VOLATILE | moodie_memories | 1 file |
| `finish_moodie_agent_run(p_run_id uuid, p_lease_token uuid, p_status text, p_result jsonb, p_er)` | `SETOF moodie_agent_runs` | **DEFINER** | VOLATILE | moodie_agent_runs | 1 file |
| `heartbeat_moodie_agent_run(p_run_id uuid, p_lease_token uuid, p_progress integer, p_lease_seconds)` | `boolean` | **DEFINER** | VOLATILE | moodie_agent_runs | 1 file |
| `maintain_moodie_memory_lifecycle(p_limit integer)` | `TABLE(expired_count integer, reconfirm_count integer)` | **DEFINER** | VOLATILE | moodie_memories | 1 file |
| `match_moodie_memories(p_user_id uuid, p_conversation_id uuid, p_query_text text, p_query_emb)` | `TABLE(id uuid, scope text, memory_type text, content text, subject text, predicate text, importance numeric, updated_at timestamp with time zone, use_count integer, score double precision)` | invoker | STABLE | moodie_memories | 1 file |
| `reserve_moodie_brave_call(p_user_id uuid, p_daily_limit integer, p_studio_daily_limit integer, p)` | `TABLE(user_call_count integer, studio_call_count bigint)` | **DEFINER** | VOLATILE | moodie_brave_usage_daily | 1 file |
| `retry_moodie_agent_run(p_run_id uuid, p_lease_token uuid, p_error text, p_delay_seconds integ)` | `SETOF moodie_agent_runs` | **DEFINER** | VOLATILE | moodie_agent_runs | 1 file |
| `sync_ai_conversation_message_count()` | `trigger` | **DEFINER** | VOLATILE | ai_conversations | **0 — không ai gọi** |

Thân đầy đủ từng hàm: `vault/30-du-lieu/than-ham/`.

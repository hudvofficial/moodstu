---
title: "Lược đồ DB — Moodie (AI trợ lý)"
tags: [du-lieu, schema, moodie-ai]
sinh-tu: "introspect DB thật (pooler) — regenerate bằng scripts/vault-gen-schema.mjs"
cap-nhat: 2026-08-07
---

# Lược đồ DB — Moodie (AI trợ lý)

> Sinh tự động từ **DB production thật** (không phải từ `types/database.types.ts`). Sau mỗi migration nhớ chạy cả `npm run db:types` — xem [[canh-bao-schema]].

Module liên quan: [[moodie-ai]]

| Bảng | Số dòng | RLS | Policy |
|---|---:|---|---:|
| `ai_conversations` | 60 | ✅ | 1 |
| `ai_messages` | 367 | ✅ | 1 |
| `ai_turns` | 144 | ✅ | 1 |
| `moodie_action_approvals` | 0 | ✅ | 1 |
| `moodie_agent_run_events` | 22 | ✅ | 1 |
| `moodie_agent_runs` | 22 | ✅ | 1 |
| `moodie_brave_audit_events` | 9 | ✅ | 1 |
| `moodie_brave_usage_daily` | 2 | ✅ | 1 |
| `moodie_memories` | 1 | ✅ | 2 |
| `moodie_memory_relations` | 0 | ✅ | 1 |
| `moodie_message_feedback` | 0 | ✅ | 1 |
| `moodie_observations` | 62 | ✅ | 1 |
| `moodie_voice_events` | 3279 | ✅ | 1 |
| `moodie_voice_sessions` | 42 | ✅ | 1 |
| `moodie_voice_turns` | 143 | ✅ | 1 |

## `ai_conversations`

60 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL |  |
| `title` | text | NOT NULL | `'Cuộc trò chuyện mới'` |
| `last_message_preview` | text |  |  |
| `locked_until` | timestamptz |  |  |
| `locked_by` | uuid |  |  |
| `version` | int | NOT NULL | `1` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |
| `message_count` | int | NOT NULL | `0` |
| `summary` | text |  |  |
| `summary_updated_at` | timestamptz |  |  |
| `active_leaf_message_id` | uuid |  |  |

**Trỏ ra:** `active_leaf_message_id` → `ai_messages.id` (ON DELETE SET NULL)

**Bị trỏ tới bởi:** `moodie_observations.conversation_id` · `moodie_agent_runs.conversation_id` · `moodie_voice_sessions.conversation_id` · `moodie_message_feedback.conversation_id` · `ai_turns.conversation_id` · `moodie_action_approvals.conversation_id` · `moodie_memories.conversation_id` · `ai_messages.conversation_id`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (user_id, updated_at DESC)`
- `btree (locked_until)`

</details>

## `ai_messages`

367 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `conversation_id` | uuid | NOT NULL |  |
| `role` | text | NOT NULL |  |
| `content` | text | NOT NULL |  |
| `metadata` | jsonb |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `parent_message_id` | uuid |  |  |
| `revision` | int | NOT NULL | `1` |
| `status` | text | NOT NULL | `'completed'` |
| `request_id` | uuid |  |  |

**Trỏ ra:** `parent_message_id` → `ai_messages.id` (ON DELETE SET NULL) · `conversation_id` → `ai_conversations.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `moodie_message_feedback.message_id` · `moodie_memories.source_message_id` · `ai_conversations.active_leaf_message_id` · `ai_messages.parent_message_id`

**Trigger:** `sync_ai_conversation_message_count` → `sync_ai_conversation_message_count()`

**CHECK:** `CHECK ((role = ANY (ARRAY['user', 'assistant'])))` · `CHECK ((status = ANY (ARRAY['pending', 'streaming', 'completed', 'failed', 'cancelled'])))`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `btree (conversation_id, created_at)`
- `btree (parent_message_id, revision)`
- `btree (request_id)`

</details>

## `ai_turns`

144 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL |  |
| `request_id` | uuid | NOT NULL |  |
| `conversation_id` | uuid |  |  |
| `user_id` | uuid | NOT NULL |  |
| `status` | text | NOT NULL | `'accepted'` |
| `last_sequence` | int | NOT NULL | `0` |
| `error` | text |  |  |
| `started_at` | timestamptz | NOT NULL | `now()` |
| `completed_at` | timestamptz |  |  |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `conversation_id` → `ai_conversations.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `moodie_agent_runs.parent_turn_id`

**CHECK:** `CHECK ((status = ANY (ARRAY['accepted', 'running', 'saving', 'completed', 'failed', 'cancelled'])))`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (request_id)`
- `btree (user_id, updated_at DESC)`
- `btree (conversation_id, updated_at DESC)`

</details>

## `moodie_action_approvals`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL |  |
| `conversation_id` | uuid |  |  |
| `action_kind` | text | NOT NULL |  |
| `action_label` | text | NOT NULL |  |
| `payload` | jsonb | NOT NULL | `'{}'` |
| `risk` | text | NOT NULL |  |
| `status` | text | NOT NULL | `'pending'` |
| `expires_at` | timestamptz | NOT NULL | `(now() + '00:10:00')` |
| `approved_at` | timestamptz |  |  |
| `executed_at` | timestamptz |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `conversation_id` → `ai_conversations.id` (ON DELETE SET NULL)

**CHECK:** `CHECK (((char_length(action_label) >= 1) AND (char_length(action_label) <= 160)))` · `CHECK ((risk = ANY (ARRAY['none', 'low', 'medium', 'high'])))` · `CHECK ((status = ANY (ARRAY['pending', 'approved', 'rejected', 'executed', 'expired'])))`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (user_id, status, created_at DESC)`

</details>

## `moodie_agent_run_events`

22 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | bigint | NOT NULL |  |
| `run_id` | uuid | NOT NULL |  |
| `user_id` | uuid | NOT NULL |  |
| `sequence` | int | NOT NULL |  |
| `event_type` | text | NOT NULL |  |
| `message` | text |  |  |
| `payload` | jsonb | NOT NULL | `'{}'` |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `run_id` → `moodie_agent_runs.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((sequence > 0))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (run_id, sequence)`
- `btree (run_id, sequence)`

</details>

## `moodie_agent_runs`

22 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL |  |
| `conversation_id` | uuid |  |  |
| `voice_session_id` | uuid |  |  |
| `parent_turn_id` | uuid |  |  |
| `kind` | text | NOT NULL |  |
| `title` | text | NOT NULL |  |
| `request` | jsonb | NOT NULL | `'{}'` |
| `status` | text | NOT NULL | `'proposed'` |
| `requires_confirmation` | bool | NOT NULL | `false` |
| `confirmation_token_hash` | text |  |  |
| `confirmation_expires_at` | timestamptz |  |  |
| `confirmed_at` | timestamptz |  |  |
| `confirmed_by` | uuid |  |  |
| `started_at` | timestamptz |  |  |
| `completed_at` | timestamptz |  |  |
| `progress` | int | NOT NULL | `0` |
| `result` | jsonb |  |  |
| `error` | text |  |  |
| `source_refs` | jsonb | NOT NULL | `'[]'` |
| `idempotency_key` | text |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |
| `lease_token` | uuid |  |  |
| `lease_owner` | text |  |  |
| `lease_expires_at` | timestamptz |  |  |
| `heartbeat_at` | timestamptz |  |  |
| `attempt_count` | int | NOT NULL | `0` |
| `max_attempts` | int | NOT NULL | `3` |
| `next_attempt_at` | timestamptz |  |  |

**Trỏ ra:** `parent_turn_id` → `ai_turns.id` (ON DELETE SET NULL) · `voice_session_id` → `moodie_voice_sessions.id` (ON DELETE SET NULL) · `conversation_id` → `ai_conversations.id` (ON DELETE SET NULL)

**Bị trỏ tới bởi:** `moodie_agent_run_events.run_id`

**CHECK:** `CHECK ((attempt_count >= 0))` · `CHECK ((kind = ANY (ARRAY['task', 'research', 'action'])))` · `CHECK (((max_attempts >= 1) AND (max_attempts <= 10)))` · `CHECK (((progress >= 0) AND (progress <= 100)))` · `CHECK ((status = ANY (ARRAY['proposed', 'awaiting_confirmation', 'queued', 'running', 'completed', 'failed', 'cancelled', 'expired'])))`

<details><summary>6 index</summary>

- `btree (status, next_attempt_at, created_at) WHERE (status = 'queued'::text)`
- `UNIQUE btree (id)`
- `UNIQUE btree (user_id, idempotency_key) WHERE (idempotency_key IS NOT NULL)`
- `btree (user_id, updated_at DESC)`
- `btree (status, updated_at)`
- `btree (status, lease_expires_at, created_at) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text]))`

</details>

## `moodie_brave_audit_events`

9 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL |  |
| `mode` | text | NOT NULL |  |
| `query_fingerprint` | text | NOT NULL |  |
| `status` | text | NOT NULL |  |
| `result_count` | int | NOT NULL | `0` |
| `duration_ms` | int |  |  |
| `estimated_cost_microusd` | bigint | NOT NULL | `0` |
| `error_code` | text |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |

**CHECK:** `CHECK ((mode = ANY (ARRAY['web', 'news', 'local'])))` · `CHECK ((status = ANY (ARRAY['reserved', 'completed', 'failed'])))`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (user_id, created_at DESC)`

</details>

## `moodie_brave_usage_daily`

2 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `usage_date` | date | NOT NULL | `CURRENT_DATE` |
| `user_id` | uuid | NOT NULL |  |
| `call_count` | int | NOT NULL | `0` |
| `result_count` | int | NOT NULL | `0` |
| `estimated_cost_microusd` | bigint | NOT NULL | `0` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**CHECK:** `CHECK ((call_count >= 0))` · `CHECK ((estimated_cost_microusd >= 0))` · `CHECK ((result_count >= 0))`

<details><summary>1 index</summary>

- `UNIQUE btree (usage_date, user_id)`

</details>

## `moodie_memories`

1 dòng · RLS bật · 2 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `scope` | text | NOT NULL |  |
| `user_id` | uuid |  |  |
| `conversation_id` | uuid |  |  |
| `memory_type` | text | NOT NULL |  |
| `content` | text | NOT NULL |  |
| `source_message_id` | uuid |  |  |
| `confidence` | numeric | NOT NULL | `0.70` |
| `status` | text | NOT NULL | `'pending'` |
| `expires_at` | timestamptz |  |  |
| `last_confirmed_at` | timestamptz |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |
| `subject` | text |  |  |
| `predicate` | text |  |  |
| `value` | jsonb |  |  |
| `importance` | numeric | NOT NULL | `0.50` |
| `source_message_ids` | uuid[] | NOT NULL | `'{}'` |
| `supersedes_memory_id` | uuid |  |  |
| `last_used_at` | timestamptz |  |  |
| `use_count` | int | NOT NULL | `0` |
| `embedding` | jsonb |  |  |
| `embedding_model` | text |  |  |
| `embedding_updated_at` | timestamptz |  |  |
| `reconfirmation_interval_days` | int |  |  |
| `review_after` | timestamptz |  |  |
| `archived_reason` | text |  |  |
| `deleted_at` | timestamptz |  |  |
| `consolidated_into_memory_id` | uuid |  |  |
| `source_voice_turn_id` | uuid |  |  |

**Trỏ ra:** `consolidated_into_memory_id` → `moodie_memories.id` (ON DELETE SET NULL) · `supersedes_memory_id` → `moodie_memories.id` (ON DELETE SET NULL) · `source_message_id` → `ai_messages.id` (ON DELETE SET NULL) · `conversation_id` → `ai_conversations.id` (ON DELETE SET NULL) · `source_voice_turn_id` → `moodie_voice_turns.id` (ON DELETE SET NULL)

**Bị trỏ tới bởi:** `moodie_memory_relations.target_memory_id` · `moodie_memory_relations.source_memory_id` · `moodie_memories.consolidated_into_memory_id` · `moodie_memories.supersedes_memory_id`

**Trigger:** `emit_realtime_signal` → `emit_realtime_signal()`

**CHECK:** `CHECK ((((scope = 'studio') AND (user_id IS NULL)) OR ((scope = 'user') AND (user_id IS NOT NULL)) OR ((scope = 'conversation') AND (user_id IS NOT NULL) AND (conversation_id IS NOT NULL))))` · `CHECK (((confidence >= (0)) AND (confidence <= (1))))` · `CHECK (((char_length(content) >= 1) AND (char_length(content) <= 1000)))` · `CHECK (((importance >= (0)) AND (importance <= (1))))` · `CHECK ((memory_type = ANY (ARRAY['identity', 'preference', 'instruction', 'goal', 'project', 'decision', 'relationship', 'episodic', 'studio_knowledge', 'fact', 'summary'])))` · `CHECK (((reconfirmation_interval_days >= 1) AND (reconfirmation_interval_days <= 3650)))` · `CHECK ((scope = ANY (ARRAY['user', 'studio', 'conversation'])))` · `CHECK ((status = ANY (ARRAY['pending', 'active', 'needs_confirmation', 'archived', 'deleted'])))` · `CHECK ((use_count >= 0))`

<details><summary>12 index</summary>

- `btree (status, review_after) WHERE ((status = 'active'::text) AND (review_after IS NOT NULL))`
- `btree (status, expires_at) WHERE ((status = 'active'::text) AND (expires_at IS NOT NULL))`
- `btree (user_id, supersedes_memory_id) WHERE (supersedes_memory_id IS NOT NULL)`
- `btree (source_voice_turn_id) WHERE (source_voice_turn_id IS NOT NULL)`
- `UNIQUE btree (id)`
- `btree (user_id, memory_type, updated_at DESC) WHERE (status = 'active'::text)`
- `btree (conversation_id, updated_at DESC) WHERE (status = 'active'::text)`
- `btree (memory_type, updated_at DESC) WHERE ((scope = 'studio'::text) AND (status = 'active'::text))`
- `btree (user_id, subject, predicate, status, updated_at DESC)`
- `btree (user_id, memory_type, status, importance DESC, updated_at DESC) WHERE (memory_type = ANY (ARRAY['goal'::text, 'project'::text, 'decision'::text]))`
- `gin (value)`
- `btree (updated_at DESC) WHERE ((status = 'active'::text) AND (embedding IS NULL))`

</details>

## `moodie_memory_relations`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL |  |
| `source_memory_id` | uuid | NOT NULL |  |
| `target_memory_id` | uuid | NOT NULL |  |
| `relation_type` | text | NOT NULL |  |
| `confidence` | numeric | NOT NULL | `0.80` |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `target_memory_id` → `moodie_memories.id` (ON DELETE CASCADE) · `source_memory_id` → `moodie_memories.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((source_memory_id <> target_memory_id))` · `CHECK (((confidence >= (0)) AND (confidence <= (1))))` · `CHECK ((relation_type = ANY (ARRAY['supersedes', 'extends', 'contradicts', 'related'])))`

<details><summary>4 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (source_memory_id, target_memory_id, relation_type)`
- `btree (user_id, source_memory_id)`
- `btree (user_id, target_memory_id)`

</details>

## `moodie_message_feedback`

0 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL |  |
| `conversation_id` | uuid | NOT NULL |  |
| `message_id` | uuid | NOT NULL |  |
| `rating` | smallint | NOT NULL |  |
| `note` | text |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `message_id` → `ai_messages.id` (ON DELETE CASCADE) · `conversation_id` → `ai_conversations.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((rating = ANY (ARRAY['-1', 1])))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (user_id, message_id)`
- `btree (message_id)`

</details>

## `moodie_observations`

62 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL |  |
| `conversation_id` | uuid |  |  |
| `turn_id` | uuid |  |  |
| `route_intent` | text |  |  |
| `prompt_summary` | text | NOT NULL |  |
| `outcome_summary` | text |  |  |
| `tool_names` | text[] | NOT NULL | `'{}'` |
| `succeeded` | bool | NOT NULL | `true` |
| `reflected_at` | timestamptz |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `conversation_id` → `ai_conversations.id` (ON DELETE CASCADE)

**CHECK:** `CHECK (((outcome_summary IS NULL) OR (char_length(outcome_summary) <= 1000)))` · `CHECK (((char_length(prompt_summary) >= 1) AND (char_length(prompt_summary) <= 600)))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `btree (user_id, created_at DESC)`
- `btree (user_id, created_at) WHERE (succeeded AND (reflected_at IS NULL))`

</details>

## `moodie_voice_events`

3279 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | bigint | NOT NULL |  |
| `session_id` | uuid | NOT NULL |  |
| `turn_id` | uuid |  |  |
| `user_id` | uuid | NOT NULL |  |
| `event_type` | text | NOT NULL |  |
| `sequence` | int | NOT NULL |  |
| `payload` | jsonb | NOT NULL | `'{}'` |
| `occurred_at` | timestamptz | NOT NULL | `now()` |
| `created_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `turn_id` → `moodie_voice_turns.id` (ON DELETE SET NULL) · `session_id` → `moodie_voice_sessions.id` (ON DELETE CASCADE)

**CHECK:** `CHECK ((sequence > 0))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (session_id, sequence)`
- `btree (session_id, sequence)`

</details>

## `moodie_voice_sessions`

42 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `user_id` | uuid | NOT NULL |  |
| `conversation_id` | uuid |  |  |
| `engine` | text | NOT NULL | `'live'` |
| `model` | text | NOT NULL |  |
| `voice` | text | NOT NULL |  |
| `status` | text | NOT NULL | `'issued'` |
| `policy_version` | int | NOT NULL | `1` |
| `memory_packet_version` | int | NOT NULL | `1` |
| `reconnect_count` | int | NOT NULL | `0` |
| `client_metadata` | jsonb | NOT NULL | `'{}'` |
| `last_event_at` | timestamptz | NOT NULL | `now()` |
| `started_at` | timestamptz | NOT NULL | `now()` |
| `connected_at` | timestamptz |  |  |
| `ended_at` | timestamptz |  |  |
| `error` | text |  |  |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `conversation_id` → `ai_conversations.id` (ON DELETE SET NULL)

**Bị trỏ tới bởi:** `moodie_agent_runs.voice_session_id` · `moodie_voice_events.session_id` · `moodie_voice_turns.session_id`

**CHECK:** `CHECK ((engine = ANY (ARRAY['live', 'cascade'])))` · `CHECK ((reconnect_count >= 0))` · `CHECK ((status = ANY (ARRAY['issued', 'connecting', 'connected', 'ended', 'failed'])))`

<details><summary>2 index</summary>

- `UNIQUE btree (id)`
- `btree (user_id, started_at DESC)`

</details>

## `moodie_voice_turns`

143 dòng · RLS bật · 1 policy

| Cột | Kiểu | Null | Mặc định |
|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` |
| `session_id` | uuid | NOT NULL |  |
| `user_id` | uuid | NOT NULL |  |
| `sequence` | int | NOT NULL |  |
| `user_transcript` | text |  |  |
| `assistant_transcript` | text |  |  |
| `first_input_at` | timestamptz |  |  |
| `first_input_transcript_at` | timestamptz |  |  |
| `first_assistant_audio_at` | timestamptz |  |  |
| `playback_started_at` | timestamptz |  |  |
| `completed_at` | timestamptz |  |  |
| `interrupted` | bool | NOT NULL | `false` |
| `delegated_run_ids` | uuid[] | NOT NULL | `'{}'` |
| `metrics` | jsonb | NOT NULL | `'{}'` |
| `created_at` | timestamptz | NOT NULL | `now()` |
| `updated_at` | timestamptz | NOT NULL | `now()` |

**Trỏ ra:** `session_id` → `moodie_voice_sessions.id` (ON DELETE CASCADE)

**Bị trỏ tới bởi:** `moodie_voice_events.turn_id` · `moodie_memories.source_voice_turn_id`

**CHECK:** `CHECK ((sequence > 0))`

<details><summary>3 index</summary>

- `UNIQUE btree (id)`
- `UNIQUE btree (session_id, sequence)`
- `btree (session_id, sequence)`

</details>

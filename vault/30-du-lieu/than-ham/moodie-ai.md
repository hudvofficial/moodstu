---
title: "Thân hàm DB — moodie-ai"
tags: [sinh-tu-dong, db, ham, moodie-ai]
cap-nhat: 2026-09-11
trang-thai: sinh-tu-dong
nguon: pg_proc · pg_policies · information_schema.role_table_grants
---

> ⚙️ **File này do `scripts/vault-gen-db-truth.mjs` sinh ra từ database production. ĐỪNG sửa tay** — chạy lại script để cập nhật.

# Thân hàm DB — moodie-ai

9 hàm. `SECURITY DEFINER` = chạy bằng quyền chủ hàm, **bỏ qua RLS** → hàm loại này phải tự kiểm quyền bên trong.

| Hàm | Tham số | Trả về | Quyền | Ngôn ngữ |
|---|---|---|---|---|
| [`claim_moodie_agent_run`](#claim_moodie_agent_run) | `p_worker_id text, p_lease_seconds integer` | `SETOF moodie_agent_runs` | **DEFINER** | plpgsql |
| [`finalize_moodie_memory_consolidation`](#finalize_moodie_memory_consolidation) | `p_user_id uuid, p_source_ids uuid[], p_content text, p_value jsonb, p_confidence numeric, p_importance numeric` | `uuid` | **DEFINER** | plpgsql |
| [`finish_moodie_agent_run`](#finish_moodie_agent_run) | `p_run_id uuid, p_lease_token uuid, p_status text, p_result jsonb, p_error text, p_source_refs jsonb` | `SETOF moodie_agent_runs` | **DEFINER** | plpgsql |
| [`heartbeat_moodie_agent_run`](#heartbeat_moodie_agent_run) | `p_run_id uuid, p_lease_token uuid, p_progress integer, p_lease_seconds integer` | `boolean` | **DEFINER** | plpgsql |
| [`maintain_moodie_memory_lifecycle`](#maintain_moodie_memory_lifecycle) | `p_limit integer` | `TABLE(expired_count integer, reconfirm_count integer)` | **DEFINER** | plpgsql |
| [`match_moodie_memories`](#match_moodie_memories) | `p_user_id uuid, p_conversation_id uuid, p_query_text text, p_query_embedding jsonb, p_limit integer` | `TABLE(id uuid, scope text, memory_type text, content text, subject text, predicate text, importance numeric, updated_at timestamp with time zone, use_count integer, score double precision)` | invoker | sql |
| [`reserve_moodie_brave_call`](#reserve_moodie_brave_call) | `p_user_id uuid, p_daily_limit integer, p_studio_daily_limit integer, p_estimated_cost_microusd bigint` | `TABLE(user_call_count integer, studio_call_count bigint)` | **DEFINER** | plpgsql |
| [`retry_moodie_agent_run`](#retry_moodie_agent_run) | `p_run_id uuid, p_lease_token uuid, p_error text, p_delay_seconds integer` | `SETOF moodie_agent_runs` | **DEFINER** | plpgsql |
| [`sync_ai_conversation_message_count`](#sync_ai_conversation_message_count) | `—` | `trigger` | **DEFINER** | plpgsql |

---

## claim_moodie_agent_run

`claim_moodie_agent_run(p_worker_id text, p_lease_seconds integer)` → `SETOF moodie_agent_runs` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE v_run_id UUID; v_now TIMESTAMPTZ := now();
BEGIN
  SELECT id INTO v_run_id FROM public.moodie_agent_runs
  WHERE (
    (status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= v_now))
    OR (status = 'running' AND lease_expires_at < v_now AND attempt_count < max_attempts)
  )
  AND attempt_count < max_attempts
  ORDER BY COALESCE(next_attempt_at, created_at), created_at
  FOR UPDATE SKIP LOCKED LIMIT 1;
  IF v_run_id IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE public.moodie_agent_runs
  SET status = 'running', lease_token = gen_random_uuid(), lease_owner = left(p_worker_id, 200),
      lease_expires_at = v_now + make_interval(secs => greatest(15, least(p_lease_seconds, 300))),
      heartbeat_at = v_now, started_at = COALESCE(started_at, v_now),
      attempt_count = attempt_count + 1, next_attempt_at = NULL, updated_at = v_now
  WHERE id = v_run_id RETURNING *;
END;
```

---

## finalize_moodie_memory_consolidation

`finalize_moodie_memory_consolidation(p_user_id uuid, p_source_ids uuid[], p_content text, p_value jsonb, p_confidence numeric, p_importance numeric)` → `uuid` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE v_summary_id UUID; v_valid_count INTEGER; v_review_after TIMESTAMPTZ := now() + interval '90 days';
BEGIN
  IF cardinality(p_source_ids) < 2 OR cardinality(p_source_ids) > 50 THEN
    RAISE EXCEPTION 'consolidation requires 2..50 source memories';
  END IF;
  IF char_length(trim(p_content)) < 1 OR char_length(trim(p_content)) > 1000 THEN
    RAISE EXCEPTION 'invalid consolidation content';
  END IF;

  SELECT count(*) INTO v_valid_count
  FROM public.moodie_memories
  WHERE id = ANY(p_source_ids) AND user_id = p_user_id
    AND scope = 'user' AND memory_type = 'episodic' AND status = 'active';
  IF v_valid_count <> cardinality(p_source_ids) THEN
    RAISE EXCEPTION 'invalid or mixed consolidation sources';
  END IF;

  INSERT INTO public.moodie_memories (
    scope, user_id, memory_type, content, confidence, importance,
    status, subject, predicate, value, source_message_ids,
    last_confirmed_at, reconfirmation_interval_days, review_after
  )
  SELECT 'user', p_user_id, 'summary', trim(p_content),
    least(1, greatest(0, p_confidence)), least(1, greatest(0, p_importance)),
    'active', 'user', 'episodic.summary', p_value,
    COALESCE(array_agg(DISTINCT message_id) FILTER (WHERE message_id IS NOT NULL), '{}'),
    now(), 90, v_review_after
  FROM public.moodie_memories source
  LEFT JOIN LATERAL unnest(source.source_message_ids) message_id ON true
  WHERE source.id = ANY(p_source_ids)
  RETURNING id INTO v_summary_id;

  UPDATE public.moodie_memories
  SET status = 'archived', archived_reason = 'consolidated',
      consolidated_into_memory_id = v_summary_id, updated_at = now()
  WHERE id = ANY(p_source_ids) AND user_id = p_user_id;

  RETURN v_summary_id;
END;
```

---

## finish_moodie_agent_run

`finish_moodie_agent_run(p_run_id uuid, p_lease_token uuid, p_status text, p_result jsonb, p_error text, p_source_refs jsonb)` → `SETOF moodie_agent_runs` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  IF p_status NOT IN ('completed', 'failed') THEN RAISE EXCEPTION 'invalid terminal status'; END IF;
  RETURN QUERY UPDATE public.moodie_agent_runs
  SET status = p_status, progress = CASE WHEN p_status = 'completed' THEN 100 ELSE progress END,
      result = CASE WHEN p_status = 'completed' THEN p_result ELSE result END,
      error = CASE WHEN p_status = 'failed' THEN left(COALESCE(p_error, 'Unknown worker failure'), 4000) ELSE NULL END,
      source_refs = COALESCE(p_source_refs, '[]'::jsonb), completed_at = now(),
      lease_token = NULL, lease_owner = NULL, lease_expires_at = NULL, updated_at = now()
  WHERE id = p_run_id AND status = 'running' AND lease_token = p_lease_token RETURNING *;
END;
```

---

## heartbeat_moodie_agent_run

`heartbeat_moodie_agent_run(p_run_id uuid, p_lease_token uuid, p_progress integer, p_lease_seconds integer)` → `boolean` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  UPDATE public.moodie_agent_runs
  SET heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(15, least(p_lease_seconds, 300))),
      progress = COALESCE(greatest(progress, least(99, greatest(0, p_progress))), progress), updated_at = now()
  WHERE id = p_run_id AND status = 'running' AND lease_token = p_lease_token;
  RETURN FOUND;
END;
```

---

## maintain_moodie_memory_lifecycle

`maintain_moodie_memory_lifecycle(p_limit integer)` → `TABLE(expired_count integer, reconfirm_count integer)` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE v_expired INTEGER := 0; v_reconfirm INTEGER := 0;
BEGIN
  WITH target AS (
    SELECT id FROM public.moodie_memories
    WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= now()
    ORDER BY expires_at LIMIT greatest(1, least(p_limit, 2000)) FOR UPDATE SKIP LOCKED
  )
  UPDATE public.moodie_memories m
  SET status = 'archived', archived_reason = 'expired', updated_at = now()
  FROM target WHERE m.id = target.id;
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  WITH target AS (
    SELECT id FROM public.moodie_memories
    WHERE status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
      AND review_after IS NOT NULL AND review_after <= now()
    ORDER BY review_after LIMIT greatest(1, least(p_limit, 2000)) FOR UPDATE SKIP LOCKED
  )
  UPDATE public.moodie_memories m
  SET status = 'needs_confirmation', archived_reason = 'reconfirmation_due', updated_at = now()
  FROM target WHERE m.id = target.id;
  GET DIAGNOSTICS v_reconfirm = ROW_COUNT;

  RETURN QUERY SELECT v_expired, v_reconfirm;
END;
```

---

## match_moodie_memories

`match_moodie_memories(p_user_id uuid, p_conversation_id uuid, p_query_text text, p_query_embedding jsonb, p_limit integer)` → `TABLE(id uuid, scope text, memory_type text, content text, subject text, predicate text, importance numeric, updated_at timestamp with time zone, use_count integer, score double precision)` · SECURITY INVOKER · sql · STABLE

```sql
SELECT m.id, m.scope, m.memory_type, m.content, m.subject, m.predicate,
         m.importance, m.updated_at, m.use_count,
         (
           CASE WHEN p_query_embedding IS NOT NULL AND m.embedding IS NOT NULL
             THEN greatest(0, public.moodie_jsonb_cosine_similarity(p_query_embedding, m.embedding)) * 0.45 ELSE 0 END
           + ts_rank_cd(
               to_tsvector('simple', coalesce(m.subject, '') || ' ' || coalesce(m.predicate, '') || ' ' || m.content),
               plainto_tsquery('simple', coalesce(p_query_text, ''))
             ) * 0.25
           + coalesce(m.importance, 0.5)::double precision * 0.12
           + CASE WHEN m.memory_type IN ('goal', 'project', 'decision') THEN 0.18 ELSE 0 END
           + CASE WHEN m.scope = 'conversation' THEN 0.12 WHEN m.scope = 'user' THEN 0.08 ELSE 0.04 END
           + greatest(0, 1 - extract(epoch FROM (now() - coalesce(m.last_used_at, m.updated_at))) / 15552000.0) * 0.08
         ) AS score
  FROM public.moodie_memories m
  WHERE m.status = 'active'
    AND (m.expires_at IS NULL OR m.expires_at > now())
    AND (m.review_after IS NULL OR m.review_after > now())
    AND (
      (m.scope = 'user' AND m.user_id = p_user_id)
      OR m.scope = 'studio'
      OR (m.scope = 'conversation' AND m.user_id = p_user_id AND m.conversation_id = p_conversation_id)
    )
  ORDER BY score DESC, m.updated_at DESC
  LIMIT greatest(1, least(p_limit, 20));
```

---

## reserve_moodie_brave_call

`reserve_moodie_brave_call(p_user_id uuid, p_daily_limit integer, p_studio_daily_limit integer, p_estimated_cost_microusd bigint)` → `TABLE(user_call_count integer, studio_call_count bigint)` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
DECLARE
  v_user_count INTEGER;
  v_studio_count BIGINT;
BEGIN
  IF p_daily_limit < 1 OR p_studio_daily_limit < 1 THEN
    RAISE EXCEPTION 'Invalid Brave quota configuration';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('moodie_brave:' || CURRENT_DATE::TEXT));
  SELECT COALESCE(SUM(call_count), 0) INTO v_studio_count
    FROM public.moodie_brave_usage_daily WHERE usage_date = CURRENT_DATE;
  IF v_studio_count >= p_studio_daily_limit THEN
    RAISE EXCEPTION 'MOODIE_BRAVE_STUDIO_QUOTA_EXCEEDED';
  END IF;

  INSERT INTO public.moodie_brave_usage_daily(usage_date, user_id, call_count, estimated_cost_microusd)
  VALUES (CURRENT_DATE, p_user_id, 1, p_estimated_cost_microusd)
  ON CONFLICT (usage_date, user_id) DO UPDATE SET
    call_count = public.moodie_brave_usage_daily.call_count + 1,
    estimated_cost_microusd = public.moodie_brave_usage_daily.estimated_cost_microusd + EXCLUDED.estimated_cost_microusd,
    updated_at = NOW()
  WHERE public.moodie_brave_usage_daily.call_count < p_daily_limit
  RETURNING call_count INTO v_user_count;

  IF v_user_count IS NULL THEN RAISE EXCEPTION 'MOODIE_BRAVE_USER_QUOTA_EXCEEDED'; END IF;
  RETURN QUERY SELECT v_user_count, v_studio_count + 1;
END;
```

---

## retry_moodie_agent_run

`retry_moodie_agent_run(p_run_id uuid, p_lease_token uuid, p_error text, p_delay_seconds integer)` → `SETOF moodie_agent_runs` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  RETURN QUERY UPDATE public.moodie_agent_runs
  SET status = CASE WHEN attempt_count < max_attempts THEN 'queued' ELSE 'failed' END,
      error = left(COALESCE(p_error, 'Unknown worker failure'), 4000),
      next_attempt_at = CASE WHEN attempt_count < max_attempts
        THEN now() + make_interval(secs => greatest(5, least(p_delay_seconds, 3600))) ELSE NULL END,
      completed_at = CASE WHEN attempt_count < max_attempts THEN NULL ELSE now() END,
      lease_token = NULL, lease_owner = NULL, lease_expires_at = NULL, updated_at = now()
  WHERE id = p_run_id AND status = 'running' AND lease_token = p_lease_token
  RETURNING *;
END;
```

---

## sync_ai_conversation_message_count

`sync_ai_conversation_message_count()` → `trigger` · **SECURITY DEFINER — bỏ qua RLS** · plpgsql · VOLATILE

```sql
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ai_conversations
    SET message_count = message_count + 1
    WHERE id = NEW.conversation_id;
    RETURN NEW;
  END IF;

  UPDATE public.ai_conversations
  SET message_count = GREATEST(message_count - 1, 0)
  WHERE id = OLD.conversation_id;
  RETURN OLD;
END;
```

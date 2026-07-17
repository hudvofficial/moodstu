CREATE OR REPLACE FUNCTION public.match_moodie_memories(
  p_user_id UUID,
  p_conversation_id UUID DEFAULT NULL,
  p_query_text TEXT DEFAULT '',
  p_query_embedding JSONB DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  scope TEXT,
  memory_type TEXT,
  content TEXT,
  subject TEXT,
  predicate TEXT,
  importance NUMERIC,
  updated_at TIMESTAMPTZ,
  use_count INTEGER,
  score DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.match_moodie_memories(UUID, UUID, TEXT, JSONB, INTEGER) TO authenticated, service_role;

COMMENT ON FUNCTION public.match_moodie_memories IS
  'RLS-scoped database-native hybrid memory retrieval over semantic JSON embeddings, lexical rank, scope, importance and recency (recency = last retrieval, not last edit).';

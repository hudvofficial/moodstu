CREATE OR REPLACE FUNCTION public.finalize_moodie_memory_consolidation(
  p_user_id UUID,
  p_source_ids UUID[],
  p_content TEXT,
  p_value JSONB DEFAULT '{}'::jsonb,
  p_confidence NUMERIC DEFAULT 0.85,
  p_importance NUMERIC DEFAULT 0.70
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

REVOKE ALL ON FUNCTION public.finalize_moodie_memory_consolidation(UUID, UUID[], TEXT, JSONB, NUMERIC, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_moodie_memory_consolidation(UUID, UUID[], TEXT, JSONB, NUMERIC, NUMERIC) TO service_role;

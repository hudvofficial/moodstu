ALTER TABLE public.moodie_agent_runs
  ADD COLUMN IF NOT EXISTS lease_token UUID,
  ADD COLUMN IF NOT EXISTS lease_owner TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3;

ALTER TABLE public.moodie_agent_runs
  DROP CONSTRAINT IF EXISTS moodie_agent_runs_attempt_count_check,
  ADD CONSTRAINT moodie_agent_runs_attempt_count_check CHECK (attempt_count >= 0),
  DROP CONSTRAINT IF EXISTS moodie_agent_runs_max_attempts_check,
  ADD CONSTRAINT moodie_agent_runs_max_attempts_check CHECK (max_attempts BETWEEN 1 AND 10);

CREATE INDEX IF NOT EXISTS idx_moodie_agent_runs_claimable
  ON public.moodie_agent_runs(status, lease_expires_at, created_at)
  WHERE status IN ('queued', 'running');

CREATE OR REPLACE FUNCTION public.claim_moodie_agent_run(p_worker_id TEXT, p_lease_seconds INTEGER DEFAULT 60)
RETURNS SETOF public.moodie_agent_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_run_id UUID; v_now TIMESTAMPTZ := now();
BEGIN
  SELECT id INTO v_run_id FROM public.moodie_agent_runs
  WHERE (status = 'queued' OR (status = 'running' AND lease_expires_at < v_now AND attempt_count < max_attempts))
    AND attempt_count < max_attempts
  ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
  IF v_run_id IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE public.moodie_agent_runs
  SET status = 'running', lease_token = gen_random_uuid(), lease_owner = left(p_worker_id, 200),
      lease_expires_at = v_now + make_interval(secs => greatest(15, least(p_lease_seconds, 300))),
      heartbeat_at = v_now, started_at = COALESCE(started_at, v_now),
      attempt_count = attempt_count + 1, updated_at = v_now
  WHERE id = v_run_id RETURNING *;
END; $$;

CREATE OR REPLACE FUNCTION public.heartbeat_moodie_agent_run(p_run_id UUID, p_lease_token UUID, p_progress INTEGER DEFAULT NULL, p_lease_seconds INTEGER DEFAULT 60)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.moodie_agent_runs
  SET heartbeat_at = now(),
      lease_expires_at = now() + make_interval(secs => greatest(15, least(p_lease_seconds, 300))),
      progress = COALESCE(greatest(progress, least(99, greatest(0, p_progress))), progress), updated_at = now()
  WHERE id = p_run_id AND status = 'running' AND lease_token = p_lease_token;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.finish_moodie_agent_run(p_run_id UUID, p_lease_token UUID, p_status TEXT, p_result JSONB DEFAULT NULL, p_error TEXT DEFAULT NULL, p_source_refs JSONB DEFAULT '[]'::jsonb)
RETURNS SETOF public.moodie_agent_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_status NOT IN ('completed', 'failed') THEN RAISE EXCEPTION 'invalid terminal status'; END IF;
  RETURN QUERY UPDATE public.moodie_agent_runs
  SET status = p_status, progress = CASE WHEN p_status = 'completed' THEN 100 ELSE progress END,
      result = CASE WHEN p_status = 'completed' THEN p_result ELSE result END,
      error = CASE WHEN p_status = 'failed' THEN left(COALESCE(p_error, 'Unknown worker failure'), 4000) ELSE NULL END,
      source_refs = COALESCE(p_source_refs, '[]'::jsonb), completed_at = now(),
      lease_token = NULL, lease_owner = NULL, lease_expires_at = NULL, updated_at = now()
  WHERE id = p_run_id AND status = 'running' AND lease_token = p_lease_token RETURNING *;
END; $$;

REVOKE ALL ON FUNCTION public.claim_moodie_agent_run(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_moodie_agent_run(UUID, UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_moodie_agent_run(UUID, UUID, TEXT, JSONB, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_moodie_agent_run(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_moodie_agent_run(UUID, UUID, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_moodie_agent_run(UUID, UUID, TEXT, JSONB, TEXT, JSONB) TO service_role;

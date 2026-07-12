ALTER TABLE public.moodie_agent_runs
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_moodie_agent_runs_retry_ready
  ON public.moodie_agent_runs(status, next_attempt_at, created_at)
  WHERE status = 'queued';

CREATE OR REPLACE FUNCTION public.claim_moodie_agent_run(p_worker_id TEXT, p_lease_seconds INTEGER DEFAULT 60)
RETURNS SETOF public.moodie_agent_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

CREATE OR REPLACE FUNCTION public.retry_moodie_agent_run(
  p_run_id UUID,
  p_lease_token UUID,
  p_error TEXT,
  p_delay_seconds INTEGER DEFAULT 30
)
RETURNS SETOF public.moodie_agent_runs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

REVOKE ALL ON FUNCTION public.retry_moodie_agent_run(UUID, UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_moodie_agent_run(UUID, UUID, TEXT, INTEGER) TO service_role;

CREATE TABLE IF NOT EXISTS public.moodie_brave_usage_daily (
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_count INTEGER NOT NULL DEFAULT 0 CHECK (call_count >= 0),
  result_count INTEGER NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  estimated_cost_microusd BIGINT NOT NULL DEFAULT 0 CHECK (estimated_cost_microusd >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usage_date, user_id)
);

CREATE TABLE IF NOT EXISTS public.moodie_brave_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('web', 'news', 'local')),
  query_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'completed', 'failed')),
  result_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  estimated_cost_microusd BIGINT NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moodie_brave_audit_user_created
  ON public.moodie_brave_audit_events(user_id, created_at DESC);

ALTER TABLE public.moodie_brave_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moodie_brave_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own Moodie Brave usage" ON public.moodie_brave_usage_daily;
CREATE POLICY "Users read own Moodie Brave usage" ON public.moodie_brave_usage_daily
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own Moodie Brave audit" ON public.moodie_brave_audit_events;
CREATE POLICY "Users read own Moodie Brave audit" ON public.moodie_brave_audit_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.reserve_moodie_brave_call(
  p_user_id UUID,
  p_daily_limit INTEGER DEFAULT 20,
  p_studio_daily_limit INTEGER DEFAULT 200,
  p_estimated_cost_microusd BIGINT DEFAULT 5000
) RETURNS TABLE(user_call_count INTEGER, studio_call_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

REVOKE ALL ON FUNCTION public.reserve_moodie_brave_call(UUID, INTEGER, INTEGER, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_moodie_brave_call(UUID, INTEGER, INTEGER, BIGINT) TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.moodie_brave_usage_daily FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.moodie_brave_audit_events FROM anon, authenticated;

-- Memory v3 lifecycle: reconfirmation, expiry, soft deletion evidence, and consolidation lineage.
ALTER TABLE public.moodie_memories
  DROP CONSTRAINT IF EXISTS moodie_memories_status_check;
ALTER TABLE public.moodie_memories
  ADD CONSTRAINT moodie_memories_status_check
  CHECK (status IN ('pending', 'active', 'needs_confirmation', 'archived', 'deleted'));

ALTER TABLE public.moodie_memories
  ADD COLUMN IF NOT EXISTS reconfirmation_interval_days INTEGER CHECK (reconfirmation_interval_days BETWEEN 1 AND 3650),
  ADD COLUMN IF NOT EXISTS review_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consolidated_into_memory_id UUID REFERENCES public.moodie_memories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_moodie_memories_lifecycle_review
  ON public.moodie_memories(status, review_after)
  WHERE status = 'active' AND review_after IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moodie_memories_expiry
  ON public.moodie_memories(status, expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moodie_memories_conflicts
  ON public.moodie_memories(user_id, supersedes_memory_id)
  WHERE supersedes_memory_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.maintain_moodie_memory_lifecycle(p_limit INTEGER DEFAULT 500)
RETURNS TABLE(expired_count INTEGER, reconfirm_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;

REVOKE ALL ON FUNCTION public.maintain_moodie_memory_lifecycle(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maintain_moodie_memory_lifecycle(INTEGER) TO service_role;

COMMENT ON COLUMN public.moodie_memories.review_after IS 'After this instant an active memory must be reconfirmed before further recall.';
COMMENT ON COLUMN public.moodie_memories.consolidated_into_memory_id IS 'Summary memory that replaced this episodic record during consolidation.';

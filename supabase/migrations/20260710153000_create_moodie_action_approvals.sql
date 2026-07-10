-- Moodie action approval ledger
-- Navigation actions do not need approval. Any future write action must create a pending row first.
CREATE TABLE IF NOT EXISTS public.moodie_action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  action_kind TEXT NOT NULL,
  action_label TEXT NOT NULL CHECK (char_length(action_label) BETWEEN 1 AND 160),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk TEXT NOT NULL CHECK (risk IN ('none', 'low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_moodie_action_approvals_user_status
  ON public.moodie_action_approvals(user_id, status, created_at DESC);
ALTER TABLE public.moodie_action_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own Moodie action approvals" ON public.moodie_action_approvals;
CREATE POLICY "Users manage own Moodie action approvals"
ON public.moodie_action_approvals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
COMMENT ON TABLE public.moodie_action_approvals IS 'Approval ledger for Moodie side-effect actions. Never execute directly from model output.';


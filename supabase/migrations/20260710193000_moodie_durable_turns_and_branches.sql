-- Durable generation lifecycle and non-destructive message revisions.
ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'streaming', 'completed', 'failed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS request_id UUID;

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS active_leaf_message_id UUID REFERENCES public.ai_messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ai_turns (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL UNIQUE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'running', 'saving', 'completed', 'failed', 'cancelled')),
  last_sequence INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_parent_revision ON public.ai_messages(parent_message_id, revision);
CREATE INDEX IF NOT EXISTS idx_ai_messages_request_id ON public.ai_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_turns_user_updated ON public.ai_turns(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_turns_conversation ON public.ai_turns(conversation_id, updated_at DESC);

ALTER TABLE public.ai_turns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own Moodie turns" ON public.ai_turns;
CREATE POLICY "Users manage own Moodie turns"
ON public.ai_turns FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Moodie governed long-term memory
-- Memory is not live business data. Financial, contract, and schedule facts must still be queried by tools.

CREATE TABLE IF NOT EXISTS public.moodie_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('user', 'studio', 'conversation')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'instruction', 'fact', 'summary')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  source_message_id UUID REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.70 CHECK (confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'archived', 'deleted')),
  expires_at TIMESTAMPTZ,
  last_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (scope = 'studio' AND user_id IS NULL)
    OR (scope = 'user' AND user_id IS NOT NULL)
    OR (scope = 'conversation' AND user_id IS NOT NULL AND conversation_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_moodie_memories_active_user
  ON public.moodie_memories(user_id, memory_type, updated_at DESC)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_moodie_memories_active_conversation
  ON public.moodie_memories(conversation_id, updated_at DESC)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_moodie_memories_active_studio
  ON public.moodie_memories(memory_type, updated_at DESC)
  WHERE scope = 'studio' AND status = 'active';

ALTER TABLE public.moodie_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Moodie memories read scoped" ON public.moodie_memories;
CREATE POLICY "Moodie memories read scoped"
ON public.moodie_memories
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    scope = 'studio'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "Moodie memories write own or managed studio" ON public.moodie_memories;
CREATE POLICY "Moodie memories write own or managed studio"
ON public.moodie_memories
FOR ALL
USING (
  user_id = auth.uid()
  OR (
    scope = 'studio'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.status = 'active'
        AND e.role IN ('admin', 'manager')
    )
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR (
    scope = 'studio'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.status = 'active'
        AND e.role IN ('admin', 'manager')
    )
  )
);

COMMENT ON TABLE public.moodie_memories IS
  'Governed Moodie memory. Only active, source-linked records may be injected into model context.';


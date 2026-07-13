-- Durable agent observations and lightweight memory graph for Moodie.

CREATE TABLE IF NOT EXISTS public.moodie_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  turn_id UUID,
  route_intent TEXT,
  prompt_summary TEXT NOT NULL CHECK (char_length(prompt_summary) BETWEEN 1 AND 600),
  outcome_summary TEXT CHECK (outcome_summary IS NULL OR char_length(outcome_summary) <= 1000),
  tool_names TEXT[] NOT NULL DEFAULT '{}',
  succeeded BOOLEAN NOT NULL DEFAULT true,
  reflected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moodie_observations_user_recent
  ON public.moodie_observations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moodie_observations_reflection
  ON public.moodie_observations(user_id, created_at)
  WHERE succeeded AND reflected_at IS NULL;

ALTER TABLE public.moodie_observations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own Moodie observations" ON public.moodie_observations;
CREATE POLICY "Users manage own Moodie observations"
ON public.moodie_observations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.moodie_memory_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_memory_id UUID NOT NULL REFERENCES public.moodie_memories(id) ON DELETE CASCADE,
  target_memory_id UUID NOT NULL REFERENCES public.moodie_memories(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('supersedes', 'extends', 'contradicts', 'related')),
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_memory_id <> target_memory_id),
  UNIQUE(source_memory_id, target_memory_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_moodie_memory_relations_source
  ON public.moodie_memory_relations(user_id, source_memory_id);
CREATE INDEX IF NOT EXISTS idx_moodie_memory_relations_target
  ON public.moodie_memory_relations(user_id, target_memory_id);

ALTER TABLE public.moodie_memory_relations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own Moodie memory relations" ON public.moodie_memory_relations;
CREATE POLICY "Users manage own Moodie memory relations"
ON public.moodie_memory_relations FOR ALL
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.moodie_memories source
    WHERE source.id = source_memory_id AND source.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.moodie_memories target
    WHERE target.id = target_memory_id AND target.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.moodie_observations TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moodie_memory_relations TO authenticated, service_role;

COMMENT ON TABLE public.moodie_observations IS
  'Compact per-turn observations used as bounded working memory and reflection input.';
COMMENT ON TABLE public.moodie_memory_relations IS
  'User-scoped lightweight graph connecting durable Moodie memories.';

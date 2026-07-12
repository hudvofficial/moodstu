-- Moodie companion memory v2: structured, versionable and retrievable across conversations.
ALTER TABLE public.moodie_memories
  DROP CONSTRAINT IF EXISTS moodie_memories_memory_type_check;

ALTER TABLE public.moodie_memories
  ADD CONSTRAINT moodie_memories_memory_type_check
  CHECK (memory_type IN (
    'identity', 'preference', 'instruction', 'goal', 'project',
    'decision', 'relationship', 'episodic', 'studio_knowledge',
    'fact', 'summary'
  ));

ALTER TABLE public.moodie_memories
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS predicate TEXT,
  ADD COLUMN IF NOT EXISTS value JSONB,
  ADD COLUMN IF NOT EXISTS importance NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (importance >= 0 AND importance <= 1),
  ADD COLUMN IF NOT EXISTS source_message_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supersedes_memory_id UUID REFERENCES public.moodie_memories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS use_count INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0);

UPDATE public.moodie_memories
SET
  subject = COALESCE(subject, CASE WHEN scope = 'studio' THEN 'studio' ELSE 'user' END),
  predicate = COALESCE(predicate, 'legacy.' || memory_type),
  value = COALESCE(value, jsonb_build_object('text', content)),
  source_message_ids = CASE
    WHEN cardinality(source_message_ids) = 0 AND source_message_id IS NOT NULL THEN ARRAY[source_message_id]
    ELSE source_message_ids
  END
WHERE subject IS NULL OR predicate IS NULL OR value IS NULL
   OR (cardinality(source_message_ids) = 0 AND source_message_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_moodie_memories_structured_lookup
  ON public.moodie_memories(user_id, subject, predicate, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_moodie_memories_goal_project
  ON public.moodie_memories(user_id, memory_type, status, importance DESC, updated_at DESC)
  WHERE memory_type IN ('goal', 'project', 'decision');
CREATE INDEX IF NOT EXISTS idx_moodie_memories_value_gin
  ON public.moodie_memories USING GIN(value);

COMMENT ON COLUMN public.moodie_memories.subject IS 'Entity the memory describes, such as user, studio, or project:<slug>.';
COMMENT ON COLUMN public.moodie_memories.predicate IS 'Stable relation such as presentation.preference, goal.objective, or decision.outcome.';
COMMENT ON COLUMN public.moodie_memories.value IS 'Structured value used for retrieval, merging and superseding.';

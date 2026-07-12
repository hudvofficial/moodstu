ALTER TABLE public.moodie_memories
  ADD COLUMN IF NOT EXISTS source_voice_turn_id UUID REFERENCES public.moodie_voice_turns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_moodie_memories_source_voice_turn
  ON public.moodie_memories(source_voice_turn_id)
  WHERE source_voice_turn_id IS NOT NULL;

COMMENT ON COLUMN public.moodie_memories.source_voice_turn_id IS
  'Durable voice turn whose user transcript produced this memory candidate.';

-- Semantic memory retrieval without requiring pgvector: embeddings are stored as JSONB arrays
-- and ranked in the application over the already-scoped, bounded candidate set.
ALTER TABLE public.moodie_memories
  ADD COLUMN IF NOT EXISTS embedding JSONB,
  ADD COLUMN IF NOT EXISTS embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_moodie_memories_embedding_pending
  ON public.moodie_memories(updated_at DESC)
  WHERE status = 'active' AND embedding IS NULL;

COMMENT ON COLUMN public.moodie_memories.embedding IS 'Normalized embedding vector represented as a JSON number array.';
COMMENT ON COLUMN public.moodie_memories.embedding_model IS 'Provider embedding model or provider label used to create the vector.';

CREATE TABLE IF NOT EXISTS public.moodie_message_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_moodie_message_feedback_message ON public.moodie_message_feedback(message_id);
ALTER TABLE public.moodie_message_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own Moodie feedback" ON public.moodie_message_feedback;
CREATE POLICY "Users manage own Moodie feedback"
ON public.moodie_message_feedback FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

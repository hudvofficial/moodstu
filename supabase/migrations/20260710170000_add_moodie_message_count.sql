ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.ai_conversations AS conversation
SET message_count = counts.total
FROM (
  SELECT conversation_id, COUNT(*)::INTEGER AS total
  FROM public.ai_messages
  GROUP BY conversation_id
) AS counts
WHERE conversation.id = counts.conversation_id;

CREATE OR REPLACE FUNCTION public.sync_ai_conversation_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ai_conversations
    SET message_count = message_count + 1
    WHERE id = NEW.conversation_id;
    RETURN NEW;
  END IF;

  UPDATE public.ai_conversations
  SET message_count = GREATEST(message_count - 1, 0)
  WHERE id = OLD.conversation_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS sync_ai_conversation_message_count ON public.ai_messages;
CREATE TRIGGER sync_ai_conversation_message_count
AFTER INSERT OR DELETE ON public.ai_messages
FOR EACH ROW
EXECUTE FUNCTION public.sync_ai_conversation_message_count();

-- Repair conversations created while the lock projection dropped
-- ai_conversations.active_leaf_message_id. During that regression every new
-- user turn was persisted as a root, so walking backward from the active leaf
-- only returned the latest user/assistant pair.
--
-- This intentionally touches only root user messages that have an earlier
-- assistant message in the same conversation. Existing branches, assistant
-- revisions, and already-linked user messages are preserved.
WITH broken_user_roots AS (
  SELECT
    user_message.id AS user_message_id,
    previous_assistant.id AS parent_message_id
  FROM public.ai_messages AS user_message
  JOIN LATERAL (
    SELECT candidate.id
    FROM public.ai_messages AS candidate
    WHERE candidate.conversation_id = user_message.conversation_id
      AND candidate.role = 'assistant'
      AND (candidate.created_at, candidate.id) < (user_message.created_at, user_message.id)
    ORDER BY candidate.created_at DESC, candidate.id DESC
    LIMIT 1
  ) AS previous_assistant ON TRUE
  WHERE user_message.role = 'user'
    AND user_message.parent_message_id IS NULL
)
UPDATE public.ai_messages AS user_message
SET parent_message_id = broken_user_roots.parent_message_id
FROM broken_user_roots
WHERE user_message.id = broken_user_roots.user_message_id;


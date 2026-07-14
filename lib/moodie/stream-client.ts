import type { MoodieAttachment, MoodieComposerContext, MoodieSendResult, MoodieStreamEvent } from "@/types/moodie";

export async function sendMoodieStreamingMessage(params: {
  conversationId: string | null;
  content: string;
  attachments?: MoodieAttachment[];
  contexts?: MoodieComposerContext[];
  model?: string;
  regenerateFromMessageId?: string;
  editFromMessageId?: string;
  continueFromMessageId?: string;
  signal?: AbortSignal;
  lastEventId?: number;
  onEvent?: (event: MoodieStreamEvent) => void;
  onStatus?: (label: string) => void;
}) {
  const response = await fetch("/api/moodie/messages/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(params.lastEventId ? { "Last-Event-ID": String(params.lastEventId) } : {}),
    },
    body: JSON.stringify({
      conversation_id: params.conversationId,
      content: params.content,
      attachments: params.attachments || [],
      contexts: params.contexts || [],
      model: params.model,
      regenerate_from_message_id: params.regenerateFromMessageId,
      edit_from_message_id: params.editFromMessageId,
      continue_from_message_id: params.continueFromMessageId,
    }),
    signal: params.signal,
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !response.body || !contentType.includes("text/event-stream")) {
    if (contentType.includes("text/html")) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục với Moodie.");
    }
    throw new Error("Không thể kết nối luồng trả lời của Moodie");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: MoodieSendResult | null = null;
  let lastSequence = params.lastEventId || 0;

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const dataLines = rawEvent
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());
      if (dataLines.length === 0) continue;

      const event = JSON.parse(dataLines.join("\n")) as MoodieStreamEvent;
      if (event.version !== 2 || event.sequence <= lastSequence) continue;
      lastSequence = event.sequence;
      params.onEvent?.(event);
      if ("label" in event) params.onStatus?.(event.label);

      if (event.type === "turn.completed") result = event.data;
      if (event.type === "turn.failed") throw new Error(event.error);
      if (event.type === "turn.cancelled") throw new DOMException(event.label, "AbortError");
    }
    if (done) break;
  }

  if (!result) {
    if (params.signal?.aborted) throw new DOMException("Đã dừng phản hồi", "AbortError");
    throw new Error("Moodie kết thúc luồng nhưng chưa trả về kết quả");
  }
  return result;
}

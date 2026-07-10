import type { MoodieSendResult, MoodieStreamEvent } from "@/types/moodie";

export async function sendMoodieStreamingMessage(params: {
  conversationId: string | null;
  content: string;
  onStatus: (label: string) => void;
}) {
  const response = await fetch("/api/moodie/messages/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: params.conversationId, content: params.content }),
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

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() || "";

    for (const rawEvent of events) {
      const dataLine = rawEvent.split(/\r?\n/).find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      const event = JSON.parse(dataLine.slice(6)) as MoodieStreamEvent;
      if (event.type === "status") params.onStatus(event.label);
      if (event.type === "result") result = event.data;
      if (event.type === "error") throw new Error(event.error);
    }
    if (done) break;
  }

  if (!result) throw new Error("Moodie kết thúc luồng nhưng chưa trả về kết quả");
  return result;
}

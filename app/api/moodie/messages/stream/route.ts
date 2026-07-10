import { sendMoodieMessage } from "@/app/actions/moodie-mutations";
import type { MoodieStreamEvent } from "@/types/moodie";

function encodeEvent(event: MoodieStreamEvent) {
  return "data: " + JSON.stringify(event) + "\n\n";
}

export async function POST(request: Request) {
  const payload = await request.json();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: MoodieStreamEvent) => controller.enqueue(encoder.encode(encodeEvent(event)));

      emit({ type: "status", stage: "accepted", label: "Moodie đã nhận yêu cầu" });
      emit({ type: "status", stage: "context", label: "Đang đọc ngữ cảnh phù hợp" });

      void (async () => {
        try {
          emit({ type: "status", stage: "reasoning", label: "Đang phân tích và chuẩn bị câu trả lời" });
          const result = await sendMoodieMessage(payload);
          if (!result.success) {
            emit({ type: "error", error: result.error });
            return;
          }
          emit({ type: "status", stage: "saving", label: "Đang hoàn tất hội thoại" });
          emit({ type: "result", data: result.data });
        } catch (error) {
          emit({ type: "error", error: error instanceof Error ? error.message : "Moodie không thể hoàn tất yêu cầu" });
        } finally {
          emit({ type: "done" });
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

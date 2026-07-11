import { sendMoodieMessage } from "@/app/actions/moodie-mutations";
import type { MoodieEngineEvent, MoodieRuntimeEvent, MoodieStreamEvent } from "@/types/moodie";

const HEARTBEAT_INTERVAL_MS = 15_000;

function encodeEvent(event: MoodieStreamEvent) {
  return `id: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  const payload = await request.json();
  const encoder = new TextEncoder();
  const requestId = crypto.randomUUID();
  const turnId = crypto.randomUUID();
  let sequence = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const emit = (event: MoodieRuntimeEvent) => {
        if (closed || request.signal.aborted) return;
        sequence += 1;
        controller.enqueue(encoder.encode(encodeEvent({
          ...event,
          version: 2,
          request_id: requestId,
          turn_id: turnId,
          sequence,
          timestamp: new Date().toISOString(),
        } as MoodieStreamEvent)));
      };

      const emitEngineEvent = (event: MoodieEngineEvent) => emit(event);
      const heartbeatId = setInterval(() => {
        if (!closed && !request.signal.aborted) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, HEARTBEAT_INTERVAL_MS);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatId);
        controller.close();
      };

      request.signal.addEventListener("abort", () => {
        emit({ type: "turn.cancelled", label: "Đã dừng phản hồi" });
        close();
      }, { once: true });

      emit({ type: "turn.accepted", label: "Moodie đã nhận yêu cầu" });

      void (async () => {
        try {
          const result = await sendMoodieMessage({ ...payload, request_id: requestId, turn_id: turnId }, emitEngineEvent);
          if (request.signal.aborted) return;
          if (!result.success) {
            emit({ type: "turn.failed", label: "Moodie không thể hoàn tất yêu cầu", error: result.error, retryable: true });
            return;
          }

          emit({ type: "turn.saving", label: "Đang hoàn tất hội thoại" });
          if (result.data.memoryProposed) {
            emit({ type: "memory.candidate", label: "Moodie có một ghi nhớ đang chờ bạn duyệt" });
          }
          emit({ type: "turn.completed", label: "Đã hoàn tất", data: result.data });
        } catch (error) {
          if (!request.signal.aborted) {
            emit({
              type: "turn.failed",
              label: "Moodie không thể hoàn tất yêu cầu",
              error: error instanceof Error ? error.message : "Moodie không thể hoàn tất yêu cầu",
              retryable: true,
            });
          }
        } finally {
          close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Moodie-Request-Id": requestId,
      "X-Moodie-Turn-Id": turnId,
    },
  });
}

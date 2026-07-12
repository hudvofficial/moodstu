import { initialMoodieTurnState, reduceMoodieTurn } from "@/lib/moodie/turn-store";
import type { MoodieRuntimeEvent, MoodieStreamEvent } from "@/types/moodie";

function streamEvent(sequence: number, payload: MoodieRuntimeEvent): MoodieStreamEvent {
  return {
    ...payload,
    version: 2,
    request_id: "request-e2e",
    turn_id: "turn-e2e",
    sequence,
    timestamp: new Date(Date.UTC(2026, 6, 11, 8, 0, sequence)).toISOString(),
  } as MoodieStreamEvent;
}

describe("Moodie streaming lifecycle integration", () => {
  it("hands a complete finance turn through every user-visible stage", () => {
    const events: MoodieRuntimeEvent[] = [
      { type: "turn.accepted", label: "Moodie đã nhận yêu cầu" },
      { type: "route.resolved", label: "Đang xử lý theo ngữ cảnh Finance Analyst", intent: "financial_summary", agent_id: "finance", agent_label: "Finance Analyst" },
      { type: "plan.created", label: "Đã lập kế hoạch xử lý", summary: "Tổng hợp tài chính", tool_names: ["get_financial_summary"] },
      { type: "context.started", label: "Đang đọc ngữ cảnh liên quan" },
      { type: "context.completed", label: "Đã chuẩn bị ngữ cảnh", retrieval_used: true, memory_used: false },
      { type: "generation.started", label: "Đang soạn câu trả lời" },
      { type: "tool.started", label: "Đang tổng hợp tài chính", tool_run_id: "tool-finance", tool_name: "get_financial_summary" },
      { type: "tool.completed", label: "Đã tổng hợp tài chính", tool_run_id: "tool-finance", tool_name: "get_financial_summary", duration_ms: 250, sources: [{ label: "Kỳ báo cáo", value: "Tháng này", kind: "database", entity_type: "report_period", entity_id: "current-month" }] },
      { type: "generation.started", label: "Đang hoàn thiện câu trả lời" },
      { type: "text.delta", delta: "Tổng quan tài chính tháng này" },
      { type: "turn.saving", label: "Đang lưu câu trả lời" },
      { type: "turn.completed", label: "Đã hoàn tất", data: { conversation: { id: "conversation-e2e" } as never } },
    ];

    const state = events.reduce((current, payload, index) => reduceMoodieTurn(current, streamEvent(index + 1, payload)), initialMoodieTurnState);

    expect(state.active).toBe(false);
    expect(state.stage).toBe("completed");
    expect(state.streamedText).toBe("Tổng quan tài chính tháng này");
    expect(state.result?.conversation.id).toBe("conversation-e2e");
    expect(state.activities.map((activity) => activity.id)).toEqual([
      "turn-e2e:request",
      "turn-e2e:route",
      "turn-e2e:plan",
      "turn-e2e:context",
      "tool-finance",
      "turn-e2e:generation",
      "turn-e2e:save",
    ]);
    expect(state.activities.every((activity) => activity.state === "done")).toBe(true);
    expect(state.activityHistory.find((activity) => activity.kind === "context")).toMatchObject({ label: "Đã chuẩn bị ngữ cảnh", state: "completed" });
    expect(state.activityHistory.find((activity) => activity.kind === "generation")).toMatchObject({ label: "Đang hoàn thiện câu trả lời" });
    expect(state.sourcesV2).toHaveLength(1);
  });

  it("never exposes an empty draft across verifier and tool replacement passes", () => {
    const events: MoodieRuntimeEvent[] = [
      { type: "text.delta", delta: "Bản nháp đầu" },
      { type: "text.reset" },
      { type: "generation.started", label: "Đang sửa câu trả lời" },
      { type: "text.delta", delta: "Bản kiểm chứng" },
      { type: "text.reset" },
      { type: "tool.started", label: "Đang tra dữ liệu", tool_run_id: "tool-1", tool_name: "get_financial_summary" },
      { type: "tool.completed", label: "Đã tra dữ liệu", tool_run_id: "tool-1", tool_name: "get_financial_summary", duration_ms: 20 },
      { type: "text.delta", delta: "Bản cuối" },
    ];

    const visibleDrafts: string[] = [];
    events.reduce((current, payload, index) => {
      const next = reduceMoodieTurn(current, streamEvent(index + 1, payload));
      visibleDrafts.push(next.streamedText);
      return next;
    }, initialMoodieTurnState);

    expect(visibleDrafts).toEqual([
      "Bản nháp đầu",
      "Bản nháp đầu",
      "Bản nháp đầu",
      "Bản kiểm chứng",
      "Bản kiểm chứng",
      "Bản kiểm chứng",
      "Bản kiểm chứng",
      "Bản cuối",
    ]);
    expect(visibleDrafts.slice(1)).not.toContain("");
  });

  it("terminates a cancelled turn without a result", () => {
    const accepted = reduceMoodieTurn(initialMoodieTurnState, streamEvent(1, { type: "turn.accepted", label: "Moodie đã nhận yêu cầu" }));
    const generating = reduceMoodieTurn(accepted, streamEvent(2, { type: "generation.started", label: "Đang soạn câu trả lời" }));
    const cancelled = reduceMoodieTurn(generating, streamEvent(3, { type: "turn.cancelled", label: "Đã dừng phản hồi" }));

    expect(cancelled.active).toBe(false);
    expect(cancelled.stage).toBe("cancelled");
    expect(cancelled.result).toBeNull();
    expect(cancelled.error).toBe("Đã dừng phản hồi");
  });
});

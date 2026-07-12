import { initialMoodieTurnState, reduceMoodieTurn } from "@/lib/moodie/turn-store";
import type { MoodieRuntimeEvent, MoodieStreamEvent } from "@/types/moodie";

function event(sequence: number, payload: MoodieRuntimeEvent): MoodieStreamEvent {
  return {
    ...payload,
    version: 2,
    request_id: "request-1",
    turn_id: "turn-1",
    sequence,
    timestamp: new Date(sequence * 1000).toISOString(),
  } as MoodieStreamEvent;
}

describe("reduceMoodieTurn", () => {
  it("builds a live turn from ordered runtime events", () => {
    let state = reduceMoodieTurn(initialMoodieTurnState, event(1, { type: "turn.accepted", label: "Đã nhận" }));
    state = reduceMoodieTurn(state, event(2, {
      type: "tool.started",
      label: "Đang tra dữ liệu",
      tool_run_id: "tool-1",
      tool_name: "search_contracts",
    }));
    state = reduceMoodieTurn(state, event(3, { type: "text.delta", delta: "Kết quả" }));
    state = reduceMoodieTurn(state, event(4, {
      type: "turn.completed",
      label: "Hoàn tất",
      data: { conversation: { id: "conversation-1" } as never },
    }));

    expect(state.active).toBe(false);
    expect(state.streamedText).toBe("Kết quả");
    expect(state.activities.some((activity) => activity.toolName === "search_contracts")).toBe(true);
    expect(state.result?.conversation.id).toBe("conversation-1");
  });

  it("uses one activity identity per phase and settles previous active phases", () => {
    let state = reduceMoodieTurn(initialMoodieTurnState, event(1, { type: "turn.accepted", label: "Đã nhận" }));
    state = reduceMoodieTurn(state, event(2, { type: "route.resolved", label: "Đã định tuyến", intent: "finance", agent_id: "finance", agent_label: "Finance Analyst" }));
    state = reduceMoodieTurn(state, event(3, { type: "plan.created", label: "Đã lập kế hoạch", summary: "Tra dữ liệu", tool_names: ["get_financial_summary"] }));
    state = reduceMoodieTurn(state, event(4, { type: "context.started", label: "Đang đọc ngữ cảnh" }));
    state = reduceMoodieTurn(state, event(5, { type: "context.completed", label: "Đã chuẩn bị ngữ cảnh", retrieval_used: true, memory_used: false }));
    state = reduceMoodieTurn(state, event(6, { type: "generation.started", label: "Đang soạn câu trả lời" }));

    expect(state.activities.map((activity) => activity.id)).toEqual([
      "turn-1:request",
      "turn-1:route",
      "turn-1:plan",
      "turn-1:context",
      "turn-1:generation",
    ]);
    expect(state.activities.slice(0, -1).every((activity) => activity.state === "done")).toBe(true);
    expect(state.activities.at(-1)).toMatchObject({ stage: "generating", state: "active", label: "Đang soạn câu trả lời" });
    expect(state.activityHistory.find((activity) => activity.kind === "context")).toMatchObject({ label: "Đã chuẩn bị ngữ cảnh", state: "completed" });
  });

  it("marks a cancelled turn inactive", () => {
    let state = reduceMoodieTurn(initialMoodieTurnState, event(1, { type: "turn.accepted", label: "Đã nhận" }));
    state = reduceMoodieTurn(state, event(2, { type: "turn.cancelled", label: "Đã dừng phản hồi" }));
    expect(state.active).toBe(false);
    expect(state.stage).toBe("cancelled");
    expect(state.error).toBe("Đã dừng phản hồi");
  });

  it("atomically replaces a retracted draft without rendering a blank frame", () => {
    let state = reduceMoodieTurn(initialMoodieTurnState, event(1, { type: "text.delta", delta: "Bản nháp" }));
    state = reduceMoodieTurn(state, event(2, { type: "text.reset" }));
    expect(state.streamedText).toBe("Bản nháp");
    expect(state.replaceTextOnNextDelta).toBe(true);

    state = reduceMoodieTurn(state, event(3, { type: "text.delta", delta: "Bản đúng" }));
    expect(state.streamedText).toBe("Bản đúng");
    expect(state.replaceTextOnNextDelta).toBe(false);
  });

  it("ignores duplicate and out-of-order events", () => {
    const accepted = event(1, { type: "turn.accepted", label: "Đã nhận" });
    const state = reduceMoodieTurn(initialMoodieTurnState, accepted);
    expect(reduceMoodieTurn(state, accepted)).toBe(state);
    expect(reduceMoodieTurn(state, event(0, { type: "text.delta", delta: "duplicate" }))).toBe(state);
  });

  it("keeps part and source events idempotent", () => {
    const part = { type: "metric_grid", items: [{ label: "Doanh thu", value: "1" }] } as const;
    let state = reduceMoodieTurn(initialMoodieTurnState, event(1, { type: "part.created", part_id: "part-1", part }));
    state = reduceMoodieTurn(state, event(2, {
      type: "tool.completed",
      label: "Xong",
      tool_run_id: "tool-1",
      tool_name: "get_financial_summary",
      duration_ms: 10,
      sources: [{ label: "Báo cáo", value: "Tháng này" }],
    }));
    state = reduceMoodieTurn(state, event(3, {
      type: "tool.completed",
      label: "Xong",
      tool_run_id: "tool-1",
      tool_name: "get_financial_summary",
      duration_ms: 10,
      sources: [{ label: "Báo cáo", value: "Tháng này" }],
    }));

    expect(state.parts).toHaveLength(1);
    expect(state.sources).toHaveLength(1);
  });
});

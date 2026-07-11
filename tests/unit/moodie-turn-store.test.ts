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

  it("resets streamed draft when verifier or tool loop retracts it", () => {
    let state = reduceMoodieTurn(initialMoodieTurnState, event(1, { type: "text.delta", delta: "Bản nháp" }));
    state = reduceMoodieTurn(state, event(2, { type: "text.reset" }));
    state = reduceMoodieTurn(state, event(3, { type: "text.delta", delta: "Bản đúng" }));
    expect(state.streamedText).toBe("Bản đúng");
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

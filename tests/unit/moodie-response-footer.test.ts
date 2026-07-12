import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getMoodieElapsedDuration, MoodieExecutionSummary } from "@/components/moodie/moodie-execution-summary";
import { MoodieMessageBubble } from "@/components/moodie/moodie-message-bubble";

const assistantMessage = {
  id: "assistant-1",
  role: "assistant" as const,
  content: "Mình đã tổng hợp dữ liệu.",
  created_at: "2026-07-11T08:00:00.000Z",
  metadata: {
    provider: "test",
    response_ui_version: 2 as const,
    activity_history: [{
      id: "tool-1",
      kind: "tool" as const,
      action: "tool.completed",
      label: "Đã tra dữ liệu hợp đồng",
      state: "completed" as const,
      started_at: "2026-07-11T07:59:59.000Z",
      completed_at: "2026-07-11T08:00:00.000Z",
      duration_ms: 1000,
      source_ids: ["source-1"],
    }],
    sources_v2: [{ id: "source-1", kind: "database" as const, title: "Hợp đồng HD-01" }],
    follow_ups: ["Xem chi tiết hợp đồng"],
    trace: {
      engine: "model" as const,
      started_at: "2026-07-11T07:59:59.000Z",
      duration_ms: 1000,
      model_steps: 1,
      tool_call_count: 1,
      verifier_corrections: 0,
      fallback_used: false,
      tools: [{ name: "lookup", ok: true, duration_ms: 1000 }],
    },
  },
};

describe("Moodie response footer", () => {
  it("renders the collapsed execution summary with correct Vietnamese text", () => {
    const markup = renderToStaticMarkup(createElement(MoodieExecutionSummary, {
      activities: assistantMessage.metadata.activity_history,
      sources: assistantMessage.metadata.sources_v2,
      trace: assistantMessage.metadata.trace,
      timestamp: assistantMessage.created_at,
    }));
    expect(markup).toContain("Đã tra dữ liệu");
    expect(markup).not.toContain("1.0s");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Quá trình xử lý của Moodie");
  });

  it("uses wall-clock elapsed time instead of summing parallel tool durations", () => {
    const duration = getMoodieElapsedDuration([
      { id: "a", kind: "tool", action: "tool.completed", label: "A", state: "completed", started_at: "2026-07-11T08:00:00.000Z", completed_at: "2026-07-11T08:00:02.000Z", duration_ms: 2000 },
      { id: "b", kind: "tool", action: "tool.completed", label: "B", state: "completed", started_at: "2026-07-11T08:00:00.500Z", completed_at: "2026-07-11T08:00:02.500Z", duration_ms: 2000 },
    ]);
    expect(duration).toBe(2500);
  });

  it("keeps the source action visually light until hover or keyboard focus", () => {
    const markup = renderToStaticMarkup(createElement(MoodieExecutionSummary, {
      activities: assistantMessage.metadata.activity_history,
      sources: assistantMessage.metadata.sources_v2,
    }));
    expect(markup).toContain("bg-transparent");
    expect(markup).toContain("hover:bg-black/5");
    expect(markup).toContain("border-0");
    expect(markup).not.toContain("border-t border-border py-2");
  });

  it("renders every connected response action in the intended order", () => {
    const markup = renderToStaticMarkup(createElement(MoodieMessageBubble, {
      message: assistantMessage,
      activeLeaf: true,
      branch: { index: 1, total: 2, onPrevious: () => {} },
      onQuickPrompt: () => {},
      onRegenerate: () => {},
      onContinue: () => {},
      onDelete: () => {},
      onFeedback: async () => {},
    }));
    const labels = [
      "Phiên bản trước",
      "Sao chép câu trả lời",
      "Đọc câu trả lời",
      "Thông tin câu trả lời",
      "Phản hồi hữu ích",
      "Phản hồi chưa tốt",
      "Tiếp tục câu trả lời",
      "Tạo lại câu trả lời",
      "Xóa câu trả lời",
    ];
    labels.forEach((label) => expect(markup).toContain(`aria-label="${label}"`));
    labels.slice(1).forEach((label, index) => {
      expect(markup.indexOf(labels[index])).toBeLessThan(markup.indexOf(label));
    });
    expect(markup).toContain("bg-transparent");
    expect(markup).toContain("hover:bg-black/5");
    expect(markup).not.toContain("icon-btn");
    expect(markup).toContain("Hỏi tiếp");
    expect(markup).toContain("Xem chi tiết hợp đồng");
  });

  it("hides follow-ups when the assistant is not the active leaf", () => {
    const markup = renderToStaticMarkup(createElement(MoodieMessageBubble, {
      message: assistantMessage,
      activeLeaf: false,
      onQuickPrompt: () => {},
    }));
    expect(markup).not.toContain("Xem chi tiết hợp đồng");
  });
});

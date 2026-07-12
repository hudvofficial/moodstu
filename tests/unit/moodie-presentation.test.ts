import { parseMoodieText } from "@/lib/moodie/presentation";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { MoodieResponseContent } from "@/components/moodie/moodie-response-content";
import { MoodieMessageBubble } from "@/components/moodie/moodie-message-bubble";
import { MoodieDebugPanel } from "@/components/moodie/moodie-debug-panel";
import { MoodieThread } from "@/components/moodie/moodie-thread";
import { MoodieThinkingState } from "@/components/moodie/moodie-thinking-state";

describe("parseMoodieText", () => {
  it("parses a markdown table without flattening rows", () => {
    const blocks = parseMoodieText("| Hợp đồng | Khách hàng | Còn phải thu |\n|---|---|---:|\n| HD-01 | An | 9.000.000 đ |");
    expect(blocks).toEqual([{ type: "table", headers: ["Hợp đồng", "Khách hàng", "Còn phải thu"], rows: [["HD-01", "An", "9.000.000 đ"]] }]);
  });

  it("recovers dangling bold headings from model output", () => {
    const blocks = parseMoodieText("**PHẢI THU ĐÃ GHI NHẬN\n** 0 đ");
    expect(blocks).toEqual([
      { type: "heading", text: "PHẢI THU ĐÃ GHI NHẬN", level: 2 },
      { type: "paragraph", text: "0 đ" },
    ]);
  });

  it("turns business notes into callouts", () => {
    const blocks = parseMoodieText("Lưu ý: Có chênh lệch giữa sổ công nợ và danh sách hợp đồng.");
    expect(blocks[0]).toMatchObject({ type: "callout", tone: "info", title: "Lưu ý" });
  });

  it("structures the receivables response shown in the UI regression", () => {
    const content = [
      "Tình hình công nợ hiện tại:",
      "",
      "**PHẢI THU ĐÃ GHI NHẬN",
      "** 0 đ",
      "",
      "**PHẢI TRẢ",
      "** 0 đ",
      "",
      "Tuy nhiên, hiện có **2 hợp đồng còn tiền cần thu**, tổng cộng **15.900.000 đ**:",
      "",
      "| Hợp đồng | Khách hàng | Còn phải thu |",
      "|---|---|---:|",
      "| HD-01 | An | 9.000.000 đ |",
      "| HD-02 | Bình | 6.900.000 đ |",
      "",
      "Lưu ý:** Có chênh lệch giữa sổ công nợ và danh sách hợp đồng.",
    ].join("\n");

    const blocks = parseMoodieText(content);
    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "heading",
      "paragraph",
      "heading",
      "paragraph",
      "paragraph",
      "table",
      "callout",
    ]);
    expect(blocks.find((block) => block.type === "table")).toMatchObject({ rows: expect.any(Array) });
  });

  it("parses code, quotes and separators as safe blocks", () => {
    const blocks = parseMoodieText("> Quy tắc nghiệp vụ\n\n---\n\n```ts\nconst total = 1;\n```");
    expect(blocks).toEqual([
      { type: "quote", text: "Quy tắc nghiệp vụ" },
      { type: "separator" },
      { type: "code", language: "ts", code: "const total = 1;" },
    ]);
  });

  it("suppresses duplicated table and metric visuals when typed artifacts exist", () => {
    const content = "**Phải thu**\n10.000.000 đ\n\n| Mã | Giá trị |\n|---|---:|\n| HD-01 | 10.000.000 đ |";
    const markup = renderToStaticMarkup(createElement(MoodieResponseContent, { content, suppressMetrics: true, suppressTables: true }));
    expect(markup).not.toContain("<table");
    expect(markup).not.toContain("PHẢI THU");
  });

  it("places assistant message actions after typed artifacts", () => {
    const markup = renderToStaticMarkup(createElement(MoodieMessageBubble, {
      message: {
        id: "message-1",
        role: "assistant",
        content: "Mình đã tổng hợp dữ liệu.",
        created_at: "2026-07-10T08:00:00.000Z",
        metadata: {
          provider: "gpt",
          parts: [{
            type: "table",
            title: "Công nợ",
            columns: [{ key: "code", label: "Mã" }],
            rows: [{ code: "HD-01" }],
          }],
        },
      },
    }));
    expect(markup.indexOf("Công nợ")).toBeLessThan(markup.indexOf("Sao chép câu trả lời"));
  });

  it("hides user actions until hover on desktop while keeping touch access", () => {
    const markup = renderToStaticMarkup(createElement(MoodieMessageBubble, {
      message: {
        id: "user-message-1",
        role: "user",
        content: "Kiểm tra công nợ",
        created_at: "2026-07-10T08:00:00.000Z",
        metadata: null,
      },
    }));
    expect(markup).toContain("flex-auto w-0 max-w-full pl-1");
    expect(markup).toContain("flex justify-end pr-2 text-xs");
    expect(markup).toContain("text-[0.65rem]");
    expect(markup).toContain("invisible transition group-hover:visible");
    expect(markup).toContain("flex justify-end pb-1");
    expect(markup).toContain("max-w-[90%]");
    expect(markup).toContain("rounded-3xl");
    expect(markup).toContain("bg-gray-50");
    expect(markup).toContain("px-4 py-1.5");
    expect(markup).not.toContain("pb-7");
    expect(markup).toContain("Sao chép tin nhắn");
    expect(markup).toContain("lúc");
  });

  it("hides debug chrome for ordinary model responses", () => {
    const markup = renderToStaticMarkup(createElement(MoodieDebugPanel, {
      trace: {
        engine: "model",
        started_at: "2026-07-10T08:00:00.000Z",
        duration_ms: 320,
        model_steps: 1,
        tool_call_count: 0,
        verifier_corrections: 0,
        fallback_used: false,
        tools: [],
      },
    }));
    expect(markup).toBe("");
  });

  it("shows a concise phase and only exposes meaningful tool history", () => {
    const markup = renderToStaticMarkup(createElement(MoodieThinkingState, {
      activities: [
        { id: "tool-contract", stage: "tool", label: "Đã tra hợp đồng", state: "done", durationMs: 820 },
        { id: "tool-calendar", stage: "tool", label: "Đang tra lịch", state: "active" },
      ],
    }));
    expect(markup).toContain("Đang tra dữ liệu");
    expect(markup).not.toContain("Đã tra hợp đồng");
    expect(markup).not.toContain("Đang tra lịch");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Mở hoặc đóng các bước Moodie đang thực hiện");
  });

  it("keeps the Open-style status unboxed and mobile touch accessible", () => {
    const markup = renderToStaticMarkup(createElement(MoodieThinkingState, {
      activities: [
        { id: "tool-a", stage: "tool", label: "Tra dữ liệu A", state: "done", durationMs: 900 },
        { id: "tool-b", stage: "tool", label: "Tra dữ liệu B", state: "active" },
      ],
    }));
    expect(markup).toContain("min-h-11");
    expect(markup).toContain("md:min-h-8");
    expect(markup).toContain("motion-reduce:animate-none");
    expect(markup).not.toContain("rounded-lg bg-primary text-text-inverse");
    expect(markup).not.toContain("animate-pulse");
  });

  it("uses Open WebUI message-list rhythm instead of a large global gap", () => {
    const markup = renderToStaticMarkup(createElement(MoodieThread, {
      conversation: {
        id: "conversation-1",
        title: "Test",
        last_message_preview: null,
        message_count: 1,
        created_at: "2026-07-10T08:00:00.000Z",
        updated_at: "2026-07-10T08:00:00.000Z",
        locked_until: null,
        locked_by: null,
        version: 1,
        messages: [{ id: "message-1", role: "user", content: "Xin chào", metadata: null, created_at: "2026-07-10T08:00:00.000Z" }],
      },
      capabilities: [],
      suggestions: [],
      pendingPrompt: null,
      onQuickPrompt: () => {},
    }));
    expect(markup).toContain("space-y-3");
    expect(markup).toContain("pt-3");
    expect(markup).not.toContain("space-y-8");
    expect(markup).not.toContain("sm:pt-10");
  });
});

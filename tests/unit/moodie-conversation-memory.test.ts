import { describe, expect, it } from "@jest/globals";
import { buildMoodieConversationSummary, buildMoodieConversationSummaryContext } from "@/lib/moodie/conversation-summary";
import { extractMoodieMemoryCandidate } from "@/lib/moodie/memory-extractor";

describe("Moodie conversation memory", () => {
  it("builds a compact summary with explicit speakers", () => {
    const summary = buildMoodieConversationSummary([
      { role: "user", content: "Mình muốn câu trả lời thật ngắn." },
      { role: "assistant", content: "Mình hiểu rồi." },
    ]);

    expect(summary).toContain("Người dùng: Mình muốn câu trả lời thật ngắn.");
    expect(summary).toContain("Moodie: Mình hiểu rồi.");
    expect(buildMoodieConversationSummaryContext(summary)).toContain("Tóm tắt hội thoại trước đó");
  });

  it("keeps the previous checkpoint when compacting newer context", () => {
    const summary = buildMoodieConversationSummary(
      [{ role: "user", content: "Tiếp tục phần lịch làm việc." }],
      "Người dùng ưu tiên câu trả lời ngắn và đã chốt phân tích tài chính trước.",
    );

    expect(summary).toContain("Tóm tắt trước");
    expect(summary).toContain("ưu tiên câu trả lời ngắn");
    expect(summary).toContain("Diễn biến gần đây");
  });

  it("extracts explicit stable preferences as pending candidates", () => {
    const candidate = extractMoodieMemoryCandidate({
      prompt: "Từ giờ ưu tiên trả lời ngắn và trực tiếp",
      conversationId: "11111111-1111-4111-8111-111111111111",
      sourceMessageId: "22222222-2222-4222-8222-222222222222",
    });

    expect(candidate).toMatchObject({
      scope: "user",
      memoryType: "preference",
      status: "pending",
      content: "ưu tiên trả lời ngắn và trực tiếp",
    });
  });

  it("does not extract ordinary chat or mutable business data", () => {
    expect(extractMoodieMemoryCandidate({
      prompt: "Hôm nay studio thế nào?",
      conversationId: "11111111-1111-4111-8111-111111111111",
      sourceMessageId: "22222222-2222-4222-8222-222222222222",
    })).toBeNull();

    expect(extractMoodieMemoryCandidate({
      prompt: "Hãy nhớ doanh thu tháng này là 50000000",
      conversationId: "11111111-1111-4111-8111-111111111111",
      sourceMessageId: "22222222-2222-4222-8222-222222222222",
    })).toBeNull();
  });
});

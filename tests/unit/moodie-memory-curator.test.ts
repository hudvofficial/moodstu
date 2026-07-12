import { describe, expect, it } from "@jest/globals";
import { curateMoodieMemories } from "@/lib/moodie/memory-curator";

const base = {
  conversationId: "11111111-1111-4111-8111-111111111111",
  sourceMessageId: "22222222-2222-4222-8222-222222222222",
};

describe("Moodie companion memory curator", () => {
  it("auto-activates an explicit safe preference", () => {
    const [memory] = curateMoodieMemories({ ...base, prompt: "Ưu tiên trả lời kết luận trước và không khuyên chung chung" });
    expect(memory).toMatchObject({ memoryType: "preference", predicate: "presentation.preference", status: "active", autoActivate: true, importance: 0.8 });
  });

  it("extracts durable goals, projects and decisions", () => {
    expect(curateMoodieMemories({ ...base, prompt: "Mục tiêu của mình là biến Moodie thành trợ lý vận hành đồng hành lâu dài" })[0]).toMatchObject({ memoryType: "goal", predicate: "goal.objective", status: "active" });
    expect(curateMoodieMemories({ ...base, prompt: "Chúng ta đang làm nâng cấp hệ thống memory của Moodie" })[0]).toMatchObject({ memoryType: "project", predicate: "project.active" });
    expect(curateMoodieMemories({ ...base, prompt: "Chốt dùng structured presentation thay cho markdown tự do" })[0]).toMatchObject({ memoryType: "decision", predicate: "decision.outcome" });
  });

  it("rejects secrets, mutable live data and ordinary chat", () => {
    expect(curateMoodieMemories({ ...base, prompt: "Hãy nhớ API key là sk-secret-value" })).toEqual([]);
    expect(curateMoodieMemories({ ...base, prompt: "Hãy nhớ doanh thu tháng này là 50000000 VND" })).toEqual([]);
    expect(curateMoodieMemories({ ...base, prompt: "Studio hôm nay thế nào?" })).toEqual([]);
  });
});

import { describe, expect, it } from "@jest/globals";
import { buildMoodieMemoryContext, validateMoodieMemoryCandidate } from "@/lib/moodie/memory-policy";

describe("Moodie memory policy", () => {
  it("accepts a stable user preference only as pending", () => {
    const result = validateMoodieMemoryCandidate({
      scope: "user",
      memoryType: "preference",
      content: "Người dùng thích báo cáo ngắn, có gạch đầu dòng.",
      confidence: 0.9,
    });

    expect(result).toMatchObject({ ok: true, candidate: { status: "pending" } });
  });

  it("rejects secrets and mutable business data", () => {
    expect(validateMoodieMemoryCandidate({
      scope: "user",
      memoryType: "fact",
      content: "API key là sk-secret-value",
      confidence: 1,
    })).toMatchObject({ ok: false, reason: "sensitive_secret" });

    expect(validateMoodieMemoryCandidate({
      scope: "studio",
      memoryType: "fact",
      content: "Công nợ tháng này là 12000000 VND",
      confidence: 1,
    })).toMatchObject({ ok: false, reason: "mutable_business_data" });
  });

  it("keeps recalled memory compact and explicitly governed", () => {
    const context = buildMoodieMemoryContext([
      { scope: "user", memoryType: "preference", content: "Ưu tiên câu trả lời ngắn." },
      { scope: "studio", memoryType: "instruction", content: "Luôn nêu nguồn khi dùng số liệu." },
    ]);

    expect(context).toContain("Ghi nhớ dài hạn");
    expect(context).toContain("user/preference");
    expect(context).toContain("studio/instruction");
  });
});

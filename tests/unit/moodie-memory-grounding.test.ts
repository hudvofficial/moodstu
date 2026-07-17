import { describe, expect, it } from "@jest/globals";
import { isMoodieMemoryGrounded, summarizeMoodieMemoryGrounding } from "@/lib/moodie/memory-grounding";

describe("Moodie memory grounding", () => {
  it("marks a memory grounded when its significant words appear in the answer", () => {
    expect(isMoodieMemoryGrounded("Khách hàng thích liên hệ qua Zalo", "Mình sẽ liên hệ qua Zalo cho bạn nhé")).toBe(true);
  });

  it("marks a memory ungrounded when the answer shares no significant words", () => {
    expect(isMoodieMemoryGrounded("Khách hàng thích liên hệ qua Zalo", "Hôm nay trời đẹp quá")).toBe(false);
  });

  it("treats memory content with no significant tokens as ungrounded", () => {
    expect(isMoodieMemoryGrounded("ok", "ok là được rồi")).toBe(false);
  });

  it("summarizes an empty record list without dividing by zero", () => {
    expect(summarizeMoodieMemoryGrounding([], "bất kỳ câu trả lời nào")).toEqual({ retrieved_count: 0, grounded_count: 0 });
  });

  it("counts grounded vs ungrounded and lists ungrounded ids", () => {
    const records = [
      { id: "a", content: "Khách hàng thích liên hệ qua Zalo" },
      { id: "b", content: "Ngân sách dự kiến năm trăm triệu đồng" },
    ];
    const result = summarizeMoodieMemoryGrounding(records, "Mình sẽ liên hệ qua Zalo cho bạn nhé");
    expect(result.retrieved_count).toBe(2);
    expect(result.grounded_count).toBe(1);
    expect(result.ungrounded_ids).toEqual(["b"]);
  });
});

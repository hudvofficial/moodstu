import { decideMoodieOrchestration } from "@/lib/moodie/orchestrator";
import { classifyMoodieResearchIntent } from "@/lib/moodie/research-intent";

describe("Moodie orchestration decision", () => {
  it.each([
    "Tin OpenAI mới nhất hôm nay",
    "Search web giúp tôi về Brave Search API",
    "Tìm nhà hàng gần studio",
  ])("keeps a bounded lookup in the foreground: %s", (prompt) => {
    const decision = decideMoodieOrchestration({ prompt, research: classifyMoodieResearchIntent(prompt) });
    expect(decision).toMatchObject({ mode: "foreground_tool", foregroundCallBudget: 1, backgroundRunBudget: 0 });
  });

  it.each([
    "Nghiên cứu sâu xu hướng studio ảnh cưới và lập báo cáo chi tiết",
    "Tìm xu hướng thị trường và so sánh với các đối thủ chính",
    "Deep research the wedding photography market",
    "Create a comprehensive report with sources about AI assistants",
  ])("delegates deep research to a durable run: %s", (prompt) => {
    const decision = decideMoodieOrchestration({ prompt, research: classifyMoodieResearchIntent(prompt) });
    expect(decision).toMatchObject({ mode: "background_run", foregroundCallBudget: 0, backgroundRunBudget: 1 });
  });

  it("does not create a run for stable direct knowledge", () => {
    const prompt = "React là gì?";
    expect(decideMoodieOrchestration({ prompt, research: classifyMoodieResearchIntent(prompt) })).toMatchObject({ mode: "direct" });
  });
});

import { describe, expect, it } from "@jest/globals";
import { evaluateMoodieResponse, summarizeMoodieEvaluations } from "@/lib/moodie/evaluator";
import type { MoodieRegressionCase } from "@/lib/moodie/regression-prompts";
import type { MoodieMessageMeta } from "@/types/moodie";

const financeCase: MoodieRegressionCase = {
  id: "finance_test",
  prompt: "Tai chinh thang nay ra sao?",
  expectedIntent: "finance",
  expectsToolUse: true,
  expectedSignals: ["get_financial_summary", "retrieval"],
};

function createMetadata(overrides?: Partial<NonNullable<MoodieMessageMeta["trace"]>>): MoodieMessageMeta {
  return {
    provider: "Test Provider",
    route_intent: "finance",
    retrieval_used: true,
    trace: {
      engine: "model",
      started_at: new Date().toISOString(),
      duration_ms: 800,
      provider: "Test Provider",
      route_intent: "finance",
      retrieval_used: true,
      model_steps: 2,
      tool_call_count: 1,
      verifier_corrections: 0,
      fallback_used: false,
      tools: [{
        name: "get_financial_summary",
        ok: true,
        duration_ms: 120,
      }],
      ...overrides,
    },
  };
}

describe("Moodie evaluator", () => {
  it("scores a correct routed and grounded response", () => {
    const result = evaluateMoodieResponse({
      testCase: financeCase,
      content: "Doanh thu và dòng tiền đã được tổng hợp từ dữ liệu hệ thống hiện tại.",
      metadata: createMetadata(),
    });

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.toolNames).toContain("get_financial_summary");
  });

  it("fails when a data question skips tools", () => {
    const result = evaluateMoodieResponse({
      testCase: financeCase,
      content: "Đây là một câu trả lời đủ dài nhưng không sử dụng dữ liệu hệ thống.",
      metadata: createMetadata({
        tool_call_count: 0,
        tools: [],
        retrieval_used: false,
      }),
    });

    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(70);
  });

  it("summarizes score, pass rate and latency", () => {
    const passed = evaluateMoodieResponse({
      testCase: financeCase,
      content: "Doanh thu và dòng tiền đã được tổng hợp từ dữ liệu hệ thống hiện tại.",
      metadata: createMetadata({ duration_ms: 800 }),
    });
    const failed = {
      ...passed,
      caseId: "failed",
      passed: false,
      score: 40,
      latencyMs: 1200,
    };

    expect(summarizeMoodieEvaluations([passed, failed])).toEqual({
      total: 2,
      passed: 1,
      failed: 1,
      passRate: 50,
      averageScore: 70,
      averageLatencyMs: 1000,
    });
  });

  it("fails identity benchmark when Moodie or Studio is missing", () => {
    const result = evaluateMoodieResponse({
      testCase: {
        id: "identity",
        prompt: "Bạn là ai?",
        expectedIntent: "general",
        expectsToolUse: false,
        expectedSignals: ["identity_moodie"],
        expectedAgentId: "studio_advisor",
      },
      content: "Mình là một trợ lý AI đa năng có thể hỗ trợ bạn.",
      metadata: createMetadata({
        route_intent: "general",
        agent_id: "studio_advisor",
        tool_call_count: 0,
        tools: [],
      }),
    });

    expect(result.passed).toBe(false);
    expect(result.checks.find((check) => check.key === "identity")?.passed).toBe(false);
  });
});

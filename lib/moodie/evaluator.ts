import type { MoodieRegressionCase } from "@/lib/moodie/regression-prompts";
import type { MoodieMessageMeta } from "@/types/moodie";

export type MoodieEvaluationResult = {
  caseId: string;
  prompt: string;
  score: number;
  passed: boolean;
  checks: Array<{
    key: string;
    label: string;
    passed: boolean;
    points: number;
    earned: number;
  }>;
  actualIntent?: string;
  toolNames: string[];
  latencyMs: number;
  fallbackUsed: boolean;
  responsePreview: string;
};

function includesExpectedTool(signal: string, toolNames: Set<string>) {
  return signal.startsWith("get_") || signal === "read_file" || signal === "grep_code" || signal === "list_symbols"
    ? toolNames.has(signal)
    : true;
}

export function evaluateMoodieResponse(params: {
  testCase: MoodieRegressionCase;
  content: string;
  metadata: MoodieMessageMeta;
}): MoodieEvaluationResult {
  const trace = params.metadata.trace;
  const toolNames = trace?.tools.map((tool) => tool.name) || [];
  const toolNameSet = new Set(toolNames);
  const expectedTools = params.testCase.expectedSignals.filter((signal) =>
    signal.startsWith("get_") || signal === "read_file" || signal === "grep_code" || signal === "list_symbols",
  );
  const routePassed = (trace?.route_intent || params.metadata.route_intent) === params.testCase.expectedIntent;
  const toolUsePassed = params.testCase.expectsToolUse
    ? (trace?.tool_call_count || 0) > 0
    : (trace?.tool_call_count || 0) === 0;
  const expectedToolsPassed = expectedTools.length === 0
    ? true
    : expectedTools.every((tool) => includesExpectedTool(tool, toolNameSet));
  const retrievalExpected = params.testCase.expectedSignals.includes("retrieval");
  const retrievalPassed = retrievalExpected ? trace?.retrieval_used === true : true;
  const responsePassed = params.content.trim().length >= 24;
  const fallbackPassed = trace?.fallback_used !== true;
  const agentPassed = !params.testCase.expectedAgentId || trace?.agent_id === params.testCase.expectedAgentId;
  const identityExpected = params.testCase.expectedSignals.includes("identity_moodie");
  const normalizedContent = params.content.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const identityPassed = !identityExpected || (normalizedContent.includes("moodie") && normalizedContent.includes("studio"));
  const skillPassed = !params.testCase.expectedSkillId || params.metadata.skill_id === params.testCase.expectedSkillId;
  const partTypes = new Set((params.metadata.parts || []).map((part) => part.type));
  const presentationPassed = !params.testCase.expectedPartTypes?.length || params.testCase.expectedPartTypes.every((type) => partTypes.has(type as never));
  const evidencePassed = !params.testCase.requiresEvidenceComplete || params.metadata.note === "evidence_complete";

  const rawChecks = [
    { key: "intent", label: "Intent đúng", passed: routePassed, points: 25 },
    { key: "tool_use", label: "Quyết định gọi tool đúng", passed: toolUsePassed, points: 20 },
    { key: "expected_tool", label: "Tool phù hợp", passed: expectedToolsPassed, points: 20 },
    { key: "retrieval", label: "Retrieval đúng kỳ vọng", passed: retrievalPassed, points: 10 },
    { key: "response", label: "Có câu trả lời hữu ích", passed: responsePassed, points: 15 },
    { key: "fallback", label: "Không fallback ngoài ý muốn", passed: fallbackPassed, points: 10 },
    { key: "agent", label: "Agent đúng vai trò", passed: agentPassed, points: 0 },
    { key: "identity", label: "Giữ đúng danh tính Moodie", passed: identityPassed, points: 0 },
    { key: "skill", label: "Workflow đúng", passed: skillPassed, points: 0 },
    { key: "presentation", label: "Structured presentation đúng", passed: presentationPassed, points: 0 },
    { key: "evidence", label: "Bằng chứng hoàn chỉnh", passed: evidencePassed, points: 0 },
  ];
  const checks = rawChecks.map((check) => ({
    ...check,
    earned: check.passed ? check.points : 0,
  }));
  const score = checks.reduce((sum, check) => sum + check.earned, 0);

  return {
    caseId: params.testCase.id,
    prompt: params.testCase.prompt,
    score,
    passed: score >= 70 && routePassed && toolUsePassed && agentPassed && identityPassed && skillPassed && presentationPassed && evidencePassed,
    checks,
    actualIntent: trace?.route_intent || params.metadata.route_intent,
    toolNames,
    latencyMs: trace?.duration_ms || 0,
    fallbackUsed: trace?.fallback_used || false,
    responsePreview: params.content.replace(/\s+/g, " ").trim().slice(0, 220),
  };
}

export function summarizeMoodieEvaluations(results: MoodieEvaluationResult[]) {
  const total = results.length;
  const passed = results.filter((result) => result.passed).length;
  const totalScore = results.reduce((sum, result) => sum + result.score, 0);
  const totalLatency = results.reduce((sum, result) => sum + result.latencyMs, 0);

  return {
    total,
    passed,
    failed: total - passed,
    passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    averageScore: total > 0 ? Math.round(totalScore / total) : 0,
    averageLatencyMs: total > 0 ? Math.round(totalLatency / total) : 0,
  };
}

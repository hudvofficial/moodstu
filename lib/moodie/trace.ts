import type { MoodieMessageMeta } from "@/types/moodie";

export type MoodieToolTrace = {
  name: string;
  ok: boolean;
  duration_ms: number;
  result_bytes?: number;
  error?: string;
};

export type MoodieTrace = {
  engine: "model" | "core_fallback" | "session";
  started_at: string;
  duration_ms: number;
  provider?: string;
  agent_id?: string;
  route_intent?: string;
  route_reason?: string;
  retrieval_used?: boolean;
  research_required?: boolean;
  research_mode?: "web" | "news" | "local";
  allowed_tool_names?: string[];
  execution_plan?: string;
  model_steps: number;
  tool_call_count: number;
  verifier_corrections: number;
  fallback_used: boolean;
  fallback_reason?: "provider_unavailable" | "provider_error";
  provider_latency_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  fallback_latency_ms?: number;
  tools: MoodieToolTrace[];
  error?: string;
};

export function createMoodieTrace(params: {
  provider?: string;
  agent_id?: string;
  route_intent?: string;
  route_reason?: string;
  retrieval_used?: boolean;
  research_required?: boolean;
  research_mode?: "web" | "news" | "local";
  allowed_tool_names?: string[];
  execution_plan?: string;
}) {
  const startedAt = Date.now();
  const trace: MoodieTrace = {
    engine: "model",
    started_at: new Date(startedAt).toISOString(),
    duration_ms: 0,
    provider: params.provider,
    agent_id: params.agent_id,
    route_intent: params.route_intent,
    route_reason: params.route_reason,
    retrieval_used: params.retrieval_used,
    research_required: params.research_required,
    research_mode: params.research_mode,
    allowed_tool_names: params.allowed_tool_names,
    execution_plan: params.execution_plan,
    model_steps: 0,
    tool_call_count: 0,
    verifier_corrections: 0,
    fallback_used: false,
    tools: [],
  };

  return {
    trace,
    finish(extra?: Partial<MoodieTrace>) {
      trace.duration_ms = Date.now() - startedAt;
      Object.assign(trace, extra);
      return trace;
    },
  };
}

export function attachMoodieTrace(
  metadata: MoodieMessageMeta,
  trace: MoodieTrace,
): MoodieMessageMeta {
  return {
    ...metadata,
    trace,
  };
}

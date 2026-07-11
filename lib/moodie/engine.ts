import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/audit";
import { runMoodieCoreEngine } from "@/lib/moodie/core-engine";
import { getActiveMoodieProvider } from "@/lib/moodie/providers/registry";
import {
  MOODIE_MODEL_MAX_HISTORY,
  MOODIE_IDENTITY_PROMPT,
  MOODIE_MODEL_SYSTEM_PROMPT,
} from "@/lib/moodie/model-prompt";
import { executeMoodieTool, getMoodieToolDefinitions } from "@/lib/moodie/tools";
import { routeMoodieIntent } from "@/lib/moodie/intent-router";
import { verifyMoodieAnswer } from "@/lib/moodie/answer-verifier";
import { shapeMoodieHistoryForModel } from "@/lib/moodie/context-shaper";
import { normalizeMoodieToolOutput } from "@/lib/moodie/tool-output-normalizer";
import { buildMoodieRetrievedContext } from "@/lib/moodie/retrieval-context";
import { planMoodieExecution } from "@/lib/moodie/tool-planner";
import { attachMoodieTrace, createMoodieTrace } from "@/lib/moodie/trace";
import { buildMoodieAgentInstruction, selectMoodieAgent } from "@/lib/moodie/agents/profiles";
import { planMoodieSafeNavigation } from "@/lib/moodie/action-planner";
import { loadMoodieMemoryContext } from "@/lib/moodie/memory-store";
import { buildMoodieConversationSummaryContext } from "@/lib/moodie/conversation-summary";
import type { Database } from "@/types/database.types";
import type {
  MoodieAttachment,
  MoodieComposerContext,
  MoodieEngineEvent,
  MoodieHistoryMessage,
  MoodieMessageMeta,
  MoodieMessagePart,
  MoodieWidget,
} from "@/types/moodie";
import type { Role } from "@/types/roles";
import type { ProviderMessage } from "@/lib/moodie/providers/types";

type EngineResult = {
  content: string;
  metadata: MoodieMessageMeta;
};

class MoodieModelError extends Error {
  constructor(
    message: string,
    readonly trace: ReturnType<typeof createMoodieTrace>["trace"],
  ) {
    super(message);
    this.name = "MoodieModelError";
  }
}

async function buildAttachmentContext(
  supabase: SupabaseClient<Database>,
  attachments: MoodieAttachment[] | undefined,
) {
  if (!attachments?.length) return "";
  const details = await Promise.all(attachments.map(async (attachment) => {
    if (attachment.mime_type !== "text/plain") {
      return `- ${attachment.name} (${attachment.mime_type}, ${attachment.size} bytes)`;
    }
    const { data, error } = await supabase.storage.from("moodie-attachments").download(attachment.storage_path);
    if (error || !data) return `- ${attachment.name} (không thể đọc nội dung)`;
    const text = (await data.text()).slice(0, 12_000);
    return `- ${attachment.name} (text/plain):\n${text}`;
  }));
  return `User attachments:\n${details.join("\n")}`;
}

function buildSelectedContext(contexts: MoodieComposerContext[] | undefined) {
  if (!contexts?.length) return "";
  return `User-selected context:\n${contexts.map((context) => `- ${context.type}: ${context.label}${context.value ? ` (${context.value})` : ""}`).join("\n")}`;
}

function trimHistory(history: MoodieHistoryMessage[] | undefined, prompt: string) {
  const baseHistory =
    history && history.length > 0
      ? history
      : [{ role: "user" as const, content: prompt }];

  return baseHistory
    .filter((message) => message.content.trim().length > 0)
    .slice(-MOODIE_MODEL_MAX_HISTORY);
}

async function runMoodieModelEngine(params: {
  supabase: SupabaseClient<Database>;
  role: Role;
  prompt: string;
  history?: MoodieHistoryMessage[];
  userId?: string;
  conversationId?: string;
  conversationSummary?: string | null;
  attachments?: MoodieAttachment[];
  contexts?: MoodieComposerContext[];
  emit?: (event: MoodieEngineEvent) => void;
}): Promise<EngineResult | null> {
  const provider = await getActiveMoodieProvider();
  if (!provider) return null;

  const history = trimHistory(params.history, params.prompt);
  const route = routeMoodieIntent({
    prompt: params.prompt,
    history,
    role: params.role,
  });
  const executionPlan = planMoodieExecution({
    route,
    prompt: params.prompt,
    role: params.role,
  });
  const agent = selectMoodieAgent({ intent: route.intent, role: params.role });
  const plannedAction = planMoodieSafeNavigation({ prompt: params.prompt, role: params.role });
  params.emit?.({
    type: "route.resolved",
    label: `Đang xử lý theo ngữ cảnh ${agent.label}`,
    intent: route.intent,
    agent_id: agent.id,
    agent_label: agent.label,
  });
  params.emit?.({
    type: "plan.created",
    label: "Đã lập kế hoạch xử lý",
    summary: executionPlan.summary,
    tool_names: executionPlan.prioritizedToolNames,
  });
  params.emit?.({ type: "context.started", label: "Đang đọc ngữ cảnh liên quan" });
  const retrievedContext = buildMoodieRetrievedContext({
    prompt: params.prompt,
    route,
  });
  const [memoryContext, attachmentContext] = await Promise.all([
    loadMoodieMemoryContext({
      supabase: params.supabase,
      userId: params.userId,
      conversationId: params.conversationId,
      prompt: params.prompt,
    }),
    buildAttachmentContext(params.supabase, params.attachments),
  ]);
  const selectedContext = buildSelectedContext(params.contexts);
  params.emit?.({
    type: "context.completed",
    label: retrievedContext.hasContext || memoryContext ? "Đã chuẩn bị ngữ cảnh" : "Không cần bổ sung ngữ cảnh",
    retrieval_used: retrievedContext.hasContext,
    memory_used: Boolean(memoryContext || attachmentContext || selectedContext),
  });
  const toolDefinitions = getMoodieToolDefinitions({
    allowedToolNames: executionPlan.prioritizedToolNames,
    role: params.role,
  });
  const traceState = createMoodieTrace({
    provider: provider.label,
    agent_id: agent.id,
    route_intent: route.intent,
    route_reason: route.reason,
    retrieval_used: retrievedContext.hasContext,
    execution_plan: executionPlan.summary,
  });

  const messages: ProviderMessage[] = [
    {
      role: "system",
      content: MOODIE_IDENTITY_PROMPT,
    },
    ...(buildMoodieConversationSummaryContext(params.conversationSummary)
      ? [{ role: "system" as const, content: buildMoodieConversationSummaryContext(params.conversationSummary) }]
      : []),
    {
      role: "system",
      content: buildMoodieAgentInstruction(agent),
    },
    ...(memoryContext ? [{ role: "system" as const, content: memoryContext }] : []),
    ...(attachmentContext ? [{ role: "system" as const, content: attachmentContext }] : []),
    ...(selectedContext ? [{ role: "system" as const, content: selectedContext }] : []),
    {
      role: "system",
      content: `${MOODIE_MODEL_SYSTEM_PROMPT}\n\nRouting context:\n- intent: ${route.intent}\n- must_use_data_tool: ${executionPlan.shouldForceTool ? "yes" : "no"}\n- exposed_tools: ${executionPlan.prioritizedToolNames.join(", ") || "none"}\n- route_reason: ${route.reason}\n- execution_plan: ${executionPlan.summary}\n- history_policy: only recent, compact, decision-relevant context is preserved${retrievedContext.hasContext ? `\n\n${retrievedContext.summary}` : ""}`,
    },
    ...shapeMoodieHistoryForModel(history),
  ];

  let metadataPatch: Partial<MoodieMessageMeta> = {
    skill_label: agent.label,
    agent_id: agent.id,
    agent_label: agent.label,
    actions: plannedAction ? [plannedAction] : undefined,
    provider: provider.label,
  };
  const widgets: MoodieWidget[] = [];
  const parts: MoodieMessagePart[] = [];
  let toolUsedInTurn = false;
  let correctionCount = 0;

  try {
    for (let step = 0; step < 8; step += 1) {
      traceState.trace.model_steps = step + 1;
      let streamedThisStep = false;
      const modelResult = provider.chatStream
        ? await provider.chatStream(messages, toolDefinitions, (delta) => {
            streamedThisStep = true;
            params.emit?.({ type: "text.delta", delta });
          })
        : await provider.chat(messages, toolDefinitions);

      if (!modelResult.ok) {
        throw new Error(modelResult.error);
      }

      if (modelResult.usage) {
        traceState.trace.input_tokens = (traceState.trace.input_tokens || 0) + (modelResult.usage.inputTokens || 0);
        traceState.trace.output_tokens = (traceState.trace.output_tokens || 0) + (modelResult.usage.outputTokens || 0);
        traceState.trace.total_tokens = (traceState.trace.total_tokens || 0) + (modelResult.usage.totalTokens || 0);
      }

      const assistantMessage = modelResult.message;
      const toolCalls = assistantMessage.tool_calls || [];

      if (toolCalls.length === 0) {
      const content = assistantMessage.content?.trim();
      if (!content) {
        throw new Error("Moodie model returned an empty response.");
      }

      const verification = verifyMoodieAnswer({
        userPrompt: params.prompt,
        route,
        assistantMessage,
        toolUsedInTurn,
        correctionCount,
      });

      if (!verification.ok) {
        correctionCount += 1;
        traceState.trace.verifier_corrections = correctionCount;
        if (streamedThisStep) params.emit?.({ type: "text.reset" });
        messages.push(assistantMessage);
        messages.push({ role: "system", content: verification.correctiveInstruction });
        continue;
      }

        if (!streamedThisStep) params.emit?.({ type: "text.delta", delta: content });
        return {
        content,
        metadata: attachMoodieTrace({
          provider: provider.label,
          note: "model_generated",
          route_intent: route.intent,
          route_reason: route.reason,
          agent_id: agent.id,
          retrieval_used: retrievedContext.hasContext,
          execution_plan: executionPlan.summary,
          ...metadataPatch,
          widgets:
            widgets.length > 0
              ? widgets.slice(0, 3)
              : metadataPatch.widgets,
          parts: parts.length > 0 ? parts.slice(0, 6) : metadataPatch.parts,
          visual_schema_version: parts.length > 0 || metadataPatch.parts?.length ? 1 : undefined,
        }, traceState.finish({
          tool_call_count: traceState.trace.tools.length,
        })),
        };
      }

      if (streamedThisStep) params.emit?.({ type: "text.reset" });
      messages.push(assistantMessage);

      for (const toolCall of toolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        parsedArgs = {};
      }

      toolUsedInTurn = true;

      const toolStartedAt = Date.now();
      params.emit?.({
        type: "tool.started",
        label: `Đang tra ${toolCall.function.name}`,
        tool_run_id: toolCall.id,
        tool_name: toolCall.function.name,
      });
      let execution;
      try {
        execution = await executeMoodieTool(
        toolCall.function.name,
        {
          supabase: params.supabase,
          role: params.role,
          userId: params.userId,
          conversationId: params.conversationId,
          history,
        },
        parsedArgs,
      );

      } catch (error) {
        const durationMs = Date.now() - toolStartedAt;
        const errorMessage = error instanceof Error ? error.message : String(error);
        traceState.trace.tools.push({
          name: toolCall.function.name,
          ok: false,
          duration_ms: durationMs,
          error: errorMessage,
        });
        params.emit?.({
          type: "tool.failed",
          label: `Không thể hoàn tất ${toolCall.function.name}`,
          tool_run_id: toolCall.id,
          tool_name: toolCall.function.name,
          duration_ms: durationMs,
          error: errorMessage,
        });
        throw error;
      }

      const toolDurationMs = Date.now() - toolStartedAt;
      traceState.trace.tools.push({
        name: toolCall.function.name,
        ok: true,
        duration_ms: toolDurationMs,
        result_bytes: JSON.stringify(execution.result).length,
      });

      const nextWidgets = execution.metadata.widgets || [];
      const nextParts = execution.metadata.parts || [];
      params.emit?.({
        type: "tool.completed",
        label: `Đã tra xong ${toolCall.function.name}`,
        tool_run_id: toolCall.id,
        tool_name: toolCall.function.name,
        duration_ms: toolDurationMs,
        sources: execution.metadata.sources,
        parts: nextParts.length > 0 ? nextParts : undefined,
      });
      nextParts.forEach((part, partIndex) => {
        params.emit?.({
          type: "part.created",
          part_id: `${toolCall.id}:${partIndex}`,
          part,
        });
      });
      const { widgets: metadataWidgets, parts: metadataParts, ...restMetadata } = execution.metadata;
      void metadataWidgets;
      void metadataParts;

      if (nextWidgets.length > 0) {
        widgets.push(...nextWidgets);
      }
      if (nextParts.length > 0) {
        parts.push(...nextParts);
      }

      metadataPatch = {
        ...metadataPatch,
        ...restMetadata,
      };

        messages.push({
        role: "tool",
        content: normalizeMoodieToolOutput({
          toolName: toolCall.function.name,
          result: execution.result,
          metadata: execution.metadata,
        }),
        _tool_name: toolCall.function.name,
        _tool_call_id: toolCall.id,
        });
      }
    }

    throw new Error("Moodie model exceeded the tool loop limit (8 steps).");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    traceState.finish({ error: message, provider_latency_ms: Date.now() - Date.parse(traceState.trace.started_at) });
    throw new MoodieModelError(message, traceState.trace);
  }
}

export function buildMoodieUnavailableResult(error?: string): EngineResult {
  return {
    content: "Moodie đang không kết nối được với model trò chuyện. Bạn có thể thử lại sau khi kiểm tra combo provider trong Cài đặt Studio.",
    metadata: {
      provider: "Moodie fallback",
      skill_id: "fallback",
      skill_label: "Kết nối AI gián đoạn",
      note: error || "provider_unavailable",
      follow_ups: ["Thử lại câu vừa rồi", "Kiểm tra provider đang dùng"],
    },
  };
}

export async function runMoodieEngine(params: {
  supabase: SupabaseClient<Database>;
  role: Role;
  prompt: string;
  history?: MoodieHistoryMessage[];
  userId?: string;
  conversationId?: string;
  conversationSummary?: string | null;
  attachments?: MoodieAttachment[];
  contexts?: MoodieComposerContext[];
  emit?: (event: MoodieEngineEvent) => void;
}): Promise<EngineResult> {
  const requestStartedAt = Date.now();
  const route = routeMoodieIntent({
    prompt: params.prompt,
    history: trimHistory(params.history, params.prompt),
    role: params.role,
  });
  let modelError: MoodieModelError | null = null;
  let fallbackReason: "provider_unavailable" | "provider_error" = "provider_unavailable";

  try {
    const modelResult = await runMoodieModelEngine(params);
    if (modelResult) return modelResult;
  } catch (error) {
    fallbackReason = "provider_error";
    modelError = error instanceof MoodieModelError
      ? error
      : new MoodieModelError(error instanceof Error ? error.message : String(error), createMoodieTrace({ route_intent: route.intent, route_reason: route.reason }).trace);
    await logError({
      error,
      context: "moodie.modelEngine",
      tableName: "ai_messages",
    }).catch(() => {});
  }

  const fallbackStartedAt = Date.now();
  const fallbackResult = route.intent === "general"
    ? buildMoodieUnavailableResult(modelError?.message)
    : await runMoodieCoreEngine({
        supabase: params.supabase,
        role: params.role,
        prompt: params.prompt,
      });
  const fallbackLatency = Date.now() - fallbackStartedAt;
  const previousTrace = modelError?.trace;
  params.emit?.({ type: "text.delta", delta: fallbackResult.content });

  return {
    ...fallbackResult,
    metadata: attachMoodieTrace(fallbackResult.metadata, {
      engine: "core_fallback",
      started_at: new Date(requestStartedAt).toISOString(),
      duration_ms: Date.now() - requestStartedAt,
      provider: previousTrace?.provider || fallbackResult.metadata.provider,
      route_intent: route.intent,
      route_reason: route.reason,
      retrieval_used: false,
      execution_plan: previousTrace?.execution_plan || fallbackResult.metadata.execution_plan,
      model_steps: previousTrace?.model_steps || 0,
      tool_call_count: previousTrace?.tool_call_count || 0,
      verifier_corrections: previousTrace?.verifier_corrections || 0,
      fallback_used: true,
      fallback_reason: fallbackReason,
      provider_latency_ms: previousTrace?.provider_latency_ms,
      fallback_latency_ms: fallbackLatency,
      tools: previousTrace?.tools || [],
      error: modelError?.message,
    }),
  };
}

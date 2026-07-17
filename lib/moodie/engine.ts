import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/audit";
import { runMoodieCoreEngine } from "@/lib/moodie/core-engine";
import { getActiveMoodieProvider } from "@/lib/moodie/providers/registry";
import {
  MOODIE_MODEL_MAX_HISTORY,
  MOODIE_IDENTITY_PROMPT,
  MOODIE_MODEL_SYSTEM_PROMPT,
} from "@/lib/moodie/model-prompt";
import type { MoodieAuthenticatedUserContext } from "@/lib/moodie/model-prompt";
import { executeMoodieTool, getMoodieToolDefinitions } from "@/lib/moodie/tools";
import { classifyMoodieResearchIntent } from "@/lib/moodie/research-intent";
import { routeMoodieIntent } from "@/lib/moodie/intent-router";
import { verifyMoodieAnswer } from "@/lib/moodie/answer-verifier";
import { shapeMoodieHistoryForModel } from "@/lib/moodie/context-shaper";
import { normalizeMoodieToolOutput } from "@/lib/moodie/tool-output-normalizer";
import { planMoodieContext } from "@/lib/moodie/context-planner";
import { planMoodieExecution } from "@/lib/moodie/tool-planner";
import { attachMoodieTrace, createMoodieTrace } from "@/lib/moodie/trace";
import { summarizeMoodieMemoryGrounding } from "@/lib/moodie/memory-grounding";
import { buildMoodieAgentInstruction, selectMoodieAgent } from "@/lib/moodie/agents/profiles";
import { planMoodieSafeNavigation } from "@/lib/moodie/action-planner";
import { planMoodieWorkflow } from "@/lib/moodie/execution-plan-v2";
import { getMoodieWorkflow } from "@/lib/moodie/workflows/registry";
import type { Database } from "@/types/database.types";
import type {
  MoodieAttachment,
  MoodieComposerContext,
  MoodieEngineEvent,
  MoodieHistoryMessage,
  MoodieMessageMeta,
  MoodieMessageSource,
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

function normalizeFastPathPrompt(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMoodieSessionIdentityResponse(
  prompt: string,
  userContext: MoodieAuthenticatedUserContext,
): string | null {
  const normalized = normalizeFastPathPrompt(prompt);
  const asksWhoAmI = /^(ban (co )?biet )?(minh|toi) la ai( khong)?$/.test(normalized)
    || /^(who am i|do you know who i am)$/.test(normalized);

  if (!asksWhoAmI) return null;
  return `Bạn đang đăng nhập với tên ${userContext.fullName}, vai trò ${userContext.role} tại Mood Studio.`;
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

function throwIfMoodieAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Đã dừng phản hồi", "AbortError");
}

async function runMoodieModelEngine(params: {
  supabase: SupabaseClient<Database>;
  role: Role;
  prompt: string;
  history?: MoodieHistoryMessage[];
  userId?: string;
  conversationId?: string;
  conversationSummary?: string | null;
  userContext: MoodieAuthenticatedUserContext;
  attachments?: MoodieAttachment[];
  contexts?: MoodieComposerContext[];
  responseProfile?: "default" | "voice";
  model?: string;
  emit?: (event: MoodieEngineEvent) => void;
  signal?: AbortSignal;
}): Promise<EngineResult | null> {
  throwIfMoodieAborted(params.signal);
  const earlyResearchIntent = classifyMoodieResearchIntent(params.prompt);
  const workflowCandidate = planMoodieWorkflow({ prompt: params.prompt, role: params.role });
  const workflowPlan = earlyResearchIntent.requested || earlyResearchIntent.mode === "local"
    ? null
    : workflowCandidate;
  if (workflowPlan) {
    const workflowIntent = workflowPlan.skillId === "financial_health_review" ? "finance" : workflowPlan.skillId === "studio_daily_brief" ? "crm_calendar_ops" : "contracts";
    const workflowAgentId = workflowIntent === "finance" ? "finance_analyst" : "operations_assistant";
    const workflowAgentLabel = workflowIntent === "finance" ? "Finance Analyst" : "Operations Assistant";
    params.emit?.({ type: "route.resolved", label: `Đang xử lý theo ${workflowPlan.skillId}`, intent: workflowIntent, agent_id: workflowAgentId, agent_label: workflowAgentLabel });
    params.emit?.({ type: "plan.created", label: "Đã lập kế hoạch điều tra vận hành", summary: workflowPlan.objective, tool_names: workflowPlan.steps.map((step) => step.tool) });
    const workflow = getMoodieWorkflow(workflowPlan);
    const workflowResult = await workflow.run({ plan: workflowPlan, supabase: params.supabase, role: params.role, userId: params.userId, conversationId: params.conversationId, emit: params.emit, signal: params.signal });
    params.emit?.({ type: "generation.started", label: "Đang trình bày kết quả đã kiểm chứng" });
    params.emit?.({ type: "text.delta", delta: workflowResult.content });
    return workflowResult;
  }
  const provider = await getActiveMoodieProvider(params.model);
  if (!provider) return null;
  throwIfMoodieAborted(params.signal);

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
  const contextStartedAt = Date.now();
  const [contextPacket, attachmentContext] = await Promise.all([
    planMoodieContext({
      supabase: params.supabase,
      userContext: params.userContext,
      prompt: params.prompt,
      conversationId: params.conversationId,
      conversationSummary: params.conversationSummary,
      route,
    }),
    buildAttachmentContext(params.supabase, params.attachments),
  ]);
  const retrievedContext = contextPacket.retrieval;
  const memoryContext = contextPacket.memory;
  const workingMemoryContext = contextPacket.workingMemory;
  const selectedContext = buildSelectedContext(params.contexts);
  params.emit?.({
    type: "context.completed",
    label: retrievedContext.hasContext || memoryContext || workingMemoryContext ? "Đã chuẩn bị ngữ cảnh" : "Không cần bổ sung ngữ cảnh",
    retrieval_used: retrievedContext.hasContext,
    memory_used: Boolean(memoryContext || workingMemoryContext || attachmentContext || selectedContext),
  });
  const availableToolNames = contextPacket.trace.allowed_tool_names;
  if (route.research.required && !availableToolNames.some((name) => name.startsWith("search_") || name === "start_deep_research")) {
    throw new Error("Không thể truy cập nguồn bên ngoài: Brave Search đang tắt hoặc chưa được cấu hình");
  }
  const toolDefinitions = getMoodieToolDefinitions({
    allowedToolNames: availableToolNames,
    role: params.role,
  });
  const traceState = createMoodieTrace({
    provider: provider.label,
    agent_id: agent.id,
    route_intent: route.intent,
    route_reason: route.reason,
    retrieval_used: retrievedContext.hasContext,
    working_memory_used: contextPacket.trace.working_memory_used,
    execution_plan: executionPlan.summary,
    research_required: contextPacket.trace.research_required,
    research_mode: contextPacket.trace.research_mode,
    allowed_tool_names: availableToolNames,
  });
  traceState.trace.context_latency_ms = Date.now() - contextStartedAt;

  const messages: ProviderMessage[] = [
    {
      role: "system",
      content: MOODIE_IDENTITY_PROMPT,
    },
    {
      role: "system",
      content: contextPacket.identity,
    },
    ...(contextPacket.conversationSummary
      ? [{ role: "system" as const, content: contextPacket.conversationSummary }]
      : []),
    {
      role: "system",
      content: buildMoodieAgentInstruction(agent),
    },
    ...(memoryContext ? [{ role: "system" as const, content: memoryContext }] : []),
    ...(workingMemoryContext ? [{ role: "system" as const, content: workingMemoryContext }] : []),
    ...(attachmentContext ? [{ role: "system" as const, content: attachmentContext }] : []),
    ...(selectedContext ? [{ role: "system" as const, content: selectedContext }] : []),
    {
      role: "system",
      content: `${MOODIE_MODEL_SYSTEM_PROMPT}\n\nRouting context:\n- intent: ${route.intent}\n- must_use_data_tool: ${executionPlan.shouldForceTool ? "yes" : "no"}\n- exposed_tools: ${availableToolNames.join(", ") || "none"}
- research_required: ${contextPacket.trace.research_required ? "yes" : "no"}
- research_mode: ${contextPacket.trace.research_mode || "none"}
- research_policy: ${route.orchestration.mode === "background_run" ? "Call start_deep_research exactly once, then tell the user the research is running in the background. Do not claim a research result yet." : contextPacket.trace.research_required ? "You must call the exposed search tool before answering. Every current external claim must be grounded in the returned sources and include an inline numeric citation like [1] matching the source order. If the tool fails, state that external research is unavailable and do not answer from memory." : "Do not call external search unless an exposed tool is present."}\n- route_reason: ${route.reason}\n- execution_plan: ${executionPlan.summary}\n- history_policy: only recent, compact, decision-relevant context is preserved${retrievedContext.hasContext ? `\n\n${retrievedContext.summary}` : ""}`,
    },
    ...(params.responseProfile === "voice" ? [{
      role: "system" as const,
      content: "Voice response profile: answer for speech, not a document. Give the direct answer first, use at most 120 Vietnamese words, no markdown table, no long preamble, and ask at most one short follow-up. Keep tool use and factual safeguards unchanged.",
    }] : []),
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
  const sources: MoodieMessageSource[] = [];
  let toolUsedInTurn = false;
  let externalResearchCalls = 0;
  let externalResearchUsed = false;
  let backgroundResearchStarted = false;
  let correctionCount = 0;
  let providerLatencyMs = 0;
  let firstTokenLatencyMs: number | undefined;

  try {
    for (let step = 0; step < 8; step += 1) {
      throwIfMoodieAborted(params.signal);
      traceState.trace.model_steps = step + 1;
      let streamedThisStep = false;
      let bufferedText = "";
      params.emit?.({ type: "generation.started", label: step === 0 ? "Đang soạn câu trả lời" : "Đang hoàn thiện câu trả lời" });
      const toolChoice = step === 0 && executionPlan.shouldForceTool ? "required" as const : "auto" as const;
      const bufferUntilFinal = executionPlan.shouldForceTool
        || route.research.required
        || route.orchestration.mode === "background_run"
        || toolUsedInTurn;
      const providerStartedAt = Date.now();
      const modelResult = provider.chatStream
        ? await provider.chatStream(messages, toolDefinitions, (delta) => {
            throwIfMoodieAborted(params.signal);
            if (firstTokenLatencyMs === undefined) firstTokenLatencyMs = Date.now() - providerStartedAt;
            streamedThisStep = true;
            if (bufferUntilFinal) bufferedText += delta;
            else params.emit?.({ type: "text.delta", delta });
          }, { signal: params.signal, toolChoice, maxOutputTokens: params.responseProfile === "voice" ? 384 : undefined })
        : await provider.chat(messages, toolDefinitions, { signal: params.signal, toolChoice, maxOutputTokens: params.responseProfile === "voice" ? 384 : undefined });
      providerLatencyMs += Date.now() - providerStartedAt;
      throwIfMoodieAborted(params.signal);

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
        externalResearchUsed,
        externalSourceCount: sources.filter((source) => source.kind === "web").length,
        backgroundResearchStarted,
        correctionCount,
        authenticatedUser: { fullName: params.userContext.fullName, role: params.userContext.role },
      });

      if (!verification.ok) {
        correctionCount += 1;
        traceState.trace.verifier_corrections = correctionCount;
        if (streamedThisStep && !bufferUntilFinal) params.emit?.({ type: "text.reset" });
        messages.push(assistantMessage);
        messages.push({ role: "system", content: verification.correctiveInstruction });
        continue;
      }

        const finalContent = verification.replacementContent || content;
        if (verification.replacementContent && streamedThisStep && !bufferUntilFinal) params.emit?.({ type: "text.reset" });
        if (!streamedThisStep || verification.replacementContent || bufferUntilFinal) {
          params.emit?.({ type: "text.delta", delta: finalContent || bufferedText });
        }
        return {
        content: finalContent,
        metadata: attachMoodieTrace({
          provider: provider.label,
          note: "model_generated",
          route_intent: route.intent,
          route_reason: route.reason,
          agent_id: agent.id,
          retrieval_used: retrievedContext.hasContext,
          execution_plan: executionPlan.summary,
          ...metadataPatch,
          sources: sources.length > 0 ? sources.slice(0, 20) : metadataPatch.sources,
          widgets:
            widgets.length > 0
              ? widgets.slice(0, 3)
              : metadataPatch.widgets,
          parts: parts.length > 0 ? parts.slice(0, 6) : metadataPatch.parts,
          visual_schema_version: parts.length > 0 || metadataPatch.parts?.length ? 1 : undefined,
        }, traceState.finish({
          tool_call_count: traceState.trace.tools.length,
          provider_latency_ms: providerLatencyMs,
          first_token_latency_ms: firstTokenLatencyMs,
          memory_grounding: summarizeMoodieMemoryGrounding(contextPacket.memoryRecords, finalContent),
        })),
        };
      }

      if (streamedThisStep && !bufferUntilFinal) params.emit?.({ type: "text.reset" });
      messages.push(assistantMessage);

      for (const toolCall of toolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        parsedArgs = {};
      }

      const isExternalResearchTool = toolCall.function.name === "search_web"
        || toolCall.function.name === "search_news"
        || toolCall.function.name === "search_local";
      if (isExternalResearchTool && externalResearchCalls >= contextPacket.trace.foreground_call_budget) {
        messages.push({
          role: "tool",
          content: JSON.stringify({
            tool: toolCall.function.name,
            error: "Foreground external research call budget exhausted. Use the sources already returned and finish the answer.",
          }),
          _tool_name: toolCall.function.name,
          _tool_call_id: toolCall.id,
        });
        continue;
      }
      if (isExternalResearchTool) externalResearchCalls += 1;
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
        throwIfMoodieAborted(params.signal);
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

      throwIfMoodieAborted(params.signal);
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
      const { widgets: metadataWidgets, parts: metadataParts, sources: metadataSources, ...restMetadata } = execution.metadata;
      void metadataWidgets;
      void metadataParts;
      if (execution.metadata.background_runs?.length) backgroundResearchStarted = true;
      if (metadataSources?.length) sources.push(...metadataSources);
      if (isExternalResearchTool && metadataSources?.some((source) => source.kind === "web")) {
        externalResearchUsed = true;
      }

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
  userContext: MoodieAuthenticatedUserContext;
  attachments?: MoodieAttachment[];
  contexts?: MoodieComposerContext[];
  responseProfile?: "default" | "voice";
  model?: string;
  emit?: (event: MoodieEngineEvent) => void;
  signal?: AbortSignal;
}): Promise<EngineResult> {
  const requestStartedAt = Date.now();
  const sessionIdentityResponse = buildMoodieSessionIdentityResponse(params.prompt, params.userContext);
  if (sessionIdentityResponse) {
    throwIfMoodieAborted(params.signal);
    params.emit?.({ type: "generation.started", label: "Đang kiểm tra phiên đăng nhập" });
    params.emit?.({ type: "text.delta", delta: sessionIdentityResponse });
    return {
      content: sessionIdentityResponse,
      metadata: attachMoodieTrace({
        provider: "Moodie session",
        skill_id: "session_identity",
        skill_label: "Phiên đăng nhập",
        note: "authenticated_session",
      }, {
        engine: "session",
        started_at: new Date(requestStartedAt).toISOString(),
        duration_ms: Date.now() - requestStartedAt,
        route_intent: "general",
        route_reason: "authenticated_session_identity",
        retrieval_used: false,
        model_steps: 0,
        tool_call_count: 0,
        verifier_corrections: 0,
        fallback_used: false,
        tools: [],
      }),
    };
  }
  const route = routeMoodieIntent({
    prompt: params.prompt,
    history: trimHistory(params.history, params.prompt),
    role: params.role,
  });
  let modelError: MoodieModelError | null = null;
  let fallbackReason: "provider_unavailable" | "provider_error" = "provider_unavailable";

  try {
    throwIfMoodieAborted(params.signal);
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

  throwIfMoodieAborted(params.signal);
  params.emit?.({ type: "generation.started", label: "Đang chuẩn bị câu trả lời" });
  const fallbackStartedAt = Date.now();
  const fallbackResult = route.research.required
    ? {
        content: "Mình chưa thể truy cập nguồn bên ngoài để kiểm chứng câu hỏi này. Mình sẽ không trả lời bằng dữ liệu có thể đã cũ hoặc không có nguồn. Bạn có thể thử lại sau.",
        metadata: {
          provider: "Moodie research fallback",
          skill_label: "Nghiên cứu bên ngoài",
          note: modelError?.message || "external_research_unavailable",
          follow_ups: ["Thử tìm nguồn lại", "Đặt câu hỏi không yêu cầu dữ liệu mới nhất"],
        } satisfies MoodieMessageMeta,
      }
    : route.intent === "general"
      ? buildMoodieUnavailableResult(modelError?.message)
      : await runMoodieCoreEngine({
          supabase: params.supabase,
          role: params.role,
          prompt: params.prompt,
        });
  throwIfMoodieAborted(params.signal);
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

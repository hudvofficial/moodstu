import { getMoodieBraveRuntimeConfig } from "@/lib/moodie/brave-config";
import { getMoodieBrowserRuntimeConfig } from "@/lib/moodie/browser-config";
import { redactMoodieResearchQuery } from "@/lib/moodie/mcp/policy";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMoodieConversationSummaryContext } from "@/lib/moodie/conversation-summary";
import { loadMoodieMemoryContext } from "@/lib/moodie/memory-store";
import { buildMoodieAuthenticatedUserPrompt, type MoodieAuthenticatedUserContext } from "@/lib/moodie/model-prompt";
import { buildMoodieRetrievedContext } from "@/lib/moodie/retrieval-context";
import { loadMoodieWorkingContext } from "@/lib/moodie/observation-store";
import type { MoodieIntentRoute } from "@/lib/moodie/intent-router";
import type { Database } from "@/types/database.types";

export type MoodieContextPacket = {
  identity: string;
  conversationSummary: string;
  memory: string;
  memoryRecords: Array<{ id: string; content: string }>;
  workingMemory: string;
  retrieval: { summary: string; hasContext: boolean };
  trace: {
    identity_context_used: boolean;
    conversation_summary_used: boolean;
    memory_context_used: boolean;
    working_memory_used: boolean;
    retrieval_context_used: boolean;
    research_required: boolean;
    research_mode?: "web" | "news" | "local";
    research_query_redacted?: string;
    allowed_tool_names: string[];
    foreground_call_budget: number;
    background_run_budget: number;
  };
};

export async function planMoodieContext(params: {
  supabase: SupabaseClient<Database>;
  userContext: MoodieAuthenticatedUserContext;
  prompt?: string;
  conversationId?: string;
  conversationSummary?: string | null;
  includeRetrieval?: boolean;
  route?: MoodieIntentRoute;
}) : Promise<MoodieContextPacket> {
  const identity = buildMoodieAuthenticatedUserPrompt(params.userContext);
  const conversationSummary = buildMoodieConversationSummaryContext(params.conversationSummary);
  const [memoryResult, workingMemory, retrieval, braveConfig, browserConfig] = await Promise.all([
    loadMoodieMemoryContext({
      supabase: params.supabase,
      userId: params.userContext.id,
      conversationId: params.conversationId,
      prompt: params.prompt,
    }),
    loadMoodieWorkingContext({
      supabase: params.supabase,
      userId: params.userContext.id,
      conversationId: params.conversationId,
    }),
    Promise.resolve(params.includeRetrieval === false || !params.prompt || !params.route
      ? { summary: "", hasContext: false }
      : buildMoodieRetrievedContext({ prompt: params.prompt, route: params.route })),
    params.route?.research.required ? getMoodieBraveRuntimeConfig() : Promise.resolve(null),
    params.route?.allowedToolNames.includes("browse_page") ? getMoodieBrowserRuntimeConfig() : Promise.resolve(null),
  ]);
  const researchAvailable = Boolean(braveConfig?.enabled && (braveConfig.apiKey || braveConfig.mcpUrl));
  const allowedToolNames = (params.route?.allowedToolNames || []).filter((name) =>
    (!(name.startsWith("search_") || name === "start_deep_research") || researchAvailable)
    && (name !== "browse_page" || browserConfig?.enabled !== false),
  );

  return {
    identity,
    conversationSummary,
    memory: memoryResult.context,
    memoryRecords: memoryResult.records,
    workingMemory,
    retrieval,
    trace: {
      identity_context_used: Boolean(identity),
      conversation_summary_used: Boolean(conversationSummary),
      memory_context_used: Boolean(memoryResult.context),
      working_memory_used: Boolean(workingMemory),
      retrieval_context_used: retrieval.hasContext,
      research_required: Boolean(params.route?.research.required),
      research_mode: params.route?.research.required ? params.route.research.mode : undefined,
      research_query_redacted: params.route?.research.required && params.prompt
        ? redactMoodieResearchQuery(params.prompt)
        : undefined,
      allowed_tool_names: allowedToolNames,
      foreground_call_budget: params.route?.orchestration.foregroundCallBudget || 0,
      background_run_budget: params.route?.orchestration.backgroundRunBudget || 0,
    },
  };
}

export function buildMoodieVoiceMemoryPacket(packet: MoodieContextPacket) {
  return [
    packet.identity,
    packet.memory,
    packet.workingMemory,
    packet.conversationSummary,
  ].filter(Boolean).join("\n\n");
}

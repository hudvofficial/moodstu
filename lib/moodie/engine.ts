import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@/lib/audit";
import { runMoodieCoreEngine } from "@/lib/moodie/core-engine";
import {
  callMoodieGemini,
  getMoodieModelProvider,
  type MoodieModelMessage,
} from "@/lib/moodie/gemini";
import {
  MOODIE_MODEL_MAX_HISTORY,
  MOODIE_MODEL_SYSTEM_PROMPT,
} from "@/lib/moodie/model-prompt";
import { executeMoodieTool, getMoodieToolDefinitions } from "@/lib/moodie/tools";
import type { Database } from "@/types/database.types";
import type {
  MoodieHistoryMessage,
  MoodieMessageMeta,
  MoodieWidget,
} from "@/types/moodie";
import type { Role } from "@/types/roles";

type EngineResult = {
  content: string;
  metadata: MoodieMessageMeta;
};

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
}): Promise<EngineResult | null> {
  const provider = await getMoodieModelProvider();
  if (!provider) return null;

  const history = trimHistory(params.history, params.prompt);
  const toolDefinitions = getMoodieToolDefinitions();

  const messages: MoodieModelMessage[] = [
    { role: "system", content: MOODIE_MODEL_SYSTEM_PROMPT },
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  let metadataPatch: Partial<MoodieMessageMeta> = {
    skill_label: "Moodie AI",
  };
  const widgets: MoodieWidget[] = [];

  for (let step = 0; step < 5; step += 1) {
    const modelResult = await callMoodieGemini(
      messages,
      toolDefinitions,
      provider,
    );
    if (!modelResult.ok) {
      throw new Error(modelResult.error);
    }

    const assistantMessage = modelResult.message;
    const toolCalls = assistantMessage.tool_calls || [];

    if (toolCalls.length === 0) {
      const content = assistantMessage.content?.trim();
      if (!content) {
        throw new Error("Moodie model returned an empty response.");
      }

      return {
        content,
        metadata: {
          provider: provider.label,
          note: "model_generated",
          ...metadataPatch,
          widgets:
            widgets.length > 0
              ? widgets.slice(0, 3)
              : metadataPatch.widgets,
        },
      };
    }

    messages.push(assistantMessage);

    for (const toolCall of toolCalls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments);
      } catch {
        parsedArgs = {};
      }

      const execution = await executeMoodieTool(
        toolCall.function.name,
        {
          supabase: params.supabase,
          role: params.role,
          history,
        },
        parsedArgs,
      );

      const nextWidgets = execution.metadata.widgets || [];
      const { widgets: metadataWidgets, ...restMetadata } = execution.metadata;
      void metadataWidgets;

      if (nextWidgets.length > 0) {
        widgets.push(...nextWidgets);
      }

      metadataPatch = {
        ...metadataPatch,
        ...restMetadata,
      };

      messages.push({
        role: "tool",
        content: JSON.stringify(execution.result),
        _tool_name: toolCall.function.name,
      });
    }
  }

  throw new Error("Moodie model exceeded the tool loop limit.");
}

export async function runMoodieEngine(params: {
  supabase: SupabaseClient<Database>;
  role: Role;
  prompt: string;
  history?: MoodieHistoryMessage[];
}): Promise<EngineResult> {
  try {
    const modelResult = await runMoodieModelEngine(params);
    if (modelResult) return modelResult;
  } catch (error) {
    await logError({
      error,
      context: "moodie.modelEngine",
      tableName: "ai_messages",
    }).catch(() => {});
  }

  return runMoodieCoreEngine({
    supabase: params.supabase,
    role: params.role,
    prompt: params.prompt,
  });
}

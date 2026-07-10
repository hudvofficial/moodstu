/**
 * openai-adapter.ts
 *
 * OpenAI-compatible adapter cho Moodie.
 * Covers: Ollama, vLLM, LM Studio, Qwen DashScope, DeepSeek, OpenAI —
 * tất cả đều dùng /v1/chat/completions + /v1/embeddings format.
 */

import type {
  MoodieProvider,
  MoodieProviderConfig,
  ProviderMessage,
  ToolDefinition,
  ProviderChatResult,
  ProviderEmbedResult,
} from "@/lib/moodie/providers/types";

// ---------------------------------------------------------------------------
// OpenAI wire format types
// ---------------------------------------------------------------------------

interface OAIMessage {
  role: string;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface OAIChatResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
  error?: { message?: string } | string;
  detail?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

interface OAIEmbedResponse {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
}

// ---------------------------------------------------------------------------
// Message conversion (ProviderMessage → OpenAI wire format)
// ---------------------------------------------------------------------------

function convertMessages(messages: ProviderMessage[]): OAIMessage[] {
  const result: OAIMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      result.push({ role: "system", content: msg.content || "" });
      continue;
    }

    if (msg.role === "user") {
      result.push({ role: "user", content: msg.content || "" });
      continue;
    }

    if (msg.role === "assistant") {
      const oai: OAIMessage = { role: "assistant", content: msg.content ?? null };
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        oai.tool_calls = msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        }));
      }
      result.push(oai);
      continue;
    }

    if (msg.role === "tool") {
      // OpenAI tool result format
      result.push({
        role: "tool",
        content: msg.content || "",
        tool_call_id: msg._tool_call_id || msg._tool_name || "tool_call",
        name: msg._tool_name,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// OpenAIAdapter
// ---------------------------------------------------------------------------

export class OpenAIAdapter implements MoodieProvider {
  readonly id = "openai_compatible" as const;
  readonly supportsTools = true;

  readonly label: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(config: MoodieProviderConfig) {
    this.baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    this.apiKey = config.apiKey ?? "";
    this.model = config.model || "gpt-4o-mini";
    this.embeddingModel = config.embeddingModel || "text-embedding-3-small";
    this.label = config.label || `OpenAI-compatible (${this.model} @ ${this.baseUrl})`;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async chat(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
  ): Promise<ProviderChatResult> {
    const oaiMessages = convertMessages(messages);

    const body: Record<string, unknown> = {
      model: this.model,
      messages: oaiMessages,
      temperature: 0.35,
      max_tokens: 4096,
    };

    if (tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters ?? { type: "object", properties: {} },
        },
      }));
      body.tool_choice = "auto";
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
    } catch (err) {
      return { ok: false, error: `Network error (${this.baseUrl}): ${String(err)}` };
    }

    let payload: OAIChatResponse;
    try {
      payload = await response.json() as OAIChatResponse;
    } catch {
      return { ok: false, error: `Invalid JSON response from ${this.baseUrl} (${response.status})` };
    }

    if (!response.ok || payload.error) {
      return {
        ok: false,
        error:
          (typeof payload.error === "string" ? payload.error : payload.error?.message) ||
          payload.detail ||
          `API error (${response.status}) from ${this.baseUrl}`,
      };
    }

    const choice = payload.choices?.[0];
    if (!choice?.message) {
      return { ok: false, error: "Provider returned no choices." };
    }

    const msg = choice.message;
    const toolCalls = (msg.tool_calls || [])
      .filter((tc) => tc.function?.name)
      .map((tc, i) => ({
        id: tc.id || `call_${Date.now()}_${i}`,
        type: "function" as const,
        function: {
          name: tc.function!.name!,
          arguments: tc.function!.arguments || "{}",
        },
      }));

    return {
      ok: true,
      message: {
        role: "assistant",
        content: msg.content?.trim() || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      usage: payload.usage ? {
        inputTokens: payload.usage.prompt_tokens,
        outputTokens: payload.usage.completion_tokens,
        totalTokens: payload.usage.total_tokens,
      } : undefined,
    };
  }

  async embed(text: string): Promise<ProviderEmbedResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ model: this.embeddingModel, input: text }),
      });
    } catch (err) {
      return { ok: false, error: `Embed network error: ${String(err)}` };
    }

    let payload: OAIEmbedResponse;
    try {
      payload = await response.json() as OAIEmbedResponse;
    } catch {
      return { ok: false, error: `Invalid embed response (${response.status})` };
    }

    if (!response.ok || payload.error) {
      return { ok: false, error: payload.error?.message || `Embed API error (${response.status})` };
    }

    const embedding = payload.data?.[0]?.embedding;
    if (!embedding || embedding.length === 0) {
      return { ok: false, error: "Provider returned empty embedding." };
    }

    return { ok: true, embedding };
  }
}

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
  MoodieProviderChatOptions,
} from "@/lib/moodie/providers/types";
import { normalizeProviderApiKey } from "@/lib/moodie/providers/config-policy";

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
  private readonly embeddingEnabled: boolean;

  constructor(config: MoodieProviderConfig) {
    this.baseUrl = (config.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    this.apiKey = normalizeProviderApiKey(config.apiKey);
    this.model = config.model || "gpt-4o-mini";
    this.embeddingModel = config.embeddingModel || "text-embedding-3-small";
    this.embeddingEnabled = config.embeddingEnabled !== false;
    this.label = config.label || `OpenAI-compatible (${this.model} @ ${this.baseUrl})`;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private applyProviderOptions(body: Record<string, unknown>) {
    if (this.baseUrl.includes("integrate.api.nvidia.com") && this.model === "minimaxai/minimax-m3") {
      body.chat_template_kwargs = { thinking_mode: "disabled" };
    }
  }

  async chat(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
    options?: MoodieProviderChatOptions,
  ): Promise<ProviderChatResult> {
    const oaiMessages = convertMessages(messages);

    const body: Record<string, unknown> = {
      model: this.model,
      messages: oaiMessages,
      temperature: 0.35,
      max_tokens: options?.maxOutputTokens ?? 4096,
    };
    this.applyProviderOptions(body);

    if (tools.length > 0 && options?.toolChoice !== "none") {
      body.tools = tools.map((t) => ({
        type: "function",
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters ?? { type: "object", properties: {} },
        },
      }));
      body.tool_choice = options?.toolChoice || "auto";
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: options?.signal,
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

  async chatStream(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
    onDelta: (delta: string) => void,
    options?: MoodieProviderChatOptions,
  ): Promise<ProviderChatResult> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: convertMessages(messages),
      temperature: 0.35,
      max_tokens: options?.maxOutputTokens ?? 4096,
      stream: true,
      stream_options: { include_usage: true },
    };
    this.applyProviderOptions(body);
    if (tools.length > 0 && options?.toolChoice !== "none") {
      body.tools = tools.map((tool) => ({ type: "function", function: { ...tool.function, parameters: tool.function.parameters ?? { type: "object", properties: {} } } }));
      body.tool_choice = options?.toolChoice || "auto";
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, { method: "POST", headers: this.getHeaders(), body: JSON.stringify(body), signal: options?.signal });
    } catch (error) {
      return { ok: false, error: `Network error (${this.baseUrl}): ${String(error)}` };
    }
    if (!response.ok || !response.body) return { ok: false, error: `Streaming API error (${response.status}) from ${this.baseUrl}` };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;
    const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        const chunk = JSON.parse(raw) as {
          choices?: Array<{ delta?: { content?: string; tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }> } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };
        usage = chunk.usage || usage;
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          content += delta.content;
          onDelta(delta.content);
        }
        for (const toolDelta of delta?.tool_calls || []) {
          const index = toolDelta.index || 0;
          const current = toolCalls.get(index) || { id: toolDelta.id || `call_${Date.now()}_${index}`, name: "", arguments: "" };
          if (toolDelta.id) current.id = toolDelta.id;
          if (toolDelta.function?.name) current.name += toolDelta.function.name;
          if (toolDelta.function?.arguments) current.arguments += toolDelta.function.arguments;
          toolCalls.set(index, current);
        }
      }
      if (done) break;
    }

    return {
      ok: true,
      message: {
        role: "assistant",
        content: content.trim() || null,
        tool_calls: toolCalls.size > 0 ? [...toolCalls.values()].map((tool) => ({ id: tool.id, type: "function" as const, function: { name: tool.name, arguments: tool.arguments || "{}" } })) : undefined,
      },
      usage: usage ? { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, totalTokens: usage.total_tokens } : undefined,
    };
  }

  async embed(text: string): Promise<ProviderEmbedResult> {
    if (!this.embeddingEnabled) {
      return { ok: false, error: "Semantic embedding is disabled for this provider." };
    }
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

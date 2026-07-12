/**
 * gemini-adapter.ts
 *
 * Refactor logic từ lib/moodie/gemini.ts thành MoodieProvider adapter.
 * Giữ nguyên toàn bộ conversion logic (messages, tools, schema uppercase...)
 * chỉ bọc lại theo interface chung.
 */

import type {
  MoodieProvider,
  MoodieProviderConfig,
  ProviderMessage,
  ToolDefinition,
  ProviderChatResult,
  ProviderEmbedResult,
} from "@/lib/moodie/providers/types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
// Message conversion (Gemini dùng format riêng)
// ---------------------------------------------------------------------------

type GeminiPart = Record<string, unknown>;
type GeminiMessage = { role: string; parts: GeminiPart[] };

function convertMessages(messages: ProviderMessage[]): {
  systemInstruction: string | null;
  contents: GeminiMessage[];
} {
  let systemInstruction: string | null = null;
  const contents: GeminiMessage[] = [];
  let pendingToolParts: GeminiPart[] = [];

  const flushToolParts = () => {
    if (pendingToolParts.length === 0) return;
    contents.push({ role: "function", parts: pendingToolParts });
    pendingToolParts = [];
  };

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = msg.content || null;
      continue;
    }

    if (msg.role === "user") {
      flushToolParts();
      contents.push({ role: "user", parts: [{ text: msg.content || "" }] });
      continue;
    }

    if (msg.role === "assistant") {
      flushToolParts();
      const parts: GeminiPart[] = [];
      if (msg.content) parts.push({ text: msg.content });
      for (const tc of msg.tool_calls || []) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
        parts.push({ functionCall: { name: tc.function.name, args } });
      }
      if (parts.length > 0) contents.push({ role: "model", parts });
      continue;
    }

    if (msg.role === "tool") {
      let result: unknown = {};
      try { result = JSON.parse(msg.content || "{}"); } catch { result = { result: msg.content || "" }; }
      pendingToolParts.push({
        functionResponse: {
          name: msg._tool_name || "unknown_tool",
          response: { content: result },
        },
      });
    }
  }

  flushToolParts();
  return { systemInstruction, contents };
}

// ---------------------------------------------------------------------------
// Tool schema conversion (Gemini yêu cầu type uppercase)
// ---------------------------------------------------------------------------

function convertSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;
  const rec = { ...(schema as Record<string, unknown>) };
  if (typeof rec.type === "string") rec.type = rec.type.toUpperCase();
  if (rec.properties && typeof rec.properties === "object") {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rec.properties as Record<string, unknown>)) {
      next[k] = convertSchema(v);
    }
    rec.properties = next;
  }
  if (Array.isArray(rec.items)) {
    rec.items = rec.items.map(convertSchema);
  } else if (rec.items) {
    rec.items = convertSchema(rec.items);
  }
  return rec;
}

function convertTools(tools: ToolDefinition[]) {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters ? convertSchema(t.function.parameters) : undefined,
      })),
    },
  ];
}

// ---------------------------------------------------------------------------
// GeminiAdapter
// ---------------------------------------------------------------------------

export class GeminiAdapter implements MoodieProvider {
  readonly id = "gemini" as const;
  readonly supportsTools = true;

  readonly label: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(config: MoodieProviderConfig) {
    this.apiKey = config.apiKey ?? "";
    this.model = config.model || "gemini-2.5-flash";
    this.embeddingModel = config.embeddingModel || "text-embedding-004";
    this.label = config.label || `Gemini (${this.model})`;
  }

  async chat(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
    options?: { signal?: AbortSignal; toolChoice?: "auto" | "required" | "none" },
  ): Promise<ProviderChatResult> {
    if (!this.apiKey) {
      return { ok: false, error: "Gemini API key chưa được cấu hình." };
    }

    const { systemInstruction, contents } = convertMessages(messages);
    const body: Record<string, unknown> = {
      contents,
      generationConfig: { temperature: 0.35, maxOutputTokens: 4096 },
    };

    if (tools.length > 0 && options?.toolChoice !== "none") {
      body.tools = convertTools(tools);
      body.toolConfig = { functionCallingConfig: { mode: options?.toolChoice === "required" ? "ANY" : "AUTO" } };
    }
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    let response: Response;
    try {
      response = await fetch(
        `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: options?.signal },
      );
    } catch (err) {
      return { ok: false, error: `Gemini network error: ${String(err)}` };
    }

    if (!response.ok) {
      let errMsg = `Gemini API error (${response.status})`;
      try {
        const payload = await response.json() as { error?: { message?: string } };
        errMsg = payload.error?.message || errMsg;
      } catch { /* ignore */ }
      return { ok: false, error: errMsg };
    }

    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
    };
    const parts = payload.candidates?.[0]?.content?.parts || [];
    if (parts.length === 0) {
      return { ok: false, error: "Gemini không trả về nội dung nào." };
    }

    const toolCalls = parts
      .filter((p) => typeof p === "object" && p !== null && "functionCall" in p)
      .map((p, i) => {
        const fc = (p.functionCall as { name?: string; args?: Record<string, unknown> }) || {};
        return {
          id: `gemini_call_${Date.now()}_${i}`,
          type: "function" as const,
          function: {
            name: fc.name || "unknown_tool",
            arguments: JSON.stringify(fc.args || {}),
          },
        };
      });

    const content = parts
      .filter((p) => typeof p === "object" && p !== null && "text" in p)
      .map((p) => String(p.text || ""))
      .join("")
      .trim();

    return {
      ok: true,
      message: {
        role: "assistant",
        content: content || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      usage: payload.usageMetadata ? {
        inputTokens: payload.usageMetadata.promptTokenCount,
        outputTokens: payload.usageMetadata.candidatesTokenCount,
        totalTokens: payload.usageMetadata.totalTokenCount,
      } : undefined,
    };
  }

  async chatStream(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
    onDelta: (delta: string) => void,
    options?: { signal?: AbortSignal; toolChoice?: "auto" | "required" | "none" },
  ): Promise<ProviderChatResult> {
    if (!this.apiKey) return { ok: false, error: "Gemini API key chưa được cấu hình." };
    const { systemInstruction, contents } = convertMessages(messages);
    const body: Record<string, unknown> = { contents, generationConfig: { temperature: 0.35, maxOutputTokens: 4096 } };
    if (tools.length > 0 && options?.toolChoice !== "none") {
      body.tools = convertTools(tools);
      body.toolConfig = { functionCallingConfig: { mode: options?.toolChoice === "required" ? "ANY" : "AUTO" } };
    }
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

    let response: Response;
    try {
      response = await fetch(`${GEMINI_API_BASE}/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: options?.signal,
      });
    } catch (error) {
      return { ok: false, error: `Gemini network error: ${String(error)}` };
    }
    if (!response.ok || !response.body) return { ok: false, error: `Gemini streaming API error (${response.status})` };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let usage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;
    const toolCalls: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> = [];

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";
      for (const event of events) {
        const raw = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("");
        if (!raw) continue;
        const chunk = JSON.parse(raw) as {
          candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
        };
        usage = chunk.usageMetadata || usage;
        for (const part of chunk.candidates?.[0]?.content?.parts || []) {
          if (typeof part.text === "string" && part.text) {
            content += part.text;
            onDelta(part.text);
          }
          if (part.functionCall && typeof part.functionCall === "object") {
            const functionCall = part.functionCall as { name?: string; args?: Record<string, unknown> };
            toolCalls.push({
              id: `gemini_call_${Date.now()}_${toolCalls.length}`,
              type: "function",
              function: { name: functionCall.name || "unknown_tool", arguments: JSON.stringify(functionCall.args || {}) },
            });
          }
        }
      }
      if (done) break;
    }

    return {
      ok: true,
      message: { role: "assistant", content: content.trim() || null, tool_calls: toolCalls.length > 0 ? toolCalls : undefined },
      usage: usage ? { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount, totalTokens: usage.totalTokenCount } : undefined,
    };
  }

  async embed(text: string): Promise<ProviderEmbedResult> {
    if (!this.apiKey) {
      return { ok: false, error: "Gemini API key chưa được cấu hình." };
    }

    let response: Response;
    try {
      response = await fetch(
        `${GEMINI_API_BASE}/${this.embeddingModel}:embedContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: { parts: [{ text }] } }),
        },
      );
    } catch (err) {
      return { ok: false, error: `Gemini embed error: ${String(err)}` };
    }

    if (!response.ok) {
      return { ok: false, error: `Gemini embed API error (${response.status})` };
    }

    const payload = await response.json() as { embedding?: { values?: number[] } };
    const values = payload.embedding?.values;
    if (!values || values.length === 0) {
      return { ok: false, error: "Gemini embed returned empty vector." };
    }

    return { ok: true, embedding: values };
  }
}

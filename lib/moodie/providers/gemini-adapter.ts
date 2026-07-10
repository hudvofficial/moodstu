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
  ): Promise<ProviderChatResult> {
    if (!this.apiKey) {
      return { ok: false, error: "Gemini API key chưa được cấu hình." };
    }

    const { systemInstruction, contents } = convertMessages(messages);
    const body: Record<string, unknown> = {
      contents,
      generationConfig: { temperature: 0.35, maxOutputTokens: 4096 },
    };

    if (tools.length > 0) body.tools = convertTools(tools);
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    let response: Response;
    try {
      response = await fetch(
        `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
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

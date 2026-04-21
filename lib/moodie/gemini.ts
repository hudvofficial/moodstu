import { getMoodieGeminiRuntimeConfig } from "@/lib/system-settings";

type ToolCallShape = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type MoodieModelMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCallShape[];
  _tool_name?: string;
};

type GeminiToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  };
};

type GeminiMessage = {
  role: string;
  parts: Array<Record<string, unknown>>;
};

type MoodieModelProvider = {
  apiKey: string;
  model: string;
  label: string;
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function convertMessages(messages: MoodieModelMessage[]) {
  let systemInstruction: string | null = null;
  const contents: GeminiMessage[] = [];
  let pendingToolParts: Array<Record<string, unknown>> = [];

  const flushToolParts = () => {
    if (pendingToolParts.length === 0) return;
    contents.push({
      role: "function",
      parts: pendingToolParts,
    });
    pendingToolParts = [];
  };

  for (const message of messages) {
    if (message.role === "system") {
      systemInstruction = message.content || null;
      continue;
    }

    if (message.role === "user") {
      flushToolParts();
      contents.push({
        role: "user",
        parts: [{ text: message.content || "" }],
      });
      continue;
    }

    if (message.role === "assistant") {
      flushToolParts();
      const parts: Array<Record<string, unknown>> = [];

      if (message.content) {
        parts.push({ text: message.content });
      }

      for (const toolCall of message.tool_calls || []) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        parts.push({
          functionCall: {
            name: toolCall.function.name,
            args,
          },
        });
      }

      if (parts.length > 0) {
        contents.push({
          role: "model",
          parts,
        });
      }
      continue;
    }

    if (message.role === "tool") {
      let result: unknown = {};
      try {
        result = JSON.parse(message.content || "{}");
      } catch {
        result = { result: message.content || "" };
      }

      pendingToolParts.push({
        functionResponse: {
          name: message._tool_name || "unknown_tool",
          response: {
            content: result,
          },
        },
      });
    }
  }

  flushToolParts();

  return { systemInstruction, contents };
}

function convertTools(tools: GeminiToolDefinition[]) {
  const convertSchema = (schema: unknown): unknown => {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;

    const record = { ...(schema as Record<string, unknown>) };

    if (typeof record.type === "string") {
      record.type = record.type.toUpperCase();
    }

    if (record.properties && typeof record.properties === "object" && !Array.isArray(record.properties)) {
      const nextProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(record.properties as Record<string, unknown>)) {
        nextProperties[key] = convertSchema(value);
      }
      record.properties = nextProperties;
    }

    if (Array.isArray(record.items)) {
      record.items = record.items.map((item) => convertSchema(item));
    } else if (record.items) {
      record.items = convertSchema(record.items);
    }

    return record;
  };

  return [
    {
      functionDeclarations: tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
          ? convertSchema(tool.function.parameters)
          : undefined,
      })),
    },
  ];
}

export async function getMoodieModelProvider(): Promise<MoodieModelProvider | null> {
  const config = await getMoodieGeminiRuntimeConfig();
  if (!config.apiKey) return null;

  return {
    apiKey: config.apiKey,
    model: config.model,
    label: "Gemini",
  };
}

export async function callMoodieGemini(
  messages: MoodieModelMessage[],
  tools: GeminiToolDefinition[],
  providerOverride?: MoodieModelProvider,
): Promise<{
  ok: true;
  message: MoodieModelMessage;
} | {
  ok: false;
  error: string;
}> {
  const provider = providerOverride || (await getMoodieModelProvider());
  if (!provider) {
    return { ok: false, error: "Moodie Gemini API key is not configured." };
  }

  const { systemInstruction, contents } = convertMessages(messages);
  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 4096,
    },
  };

  if (tools.length > 0) {
    requestBody.tools = convertTools(tools);
  }

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(
    `${GEMINI_API_URL}/${provider.model}:generateContent?key=${provider.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    let errorMessage = `Gemini API error (${response.status})`;
    try {
      const payload = await response.json();
      errorMessage =
        (payload as { error?: { message?: string } }).error?.message || errorMessage;
    } catch {
      // Ignore non-JSON error payloads.
    }

    return { ok: false, error: errorMessage };
  }

  const payload = await response.json();
  const candidate = (payload as {
    candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }>;
  }).candidates?.[0];

  const parts = candidate?.content?.parts || [];
  if (parts.length === 0) {
    return {
      ok: false,
      error: "Gemini did not return any response content.",
    };
  }

  const toolCalls = parts
    .filter((part) => typeof part === "object" && part !== null && "functionCall" in part)
    .map((part, index) => {
      const functionCall = (part.functionCall as {
        name?: string;
        args?: Record<string, unknown>;
      }) || { };

      return {
        id: `gemini_call_${Date.now()}_${index}`,
        type: "function" as const,
        function: {
          name: functionCall.name || "unknown_tool",
          arguments: JSON.stringify(functionCall.args || {}),
        },
      };
    });

  const content = parts
    .filter((part) => typeof part === "object" && part !== null && "text" in part)
    .map((part) => String(part.text || ""))
    .join("")
    .trim();

  return {
    ok: true,
    message: {
      role: "assistant",
      content: content || null,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
  };
}

export type {
  GeminiToolDefinition,
  MoodieModelMessage,
  MoodieModelProvider,
  ToolCallShape,
};

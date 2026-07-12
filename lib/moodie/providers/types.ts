/**
 * types.ts
 *
 * Interface chung cho tất cả LLM provider của Moodie.
 * Gemini, OpenAI-compatible (Ollama, vLLM, Qwen, DeepSeek, LM Studio...)
 * đều phải implement interface này.
 */

// ---------------------------------------------------------------------------
// Message types (OpenAI-style, normalized internally)
// ---------------------------------------------------------------------------

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ToolCallShape {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ProviderMessage {
  role: MessageRole;
  content: string | null;
  tool_calls?: ToolCallShape[];
  /** internal: dùng khi role = "tool", tên tool đã gọi */
  _tool_name?: string;
  /** internal: dùng khi role = "tool", id của tool call trước đó */
  _tool_call_id?: string;
}

// ---------------------------------------------------------------------------
// Tool definition (OpenAI function calling format)
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
  };
}

export type ProviderUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

// ---------------------------------------------------------------------------
// Provider result
// ---------------------------------------------------------------------------

export type ProviderChatResult =
  | { ok: true; message: ProviderMessage; usage?: ProviderUsage }
  | { ok: false; error: string };

export type ProviderEmbedResult =
  | { ok: true; embedding: number[] }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Provider config (stored in system_settings)
// ---------------------------------------------------------------------------

export type ProviderId = "gemini" | "openai_compatible";

export type ProviderModelOption = {
  value: string;
  label: string;
};

export type ProviderModelCatalog = {
  models: ProviderModelOption[];
  embeddingModels?: ProviderModelOption[];
  allowCustomModel: boolean;
  allowCustomEmbeddingModel?: boolean;
  customModelPlaceholder?: string;
  customEmbeddingModelPlaceholder?: string;
};

export interface MoodieProviderConfig {
  providerId: ProviderId;
  /** base URL cho OpenAI-compatible (e.g. http://localhost:11434/v1) */
  baseUrl?: string;
  apiKey?: string;
  model: string;
  /** model dùng cho embedding (optional, dùng trong Phase 3 RAG) */
  embeddingModel?: string;
  label?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export type MoodieProviderChatOptions = {
  signal?: AbortSignal;
  toolChoice?: "auto" | "required" | "none";
};

export interface MoodieProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly supportsTools: boolean;

  /**
   * Gửi messages + tools tới LLM, nhận về message + optional tool_calls.
   * Đây là method chính dùng trong engine tool-calling loop.
   */
  chat(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
    options?: MoodieProviderChatOptions,
  ): Promise<ProviderChatResult>;

  chatStream?(
    messages: ProviderMessage[],
    tools: ToolDefinition[],
    onDelta: (delta: string) => void,
    options?: MoodieProviderChatOptions,
  ): Promise<ProviderChatResult>;

  /**
   * Tạo embedding vector cho 1 đoạn text.
   * Optional — chỉ dùng trong Phase 3 (RAG).
   */
  embed?(text: string): Promise<ProviderEmbedResult>;
}

// ---------------------------------------------------------------------------
// Preset configs để fill nhanh trong UI settings
// ---------------------------------------------------------------------------

export const PROVIDER_PRESETS: Array<{
  id: string;
  label: string;
  providerId: ProviderId;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  embeddingModel?: string;
}> = [
  {
    id: "gemini",
    label: "Google Gemini (Cloud)",
    providerId: "gemini",
    model: "gemini-2.5-flash",
    embeddingModel: "text-embedding-004",
  },
  {
    id: "ollama_local",
    label: "Ollama (Local)",
    providerId: "openai_compatible",
    baseUrl: "http://localhost:11434/v1",
    apiKey: "ollama",
    model: "qwen2.5-coder:7b",
    embeddingModel: "nomic-embed-text",
  },
  {
    id: "lmstudio",
    label: "LM Studio (Local)",
    providerId: "openai_compatible",
    baseUrl: "http://localhost:1234/v1",
    apiKey: "lm-studio",
    model: "local-model",
  },
  {
    id: "qwen_cloud",
    label: "Qwen / DashScope (Cloud)",
    providerId: "openai_compatible",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    embeddingModel: "text-embedding-v3",
  },
  {
    id: "deepseek",
    label: "DeepSeek (Cloud)",
    providerId: "openai_compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  {
    id: "openai",
    label: "OpenAI (Cloud)",
    providerId: "openai_compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
  },
];

const OPENAI_COMPATIBLE_DEFAULT_MODELS: ProviderModelOption[] = [
  { value: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder 7B" },
  { value: "qwen-plus", label: "Qwen Plus" },
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "local-model", label: "Local Model" },
];

const PROVIDER_MODEL_CATALOG_BY_PRESET_ID: Partial<Record<string, ProviderModelCatalog>> = {
  gemini: {
    models: [
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
    embeddingModels: [{ value: "text-embedding-004", label: "Text Embedding 004" }],
    allowCustomModel: true,
    allowCustomEmbeddingModel: true,
    customModelPlaceholder: "gemini-2.5-flash",
    customEmbeddingModelPlaceholder: "text-embedding-004",
  },
  ollama_local: {
    models: [
      { value: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder 7B" },
      { value: "qwen2.5:7b", label: "Qwen 2.5 7B" },
      { value: "deepseek-r1:8b", label: "DeepSeek R1 8B" },
      { value: "llama3.1:8b", label: "Llama 3.1 8B" },
    ],
    embeddingModels: [
      { value: "nomic-embed-text", label: "Nomic Embed Text" },
      { value: "mxbai-embed-large", label: "MxBai Embed Large" },
    ],
    allowCustomModel: true,
    allowCustomEmbeddingModel: true,
    customModelPlaceholder: "qwen2.5-coder:7b",
    customEmbeddingModelPlaceholder: "nomic-embed-text",
  },
  lmstudio: {
    models: [{ value: "local-model", label: "Local Model" }],
    embeddingModels: [{ value: "local-embedding-model", label: "Local Embedding Model" }],
    allowCustomModel: true,
    allowCustomEmbeddingModel: true,
    customModelPlaceholder: "local-model",
    customEmbeddingModelPlaceholder: "local-embedding-model",
  },
  qwen_cloud: {
    models: [
      { value: "qwen-plus", label: "Qwen Plus" },
      { value: "qwen-turbo", label: "Qwen Turbo" },
      { value: "qwen-max", label: "Qwen Max" },
    ],
    embeddingModels: [{ value: "text-embedding-v3", label: "Text Embedding v3" }],
    allowCustomModel: true,
    allowCustomEmbeddingModel: true,
    customModelPlaceholder: "qwen-plus",
    customEmbeddingModelPlaceholder: "text-embedding-v3",
  },
  deepseek: {
    models: [
      { value: "deepseek-chat", label: "DeepSeek Chat" },
      { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
    allowCustomModel: true,
    allowCustomEmbeddingModel: true,
    customModelPlaceholder: "deepseek-chat",
  },
  openai: {
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { value: "gpt-4.1", label: "GPT-4.1" },
    ],
    embeddingModels: [
      { value: "text-embedding-3-small", label: "Text Embedding 3 Small" },
      { value: "text-embedding-3-large", label: "Text Embedding 3 Large" },
    ],
    allowCustomModel: true,
    allowCustomEmbeddingModel: true,
    customModelPlaceholder: "gpt-4o-mini",
    customEmbeddingModelPlaceholder: "text-embedding-3-small",
  },
};

const PROVIDER_MODEL_CATALOG_BY_PROVIDER_ID: Record<ProviderId, ProviderModelCatalog> = {
  gemini: {
    models: PROVIDER_MODEL_CATALOG_BY_PRESET_ID.gemini?.models || [],
    embeddingModels: PROVIDER_MODEL_CATALOG_BY_PRESET_ID.gemini?.embeddingModels,
    allowCustomModel: true,
    allowCustomEmbeddingModel: true,
    customModelPlaceholder: "gemini-2.5-flash",
    customEmbeddingModelPlaceholder: "text-embedding-004",
  },
  openai_compatible: {
    models: OPENAI_COMPATIBLE_DEFAULT_MODELS,
    embeddingModels: [
      { value: "text-embedding-3-small", label: "Text Embedding 3 Small" },
      { value: "nomic-embed-text", label: "Nomic Embed Text" },
      { value: "text-embedding-v3", label: "Text Embedding v3" },
    ],
    allowCustomModel: true,
    allowCustomEmbeddingModel: true,
    customModelPlaceholder: "qwen2.5-coder:7b",
    customEmbeddingModelPlaceholder: "text-embedding-3-small",
  },
};

export function getProviderModelCatalog(params: {
  providerId: ProviderId;
  presetId?: string;
}): ProviderModelCatalog {
  if (params.presetId) {
    const presetCatalog = PROVIDER_MODEL_CATALOG_BY_PRESET_ID[params.presetId];
    if (presetCatalog) return presetCatalog;
  }

  return PROVIDER_MODEL_CATALOG_BY_PROVIDER_ID[params.providerId];
}

export function isValidProviderModel(params: {
  providerId: ProviderId;
  model: string;
  presetId?: string;
}): boolean {
  const normalizedModel = params.model.trim();
  if (!normalizedModel) return false;

  const catalog = getProviderModelCatalog({
    providerId: params.providerId,
    presetId: params.presetId,
  });

  if (catalog.models.some((option) => option.value === normalizedModel)) {
    return true;
  }

  return catalog.allowCustomModel;
}

export function isValidProviderEmbeddingModel(params: {
  providerId: ProviderId;
  embeddingModel?: string;
  presetId?: string;
}): boolean {
  const normalizedModel = params.embeddingModel?.trim() || "";
  if (!normalizedModel) return true;

  const catalog = getProviderModelCatalog({
    providerId: params.providerId,
    presetId: params.presetId,
  });

  if (catalog.embeddingModels?.some((option) => option.value === normalizedModel)) {
    return true;
  }

  return catalog.allowCustomEmbeddingModel !== false;
}

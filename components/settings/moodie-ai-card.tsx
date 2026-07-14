"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Globe2,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveMoodieBrowserConfig,
  saveMoodieBraveConfig,
  testMoodieBrowserConnection,
  testMoodieBraveConnection,
} from "@/app/actions/moodie-provider-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { MoodieVoiceSettingsSection } from "@/components/settings/moodie-voice-settings-section";
import {
  DEFAULT_MOODIE_GEMINI_MODEL,
  formatMoodieGeminiModelLabel,
  type MoodieGeminiModelOption,
} from "@/lib/moodie/model-options";
import {
  getProviderModelCatalog,
  PROVIDER_PRESETS,
  type ProviderId,
  type ProviderModelOption,
} from "@/lib/moodie/providers/types";
import type { MoodieAiSettings, MoodieBrowserSettings, MoodieBraveSettings, MoodieProviderSettings, MoodieVoiceSettings } from "@/types/settings";
import type { ActionResult } from "@/types/action-result";
import {
  canReuseProviderKey,
  isLocalProviderBaseUrl,
  normalizeProviderApiKey,
  normalizeProviderBaseUrl,
  providerNeedsApiKey,
} from "@/lib/moodie/providers/config-policy";

interface MoodieAiCardProps {
  settings: MoodieAiSettings;
  providerSettings: MoodieProviderSettings;
  voiceSettings: MoodieVoiceSettings;
  braveSettings: MoodieBraveSettings;
  browserSettings: MoodieBrowserSettings;
  apiKeyInput: string;
  setApiKeyInput: (value: string) => void;
  geminiModel: string;
  setGeminiModel: (value: string) => void;
  modelOptions: MoodieGeminiModelOption[];
  modelSource: "api" | "fallback";
  modelMessage: string;
  isLoadingModels: boolean;
  onRefreshModels: () => void;
  disabled?: boolean;
}

function ensureSelectedModelOption(
  options: MoodieGeminiModelOption[],
  selectedModel: string,
) {
  if (!selectedModel || options.some((option) => option.value === selectedModel)) {
    return options;
  }
  return [
    ...options,
    {
      value: selectedModel,
      label: `${formatMoodieGeminiModelLabel(selectedModel)} (đã lưu)`,
    },
  ];
}

const PROVIDER_OPTIONS = [
  { value: "gemini", label: "Google Gemini (Cloud)" },
  { value: "openai_compatible", label: "OpenAI-compatible (Local / Cloud)" },
];

const PRESET_OPTIONS = PROVIDER_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

const PRESET_PLACEHOLDER_VALUE = "__moodie_provider_preset_placeholder__";
const CUSTOM_MODEL_VALUE = "__moodie_provider_custom_model__";
const DEFAULT_EMBEDDING_VALUE = "__moodie_provider_default_embedding__";
const CUSTOM_EMBEDDING_VALUE = "__moodie_provider_custom_embedding__";
const DISABLED_EMBEDDING_VALUE = "__moodie_provider_embedding_disabled__";

async function callProviderConfigApi<T>(operation: "probe" | "save", payload: unknown) {
  const response = await fetch("/api/moodie/provider/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation, payload }),
  });
  const result = await response.json().catch(() => null) as ActionResult<T> | null;
  if (!result) throw new Error(`Provider API trả dữ liệu không hợp lệ (${response.status})`);
  return result;
}

function findMatchingPreset(settings: MoodieProviderSettings) {
  return PROVIDER_PRESETS.find((preset) => {
    const sameProvider = preset.providerId === settings.providerId;
    const sameBaseUrl = normalizeProviderBaseUrl(preset.baseUrl) === normalizeProviderBaseUrl(settings.baseUrl);
    const sameModel = preset.model === settings.model;
    return sameProvider && sameBaseUrl && sameModel;
  });
}

function getCatalogFirstModel(providerId: ProviderId, presetId?: string) {
  return getProviderModelCatalog({ providerId, presetId }).models[0]?.value || "";
}

function hasOption(options: ProviderModelOption[] | undefined, value: string | undefined) {
  return !!value && !!options?.some((option) => option.value === value);
}

function optionLabel(options: ProviderModelOption[] | undefined, value: string | undefined) {
  return options?.find((option) => option.value === value)?.label || value || "Auto";
}

function resolveInitialModelSelection(settings: MoodieProviderSettings, presetId?: string) {
  const catalog = getProviderModelCatalog({ providerId: settings.providerId, presetId });
  return hasOption(catalog.models, settings.model) ? settings.model : CUSTOM_MODEL_VALUE;
}

function resolveInitialEmbeddingSelection(settings: MoodieProviderSettings, presetId?: string) {
  if (!settings.embeddingEnabled) return DISABLED_EMBEDDING_VALUE;
  const catalog = getProviderModelCatalog({ providerId: settings.providerId, presetId });
  if (!settings.embeddingModel) return DEFAULT_EMBEDDING_VALUE;
  return hasOption(catalog.embeddingModels, settings.embeddingModel)
    ? settings.embeddingModel
    : CUSTOM_EMBEDDING_VALUE;
}

function getProviderSummary(settings: MoodieProviderSettings) {
  const catalog = getProviderModelCatalog({ providerId: settings.providerId });
  const modelLabel = optionLabel(catalog.models, settings.model);
  const providerLabel = settings.label || (settings.providerId === "gemini" ? "Google Gemini" : "OpenAI-compatible");
  return { providerLabel, modelLabel };
}

function MoodieExplainPanel() {
  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-3 text-xs text-text-secondary space-y-1.5">
      <p><strong>Provider chính</strong> là đường Moodie ưu tiên dùng khi chat.</p>
      <p><strong>Gemini legacy</strong> chỉ là cấu hình cũ/dự phòng, không cần động vào nếu đã dùng Local / Cloud provider.</p>
      <p><strong>Embedding model</strong> chỉ phục vụ tác vụ embedding/RAG, không phải model chat chính.</p>
    </div>
  );
}

function ProviderStatus({ settings }: { settings: MoodieProviderSettings }) {
  const { providerLabel, modelLabel } = getProviderSummary(settings);
  const hasRequiredCredential = settings.isLocal || settings.hasKey;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-subtle p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${hasRequiredCredential ? "bg-success" : "bg-warning"}`} />
          <p className="truncate text-sm font-semibold text-text-primary">{providerLabel}</p>
        </div>
        <p className="mt-1 truncate pl-4 text-xs text-text-muted">
          {modelLabel}{settings.baseUrl ? ` · ${settings.baseUrl}` : ""}
        </p>
      </div>
      <span className={`shrink-0 text-xs font-medium ${hasRequiredCredential ? "text-success" : "text-warning"}`}>
        {settings.isLocal ? "Cấu hình local" : settings.hasKey ? "Đã lưu key" : "Cần API key"}
      </span>
    </div>
  );
}

function ProviderSection({ settings }: { settings: MoodieProviderSettings }) {
  const router = useRouter();
  const matchedPreset = findMatchingPreset(settings);
  const initialPresetId = matchedPreset?.id || PRESET_PLACEHOLDER_VALUE;
  const initialActivePresetId = matchedPreset?.id;
  const initialModelSelection = resolveInitialModelSelection(settings, initialActivePresetId);
  const initialEmbeddingSelection = resolveInitialEmbeddingSelection(settings, initialActivePresetId);

  const [selectedPresetId, setSelectedPresetId] = useState(initialPresetId);
  const [providerId, setProviderId] = useState<ProviderId>(settings.providerId);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl || "");
  const [apiKey, setApiKey] = useState("");
  const [modelSelection, setModelSelection] = useState(initialModelSelection);
  const [customModel, setCustomModel] = useState(
    initialModelSelection === CUSTOM_MODEL_VALUE ? settings.model : "",
  );
  const [embeddingSelection, setEmbeddingSelection] = useState(initialEmbeddingSelection);
  const [customEmbeddingModel, setCustomEmbeddingModel] = useState(
    initialEmbeddingSelection === CUSTOM_EMBEDDING_VALUE ? settings.embeddingModel || "" : "",
  );
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<ProviderModelOption[]>([]);
  const [modelDiscoveryAttempted, setModelDiscoveryAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<{
    ok: boolean;
    text: string;
    warning?: boolean;
  } | null>(null);

  const activePresetId =
    selectedPresetId === PRESET_PLACEHOLDER_VALUE ? undefined : selectedPresetId;
  const activePreset = PROVIDER_PRESETS.find((preset) => preset.id === activePresetId);
  const isCustomProvider = !activePreset;
  const modelCatalog = useMemo(
    () => getProviderModelCatalog({ providerId, presetId: activePresetId }),
    [providerId, activePresetId],
  );
  const embeddingOptions = useMemo(() => {
    const options: ProviderModelOption[] = [
      { value: DISABLED_EMBEDDING_VALUE, label: "Không dùng semantic embedding" },
      ...(modelCatalog.embeddingModels || []),
    ];
    if ((modelCatalog.embeddingModels || []).length > 0) {
      options.splice(1, 0, { value: DEFAULT_EMBEDDING_VALUE, label: "Mặc định theo nhà cung cấp" });
    }
    if (modelCatalog.allowCustomEmbeddingModel !== false) {
      options.push({ value: CUSTOM_EMBEDDING_VALUE, label: "Embedding khác (nhập thủ công)" });
    }
    return options;
  }, [modelCatalog]);

  const isCustomModel = modelSelection === CUSTOM_MODEL_VALUE;
  const isCustomEmbedding = embeddingSelection === CUSTOM_EMBEDDING_VALUE;
  const embeddingEnabled = embeddingSelection !== DISABLED_EMBEDDING_VALUE;
  const model = isCustomModel ? customModel.trim() : modelSelection;
  const embeddingModel = isCustomEmbedding
    ? customEmbeddingModel.trim()
    : embeddingSelection === DEFAULT_EMBEDDING_VALUE
      ? ""
      : embeddingSelection;
  const isLocal = isLocalProviderBaseUrl(baseUrl);

  function resetModelDiscovery() {
    setDiscoveredModels([]);
    setModelDiscoveryAttempted(false);
    setConnectionMessage(null);
  }

  function applyPreset(presetId: string) {
    if (presetId === PRESET_PLACEHOLDER_VALUE) {
      setSelectedPresetId(PRESET_PLACEHOLDER_VALUE);
      resetModelDiscovery();
      return;
    }
    const preset = PROVIDER_PRESETS.find((option) => option.id === presetId);
    if (!preset) return;

    const nextCatalog = getProviderModelCatalog({
      providerId: preset.providerId,
      presetId,
    });
    const presetModelInCatalog = hasOption(nextCatalog.models, preset.model);
    const presetEmbeddingInCatalog = hasOption(nextCatalog.embeddingModels, preset.embeddingModel);

    setSelectedPresetId(presetId);
    setProviderId(preset.providerId);
    setBaseUrl(preset.baseUrl || "");
    setApiKey("");
    resetModelDiscovery();
    setModelSelection(presetModelInCatalog ? preset.model : CUSTOM_MODEL_VALUE);
    setCustomModel(presetModelInCatalog ? "" : preset.model);
    setEmbeddingSelection(
      preset.embeddingModel
        ? presetEmbeddingInCatalog
          ? preset.embeddingModel
          : CUSTOM_EMBEDDING_VALUE
        : DISABLED_EMBEDDING_VALUE,
    );
    setCustomEmbeddingModel(
      preset.embeddingModel && !presetEmbeddingInCatalog ? preset.embeddingModel : "",
    );
  }

  const canReuseSavedKey = canReuseProviderKey({
    hasKey: settings.hasKey,
    currentProviderId: settings.providerId,
    currentBaseUrl: settings.baseUrl,
    nextProviderId: providerId,
    nextBaseUrl: baseUrl,
  });
  const requiresApiKey = providerNeedsApiKey(providerId, baseUrl);
  const configurationMatchesSaved = providerId === settings.providerId
    && normalizeProviderBaseUrl(baseUrl) === normalizeProviderBaseUrl(settings.baseUrl);
  const canUseSavedConfiguration = configurationMatchesSaved && (isLocal || settings.hasKey);

  async function handleProbeProvider() {
    if (providerId === "openai_compatible" && !baseUrl.trim()) {
      toast.error("Nhập Base URL trước khi kiểm tra kết nối");
      return;
    }
    if (requiresApiKey && !apiKey.trim() && !canReuseSavedKey) {
      toast.error("Nhập API key trước khi kiểm tra kết nối");
      return;
    }

    setTestingKey(true);
    try {
      const result = await callProviderConfigApi<{
        ok: true;
        models: ProviderModelOption[];
        latencyMs: number;
        discoverySupported: boolean;
        warning?: string;
      }>("probe", {
        provider_id: providerId,
        base_url: baseUrl || undefined,
        api_key: apiKey || undefined,
        reuse_existing_key: canReuseSavedKey && !apiKey,
        model: model || undefined,
      });
      if (!result.success || !result.data.ok) {
        throw new Error(result.success ? "Không thể tải model từ provider" : result.error);
      }

      setDiscoveredModels(result.data.models);
      setModelDiscoveryAttempted(true);
      if (result.data.models.length > 0 && !result.data.models.some((option) => option.value === model)) {
        setModelSelection(result.data.models[0]?.value || CUSTOM_MODEL_VALUE);
        setCustomModel("");
      }
      setConnectionMessage({
        ok: true,
        warning: Boolean(result.data.warning),
        text: result.data.discoverySupported
          ? `Key hoạt động · tìm thấy ${result.data.models.length} model · ${result.data.latencyMs}ms`
          : result.data.warning
            ? `Key được provider tiếp nhận · ${result.data.warning} · cần xác nhận model thủ công`
            : `Key hoạt động · provider không hỗ trợ /models · ${result.data.latencyMs}ms`,
      });
      toast.success(result.data.discoverySupported
        ? `Kết nối thành công, đã tải ${result.data.models.length} model`
        : "Kết nối thành công; hãy xác nhận model ID thủ công");
    } catch (error) {
      setDiscoveredModels([]);
      setModelDiscoveryAttempted(true);
      const message = error instanceof Error ? error.message : "Không thể kiểm tra provider";
      setConnectionMessage({ ok: false, text: message });
      toast.error(message);
    } finally {
      setTestingKey(false);
    }
  }

  function handleProviderChange(value: string) {
    const nextProviderId = value as ProviderId;
    const firstModel = getCatalogFirstModel(nextProviderId);
    setSelectedPresetId(PRESET_PLACEHOLDER_VALUE);
    setProviderId(nextProviderId);
    setBaseUrl(nextProviderId === "openai_compatible" ? baseUrl : "");
    setModelSelection(firstModel || CUSTOM_MODEL_VALUE);
    setCustomModel("");
    setEmbeddingSelection(DEFAULT_EMBEDDING_VALUE);
    setCustomEmbeddingModel("");
    resetModelDiscovery();
  }

  async function handleSave() {
    if (!model) {
      toast.error("Vui lòng chọn hoặc nhập tên model");
      return;
    }
    if (providerId === "openai_compatible" && !baseUrl.trim()) {
      toast.error("Cần nhập Base URL cho OpenAI-compatible provider");
      return;
    }
    if (requiresApiKey && !apiKey.trim() && !canReuseSavedKey) {
      toast.error("Nhà cung cấp cloud cần API key mới để kết nối");
      return;
    }
    if (!canUseSavedConfiguration && connectionMessage?.ok !== true) {
      toast.error("Hãy bấm icon kiểm tra kết nối trước khi lưu provider mới");
      return;
    }
    if (embeddingEnabled && isCustomEmbedding && !customEmbeddingModel.trim()) {
      toast.error("Cần nhập mã model embedding hoặc tắt semantic embedding");
      setMemoryOpen(true);
      return;
    }

    const preset = activePresetId
      ? PROVIDER_PRESETS.find((option) => option.id === activePresetId)
      : undefined;

    setSaving(true);
    setConnectionMessage(null);
    try {
      const saveResult = await callProviderConfigApi<{ provider_id: ProviderId; model: string }>("save", {
        provider_id: providerId,
        preset_id: activePresetId,
        base_url: baseUrl || undefined,
        api_key: apiKey || undefined,
        reuse_existing_key: canReuseSavedKey && !apiKey,
        model,
        models: discoveredModels,
        embedding_model: embeddingModel || undefined,
        embedding_enabled: embeddingEnabled,
        label: preset?.label,
      });
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      setSaved(true);
      toast.success("Đã lưu cấu hình provider");
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SelectForm
        label="Nhà cung cấp"
        value={selectedPresetId}
        onChange={applyPreset}
        options={[...PRESET_OPTIONS, { value: PRESET_PLACEHOLDER_VALUE, label: "Provider khác / Tùy chỉnh" }]}
      />

      {activePreset ? (
        <p className="-mt-2 text-xs text-text-muted">{activePreset.description}</p>
      ) : null}

      {isCustomProvider ? (
        <SelectForm
          label="Giao thức kết nối"
          value={providerId}
          onChange={handleProviderChange}
          options={PROVIDER_OPTIONS}
        />
      ) : null}

      {providerId === "openai_compatible" && (
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="label-base !mb-0">Base URL</label>
            {activePreset ? <span className="text-xs text-text-muted">Tự điền theo nhà cung cấp</span> : null}
          </div>
          <Input
            value={baseUrl}
            onChange={(event) => {
              setBaseUrl(event.target.value);
              resetModelDiscovery();
            }}
            readOnly={Boolean(activePreset)}
            placeholder="http://localhost:1234/v1"
            className="font-mono text-xs read-only:bg-bg-subtle read-only:text-text-secondary"
          />
          {isLocal ? (
            <div className="mt-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-text-secondary">
              <strong className="text-warning">Chỉ dùng khi model chạy cùng máy chủ Mood Studio.</strong>{" "}
              `localhost` trên Vercel hoặc mobile không trỏ về máy tính của bạn.
            </div>
          ) : null}
        </div>
      )}

      {requiresApiKey ? (
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label className="label-base !mb-0">API key</label>
            {canReuseSavedKey ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
                Đã lưu an toàn
              </span>
            ) : null}
          </div>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                resetModelDiscovery();
              }}
              onBlur={() => setApiKey(normalizeProviderApiKey(apiKey))}
              placeholder={canReuseSavedKey ? settings.keyMasked || "•••••••• (đang sử dụng)" : "Nhập API key của nhà cung cấp"}
              className={canReuseSavedKey ? "border-success/25 bg-success/[0.03] pr-20 font-mono text-xs" : "pr-20 font-mono text-xs"}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="icon"
              onClick={() => setShowKey((value) => !value)}
              disabled={!apiKey}
              className="absolute right-10 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-text-muted hover:text-text-primary disabled:cursor-default disabled:opacity-40"
              aria-label={showKey ? "Ẩn khóa API" : "Hiện khóa API"}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              type="button"
              variant="icon"
              onClick={handleProbeProvider}
              disabled={testingKey || (requiresApiKey && !apiKey.trim() && !canReuseSavedKey)}
              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Kiểm tra key và tải danh sách model"
              title="Kiểm tra kết nối và tải model"
            >
              <RefreshCw className={`h-4 w-4 ${testingKey ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {canReuseSavedKey
              ? "Để nguyên để tiếp tục dùng key hiện tại, hoặc nhập key mới để thay thế trên mọi thiết bị."
              : "Chỉ dán chuỗi key (ví dụ nvapi-...), không thêm tiền tố Bearer. Key được mã hóa trên server."}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-bg-subtle px-3 py-2 text-xs text-text-secondary">
          <span>Provider local không yêu cầu API key.</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleProbeProvider} disabled={testingKey} className="h-8 gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${testingKey ? "animate-spin" : ""}`} />
            Kiểm tra
          </Button>
        </div>
      )}

      {connectionMessage ? (
        <div className={`rounded-lg border px-3 py-2 text-xs ${connectionMessage.warning ? "border-warning/25 bg-warning/5 text-warning" : connectionMessage.ok ? "border-success/20 bg-success/5 text-success" : "border-danger/20 bg-danger/5 text-danger"}`}>
          <strong>{connectionMessage.warning ? "Key đã được tiếp nhận" : connectionMessage.ok ? "Kết nối thành công" : "Kiểm tra thất bại"}</strong>
          <span className="ml-1">· {connectionMessage.text}</span>
        </div>
      ) : null}

      {discoveredModels.length > 0 ? (
        <p className="text-xs text-success">
          Đã tải {discoveredModels.length} model. Người dùng chọn model trực tiếp trong ô chat Moodie.
        </p>
      ) : null}

      <div className="rounded-xl border border-border">
        <Button
          type="button"
          unstyled
          onClick={() => setMemoryOpen((value) => !value)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        >
          <span>
            <span className="block text-sm font-medium text-text-primary">Bộ nhớ & tìm kiếm ngữ nghĩa</span>
            <span className="block text-xs text-text-muted">
              {embeddingEnabled ? embeddingModel || "Mặc định theo nhà cung cấp" : "Đang tắt · Moodie vẫn lưu bộ nhớ dạng văn bản"}
            </span>
          </span>
          {memoryOpen ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
        </Button>

        {memoryOpen ? (
          <div className="space-y-3 border-t border-border bg-bg-subtle p-3">
            <SelectForm
              label="Semantic embedding"
              value={embeddingSelection}
              onChange={setEmbeddingSelection}
              options={embeddingOptions}
            />
            {isCustomEmbedding ? (
              <div>
                <label className="label-base">Mã model embedding</label>
                <Input
                  value={customEmbeddingModel}
                  onChange={(event) => setCustomEmbeddingModel(event.target.value)}
                  placeholder={modelCatalog.customEmbeddingModelPlaceholder || "Nhập model embedding của provider"}
                  className="font-mono text-xs"
                />
              </div>
            ) : null}
            <p className="text-xs text-text-muted">
              Chat model và embedding model là hai nghiệp vụ khác nhau. Chỉ bật khi nhà cung cấp có endpoint `/embeddings` tương thích.
            </p>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        size="sm"
        onClick={handleSave}
        disabled={saving || testingKey}
        className="w-full gap-2 sm:w-auto"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        ) : null}
        {saving ? "Đang lưu..." : saved ? "Đã lưu" : "Lưu cấu hình"}
      </Button>
    </div>
  );
}

function GeminiLegacySection({
  settings,
  apiKeyInput,
  setApiKeyInput,
  geminiModel,
  setGeminiModel,
  displayedModelOptions,
  modelSource,
  modelMessage,
  isLoadingModels,
  onRefreshModels,
  cannotRefreshModels,
  disabled,
}: {
  settings: MoodieAiSettings;
  apiKeyInput: string;
  setApiKeyInput: (value: string) => void;
  geminiModel: string;
  setGeminiModel: (value: string) => void;
  displayedModelOptions: MoodieGeminiModelOption[];
  modelSource: "api" | "fallback";
  modelMessage: string;
  isLoadingModels: boolean;
  onRefreshModels: () => void;
  cannotRefreshModels: boolean;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="rounded-lg border border-border">
      <Button
        type="button"
        unstyled
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <KeyRound className="w-4 h-4 text-text-muted" />
          Gemini legacy / dự phòng
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <div>
            <label className="label-base">Khóa API Gemini</label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                placeholder={settings.hasGeminiKey ? settings.geminiKeyMasked : "AIza..."}
                className="pr-10"
                disabled={disabled}
              />
              <Button
                type="button"
                variant="icon"
                onClick={() => setShowApiKey((value) => !value)}
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-text-muted hover:text-text-primary"
                aria-label={showApiKey ? "Ẩn khóa API" : "Hiện khóa API"}
                disabled={disabled}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                {settings.hasGeminiKey ? "Đang có khóa Gemini đã lưu" : "Chưa có khóa Gemini"}
              </p>
              <Link
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Lấy khóa
              </Link>
            </div>
          </div>

          <SelectForm
            label="Mô hình Gemini"
            value={geminiModel}
            onChange={setGeminiModel}
            options={displayedModelOptions}
            disabled={disabled}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs text-text-muted">
              Auto dùng {DEFAULT_MOODIE_GEMINI_MODEL}. Danh sách hiện tại: {modelSource === "api" ? "Gemini API" : "mặc định"}.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefreshModels}
              disabled={cannotRefreshModels}
              className="h-auto shrink-0 gap-1.5 px-2 py-1 text-xs"
            >
              {isLoadingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Làm mới model
            </Button>
          </div>
          <p className="text-xs text-text-muted">{modelMessage}</p>
        </div>
      )}
    </div>
  );
}

function MoodieBrowserSection({ settings, disabled }: { settings: MoodieBrowserSettings; disabled?: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [cdpUrl, setCdpUrl] = useState(settings.cdpUrl);
  const [cdpToken, setCdpToken] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(settings.timeoutMs);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveMoodieBrowserConfig({ enabled, cdp_url: cdpUrl, cdp_token: cdpToken || undefined, timeout_ms: timeoutMs });
      setCdpToken("");
      toast.success("Đã lưu cấu hình Browser");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu Browser");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const actionResult = await testMoodieBrowserConnection();
      if (!actionResult.success) return toast.error(actionResult.error);
      const result = actionResult.data;
      if (!result.ok) return toast.error(result.error);
      if (result.engine === "cloakbrowser") toast.success(`CloakBrowser đang live · ${result.latencyMs}ms`);
      else if (result.preferredEngine === "cloakbrowser") toast.warning(`Cloak không kết nối được; đang fallback an toàn · ${result.latencyMs}ms`);
      else toast.success(`Browser fetch hoạt động · ${result.latencyMs}ms`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể kiểm tra Browser");
    } finally {
      setTesting(false);
    }
  }

  const liveLabel = settings.preferredEngine === "cloakbrowser"
    ? `Ưu tiên CloakBrowser${settings.source === "environment" ? " từ môi trường" : " đã lưu"}`
    : "Safe fetch đang hoạt động; chưa cấu hình CloakBrowser";
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2"><Globe2 className="mt-0.5 h-4 w-4 text-text-muted" /><div><h5 className="text-sm font-semibold text-text-primary">Browser & CloakBrowser</h5><p className="mt-0.5 text-xs text-text-muted">Cho Moodie mở và đọc trang nguồn; URL nội bộ vẫn bị chặn SSRF.</p></div></div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary"><Input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={disabled || saving} className="h-4 w-4 accent-primary" />Bật</label>
      </div>
      <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-text-secondary">{liveLabel}</p>
      <div className="space-y-1"><label className="text-xs font-medium text-text-secondary">Cloak CDP URL</label><Input value={cdpUrl} onChange={(event) => setCdpUrl(event.target.value)} placeholder="ws://127.0.0.1:9222/devtools/browser/..." disabled={disabled || saving} /></div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><label className="text-xs font-medium text-text-secondary">CDP token {settings.hasCdpToken ? "(đã lưu)" : "(tuỳ chọn)"}</label><Input type="password" value={cdpToken} onChange={(event) => setCdpToken(event.target.value)} placeholder={settings.hasCdpToken ? "Để trống để giữ key hiện tại" : "Bearer token"} disabled={disabled || saving} /></div><div className="space-y-1"><label className="text-xs font-medium text-text-secondary">Timeout (ms)</label><Input type="number" min={3000} max={30000} value={timeoutMs} onChange={(event) => setTimeoutMs(Number(event.target.value))} disabled={disabled || saving} /></div></div>
      <div className="flex flex-wrap gap-2"><Button type="button" onClick={() => void save()} disabled={disabled || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Lưu Browser</Button><Button type="button" variant="outline" onClick={() => void testConnection()} disabled={disabled || testing || !enabled}>{testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Kiểm tra Browser</Button></div>
    </section>
  );
}

function MoodieBraveSection({ settings, disabled }: { settings: MoodieBraveSettings; disabled?: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState(settings.endpoint);
  const [mcpUrl, setMcpUrl] = useState(settings.mcpUrl);
  const [mcpToken, setMcpToken] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(settings.timeoutMs);
  const [maxResponseBytes, setMaxResponseBytes] = useState(settings.maxResponseBytes);
  const [showKey, setShowKey] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await saveMoodieBraveConfig({ enabled, api_key: apiKey || undefined, endpoint, mcp_url: mcpUrl, mcp_token: mcpToken || undefined, timeout_ms: timeoutMs, max_response_bytes: maxResponseBytes });
      setApiKey("");
      setMcpToken("");
      toast.success("Đã lưu cấu hình Brave Search");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu Brave Search");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const actionResult = await testMoodieBraveConnection();
      if (!actionResult.success) {
        toast.error(actionResult.error);
        return;
      }
      const result = actionResult.data;
      if (result.ok) toast.success(`Brave Search hoạt động · ${result.sourceCount} nguồn · ${result.latencyMs}ms`);
      else toast.error(result.error);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể kiểm tra Brave Search");
    } finally {
      setTesting(false);
    }
  }

  const configured = settings.hasApiKey || Boolean(settings.mcpUrl);
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Globe2 className="mt-0.5 h-4 w-4 text-text-muted" />
          <div>
            <h5 className="text-sm font-semibold text-text-primary">Brave Search</h5>
            <p className="mt-0.5 text-xs text-text-muted">Cho Moodie nghiên cứu web, tin tức và trả lời kèm nguồn mới nhất.</p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
          <Input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={disabled || saving} className="h-4 w-4 accent-primary" />
          Bật
        </label>
      </div>

      <div className={`rounded-lg border p-3 text-xs ${configured ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300" : "border-border bg-bg-subtle text-text-muted"}`}>
        {configured ? `Đã có cấu hình ${settings.source === "environment" ? "từ môi trường" : "được lưu"}${settings.hasApiKey ? " · Brave API key" : " · MCP"}` : "Chưa có Brave Search API key"}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary">Brave Search API key</label>
        <div className="relative">
          <Input type={showKey ? "text" : "password"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.hasApiKey ? "Đã có key; nhập key mới để thay đổi" : "BSA..."} disabled={disabled || saving} className="pr-10" autoComplete="new-password" />
          <Button type="button" unstyled onClick={() => setShowKey((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted" aria-label={showKey ? "Ẩn API key" : "Hiện API key"}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
        </div>
        <p className="text-xs text-text-muted">Key được mã hóa trước khi lưu và không bao giờ trả lại trình duyệt.</p>
      </div>

      <Button type="button" variant="ghost" onClick={() => setAdvanced((value) => !value)} className="w-full justify-between text-xs">
        Cấu hình nâng cao {advanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {advanced ? <div className="space-y-3 rounded-lg border border-border bg-bg-subtle p-3">
        <div className="space-y-1"><label className="text-xs text-text-secondary">Search API endpoint</label><Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} disabled={disabled || saving} /></div>
        <div className="space-y-1"><label className="text-xs text-text-secondary">MCP endpoint (tùy chọn)</label><Input value={mcpUrl} onChange={(event) => setMcpUrl(event.target.value)} placeholder="https://.../mcp" disabled={disabled || saving} /></div>
        <div className="space-y-1"><label className="text-xs text-text-secondary">MCP token (tùy chọn)</label><Input type="password" value={mcpToken} onChange={(event) => setMcpToken(event.target.value)} placeholder={settings.hasMcpToken ? "Đã có token; nhập mới để thay đổi" : "Bearer token"} disabled={disabled || saving} /></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="text-xs text-text-secondary">Timeout (ms)</label><Input type="number" min={1000} max={60000} value={timeoutMs} onChange={(event) => setTimeoutMs(Number(event.target.value))} /></div><div className="space-y-1"><label className="text-xs text-text-secondary">Max response (bytes)</label><Input type="number" min={100000} max={5000000} value={maxResponseBytes} onChange={(event) => setMaxResponseBytes(Number(event.target.value))} /></div></div>
      </div> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void save()} disabled={disabled || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Lưu Brave Search</Button>
        <Button type="button" variant="outline" onClick={() => void testConnection()} disabled={disabled || testing || !configured}>{testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Kiểm tra kết nối</Button>
      </div>
    </section>
  );
}

export default function MoodieAiCard({
  settings,
  providerSettings,
  voiceSettings,
  braveSettings,
  browserSettings,
  apiKeyInput,
  setApiKeyInput,
  geminiModel,
  setGeminiModel,
  modelOptions,
  modelSource,
  modelMessage,
  isLoadingModels,
  onRefreshModels,
  disabled = false,
}: MoodieAiCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [showExplain, setShowExplain] = useState(false);
  const displayedModelOptions = ensureSelectedModelOption(modelOptions, geminiModel);
  const cannotRefreshModels =
    disabled || isLoadingModels || (!settings.hasGeminiKey && !apiKeyInput.trim());

  return (
    <div className="card-base p-4 lg:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BrainCircuit className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-text-primary">Moodie AI</h4>
              <p className="text-xs text-text-muted mt-1">
                Chọn provider chính cho Moodie. Gemini legacy được để trong phần dự phòng.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowExplain((value) => !value)}
                className="h-8 w-8 p-0"
                aria-label="Giải thích cấu hình Moodie"
              >
                <Info className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed((value) => !value)}
                className="h-8 w-8 p-0"
                aria-label={collapsed ? "Mở cấu hình Moodie" : "Thu gọn cấu hình Moodie"}
              >
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showExplain && <MoodieExplainPanel />}

      <ProviderStatus settings={providerSettings} />

      {collapsed ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setCollapsed(false)}
          className="w-full justify-between"
        >
          <span>Cấu hình provider</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      ) : null}

      {!collapsed && (
        <div className="space-y-4">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-text-muted" />
              <h5 className="text-sm font-semibold text-text-primary">Provider chính</h5>
            </div>
            <ProviderSection settings={providerSettings} />
          </section>

          <GeminiLegacySection
            settings={settings}
            apiKeyInput={apiKeyInput}
            setApiKeyInput={setApiKeyInput}
            geminiModel={geminiModel}
            setGeminiModel={setGeminiModel}
            displayedModelOptions={displayedModelOptions}
            modelSource={modelSource}
            modelMessage={modelMessage}
            isLoadingModels={isLoadingModels}
            onRefreshModels={onRefreshModels}
            cannotRefreshModels={cannotRefreshModels}
            disabled={disabled}
          />

          <MoodieVoiceSettingsSection settings={voiceSettings} disabled={disabled} />
          <MoodieBraveSection settings={braveSettings} disabled={disabled} />
          <MoodieBrowserSection settings={browserSettings} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

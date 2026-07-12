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
  Mic,
  RefreshCw,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import {
  saveMoodieProviderConfig,
  saveMoodieBraveConfig,
  saveMoodieVoiceConfig,
  saveMoodieVoiceLiveConfig,
  testActiveMoodieProvider,
  testMoodieBraveConnection,
} from "@/app/actions/moodie-provider-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
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
import type { MoodieAiSettings, MoodieBraveSettings, MoodieProviderSettings, MoodieVoiceSettings } from "@/types/settings";

interface MoodieAiCardProps {
  settings: MoodieAiSettings;
  providerSettings: MoodieProviderSettings;
  voiceSettings: MoodieVoiceSettings;
  braveSettings: MoodieBraveSettings;
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

function findMatchingPreset(settings: MoodieProviderSettings) {
  return PROVIDER_PRESETS.find((preset) => {
    const sameProvider = preset.providerId === settings.providerId;
    const sameBaseUrl = (preset.baseUrl || "") === (settings.baseUrl || "");
    const sameModel = preset.model === settings.model;
    const sameEmbedding = (preset.embeddingModel || "") === (settings.embeddingModel || "");
    return sameProvider && sameBaseUrl && sameModel && sameEmbedding;
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
  const isReady = settings.hasKey;

  return (
    <div className="rounded-xl border border-border bg-bg-subtle p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-text-muted">Provider đang chạy</p>
          <p className="truncate text-sm font-semibold text-text-primary">{providerLabel}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs ${isReady ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
          {isReady ? "Đã có API key" : settings.isLocal ? "Chưa kiểm tra" : "Thiếu API key"}
        </span>
      </div>
      <div className="grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
        <span>Model: <strong>{modelLabel}</strong></span>
        <span>Embedding: <strong>{settings.embeddingModel || "Auto"}</strong></span>
      </div>
      {settings.baseUrl ? (
        <p className="truncate text-xs text-text-muted">Endpoint: {settings.baseUrl}</p>
      ) : null}
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const activePresetId =
    selectedPresetId === PRESET_PLACEHOLDER_VALUE ? undefined : selectedPresetId;
  const modelCatalog = useMemo(
    () => getProviderModelCatalog({ providerId, presetId: activePresetId }),
    [providerId, activePresetId],
  );
  const modelOptions = useMemo(() => {
    const options = [...modelCatalog.models];
    if (modelCatalog.allowCustomModel) {
      options.push({ value: CUSTOM_MODEL_VALUE, label: "Model khác (nhập thủ công)" });
    }
    return options;
  }, [modelCatalog]);
  const embeddingOptions = useMemo(() => {
    const options: ProviderModelOption[] = [
      { value: DEFAULT_EMBEDDING_VALUE, label: "Auto / theo provider" },
      ...(modelCatalog.embeddingModels || []),
    ];
    if (modelCatalog.allowCustomEmbeddingModel !== false) {
      options.push({ value: CUSTOM_EMBEDDING_VALUE, label: "Embedding khác (nhập thủ công)" });
    }
    return options;
  }, [modelCatalog]);

  const isCustomModel = modelSelection === CUSTOM_MODEL_VALUE;
  const isCustomEmbedding = embeddingSelection === CUSTOM_EMBEDDING_VALUE;
  const model = isCustomModel ? customModel.trim() : modelSelection;
  const embeddingModel = isCustomEmbedding
    ? customEmbeddingModel.trim()
    : embeddingSelection === DEFAULT_EMBEDDING_VALUE
      ? ""
      : embeddingSelection;
  const isLocal = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  function applyPreset(presetId: string) {
    if (presetId === PRESET_PLACEHOLDER_VALUE) return;
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
    setApiKey(preset.apiKey || "");
    setModelSelection(presetModelInCatalog ? preset.model : CUSTOM_MODEL_VALUE);
    setCustomModel(presetModelInCatalog ? "" : preset.model);
    setEmbeddingSelection(
      preset.embeddingModel
        ? presetEmbeddingInCatalog
          ? preset.embeddingModel
          : CUSTOM_EMBEDDING_VALUE
        : DEFAULT_EMBEDDING_VALUE,
    );
    setCustomEmbeddingModel(
      preset.embeddingModel && !presetEmbeddingInCatalog ? preset.embeddingModel : "",
    );
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

    const preset = activePresetId
      ? PROVIDER_PRESETS.find((option) => option.id === activePresetId)
      : undefined;

    setSaving(true);
    setConnectionMessage(null);
    try {
      const saveResult = await saveMoodieProviderConfig({
        provider_id: providerId,
        preset_id: activePresetId,
        base_url: baseUrl || undefined,
        api_key: apiKey || undefined,
        model,
        embedding_model: embeddingModel || undefined,
        label: preset?.label,
      });
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      const connection = await testActiveMoodieProvider();
      if (!connection.success || !connection.data.ok) {
        const error = (connection.success ? connection.data.error : connection.error) || "Không thể kiểm tra provider";
        setAdvancedOpen(true);
        setConnectionMessage({ ok: false, text: error });
        toast.error(`Đã lưu nhưng kết nối thất bại: ${error}`);
        return;
      }

      setConnectionMessage({
        ok: true,
        text: `${connection.data.provider} phản hồi trong ${connection.data.latencyMs}ms`,
      });
      setSaved(true);
      toast.success("Đã lưu và kiểm tra provider thành công");
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi lưu cấu hình");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <SelectForm
        label="Provider"
        value={selectedPresetId}
        onChange={applyPreset}
        options={[{ value: PRESET_PLACEHOLDER_VALUE, label: "Tùy chỉnh provider" }, ...PRESET_OPTIONS]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectForm
          label="Loại provider"
          value={providerId}
          onChange={handleProviderChange}
          options={PROVIDER_OPTIONS}
        />
        <SelectForm
          label="Model chat"
          value={modelSelection}
          onChange={setModelSelection}
          options={modelOptions}
        />
      </div>

      {isCustomModel && (
        <div>
          <label className="label-base">Mã model custom</label>
          <Input
            value={customModel}
            onChange={(event) => setCustomModel(event.target.value)}
            placeholder={modelCatalog.customModelPlaceholder || "qwen2.5-coder:7b"}
            className="font-mono text-xs"
          />
        </div>
      )}

      {providerId === "openai_compatible" && (
        <div>
          <label className="label-base">Endpoint</label>
          <Input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="http://localhost:1234/v1"
            className="font-mono text-xs"
          />
          <p className="mt-1 text-xs text-text-muted">
            {isLocal ? "Local — không cần API key" : "Cloud provider thường cần API key ở phần nâng cao."}
          </p>
        </div>
      )}

      <Button
        type="button"
        unstyled
        onClick={() => setAdvancedOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm text-text-secondary hover:bg-bg-hover"
      >
        <span>Nâng cao: API key & embedding</span>
        {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {advancedOpen && (
        <div className="space-y-3 rounded-lg border border-border bg-bg-subtle p-3">
          <SelectForm
            label="Embedding model"
            value={embeddingSelection}
            onChange={setEmbeddingSelection}
            options={embeddingOptions}
          />

          {isCustomEmbedding && (
            <div>
              <label className="label-base">Mã embedding custom</label>
              <Input
                value={customEmbeddingModel}
                onChange={(event) => setCustomEmbeddingModel(event.target.value)}
                placeholder={modelCatalog.customEmbeddingModelPlaceholder || "text-embedding-3-small"}
                className="font-mono text-xs"
              />
            </div>
          )}

          <div>
              <label className="label-base">API Key provider</label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={settings.hasKey ? "Đang có key đã lưu; nhập key mới để thay đổi" : "Nhập nếu gateway yêu cầu (sk-... hoặc key nội bộ)"}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="icon"
                  onClick={() => setShowKey((value) => !value)}
                  className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-text-muted hover:text-text-primary"
                  aria-label={showKey ? "Ẩn khóa API" : "Hiện khóa API"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            <p className="mt-1 text-xs text-text-muted">Một số gateway localhost vẫn yêu cầu API key. Nút kiểm tra sẽ xác nhận chính xác.</p>
          </div>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="gap-2"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        ) : null}
        {saved ? "Đã kết nối" : "Lưu & kiểm tra"}
      </Button>
      {connectionMessage ? (
        <p className={`text-xs ${connectionMessage.ok ? "text-green-700" : "text-danger"}`}>
          {connectionMessage.text}
        </p>
      ) : null}
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

type MoodieVoiceSettingsWithLive = MoodieVoiceSettings & {
  engine?: "live" | "cascade";
  liveVoice?: string;
  liveModel?: string;
};

const VOICE_ENGINE_OPTIONS = [
  { value: "live", label: "Realtime (Live)" },
  { value: "cascade", label: "D\u1ef1 ph\u00f2ng (t\u1eebng c\u00e2u)" },
];

function MoodieVoiceSection({
  voiceSettings,
  disabled,
}: {
  voiceSettings: MoodieVoiceSettingsWithLive;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(voiceSettings.model);
  const [engine, setEngine] = useState<"live" | "cascade">(voiceSettings.engine || "live");
  const [liveVoice, setLiveVoice] = useState(voiceSettings.liveVoice || "Zephyr");
  const [liveModel, setLiveModel] = useState(
    voiceSettings.liveModel || "gemini-3.1-flash-live-preview",
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const [voiceResult, liveResult] = await Promise.all([
        saveMoodieVoiceConfig({
          api_key: apiKey || undefined,
          model: model || undefined,
        }),
        saveMoodieVoiceLiveConfig({
          engine,
          voice: liveVoice || undefined,
          model: liveModel || undefined,
        }),
      ]);
      if (!voiceResult.success) throw new Error(voiceResult.error);
      if (!liveResult.success) throw new Error(liveResult.error);
      setApiKey("");
      toast.success("Đã lưu cấu hình giọng nói");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi lưu cấu hình giọng nói");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border">
      <Button
        type="button"
        unstyled
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Mic className="w-4 h-4 text-text-muted" />
          Giọng nói (đọc để nhập)
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          <div>
            <label className="label-base">Google API key cho giọng nói</label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={voiceSettings.hasKey ? "Đang có khóa giọng nói đã lưu; nhập khóa mới để thay đổi" : "AIza..."}
                className="pr-10"
                disabled={disabled}
              />
              <Button
                type="button"
                variant="icon"
                onClick={() => setShowKey((value) => !value)}
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-md text-text-muted hover:text-text-primary"
                aria-label={showKey ? "Ẩn khóa API" : "Hiện khóa API"}
                disabled={disabled}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {voiceSettings.hasKey ? "Đang có khóa giọng nói đã lưu" : "Chưa có khóa giọng nói"}. Khóa này tách riêng khỏi provider chat chính, luôn dùng Google Gemini cho STT.
            </p>
          </div>

          <div>
            <label className="label-base">Mô hình STT (speech-to-text)</label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="gemini-2.5-flash"
              className="font-mono text-xs"
              disabled={disabled}
            />
          </div>

          <div>
            <label className="label-base">Ch\u1ebf \u0111\u1ed9 gi\u1ecdng n\u00f3i: Realtime (Live) / D\u1ef1 ph\u00f2ng (t\u1eebng c\u00e2u)</label>
            <SelectForm
              value={engine}
              onChange={(value) => setEngine(value as "live" | "cascade")}
              options={VOICE_ENGINE_OPTIONS}
              disabled={disabled}
            />
          </div>

          <div>
            <label className="label-base">Voice</label>
            <Input
              value={liveVoice}
              onChange={(event) => setLiveVoice(event.target.value)}
              placeholder="Zephyr"
              className="font-mono text-xs"
              disabled={disabled}
            />
          </div>

          <div>
            <label className="label-base">Live model</label>
            <Input
              value={liveModel}
              onChange={(event) => setLiveModel(event.target.value)}
              placeholder="gemini-3.1-flash-live-preview"
              className="font-mono text-xs"
              disabled={disabled}
            />
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || disabled}
            className="gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Lưu khóa giọng nói
          </Button>
        </div>
      )}
    </div>
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
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={disabled || saving} className="h-4 w-4 accent-primary" />
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
        <p className="text-[11px] text-text-muted">Key được mã hóa trước khi lưu và không bao giờ trả lại trình duyệt.</p>
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

          <MoodieVoiceSection voiceSettings={voiceSettings} disabled={disabled} />
          <MoodieBraveSection settings={braveSettings} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

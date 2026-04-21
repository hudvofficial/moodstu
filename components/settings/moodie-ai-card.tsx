"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BrainCircuit,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import {
  DEFAULT_MOODIE_GEMINI_MODEL,
  formatMoodieGeminiModelLabel,
  type MoodieGeminiModelOption,
} from "@/lib/moodie/model-options";
import type { MoodieAiSettings } from "@/types/settings";

interface MoodieAiCardProps {
  settings: MoodieAiSettings;
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

export default function MoodieAiCard({
  settings,
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
  const [showApiKey, setShowApiKey] = useState(false);
  const displayedModelOptions = ensureSelectedModelOption(
    modelOptions,
    geminiModel,
  );
  const cannotRefreshModels =
    disabled || isLoadingModels || (!settings.hasGeminiKey && !apiKeyInput.trim());

  return (
    <div className="card-base p-4 lg:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BrainCircuit className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-text-primary">
            Moodie AI
          </h4>
          <p className="text-xs text-text-muted mt-1">
            Runtime production của Moodie lấy khóa Gemini từ phần Cài đặt. Biến
            môi trường chỉ dùng làm cấu hình dự phòng cho local/dev.
          </p>
        </div>
      </div>

      <div className="space-y-3">
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
              {showApiKey ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <KeyRound className="w-3.5 h-3.5" />
              {settings.hasGeminiKey
                ? "Đang có khóa Gemini đã lưu"
                : "Chưa có khóa Gemini"}
            </div>
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

        <div className="space-y-1.5">
          <SelectForm
            label="Mô hình Gemini"
            value={geminiModel}
            onChange={setGeminiModel}
            options={displayedModelOptions}
            disabled={disabled}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs text-text-muted">
              Auto sẽ dùng {DEFAULT_MOODIE_GEMINI_MODEL} cho production. Dropdown
              dùng danh sách {modelSource === "api" ? "từ Gemini API" : "mặc định"}.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefreshModels}
              disabled={cannotRefreshModels}
              className="h-auto shrink-0 gap-1.5 px-2 py-1 text-xs"
            >
              {isLoadingModels ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Làm mới model
            </Button>
          </div>
          <p className="text-xs text-text-muted">{modelMessage}</p>
          <p className="text-xs text-text-muted">
            Thay đổi khóa hoặc model sẽ được lưu cùng nút Lưu thay đổi của trang.
          </p>
        </div>
      </div>
    </div>
  );
}

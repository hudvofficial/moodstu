"use client";

import GoogleCalendarCard from "../google-calendar-card";
import MoodieAiCard from "../moodie-ai-card";
import type { MoodieAiSettings, StudioInfo } from "@/types/settings";
import type { MoodieGeminiModelOption } from "@/lib/moodie/model-options";

interface StudioIntegrationCardsProps {
  savedStudioInfo: StudioInfo;
  savedMoodieSettings: MoodieAiSettings;
  moodieApiKeyInput: string;
  setMoodieApiKeyInput: (v: string) => void;
  moodieGeminiModel: string;
  setMoodieGeminiModel: (v: string) => void;
  moodieModelOptions: MoodieGeminiModelOption[];
  moodieModelSource: "api" | "fallback";
  moodieModelMessage: string;
  isLoadingMoodieModels: boolean;
  onRefreshModels: () => void;
  onDisconnect: () => Promise<{ success: boolean; error?: string }>;
  onDisconnected: () => void;
  onMutateSwr: () => void;
  disabled: boolean;
}

export default function StudioIntegrationCards({
  savedStudioInfo,
  savedMoodieSettings,
  moodieApiKeyInput,
  setMoodieApiKeyInput,
  moodieGeminiModel,
  setMoodieGeminiModel,
  moodieModelOptions,
  moodieModelSource,
  moodieModelMessage,
  isLoadingMoodieModels,
  onRefreshModels,
  onDisconnect,
  onDisconnected,
  onMutateSwr,
  disabled,
}: StudioIntegrationCardsProps) {
  return (
    <>
      <GoogleCalendarCard
        isConnected={!!savedStudioInfo.google_oauth}
        grantedScopes={savedStudioInfo.google_oauth?.granted_scopes}
        onDisconnect={onDisconnect}
        onDisconnected={() => {
          onDisconnected();
          onMutateSwr();
        }}
      />
      <MoodieAiCard
        settings={savedMoodieSettings}
        apiKeyInput={moodieApiKeyInput}
        setApiKeyInput={setMoodieApiKeyInput}
        geminiModel={moodieGeminiModel}
        setGeminiModel={setMoodieGeminiModel}
        modelOptions={moodieModelOptions}
        modelSource={moodieModelSource}
        modelMessage={moodieModelMessage}
        isLoadingModels={isLoadingMoodieModels}
        onRefreshModels={onRefreshModels}
        disabled={disabled}
      />
    </>
  );
}

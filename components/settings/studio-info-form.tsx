"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "@/lib/toast-manager";
import { Save, Loader2 } from "lucide-react";
import {
  disconnectGoogleOAuth,
  uploadStudioLogo,
} from "@/app/actions/settings-mutations";
import { getMoodieGeminiModelOptions } from "@/app/actions/settings-queries";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  MOODIE_GEMINI_MODEL_OPTIONS,
  type MoodieGeminiModelOption,
} from "@/lib/moodie/model-options";
import { cacheKeys, mutate } from "@/lib/swr";
import StudioIdentitySection from "./studio/studio-identity-section";
import StudioBankSection from "./studio/studio-bank-section";
import StudioSocialSection from "./studio/studio-social-section";
import StudioHoursSection from "./studio/studio-hours-section";
import StudioIntegrationCards from "./studio/studio-integration-cards";
import { executeSaveTasks } from "./studio/studio-save-logic";
import type {
  BankInfo,
  MoodieAiSettings,
  MoodieProviderSettings,
  MoodieVoiceSettings,
  SocialLinks,
  StudioInfo,
  WorkingHours,
} from "@/types/settings";

interface StudioInfoFormProps {
  studioInfo: StudioInfo;
  moodieAiSettings: MoodieAiSettings;
  moodieProviderSettings: MoodieProviderSettings;
  moodieVoiceSettings: MoodieVoiceSettings;
}

function normalizeRequiredText(value: string) {
  return value.trim();
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function sameRecord(left: unknown, right: unknown) {
  return JSON.stringify(left || {}) === JSON.stringify(right || {});
}

export default function StudioInfoForm({
  studioInfo,
  moodieAiSettings,
  moodieProviderSettings,
  moodieVoiceSettings,
}: StudioInfoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [savedStudioInfo, setSavedStudioInfo] = useState(studioInfo);
  const [savedMoodieSettings, setSavedMoodieSettings] = useState(moodieAiSettings);
  const [name, setName] = useState(studioInfo.name || "");
  const [hotline, setHotline] = useState(studioInfo.hotline || "");
  const [address, setAddress] = useState(studioInfo.address || "");
  const [representative, setRepresentative] = useState(studioInfo.representative || "");
  const [logoUrl, setLogoUrl] = useState(studioInfo.logo_url || "");
  const [timezone, setTimezone] = useState(studioInfo.timezone || "Asia/Ho_Chi_Minh");
  const [bankInfo, setBankInfo] = useState<BankInfo>(studioInfo.bank_info || {});
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(studioInfo.social_links || {});
  const [workingHours, setWorkingHours] = useState<WorkingHours>(studioInfo.working_hours || {});
  const [moodieApiKeyInput, setMoodieApiKeyInput] = useState("");
  const [moodieGeminiModel, setMoodieGeminiModel] = useState(moodieAiSettings.geminiModel);
  const [moodieModelOptions, setMoodieModelOptions] = useState<MoodieGeminiModelOption[]>(
    [...MOODIE_GEMINI_MODEL_OPTIONS],
  );
  const [isLoadingMoodieModels, setIsLoadingMoodieModels] = useState(false);
  const [moodieModelSource, setMoodieModelSource] = useState<"api" | "fallback">("fallback");
  const [moodieModelMessage, setMoodieModelMessage] = useState(
    moodieAiSettings.hasGeminiKey
      ? "Đang dùng danh sách mặc định; có thể làm mới từ Gemini API."
      : "Lưu hoặc nhập khóa Gemini để tải danh sách model từ API.",
  );

  // Re-sync saved snapshots when the server sends fresh props (e.g. after
  // revalidation) during render instead of in an effect — avoids the extra
  // render pass flagged by react-hooks/set-state-in-effect. React's documented
  // "adjust state during render" pattern (you-might-not-need-an-effect).
  const [syncedMoodieSettings, setSyncedMoodieSettings] = useState(moodieAiSettings);
  if (syncedMoodieSettings !== moodieAiSettings) {
    setSyncedMoodieSettings(moodieAiSettings);
    setSavedMoodieSettings(moodieAiSettings);
    setMoodieGeminiModel(moodieAiSettings.geminiModel);
  }

  const [syncedStudioInfo, setSyncedStudioInfo] = useState(studioInfo);
  if (syncedStudioInfo !== studioInfo) {
    setSyncedStudioInfo(studioInfo);
    setSavedStudioInfo(studioInfo);
    setLogoUrl(studioInfo.logo_url || "");
  }

  const studioPayload = {
    name: normalizeRequiredText(name),
    hotline: normalizeRequiredText(hotline) || "N/A",
    address: normalizeOptionalText(address),
    representative: normalizeOptionalText(representative),
    logo_url: logoUrl || null,
    timezone,
    bank_info: bankInfo,
    social_links: socialLinks,
    working_hours: workingHours,
    expected_updated_at: savedStudioInfo.updated_at,
  };

  const hasStudioChanges =
    studioPayload.name !== (savedStudioInfo.name || "") ||
    studioPayload.hotline !== (savedStudioInfo.hotline || "N/A") ||
    studioPayload.address !== (savedStudioInfo.address || null) ||
    studioPayload.representative !== (savedStudioInfo.representative || null) ||
    studioPayload.logo_url !== (savedStudioInfo.logo_url || null) ||
    studioPayload.timezone !== (savedStudioInfo.timezone || "Asia/Ho_Chi_Minh") ||
    !sameRecord(studioPayload.bank_info, savedStudioInfo.bank_info) ||
    !sameRecord(studioPayload.social_links, savedStudioInfo.social_links) ||
    !sameRecord(studioPayload.working_hours, savedStudioInfo.working_hours);

  const hasMoodieChanges =
    moodieApiKeyInput.trim().length > 0 ||
    moodieGeminiModel.trim() !== savedMoodieSettings.geminiModel;
  const hasChanges = hasStudioChanges || hasMoodieChanges;

  const loadMoodieModels = useCallback(async (showToast = false) => {
    const overrideKey = moodieApiKeyInput.trim();

    if (!savedMoodieSettings.hasGeminiKey && !overrideKey) {
      const message = "Nhập khóa Gemini trước khi tải danh sách model từ API";
      setMoodieModelMessage(message);
      if (showToast) toast.info(message);
      return;
    }

    setIsLoadingMoodieModels(true);

    try {
      const result = await getMoodieGeminiModelOptions(
        overrideKey ? { gemini_api_key: overrideKey } : undefined,
      );

      if (!result.success) {
        const message = result.error || "Không tải được danh sách model Gemini";
        setMoodieModelMessage(message);
        if (showToast) toast.error(message);
        return;
      }

      setMoodieModelOptions(result.data.options);
      setMoodieModelSource(result.data.source);
      setMoodieModelMessage(result.data.message);

      if (showToast) {
        if (result.data.source === "api") {
          toast.success("Đã tải danh sách model từ Gemini API");
        } else {
          toast.warning(result.data.message);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không tải được danh sách model Gemini";
      setMoodieModelMessage(message);
      if (showToast) toast.error(message);
    } finally {
      setIsLoadingMoodieModels(false);
    }
  }, [moodieApiKeyInput, savedMoodieSettings.hasGeminiKey]);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Tên studio không được để trống");
      return;
    }

    if (!hasChanges) {
      toast.info("Không có thay đổi để lưu");
      return;
    }

    startTransition(async () => {
      const { failed } = await executeSaveTasks({
        hasStudioChanges,
        hasMoodieChanges,
        studioPayload,
        moodieApiKeyInput,
        moodieGeminiModel,
        savedMoodieSettings,
        setSavedStudioInfo: (fn) => setSavedStudioInfo((prev) => fn(prev)),
        setSavedMoodieSettings: (fn) => setSavedMoodieSettings((prev) => fn(prev)),
      });

      if (failed) {
        toast.error(`${failed.section}: ${failed.error || "Không thể lưu"}`);
        return;
      }

      if (hasMoodieChanges) {
        setMoodieApiKeyInput("");
      }

      const savedSections = [
        hasStudioChanges ? "thông tin studio" : null,
        hasMoodieChanges ? "Moodie AI" : null,
      ].filter(Boolean);

      toast.success(`Đã lưu ${savedSections.join(" và ")}`);
    });
  }

  const handleDisconnected = useCallback(() => {
    setSavedStudioInfo((current) => ({ ...current, google_oauth: null }));
  }, []);

  const handleMutateSwr = useCallback(() => {
    void mutate(cacheKeys.studioInfo());
  }, []);

  const saveButton = (
    <Button
      variant="primary"
      onClick={handleSave}
      disabled={isPending || !name.trim() || !hasChanges}
      className="gap-1.5 w-full"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      {isPending ? "Đang lưu..." : "Lưu thay đổi"}
    </Button>
  );

  return (
    <div className="main-container pb-28 lg:pb-12">
      <Breadcrumb
        items={[
          { label: "Cài đặt", href: "/settings" },
          { label: "Thông tin studio" },
        ]}
      />

      <div className="detail-grid">
        <div className="detail-main">
          <StudioIdentitySection
            name={name}
            setName={setName}
            hotline={hotline}
            setHotline={setHotline}
            address={address}
            setAddress={setAddress}
            representative={representative}
            setRepresentative={setRepresentative}
            timezone={timezone}
            setTimezone={setTimezone}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            onUploadLogo={uploadStudioLogo}
            disabled={isPending}
          />

          <StudioBankSection bankInfo={bankInfo} setBankInfo={setBankInfo} />
          <StudioSocialSection
            socialLinks={socialLinks}
            setSocialLinks={setSocialLinks}
          />
          <StudioHoursSection
            workingHours={workingHours}
            setWorkingHours={setWorkingHours}
          />
        </div>

        <div className="detail-sidebar flex!">
          <StudioIntegrationCards
            savedStudioInfo={savedStudioInfo}
            savedMoodieSettings={savedMoodieSettings}
            moodieProviderSettings={moodieProviderSettings}
            moodieVoiceSettings={moodieVoiceSettings}
            moodieApiKeyInput={moodieApiKeyInput}
            setMoodieApiKeyInput={setMoodieApiKeyInput}
            moodieGeminiModel={moodieGeminiModel}
            setMoodieGeminiModel={setMoodieGeminiModel}
            moodieModelOptions={moodieModelOptions}
            moodieModelSource={moodieModelSource}
            moodieModelMessage={moodieModelMessage}
            isLoadingMoodieModels={isLoadingMoodieModels}
            onRefreshModels={() => void loadMoodieModels(true)}
            onDisconnect={disconnectGoogleOAuth}
            onDisconnected={handleDisconnected}
            onMutateSwr={handleMutateSwr}
            disabled={isPending}
          />
          {saveButton}
        </div>
      </div>
    </div>
  );
}

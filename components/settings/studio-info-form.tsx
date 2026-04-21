"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import {
  disconnectGoogleCalendar,
  uploadStudioLogo,
  updateMoodieAiSettings,
  updateStudioInfo,
} from "@/app/actions/settings-mutations";
import { getMoodieGeminiModelOptions } from "@/app/actions/settings-queries";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  MOODIE_GEMINI_MODEL_OPTIONS,
  type MoodieGeminiModelOption,
} from "@/lib/moodie/model-options";
import GoogleCalendarCard from "./google-calendar-card";
import MoodieAiCard from "./moodie-ai-card";
import StudioIdentitySection from "./studio/studio-identity-section";
import StudioBankSection from "./studio/studio-bank-section";
import StudioSocialSection from "./studio/studio-social-section";
import StudioHoursSection from "./studio/studio-hours-section";
import type {
  BankInfo,
  MoodieAiSettings,
  SocialLinks,
  StudioInfo,
  WorkingHours,
} from "@/types/settings";

interface StudioInfoFormProps {
  studioInfo: StudioInfo;
  moodieAiSettings: MoodieAiSettings;
}

type SaveResult = {
  section: string;
  success: boolean;
  error?: string;
};

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
}: StudioInfoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(studioInfo.name || "");
  const [hotline, setHotline] = useState(studioInfo.hotline || "");
  const [address, setAddress] = useState(studioInfo.address || "");
  const [representative, setRepresentative] = useState(
    studioInfo.representative || "",
  );
  const [logoUrl, setLogoUrl] = useState(studioInfo.logo_url || "");
  const [timezone, setTimezone] = useState(
    studioInfo.timezone || "Asia/Ho_Chi_Minh",
  );
  const [bankInfo, setBankInfo] = useState<BankInfo>(studioInfo.bank_info || {});
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(
    studioInfo.social_links || {},
  );
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    studioInfo.working_hours || {},
  );
  const [moodieApiKeyInput, setMoodieApiKeyInput] = useState("");
  const [moodieGeminiModel, setMoodieGeminiModel] = useState(
    moodieAiSettings.geminiModel,
  );
  const [moodieModelOptions, setMoodieModelOptions] = useState<
    MoodieGeminiModelOption[]
  >([...MOODIE_GEMINI_MODEL_OPTIONS]);
  const [isLoadingMoodieModels, setIsLoadingMoodieModels] = useState(false);
  const [moodieModelSource, setMoodieModelSource] = useState<"api" | "fallback">(
    "fallback",
  );
  const [moodieModelMessage, setMoodieModelMessage] = useState(
    moodieAiSettings.hasGeminiKey
      ? "Đang dùng danh sách mặc định; có thể làm mới từ Gemini API."
      : "Lưu hoặc nhập khóa Gemini để tải danh sách model từ API.",
  );

  useEffect(() => {
    setMoodieGeminiModel(moodieAiSettings.geminiModel);
  }, [moodieAiSettings.geminiModel]);

  useEffect(() => {
    setLogoUrl(studioInfo.logo_url || "");
  }, [studioInfo.logo_url]);

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
    expected_updated_at: studioInfo.updated_at,
  };

  const hasStudioChanges =
    studioPayload.name !== (studioInfo.name || "") ||
    studioPayload.hotline !== (studioInfo.hotline || "N/A") ||
    studioPayload.address !== (studioInfo.address || null) ||
    studioPayload.representative !== (studioInfo.representative || null) ||
    studioPayload.logo_url !== (studioInfo.logo_url || null) ||
    studioPayload.timezone !== (studioInfo.timezone || "Asia/Ho_Chi_Minh") ||
    !sameRecord(studioPayload.bank_info, studioInfo.bank_info) ||
    !sameRecord(studioPayload.social_links, studioInfo.social_links) ||
    !sameRecord(studioPayload.working_hours, studioInfo.working_hours);

  const hasMoodieChanges =
    moodieApiKeyInput.trim().length > 0 ||
    moodieGeminiModel.trim() !== moodieAiSettings.geminiModel;
  const hasChanges = hasStudioChanges || hasMoodieChanges;

  async function loadMoodieModels(showToast = false) {
    const overrideKey = moodieApiKeyInput.trim();

    if (!moodieAiSettings.hasGeminiKey && !overrideKey) {
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
  }

  useEffect(() => {
    if (!moodieAiSettings.hasGeminiKey) return;
    void loadMoodieModels();
    // Auto-load once for saved key; manual refresh uses the latest input key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodieAiSettings.hasGeminiKey]);

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
      const tasks: Array<Promise<SaveResult>> = [];

      if (hasStudioChanges) {
        tasks.push(
          updateStudioInfo(studioPayload).then((result): SaveResult =>
            result.success
              ? { section: "Thông tin studio", success: true }
              : {
                  section: "Thông tin studio",
                  success: false,
                  error: result.error || "Lỗi cập nhật",
                },
          ),
        );
      }

      if (hasMoodieChanges) {
        const nextModel = moodieGeminiModel.trim();
        tasks.push(
          updateMoodieAiSettings({
            gemini_api_key: moodieApiKeyInput.trim() || undefined,
            gemini_model:
              nextModel && nextModel !== moodieAiSettings.geminiModel
                ? nextModel
                : undefined,
          }).then((result): SaveResult =>
            result.success
              ? { section: "Moodie AI", success: true }
              : {
                  section: "Moodie AI",
                  success: false,
                  error: result.error || "Lỗi cập nhật",
                },
          ),
        );
      }

      const results = await Promise.all(tasks);
      const failed = results.find((result) => !result.success);

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
      router.refresh();
    });
  }

  const moodieCard = (
    <MoodieAiCard
      settings={moodieAiSettings}
      apiKeyInput={moodieApiKeyInput}
      setApiKeyInput={setMoodieApiKeyInput}
      geminiModel={moodieGeminiModel}
      setGeminiModel={setMoodieGeminiModel}
      modelOptions={moodieModelOptions}
      modelSource={moodieModelSource}
      modelMessage={moodieModelMessage}
      isLoadingModels={isLoadingMoodieModels}
      onRefreshModels={() => void loadMoodieModels(true)}
      disabled={isPending}
    />
  );

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

        <div className="detail-sidebar">
          <GoogleCalendarCard
            isConnected={!!studioInfo.google_calendar_auth}
            onDisconnect={disconnectGoogleCalendar}
          />
          {moodieCard}
          {saveButton}
        </div>
      </div>

      <div className="lg:hidden flex flex-col gap-4">
        <GoogleCalendarCard
          isConnected={!!studioInfo.google_calendar_auth}
          onDisconnect={disconnectGoogleCalendar}
        />
        {moodieCard}
        <div className="flex justify-end">{saveButton}</div>
      </div>
    </div>
  );
}

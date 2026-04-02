"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStudioInfo } from "@/app/actions/settings-mutations";
import { disconnectGoogleCalendar } from "@/app/actions/settings-mutations";
import { Button } from "@/components/ui/button";
import GoogleCalendarCard from "./google-calendar-card";
import StudioIdentitySection from "./studio/studio-identity-section";
import StudioBankSection from "./studio/studio-bank-section";
import StudioSocialSection from "./studio/studio-social-section";
import StudioHoursSection from "./studio/studio-hours-section";
import type { StudioInfo, BankInfo, SocialLinks, WorkingHours } from "@/types/settings";
import { Save, Loader2 } from "lucide-react";

/* ═══════════════════════════════════════════
   Studio Info Form — Admin Settings (Orchestrator)
   State management + save logic only.
   UI delegated to studio/ sub-components.
   ═══════════════════════════════════════════ */

interface StudioInfoFormProps {
  studioInfo: StudioInfo;
}

export default function StudioInfoForm({ studioInfo }: StudioInfoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ─── Flat fields ───
  const [name, setName] = useState(studioInfo.name || "");
  const [hotline, setHotline] = useState(studioInfo.hotline || "");
  const [address, setAddress] = useState(studioInfo.address || "");
  const [representative, setRepresentative] = useState(studioInfo.representative || "");
  const [timezone, setTimezone] = useState(studioInfo.timezone || "Asia/Ho_Chi_Minh");

  // ─── JSONB fields ───
  const [bankInfo, setBankInfo] = useState<BankInfo>(studioInfo.bank_info || {});
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(studioInfo.social_links || {});
  const [workingHours, setWorkingHours] = useState<WorkingHours>(studioInfo.working_hours || {});

  // ─── Logo state ───
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo không được vượt quá 2MB");
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  // ─── Save (optimistic locking via updated_at) ───
  function handleSave() {
    if (!name.trim()) {
      toast.error("Tên studio không được để trống!");
      return;
    }

    startTransition(async () => {
      if (logoFile) {
        // TODO: Upload logo to Supabase Storage
      }

      const result = await updateStudioInfo({
        name: name.trim(),
        hotline: hotline.trim() || "N/A",
        address: address.trim() || null,
        representative: representative.trim() || null,
        timezone,
        bank_info: bankInfo,
        social_links: socialLinks,
        working_hours: workingHours,
        expected_updated_at: studioInfo.updated_at,
      });

      if (result.success) {
        toast.success("Đã cập nhật thông tin studio!");
        router.refresh();
      } else {
        toast.error(result.error || "Lỗi cập nhật!");
      }
    });
  }

  return (
    <div className="px-4 py-4 lg:max-w-2xl lg:mx-auto space-y-4 pb-28 lg:pb-12">
      <StudioIdentitySection
        name={name} setName={setName}
        hotline={hotline} setHotline={setHotline}
        address={address} setAddress={setAddress}
        representative={representative} setRepresentative={setRepresentative}
        timezone={timezone} setTimezone={setTimezone}
        logoUrl={studioInfo.logo_url}
        logoPreview={logoPreview}
        onLogoSelect={handleLogoSelect}
        logoInputRef={logoInputRef}
      />

      <StudioBankSection bankInfo={bankInfo} setBankInfo={setBankInfo} />
      <StudioSocialSection socialLinks={socialLinks} setSocialLinks={setSocialLinks} />
      <StudioHoursSection workingHours={workingHours} setWorkingHours={setWorkingHours} />

      <GoogleCalendarCard
        isConnected={!!studioInfo.google_calendar_auth}
        onDisconnect={disconnectGoogleCalendar}
      />

      {/* ═══ Save Button ═══ */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="gap-1.5"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  );
}

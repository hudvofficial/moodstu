"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import {
  disconnectGoogleCalendar,
  updateStudioInfo,
} from "@/app/actions/settings-mutations";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import GoogleCalendarCard from "./google-calendar-card";
import StudioIdentitySection from "./studio/studio-identity-section";
import StudioBankSection from "./studio/studio-bank-section";
import StudioSocialSection from "./studio/studio-social-section";
import StudioHoursSection from "./studio/studio-hours-section";
import type {
  BankInfo,
  SocialLinks,
  StudioInfo,
  WorkingHours,
} from "@/types/settings";

interface StudioInfoFormProps {
  studioInfo: StudioInfo;
}

export default function StudioInfoForm({ studioInfo }: StudioInfoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(studioInfo.name || "");
  const [hotline, setHotline] = useState(studioInfo.hotline || "");
  const [address, setAddress] = useState(studioInfo.address || "");
  const [representative, setRepresentative] = useState(
    studioInfo.representative || "",
  );
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

  function handleSave() {
    if (!name.trim()) {
      toast.error("Ten studio khong duoc de trong");
      return;
    }

    startTransition(async () => {
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
        toast.success("Da cap nhat thong tin studio");
        router.refresh();
      } else {
        toast.error(result.error || "Loi cap nhat");
      }
    });
  }

  return (
    <div className="main-container pb-28 lg:pb-12">
      <Breadcrumb
        items={[
          { label: "Cai dat", href: "/settings" },
          { label: "Thong tin Studio" },
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
            logoUrl={studioInfo.logo_url}
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
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="gap-1.5 w-full"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isPending ? "Dang luu..." : "Luu thay doi"}
          </Button>
        </div>
      </div>

      <div className="lg:hidden flex flex-col gap-4">
        <GoogleCalendarCard
          isConnected={!!studioInfo.google_calendar_auth}
          onDisconnect={disconnectGoogleCalendar}
        />
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
            {isPending ? "Dang luu..." : "Luu thay doi"}
          </Button>
        </div>
      </div>
    </div>
  );
}

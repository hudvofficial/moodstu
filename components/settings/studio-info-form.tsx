"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateStudioInfo } from "@/app/actions/settings-mutations";
import { disconnectGoogleCalendar } from "@/app/actions/settings-mutations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/ui/select";
import Image from "next/image";
import GoogleCalendarCard from "./google-calendar-card";
import type { StudioInfo, BankInfo, SocialLinks, WorkingHours } from "@/types/settings";
import {
  Building2,
  Landmark,
  Globe,
  Clock,
  Save,
  Loader2,
  Upload,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Studio Info Form — Admin Settings
   V1 logic + V2 JSONB upgrade (bank_info, social_links, working_hours)
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

  // ─── JSONB: Bank Info (V2 upgrade from flat) ───
  const [bankInfo, setBankInfo] = useState<BankInfo>(studioInfo.bank_info || {});

  // ─── JSONB: Social Links (V2 NEW) ───
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(studioInfo.social_links || {});

  // ─── JSONB: Working Hours (V2 upgrade) ───
  const [workingHours, setWorkingHours] = useState<WorkingHours>(studioInfo.working_hours || {});

  // ─── Logo upload ───
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

  // ─── Save (V2: optimistic locking via updated_at) ───
  function handleSave() {
    if (!name.trim()) {
      toast.error("Tên studio không được để trống!");
      return;
    }

    startTransition(async () => {
      // Logo upload first
      if (logoFile) {
        // TODO: Upload logo to Supabase Storage (same pattern as avatar)
        // For now, skip logo upload — will be added when storage bucket is configured
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
        expected_updated_at: studioInfo.updated_at, // Optimistic locking
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
      {/* ═══ Section 1: Studio Identity ═══ */}
      <section className="card-base p-4 lg:p-6">
        <h3 className="section-heading mb-4">
          <Building2 className="w-4 h-4 inline-block mr-1.5 align-middle" />
          Thông tin Studio
        </h3>

        <div className="space-y-3">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-4">
            {/* eslint-disable-next-line react/forbid-elements -- avatar click area */}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative group shrink-0"
            >
              {(logoPreview || studioInfo.logo_url) ? (
                <Image
                  src={logoPreview || studioInfo.logo_url || ""}
                  alt="Logo"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-lg object-contain bg-bg-hover"
                  unoptimized={logoPreview ? true : false}
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-bg-hover flex items-center justify-center">
                  <Upload className="w-5 h-5 text-text-muted" />
                </div>
              )}
              <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </button>
            {/* eslint-disable-next-line react/forbid-elements -- file input needs native */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">Logo</p>
              <p className="text-xs text-text-muted">PNG, SVG, max 2MB</p>
            </div>
          </div>

          {/* Name */}
          <Input
            id="studio-name"
            label="Tên studio *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mood Wedding Studio"
          />

          {/* Hotline + Representative */}
          <div className="form-grid-2col">
            <Input
              id="studio-hotline"
              type="tel"
              label="Hotline"
              value={hotline}
              onChange={(e) => setHotline(e.target.value)}
              placeholder="0934 567 890"
            />
            <Input
              id="studio-representative"
              label="Người đại diện"
              value={representative}
              onChange={(e) => setRepresentative(e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </div>

          {/* Address */}
          <Textarea
            id="studio-address"
            label="Địa chỉ"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            placeholder="123 Đường ABC, Quận 1, TP.HCM"
          />

          {/* Timezone */}
          <CustomSelect
            value={timezone}
            onChange={setTimezone}
            label="Múi giờ"
            options={[
              { value: "Asia/Ho_Chi_Minh", label: "UTC+7 (Hồ Chí Minh)" },
              { value: "Asia/Bangkok", label: "UTC+7 (Bangkok)" },
              { value: "Asia/Singapore", label: "UTC+8 (Singapore)" },
            ]}
          />
        </div>
      </section>

      {/* ═══ Section 2: Bank Info (JSONB V2 upgrade) ═══ */}
      <section className="card-base p-4 lg:p-6">
        <h3 className="section-heading mb-4">
          <Landmark className="w-4 h-4 inline-block mr-1.5 align-middle" />
          Thông tin ngân hàng
        </h3>
        <div className="space-y-3">
          <div className="form-grid-2col">
            <Input
              id="bank-name"
              label="Tên ngân hàng"
              value={bankInfo.bank_name || ""}
              onChange={(e) => setBankInfo({ ...bankInfo, bank_name: e.target.value })}
              placeholder="Vietcombank"
            />
            <Input
              id="bank-branch"
              label="Chi nhánh"
              value={bankInfo.branch || ""}
              onChange={(e) => setBankInfo({ ...bankInfo, branch: e.target.value })}
              placeholder="CN Quận 1"
            />
          </div>
          <div className="form-grid-2col">
            <Input
              id="bank-account-no"
              label="Số tài khoản"
              value={bankInfo.account_number || ""}
              onChange={(e) => setBankInfo({ ...bankInfo, account_number: e.target.value })}
              placeholder="1234567890"
            />
            <Input
              id="bank-account-name"
              label="Tên chủ TK"
              value={bankInfo.account_name || ""}
              onChange={(e) => setBankInfo({ ...bankInfo, account_name: e.target.value })}
              className="uppercase"
              placeholder="NGUYEN VAN A"
            />
          </div>
        </div>
      </section>

      {/* ═══ Section 3: Social Links (V2 NEW) ═══ */}
      <section className="card-base p-4 lg:p-6">
        <h3 className="section-heading mb-4">
          <Globe className="w-4 h-4 inline-block mr-1.5 align-middle" />
          Mạng xã hội
        </h3>
        <div className="space-y-3">
          <Input
            id="social-website"
            type="url"
            label="Website"
            value={socialLinks.website || ""}
            onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
            placeholder="https://moodwedding.com"
          />
          <div className="form-grid-2col">
            <Input
              id="social-facebook"
              type="url"
              label="Facebook"
              value={socialLinks.facebook || ""}
              onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
              placeholder="https://fb.com/moodwedding"
            />
            <Input
              id="social-instagram"
              type="url"
              label="Instagram"
              value={socialLinks.instagram || ""}
              onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
              placeholder="https://instagram.com/moodwedding"
            />
          </div>
        </div>
      </section>

      {/* ═══ Section 4: Working Hours (JSONB V2 upgrade) ═══ */}
      <section className="card-base p-4 lg:p-6">
        <h3 className="section-heading mb-4">
          <Clock className="w-4 h-4 inline-block mr-1.5 align-middle" />
          Giờ làm việc
        </h3>
        <div className="form-grid-2col">
            <Input
              id="hours-weekday"
              label="Thứ 2 — Thứ 6"
              value={workingHours.monday_friday || ""}
              onChange={(e) => setWorkingHours({ ...workingHours, monday_friday: e.target.value })}
              placeholder="8:00 — 17:30"
            />
            <Input
              id="hours-weekend"
              label="Thứ 7 — Chủ nhật"
              value={workingHours.saturday_sunday || ""}
              onChange={(e) => setWorkingHours({ ...workingHours, saturday_sunday: e.target.value })}
              placeholder="9:00 — 16:00"
            />
        </div>
      </section>

      {/* ═══ Section 5: Google Calendar ═══ */}
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

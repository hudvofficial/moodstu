"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/ui/select";
import Image from "next/image";
import { Building2, Upload } from "lucide-react";

/* ═══════════════════════════════════════════
   Studio Identity Section — Logo + Name + Hotline + Address
   Sub-component of StudioInfoForm
   ═══════════════════════════════════════════ */

interface StudioIdentitySectionProps {
  name: string;
  setName: (v: string) => void;
  hotline: string;
  setHotline: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  representative: string;
  setRepresentative: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  logoUrl?: string | null;
  logoPreview: string | null;
  onLogoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function StudioIdentitySection({
  name,
  setName,
  hotline,
  setHotline,
  address,
  setAddress,
  representative,
  setRepresentative,
  timezone,
  setTimezone,
  logoUrl,
  logoPreview,
  onLogoSelect,
  logoInputRef,
}: StudioIdentitySectionProps) {
  return (
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
            {(logoPreview || logoUrl) ? (
              <Image
                src={logoPreview || logoUrl || ""}
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
            onChange={onLogoSelect}
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
  );
}

"use client";

import Image from "next/image";
import { Building2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectForm } from "@/components/ui/select/SelectForm";

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
}: StudioIdentitySectionProps) {
  return (
    <section className="card-base p-4 lg:p-6">
      <h3 className="section-heading mb-4">
        <Building2 className="w-4 h-4 inline-block mr-1.5 align-middle" />
        Thong tin Studio
      </h3>

      <div className="space-y-3">
        <div className="flex items-center gap-4 mb-4">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={64}
              height={64}
              className="w-16 h-16 rounded-lg object-contain bg-bg-hover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-bg-hover flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-text-muted" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-text-primary">Logo</p>
            <p className="text-xs text-text-muted">
              Upload logo tam thoi dang tat cho den khi backend luu file hoan chinh.
            </p>
          </div>
        </div>

        <Input
          id="studio-name"
          label="Ten studio *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mood Wedding Studio"
        />

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
            label="Nguoi dai dien"
            value={representative}
            onChange={(e) => setRepresentative(e.target.value)}
            placeholder="Nguyen Van A"
          />
        </div>

        <Textarea
          id="studio-address"
          label="Dia chi"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          placeholder="123 Duong ABC, Quan 1, TP.HCM"
        />

        <SelectForm
          value={timezone}
          onChange={setTimezone}
          label="Mui gio"
          placeholder="Chon mui gio"
          options={[
            { value: "Asia/Ho_Chi_Minh", label: "UTC+7 (Ho Chi Minh)" },
            { value: "Asia/Bangkok", label: "UTC+7 (Bangkok)" },
            { value: "Asia/Singapore", label: "UTC+8 (Singapore)" },
          ]}
        />
      </div>
    </section>
  );
}

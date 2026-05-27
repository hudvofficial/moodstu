"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "@/lib/toast-manager";
import { Building2, Camera, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectForm } from "@/components/ui/select/SelectForm";

type UploadLogoResult = Promise<{
  success: boolean;
  data?: { url: string };
  error?: string;
}>;

interface StudioIdentitySectionProps {
  name: string;
  setName: (value: string) => void;
  hotline: string;
  setHotline: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  representative: string;
  setRepresentative: (value: string) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  logoUrl?: string | null;
  setLogoUrl: (value: string) => void;
  onUploadLogo: (formData: FormData) => UploadLogoResult;
  disabled?: boolean;
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
  setLogoUrl,
  onUploadLogo,
  disabled = false,
}: StudioIdentitySectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const currentLogo = logoUrl || "";

  async function handleLogoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo không được vượt quá 2MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Chỉ chấp nhận logo JPG, PNG hoặc WEBP");
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);

    setIsUploadingLogo(true);
    const result = await onUploadLogo(formData);
    setIsUploadingLogo(false);

    if (!result.success || !result.data?.url) {
      toast.error(result.error || "Không thể tải logo");
      return;
    }

    setLogoUrl(result.data.url);
    toast.success("Đã tải logo. Bấm Lưu thay đổi để hoàn tất");
  }

  return (
    <section className="card-base p-4 lg:p-6">
      <h3 className="section-heading mb-4">
        <Building2 className="w-4 h-4 inline-block mr-1.5 align-middle" />
        Thông tin studio
      </h3>

      <div className="space-y-3">
        <div className="flex items-center gap-4 mb-4">
          <Button
            type="button"
            variant="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploadingLogo}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-bg-hover p-0 hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-70 group"
          >
            {currentLogo ? (
              <Image
                src={currentLogo}
                alt="Logo studio"
                fill
                sizes="64px"
                className="object-contain p-1"
                unoptimized={currentLogo.startsWith("blob:")}
              />
            ) : (
              <Upload className="w-5 h-5 text-text-muted" />
            )}

            <span
              className={`absolute inset-0 bg-black/35 transition-opacity flex items-center justify-center ${
                isUploadingLogo ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {isUploadingLogo ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </span>
          </Button>
          <Input
            ref={fileInputRef}
            unstyled
            withBaseStyles={false}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleLogoSelect}
            className="hidden"
            disabled={disabled || isUploadingLogo}
          />
          <div>
            <p className="text-sm font-medium text-text-primary">Logo</p>
            <p className="text-xs text-text-muted">
              Bấm vào khung logo để tải ảnh JPG, PNG hoặc WEBP, tối đa 2MB.
            </p>
          </div>
        </div>

        <Input
          id="studio-name"
          label="Tên studio *"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Mood Wedding Studio"
        />

        <div className="form-grid-2col">
          <Input
            id="studio-hotline"
            type="tel"
            label="Hotline"
            value={hotline}
            onChange={(event) => setHotline(event.target.value)}
            placeholder="0934 567 890"
          />
          <Input
            id="studio-representative"
            label="Người đại diện"
            value={representative}
            onChange={(event) => setRepresentative(event.target.value)}
            placeholder="Nguyễn Văn A"
          />
        </div>

        <Textarea
          id="studio-address"
          label="Địa chỉ"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          rows={2}
          placeholder="123 Đường ABC, Quận 1, TP.HCM"
        />

        <SelectForm
          value={timezone}
          onChange={setTimezone}
          label="Múi giờ"
          placeholder="Chọn múi giờ"
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

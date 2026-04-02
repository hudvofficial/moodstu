"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, BadgeCheck, Save, Loader2 } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectForm } from "@/components/ui/select/SelectForm";
import {
  updateProfile,
  uploadAvatar,
  updateAdminProfileFields,
} from "@/app/actions/profile-actions";
import type { EmployeeProfile } from "@/types/settings";
import {
  DEPARTMENT_OPTIONS,
  GENDER_OPTIONS,
} from "@/types/employee-constants";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: EmployeeProfile;
  canManageSettings: boolean;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  profile,
  canManageSettings,
}: EditProfileModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [gender, setGender] = useState(profile.gender || "");
  const [department, setDepartment] = useState(profile.department || "");
  const [position, setPosition] = useState(profile.position || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Anh khong duoc vuot qua 2MB");
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Ten khong duoc de trong");
      return;
    }

    startTransition(async () => {
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const avatarResult = await uploadAvatar(formData);
        if (!avatarResult.success) {
          toast.error(avatarResult.error || "Loi upload anh");
          return;
        }
      }

      const result = await updateProfile({
        full_name: name.trim(),
        phone,
        gender,
      });

      if (!result.success) {
        toast.error(result.error || "Loi cap nhat");
        return;
      }

      if (canManageSettings && profile.id) {
        const deptChanged = department !== (profile.department || "");
        const posChanged = position !== (profile.position || "");

        if (deptChanged || posChanged) {
          const adminResult = await updateAdminProfileFields({
            employee_id: profile.id,
            department,
            position,
          });

          if (!adminResult.success) {
            toast.error(
              adminResult.error || "Loi cap nhat phong ban/chuc vu",
            );
            return;
          }
        }
      }

      toast.success("Da cap nhat ho so");
      router.refresh();
      onClose();
    });
  }

  const currentAvatar = avatarPreview || profile.avatar_url;
  const initials = (profile.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Chinh sua ho so"
      size="md"
      footer={
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Huy
          </Button>
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
            Luu
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line react/forbid-elements -- avatar click area */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
          >
            {currentAvatar ? (
              <Image
                src={currentAvatar}
                alt={name || profile.full_name || "Avatar"}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover shrink-0"
                unoptimized={true}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </button>
          {/* eslint-disable-next-line react/forbid-elements -- file input needs native */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          <p className="text-xs text-text-muted">Bam de doi anh (max 2MB)</p>
        </div>

        <div>
          <h4 className="section-heading mb-3">
            <BadgeCheck className="w-4 h-4 inline-block mr-1.5" />
            Thong tin co ban
          </h4>
          <div className="space-y-3">
            <Input
              id="edit-name"
              label="Ten hien thi *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhap ten..."
            />

            <Input label="Email" value={profile.email || ""} disabled />

            <div className="form-grid-2col">
              <Input
                id="edit-phone"
                label="So dien thoai"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                pattern="[0-9]{10,11}"
                inputMode="tel"
                placeholder="0912345678"
              />
              <SelectForm
                label="Gioi tinh"
                value={gender}
                onChange={setGender}
                placeholder="Chon gioi tinh"
                options={GENDER_OPTIONS as unknown as { label: string; value: string }[]}
              />
            </div>

            {canManageSettings && (
              <div className="form-grid-2col">
                <SelectForm
                  label="Phong ban"
                  value={department}
                  onChange={setDepartment}
                  placeholder="Chon phong ban"
                  options={DEPARTMENT_OPTIONS.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                />
                <Input
                  id="edit-position"
                  label="Chuc vu"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Nhan vien"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}

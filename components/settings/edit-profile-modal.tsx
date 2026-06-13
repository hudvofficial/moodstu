"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import { toast } from "@/lib/toast-manager";
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
  onSaved?: (profile: EmployeeProfile) => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  profile,
  canManageSettings,
  onSaved,
}: EditProfileModalProps) {
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [gender, setGender] = useState(profile.gender || "");
  const [department, setDepartment] = useState(profile.department || "");
  const [position, setPosition] = useState(profile.position || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  function handleAvatarSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 2MB");
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

  // Reset form state when the modal opens with latest profile data. Adjust state
  // during render instead of in an effect to avoid a cascading render. The
  // object-URL cleanup effect above revokes the previous avatarPreview when it
  // changes, so we just clear it here.
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setName(profile.full_name || "");
      setPhone(profile.phone || "");
      setGender(profile.gender || "");
      setDepartment(profile.department || "");
      setPosition(profile.position || "");
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Tên không được để trống");
      return;
    }

    startTransition(async () => {
      let nextAvatarUrl = profile.avatar_url;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const avatarResult = await uploadAvatar(formData);
        if (!avatarResult.success) {
          toast.error(avatarResult.error || "Lỗi tải ảnh");
          return;
        }
        nextAvatarUrl = avatarResult.data.url;
      }

      const profilePromise = updateProfile({
        full_name: name.trim(),
        phone,
        gender,
      });

      const deptChanged = department !== (profile.department || "");
      const posChanged = position !== (profile.position || "");
      const needsAdminUpdate =
        canManageSettings && profile.id && (deptChanged || posChanged);

      const adminPromise = needsAdminUpdate
        ? updateAdminProfileFields({
            employee_id: profile.id,
            department,
            position,
          })
        : null;

      const [result, adminResult] = await Promise.all([
        profilePromise,
        adminPromise,
      ]);

      if (!result.success) {
        toast.error(result.error || "Lỗi cập nhật");
        return;
      }

      if (adminResult && !adminResult.success) {
        toast.error(adminResult.error || "Lỗi cập nhật phòng ban/chức vụ");
        return;
      }

      toast.success("Đã cập nhật hồ sơ");
      onClose();
      onSaved?.({
        ...profile,
        full_name: name.trim(),
        phone,
        gender,
        department,
        position,
        avatar_url: nextAvatarUrl,
      });
    });
  }

  const currentAvatar = avatarPreview || profile.avatar_url;
  const initials = (profile.full_name || "?")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh sửa hồ sơ"
      size="md"
      footer={
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Hủy
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
            Lưu
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
          <p className="text-xs text-text-muted">Bấm để đổi ảnh (tối đa 2MB)</p>
        </div>

        <div>
          <h4 className="section-heading mb-3">
            <BadgeCheck className="w-4 h-4 inline-block mr-1.5" />
            Thông tin cơ bản
          </h4>
          <div className="space-y-3">
            <Input
              id="edit-name"
              label="Tên hiển thị *"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nhập tên..."
            />

            <Input label="Email" value={profile.email || ""} disabled />

            <div className="form-grid-2col">
              <Input
                id="edit-phone"
                label="Số điện thoại"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                pattern="[0-9]{10,11}"
                inputMode="tel"
                placeholder="0912345678"
              />
              <SelectForm
                label="Giới tính"
                value={gender}
                onChange={setGender}
                placeholder="Chọn giới tính"
                options={
                  GENDER_OPTIONS as unknown as { label: string; value: string }[]
                }
              />
            </div>

            {canManageSettings && (
              <div className="form-grid-2col">
                <SelectForm
                  label="Phòng ban"
                  value={department}
                  onChange={setDepartment}
                  placeholder="Chọn phòng ban"
                  options={DEPARTMENT_OPTIONS.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                />
                <Input
                  id="edit-position"
                  label="Chức vụ"
                  value={position}
                  onChange={(event) => setPosition(event.target.value)}
                  placeholder="Nhân viên"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}

"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { updateProfile, uploadAvatar } from "@/app/actions/profile-actions";
import { toast } from "sonner";
import { Camera, BadgeCheck, Landmark, Save, Loader2 } from "lucide-react";
import type { EmployeeProfile } from "@/types/settings";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/select";
import Image from "next/image";

/* ═══════════════════════════════════════════
   Edit Profile Modal — V2 Gold Standard
   V1 logic 100% + SSOT tokens + lucide icons
   ═══════════════════════════════════════════ */

const DEPARTMENTS = [
  "Ban lãnh đạo",
  "PHOTO",
  "MAKEUP",
  "RETOUCH",
  "SALES",
  "LOGISTIC",
  "FREELANCER",
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: EmployeeProfile;
  isAdmin: boolean;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  profile,
  isAdmin,
}: EditProfileModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Form state (V1 proven) ───
  const [name, setName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [gender, setGender] = useState(profile.gender || "");
  const [department, setDepartment] = useState(profile.department || "");
  const [position, setPosition] = useState(profile.position || "");
  const [bankName, setBankName] = useState(profile.bank_name || "");
  const [bankAccountNo, setBankAccountNo] = useState(
    profile.bank_account_no || "",
  );
  const [bankAccountName, setBankAccountName] = useState(
    profile.bank_account_name || "",
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ─── Avatar select (V1 logic with blob cleanup) ───
  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 2MB");
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Save (V1 logic + V2 server actions) ───
  function handleSave() {
    if (!name.trim()) {
      toast.error("Tên không được để trống!");
      return;
    }
    startTransition(async () => {
      // Upload avatar first if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const avatarResult = await uploadAvatar(formData);
        if (!avatarResult.success) {
          toast.error(avatarResult.error || "Lỗi upload ảnh");
          return;
        }
      }

      const result = await updateProfile({
        full_name: name.trim(),
        phone,
        gender,
      });
      if (result.success) {
        toast.success("Đã cập nhật hồ sơ!");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error || "Lỗi cập nhật!");
      }
    });
  }

  // ─── Avatar display ───
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
      title="Chỉnh sửa hồ sơ"
      size="md"
      footer={
        <div className="form-actions">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Huỷ
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
        {/* ═══ Avatar Upload ═══ */}
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line react/forbid-elements -- avatar click area not a standard button */}
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
                <span className="text-xl font-bold text-primary">
                  {initials}
                </span>
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
          <p className="text-xs text-text-muted">Bấm để đổi ảnh (max 2MB)</p>
        </div>

        {/* ═══ Section 1: Thông tin cơ bản ═══ */}
        <div>
          <h4 className="section-heading mb-3">
            <BadgeCheck className="w-4 h-4 inline-block mr-1.5" />
            Thông tin cơ bản
          </h4>
          <div className="space-y-3">
            {/* Name */}
            <Input
              id="edit-name"
              label="Tên hiển thị *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên..."
            />

            {/* Email — read only */}
            <Input
              label="Email"
              value={profile.email || ""}
              disabled
            />

            {/* Phone + Gender — 2 columns */}
            <div className="form-grid-2col">
              <Input
                id="edit-phone"
                label="Số điện thoại"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                pattern="[0-9]{10,11}"
                inputMode="tel"
                placeholder="0912345678"
              />
              <CustomSelect
                label="Giới tính"
                value={gender}
                onChange={setGender}
                searchable={false}
                options={[
                  { label: "Nam", value: "Nam" },
                  { label: "Nữ", value: "Nữ" },
                  { label: "Khác", value: "Khác" },
                ]}
              />
            </div>

            {/* Department + Position — Admin only */}
            {isAdmin && (
              <div className="form-grid-2col">
                <CustomSelect
                  label="Phòng ban"
                  value={department}
                  onChange={setDepartment}
                  searchable={false}
                  options={DEPARTMENTS.map((d) => ({
                    label: d,
                    value: d,
                  }))}
                />
                <Input
                  id="edit-position"
                  label="Chức vụ"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Nhân viên"
                />
              </div>
            )}
          </div>
        </div>

        {/* ═══ Section 2: Thông tin ngân hàng ═══ */}
        <div>
          <h4 className="section-heading mb-3">
            <Landmark className="w-4 h-4 inline-block mr-1.5" />
            Thông tin ngân hàng
          </h4>
          <div className="space-y-3">
            <Input
              id="edit-bank-name"
              label="Tên ngân hàng"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="VD: Vietcombank, MB Bank..."
            />
            <div className="form-grid-2col">
              <Input
                id="edit-bank-no"
                label="Số tài khoản"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                placeholder="Nhập số tài khoản"
              />
              <Input
                id="edit-bank-owner"
                label="Tên chủ tài khoản"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                className="uppercase"
                placeholder="NGUYEN VAN A"
              />
            </div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}

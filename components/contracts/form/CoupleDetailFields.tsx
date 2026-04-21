"use client";

import { Heart, User } from "lucide-react";
import type { ContractFormData } from "@/types/contract-form";
import { Input } from "@/components/ui/input";

// ═══════════════════════════════════════════
// CoupleDetailFields — Bride + Groom info cards
// Extracted from ContractCustomerSection (V2 split)
// Layout: 2 cards side-by-side (desktop) / stacked (mobile)
// Each card: Row1 [Tên + SĐT], Row2 [Cao + Nặng + Size giày]
// ═══════════════════════════════════════════

interface CoupleFieldsProps {
  formData: ContractFormData;
  updateField: <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => void;
}

export function CoupleDetailFields({ formData, updateField }: CoupleFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Cô dâu card */}
      <div className="accent-card accent-card-rose space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 accent-icon-rose" />
          <span className="text-body-sm font-semibold accent-text-rose">
            Thông tin Cô dâu
          </span>
        </div>

        {/* Row 1: Tên + SĐT */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label-base">Họ và tên</label>
            <Input
              type="text"
              value={formData.bride_name}
              onChange={(e) => updateField("bride_name", e.target.value)}
              placeholder="Tên cô dâu"
            />
          </div>
          <div>
            <label className="label-base">Số điện thoại</label>
            <Input
              type="tel"
              value={formData.bride_phone}
              onChange={(e) => updateField("bride_phone", e.target.value)}
              placeholder="09..."
            />
          </div>
        </div>

        {/* Row 2: Cao + Nặng + Size giày */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label-base">Chiều cao</label>
            <div className="input-with-suffix">
              <Input
                type="text"
                inputMode="numeric"
                value={formData.bride_height}
                onChange={(e) => updateField("bride_height", e.target.value)}
                className="input-suffix-field"
              />
              <span className="input-suffix">cm</span>
            </div>
          </div>
          <div>
            <label className="label-base">Cân nặng</label>
            <div className="input-with-suffix">
              <Input
                type="text"
                inputMode="numeric"
                value={formData.bride_weight}
                onChange={(e) => updateField("bride_weight", e.target.value)}
                className="input-suffix-field"
              />
              <span className="input-suffix">kg</span>
            </div>
          </div>
          <div>
            <label className="label-base">Size giày</label>
            <Input
              type="text"
              inputMode="numeric"
              value={formData.bride_shoe_size}
              onChange={(e) => updateField("bride_shoe_size", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Chú rể card */}
      <div className="accent-card accent-card-sky space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 accent-icon-sky" />
          <span className="text-body-sm font-semibold accent-text-sky">
            Thông tin Chú rể
          </span>
        </div>

        {/* Row 1: Tên + SĐT */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label-base">Họ và tên</label>
            <Input
              type="text"
              value={formData.groom_name}
              onChange={(e) => updateField("groom_name", e.target.value)}
              placeholder="Tên chú rể"
            />
          </div>
          <div>
            <label className="label-base">Số điện thoại</label>
            <Input
              type="tel"
              value={formData.groom_phone}
              onChange={(e) => updateField("groom_phone", e.target.value)}
              placeholder="09..."
            />
          </div>
        </div>

        {/* Row 2: Cao + Nặng + Size giày */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="label-base">Chiều cao</label>
            <div className="input-with-suffix">
              <Input
                type="text"
                inputMode="numeric"
                value={formData.groom_height}
                onChange={(e) => updateField("groom_height", e.target.value)}
                className="input-suffix-field"
              />
              <span className="input-suffix">cm</span>
            </div>
          </div>
          <div>
            <label className="label-base">Cân nặng</label>
            <div className="input-with-suffix">
              <Input
                type="text"
                inputMode="numeric"
                value={formData.groom_weight}
                onChange={(e) => updateField("groom_weight", e.target.value)}
                className="input-suffix-field"
              />
              <span className="input-suffix">kg</span>
            </div>
          </div>
          <div>
            <label className="label-base">Size giày</label>
            <Input
              type="text"
              inputMode="numeric"
              value={formData.groom_shoe_size}
              onChange={(e) => updateField("groom_shoe_size", e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

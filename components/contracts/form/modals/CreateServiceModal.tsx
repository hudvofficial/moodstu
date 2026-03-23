"use client";

import { useState, useCallback } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { quickCreateService } from "@/app/actions/category-actions";
import { Loader2 } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SimpleSelect } from "@/components/ui/simple-select";

// ═══════════════════════════════════════════
// CreateServiceModal — Quick create service from ItemModal
// Minimal fields: name, type, price
// ═══════════════════════════════════════════

const SERVICE_TYPES = [
  { value: "chup_anh", label: "Chụp ảnh" },
  { value: "quay_phim", label: "Quay phim" },
  { value: "makeup", label: "Makeup" },
  { value: "trang_phuc", label: "Trang phục" },
  { value: "dich_vu", label: "Dịch vụ khác" },
  { value: "san_pham", label: "Sản phẩm" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (service: { id: string; service_name: string; selling_price: number; service_type: string }) => void;
}

export function CreateServiceModal({ isOpen, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("chup_anh");
  const [price, setPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError("Tên dịch vụ là bắt buộc");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await quickCreateService({
        service_name: name,
        service_type: type,
        selling_price: price,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onCreated(result.data);
      setName("");
      setPrice(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo dịch vụ");
    } finally {
      setIsSubmitting(false);
    }
  }, [name, type, price, onCreated]);

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="Tạo dịch vụ mới">
      <div className="space-y-4 p-4">
        <div>
          <label className="label-base">Tên dịch vụ *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            placeholder="VD: Chụp ảnh cưới cao cấp"
            className="input-base"
            autoFocus
          />
        </div>

        <div className="form-grid-2col">
          <SimpleSelect
            value={type}
            onChange={(v) => setType(v)}
            options={SERVICE_TYPES}
            label="Loại dịch vụ"
          />
          <div>
            <label className="label-base">Giá bán ({CURRENCY_SYMBOL})</label>
            <CurrencyInput
              value={price}
              onChange={setPrice}
            />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-interactive"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Tạo dịch vụ
          </button>
        </div>
      </div>
    </UnifiedModal>
  );
}

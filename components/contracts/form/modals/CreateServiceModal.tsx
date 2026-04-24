"use client";

import { useState, useCallback } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { quickCreateService } from "@/app/actions/category-actions";
import { Loader2 } from "lucide-react";
import { CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SERVICE_TYPES, SERVICE_TYPE_LABELS } from "@/types/service-constants";
import type { ItemType } from "@/types/contract";

// ═══════════════════════════════════════════
// CreateServiceModal — Quick create service from ItemModal
// Minimal fields: name, type, price
// ═══════════════════════════════════════════

type QuickCreateItemType = Exclude<ItemType, "trang_phuc" | "phat_sinh">;

const SERVICE_TYPE_OPTIONS = SERVICE_TYPES.map((type) => ({
  value: type,
  label: SERVICE_TYPE_LABELS[type],
}));

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemType: QuickCreateItemType;
  onCreated: (service: { id: string; service_name: string; selling_price: number; service_type: string; unit?: string | null }) => void;
}

export function CreateServiceModal({ isOpen, onClose, itemType, onCreated }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("khac");
  const [price, setPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const title = itemType === "san_pham" ? "Tạo sản phẩm mới" : "Tạo dịch vụ mới";

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
        item_type: itemType,
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
  }, [itemType, name, type, price, onCreated]);

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 p-4">
        <div>
          <label className="label-base">Tên dịch vụ *</label>
          <Input unstyled
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
            options={SERVICE_TYPE_OPTIONS}
            label="Nhóm dịch vụ"
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
          <Button unstyled type="button" onClick={onClose} className="btn btn-ghost">
            Hủy
          </Button>
          <Button unstyled
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn btn-interactive"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {itemType === "san_pham" ? "Tạo sản phẩm" : "Tạo dịch vụ"}
          </Button>
        </div>
      </div>
    </UnifiedModal>
  );
}

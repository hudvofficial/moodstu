"use client";

import { useState, useCallback } from "react";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { ContractItemFormData } from "@/types/contract-form";
import type { AddonCategory } from "@/types/addon-history";
import { SimpleSelect } from "@/components/ui/simple-select";

// ═══════════════════════════════════════════
// AddonItemForm — Free-text addon with category
// Used for phụ thu, extra charges
// ═══════════════════════════════════════════

const ADDON_CATEGORIES: { value: AddonCategory; label: string }[] = [
  { value: "makeup", label: "Makeup" },
  { value: "trang_phuc", label: "Trang phục" },
  { value: "phu_kien", label: "Phụ kiện" },
  { value: "them_gio", label: "Thêm giờ" },
  { value: "khac", label: "Khác" },
];

interface Props {
  isEditing: boolean;
  editingItem?: ContractItemFormData;
  onAdd: (item: Omit<ContractItemFormData, "_tempId">) => void;
  onEdit: (item: Partial<ContractItemFormData>) => void;
  onClose: () => void;
}

export function AddonItemForm({ isEditing, editingItem, onAdd, onEdit, onClose }: Props) {
  const [name, setName] = useState(editingItem?.item_name || "");
  const [category, setCategory] = useState<AddonCategory>(
    (editingItem?.addon_category as AddonCategory) || "khac"
  );
  const [qty, setQty] = useState(editingItem?.quantity || 1);
  const [price, setPrice] = useState(editingItem?.unit_price || 0);
  const [discount, setDiscount] = useState(editingItem?.discount_amount || 0);
  const [notes, setNotes] = useState(editingItem?.notes || "");
  const [error, setError] = useState("");

  const total = Math.max(0, qty * price - discount);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setError("Tên phụ thu là bắt buộc");
      return;
    }

    if (isEditing) {
      onEdit({
        item_name: name.trim(),
        addon_category: category,
        quantity: qty,
        unit_price: price,
        discount_amount: discount,
        total_amount: total,
        notes,
      });
    } else {
      onAdd({
        service_id: null,
        inventory_item_id: null,
        item_name: name.trim(),
        quantity: qty,
        unit_price: price,
        original_price: price,
        discount_amount: discount,
        total_amount: total,
        type: category === "trang_phuc" ? "trang_phuc" : "phat_sinh",
        export_type: category === "trang_phuc" ? "xuat_thue" : null,
        is_addon: true,
        addon_category: category,
        notes,
      });
    }
    onClose();
  }, [name, category, qty, price, discount, total, notes, isEditing, onAdd, onEdit, onClose]);

  return (
    <div className="space-y-4 p-4">
      {/* Name */}
      <div>
        <label className="label-base">Tên phụ thu *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder="VD: Thêm 1 bộ vest, Makeup cô dâu..."
          className="input-base"
          autoFocus
        />
        {error && <p className="error-text">{error}</p>}
      </div>

      <SimpleSelect
        value={category}
        onChange={(v) => setCategory(v as AddonCategory)}
        options={ADDON_CATEGORIES}
        label="Danh mục"
      />

      {/* Qty + Price + Discount */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label-base">Số lượng</label>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} className="input-base" />
        </div>
        <div>
          <label className="label-base">Đơn giá</label>
          <CurrencyInput value={price} onChange={setPrice} />
        </div>
        <div>
          <label className="label-base">Giảm giá</label>
          <CurrencyInput value={discount} onChange={setDiscount} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label-base">Ghi chú</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ghi chú thêm..."
          className="input-base"
        />
      </div>

      {/* Total */}
      <p className="form-total">
        Thành tiền: {formatCurrency(total)} {CURRENCY_SYMBOL}
      </p>

      {/* Actions */}
      <div className="form-actions">
        <button type="button" onClick={onClose} className="btn btn-ghost">
          Hủy
        </button>
        <button type="button" onClick={handleSubmit} className="btn btn-interactive">
          {isEditing ? "Lưu" : "Thêm phụ thu"}
        </button>
      </div>
    </div>
  );
}

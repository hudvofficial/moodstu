"use client";

import { useState, useCallback, useEffect } from "react";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { ContractItemFormData } from "@/types/contract-form";
import type { AddonCategory } from "@/types/addon-history";
import { searchAddonHistory, type AddonHistoryItem } from "@/app/actions/addon-actions";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [suggestions, setSuggestions] = useState<AddonHistoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const total = Math.max(0, qty * price - discount);
  const visibleSuggestions =
    showSuggestions && name.trim().length >= 2 ? suggestions : [];

  useEffect(() => {
    if (isEditing || name.trim().length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      const result = await searchAddonHistory(name.trim(), category);
      setSuggestions(result);
      setShowSuggestions(result.length > 0);
    }, 250);

    return () => clearTimeout(timer);
  }, [category, isEditing, name]);

  const applySuggestion = useCallback((item: AddonHistoryItem) => {
    setName(item.addon_name);
    setCategory(item.addon_category as AddonCategory);
    setPrice(item.last_price || 0);
    setShowSuggestions(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setError("Tên phụ thu là bắt buộc");
      return;
    }

    if (isEditing) {
      onEdit({
        service_id: null,
        dress_id: null,
        item_name: name.trim(),
        type: "phat_sinh",
        export_type: null,
        is_addon: true,
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
        dress_id: null,
        item_name: name.trim(),
        quantity: qty,
        unit_price: price,
        original_price: price,
        discount_amount: discount,
        total_amount: total,
        type: "phat_sinh",
        export_type: null,
        is_addon: true,
        addon_category: category,
        notes,
      });
    }
    setShowSuggestions(false);
    onClose();
  }, [name, category, qty, price, discount, total, notes, isEditing, onAdd, onEdit, onClose]);

  return (
    <div className="space-y-4 p-4">
      {/* Name */}
      <div>
        <label className="label-base">Tên phụ thu *</label>
        <Input unstyled
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(name.trim().length >= 2 && suggestions.length > 0)}
          placeholder="VD: Thêm 1 bộ vest, Makeup cô dâu..."
          className="input-base"
          autoFocus
        />
        {visibleSuggestions.length > 0 && (
          <div className="mt-1 max-h-36 overflow-y-auto rounded-radius-md border border-border-light bg-bg-card shadow-sm">
            {visibleSuggestions.map((item) => (
              <Button
                unstyled
                key={item.id}
                type="button"
                onClick={() => applySuggestion(item)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-body-sm hover:bg-bg-hover"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-text-primary">
                  {item.addon_name}
                </span>
                <span className="shrink-0 text-caption text-text-muted">
                  {formatCurrency(item.last_price || 0)} {CURRENCY_SYMBOL} - {item.usage_count || 0}x
                </span>
              </Button>
            ))}
          </div>
        )}
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
          <Input unstyled type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} className="input-base" />
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
        <Input unstyled
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
        <Button unstyled type="button" onClick={onClose} className="btn btn-ghost">
          Hủy
        </Button>
        <Button unstyled type="button" onClick={handleSubmit} className="btn btn-interactive">
          {isEditing ? "Lưu" : "Thêm phụ thu"}
        </Button>
      </div>
    </div>
  );
}

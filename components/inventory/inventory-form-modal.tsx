"use client";

/**
 * 📦 InventoryFormModal — Create / Edit inventory item
 * Clone: contracts/contract-form pattern
 * Uses: UnifiedModal + SelectForm (form, NOT SelectPill) + CurrencyInput
 * SSOT: .input-base, .label-base, .form-grid-2col, .error-text
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { SelectForm } from "@/components/ui/select/SelectForm";
import { CurrencyInput } from "@/components/ui/currency-input";
import { revalidateInventory } from "@/lib/hooks/use-inventory";
import { createInventoryItem, updateInventoryItem } from "@/app/actions/inventory-mutations";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  type InventoryCategory,
  type InventoryUnit,
} from "@/lib/validations/inventory.schema";
import { INVENTORY_CATEGORY_MAP, INVENTORY_UNIT_MAP } from "@/types/inventory-constants";
import type { InventoryItem } from "@/types/inventory";

// ── Options ──────────────────────────
const CATEGORY_OPTIONS = INVENTORY_CATEGORIES.map((v) => ({
  value: v,
  label: INVENTORY_CATEGORY_MAP[v]?.label || v,
}));

const UNIT_OPTIONS = INVENTORY_UNITS.map((v) => ({
  value: v,
  label: INVENTORY_UNIT_MAP[v] || v,
}));

// ── Props ────────────────────────────
interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: InventoryItem | null;
}

export function InventoryFormModal({ isOpen, onClose, editItem }: InventoryFormModalProps) {
  const isEdit = !!editItem;
  const [isPending, startTransition] = useTransition();

  // ── Form state ──
  const [name, setName] = useState(editItem?.name || "");
  const [category, setCategory] = useState<InventoryCategory | "">(
    (editItem?.category as InventoryCategory) || ""
  );
  const [unit, setUnit] = useState<InventoryUnit | "">(
    (editItem?.unit as InventoryUnit) || ""
  );
  const [minStock, setMinStock] = useState(editItem?.min_stock || 0);
  const [purchasePrice, setPurchasePrice] = useState(editItem?.purchase_price || 0);
  const [salePrice, setSalePrice] = useState(editItem?.sale_price || 0);
  const [supplier, setSupplier] = useState(editItem?.supplier || "");
  const [notes, setNotes] = useState(editItem?.notes || "");
  const [error, setError] = useState("");

  // ── Submit ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Tên vật tư là bắt buộc"); return; }
    if (!category) { setError("Vui lòng chọn phân loại"); return; }
    if (!unit) { setError("Vui lòng chọn đơn vị"); return; }

    setError("");
    startTransition(async () => {
      const formData = {
        name: name.trim(),
        category,
        unit,
        min_stock: minStock,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const result = isEdit
        ? await updateInventoryItem({ id: editItem.id, updated_at: editItem.updated_at, data: formData })
        : await createInventoryItem(formData);

      if (result && 'success' in result && result.success) {
        toast.success(isEdit ? "Đã cập nhật vật tư" : "Đã tạo vật tư mới");
        await revalidateInventory();
        onClose();
      } else {
        const errMsg = (result && 'error' in result) ? result.error : "Có lỗi xảy ra";
        setError(typeof errMsg === 'string' ? errMsg : "Có lỗi xảy ra");
      }
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Sửa vật tư" : "Khai báo vật tư mới"}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary" disabled={isPending}>
            Hủy
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="error-text">{error}</p>}

        {/* Tên vật tư */}
        <div>
          <label className="label-base">Tên vật tư *</label>
          <input
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Album cưới 30x40"
          />
        </div>

        {/* Category + Unit (2 cột) */}
        <div className="form-grid-2col">
          <div>
            <label className="label-base">Phân loại *</label>
            <SelectForm
              value={category}
              onChange={(v) => setCategory(v as InventoryCategory)}
              placeholder="Chọn phân loại"
              options={CATEGORY_OPTIONS}
            />
          </div>
          <div>
            <label className="label-base">Đơn vị *</label>
            <SelectForm
              value={unit}
              onChange={(v) => setUnit(v as InventoryUnit)}
              placeholder="Chọn đơn vị"
              options={UNIT_OPTIONS}
            />
          </div>
        </div>

        {/* Tồn kho tối thiểu */}
        <div>
          <label className="label-base">Tồn kho tối thiểu</label>
          <input
            className="input-base"
            type="number"
            min={0}
            value={minStock}
            onChange={(e) => setMinStock(Number(e.target.value))}
          />
        </div>

        {/* Giá (2 cột) */}
        <div className="form-grid-2col">
          <div>
            <label className="label-base">Giá nhập</label>
            <CurrencyInput value={purchasePrice} onChange={setPurchasePrice} />
          </div>
          <div>
            <label className="label-base">Giá bán</label>
            <CurrencyInput value={salePrice} onChange={setSalePrice} />
          </div>
        </div>

        {/* Nhà cung cấp */}
        <div>
          <label className="label-base">Nhà cung cấp</label>
          <input
            className="input-base"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="VD: Công ty ABC"
          />
        </div>

        {/* Ghi chú */}
        <div>
          <label className="label-base">Ghi chú</label>
          <textarea
            className="input-base min-h-[80px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú thêm..."
          />
        </div>
      </form>
    </UnifiedModal>
  );
}

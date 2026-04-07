"use client";

/**
 * 📥 StockInModal — Nhập kho vật tư
 * Uses: UnifiedModal + CurrencyInput
 * Action: stockIn() → updates current_stock + average_unit_price
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import { revalidateInventory } from "@/lib/hooks/use-inventory";
import { stockIn } from "@/app/actions/inventory-mutations";
import type { InventoryItem } from "@/types/inventory";

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
  items?: InventoryItem[];
}

export function StockInModal({ isOpen, onClose, item, items }: StockInModalProps) {
  const [isPending, startTransition] = useTransition();
  const [pickedItem, setPickedItem] = useState<InventoryItem | null>(null);
  const activeItem = item || pickedItem;

  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [supplier, setSupplier] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");



  const handleSubmit = () => {
    if (!activeItem) return;
    if (quantity < 1) { setError("Số lượng phải ≥ 1"); return; }

    setError("");
    startTransition(async () => {
      const result = await stockIn({
        itemId: activeItem.id,
        quantity,
        unitCost,
        supplier: supplier.trim() || undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (result && 'success' in result && result.success) {
        toast.success(`Đã nhập ${quantity} ${activeItem.name} vào kho`);
        await revalidateInventory();
        onClose();
      } else {
        setError((result && 'error' in result && typeof result.error === 'string') ? result.error : "Không thể nhập kho");
      }
    });
  };

  if (!isOpen) return null;

  // Item picker options
  const itemOptions = (items || []).map(i => ({ value: i.id, label: `${i.item_code} — ${i.name}` }));

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhập kho"
      description={activeItem ? `${activeItem.name} (${activeItem.item_code}) — Tồn: ${activeItem.current_stock}` : "Chọn vật tư cần nhập kho"}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary" disabled={isPending}>
            Hủy
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang xử lý..." : "Xác nhận nhập kho"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="error-text">{error}</p>}

        {/* Item Picker — chỉ hiện khi chưa có item */}
        {!activeItem && (
          <div>
            <ComboboxSearch
              label="Chọn vật tư *"
              onChange={(id) => {
                const found = items?.find(i => i.id === id) || null;
                setPickedItem(found);
                if (found) {
                  setUnitCost(found.purchase_price || 0);
                  setSupplier(found.supplier || "");
                }
              }}
              options={itemOptions}
              placeholder="Tìm và chọn vật tư..."
            />
          </div>
        )}

        {/* Form fields — chỉ hiện khi đã có item */}
        {activeItem && (
          <>
        <div className="form-grid-2col">
          <div>
            <label className="label-base">Số lượng *</label>
            <input
              className="input-base"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label-base">Đơn giá nhập</label>
            <CurrencyInput value={unitCost} onChange={setUnitCost} />
          </div>
        </div>

        <div>
          <label className="label-base">Nhà cung cấp</label>
          <input
            className="input-base"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="VD: Công ty ABC"
          />
        </div>

        <div>
          <label className="label-base">Lý do nhập</label>
          <input
            className="input-base"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Bổ sung hàng tháng 3"
          />
        </div>

        <div>
          <label className="label-base">Ghi chú</label>
          <textarea
            className="input-base min-h-15"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thông tin thêm..."
          />
        </div>
          </>
        )}
      </form>
    </UnifiedModal>
  );
}

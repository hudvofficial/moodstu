"use client";

/**
 * 📤 StockOutModal — Xuất kho vật tư
 * Uses: UnifiedModal
 * Action: stockOut() → decreases current_stock + warns if low
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import { revalidateInventory } from "@/lib/hooks/use-inventory";
import { stockOut } from "@/app/actions/inventory-mutations";
import type { InventoryItem } from "@/types/inventory";

interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
  items?: InventoryItem[];
}

export function StockOutModal({ isOpen, onClose, item, items }: StockOutModalProps) {
  const [isPending, startTransition] = useTransition();
  const [pickedItem, setPickedItem] = useState<InventoryItem | null>(null);
  const activeItem = item || pickedItem;

  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");



  const handleSubmit = () => {
    if (!activeItem) return;
    if (quantity < 1) { setError("Số lượng phải ≥ 1"); return; }
    if (quantity > activeItem.current_stock) {
      setError(`Không đủ tồn kho! Hiện có: ${activeItem.current_stock}`);
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await stockOut({
        itemId: activeItem.id,
        quantity,
        reason: reason.trim() || undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (result && 'success' in result && result.success) {
        toast.success(`Đã xuất ${quantity} ${activeItem.name}`);
        // Show low stock warning (from server)
        if ('warning' in result && result.warning) {
          toast.warning(result.warning as string);
        }
        await revalidateInventory();
        onClose();
      } else {
        setError((result && 'error' in result && typeof result.error === 'string') ? result.error : "Không thể xuất kho");
      }
    });
  };

  if (!isOpen) return null;

  const itemOptions = (items || []).map(i => ({ value: i.id, label: `${i.item_code} — ${i.name}` }));

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Xuất kho"
      description={activeItem ? `${activeItem.name} (${activeItem.item_code}) — Tồn: ${activeItem.current_stock}` : "Chọn vật tư cần xuất kho"}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary" disabled={isPending}>
            Hủy
          </button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={isPending}>
            {isPending ? "Đang xử lý..." : "Xác nhận xuất kho"}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="error-text">{error}</p>}

        {/* Item Picker */}
        {!activeItem && (
          <div>
            <ComboboxSearch
              label="Chọn vật tư *"
              onChange={(id) => setPickedItem(items?.find(i => i.id === id) || null)}
              options={itemOptions}
              placeholder="Tìm và chọn vật tư..."
            />
          </div>
        )}

        {activeItem && (
          <>
        {/* Cảnh báo nếu sắp hết stock */}
        {activeItem.min_stock && activeItem.current_stock <= activeItem.min_stock && (
          <div className="bg-warning/10 text-warning text-sm font-medium px-4 py-2.5 rounded-xl">
            ⚠️ Tồn kho thấp! Hiện có: {activeItem.current_stock} (Tối thiểu: {activeItem.min_stock})
          </div>
        )}

        <div>
          <label className="label-base">Số lượng xuất *</label>
          <input
            className="input-base"
            type="number"
            min={1}
            max={activeItem.current_stock}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <p className="text-xs text-text-muted mt-1">
            Tối đa: {activeItem.current_stock}
          </p>
        </div>

        <div>
          <label className="label-base">Lý do xuất</label>
          <input
            className="input-base"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Dùng cho HĐ #HD-001"
          />
        </div>

        <div className="form-grid-2col">
          <div>
            <label className="label-base">Tên khách hàng</label>
            <input
              className="input-base"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="(tùy chọn)"
            />
          </div>
          <div>
            <label className="label-base">SĐT</label>
            <input
              className="input-base"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(tùy chọn)"
            />
          </div>
        </div>

        <div>
          <label className="label-base">Ghi chú</label>
          <textarea
            className="input-base min-h-[60px]"
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

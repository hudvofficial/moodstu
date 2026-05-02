"use client";

/**
 * 📤 StockOutModal — Xuất kho vật tư
 * Uses: UnifiedModal
 * Action: stockOut() → decreases current_stock + warns if low
 */

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { invalidateInventoryAfterWrite } from "@/lib/cache-invalidation";
import { stockOut } from "@/app/actions/inventory-mutations";
import { fetchInventoryPickerItems } from "@/app/actions/inventory-queries";
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
  const [pickerItems, setPickerItems] = useState<InventoryItem[]>(items || []);
  const [pickerSearch, setPickerSearch] = useState("");
  const debouncedPickerSearch = useDebounce(pickerSearch, 300);

  useEffect(() => {
    if (!isOpen || item) return;
    let cancelled = false;
    fetchInventoryPickerItems({
      search: debouncedPickerSearch,
      limit: 30,
      activeOnly: true,
    })
      .then((data) => {
        if (!cancelled) setPickerItems(data.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không thể tải vật tư");
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedPickerSearch, isOpen, item, items]);

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!activeItem) return;
    if (activeItem.status !== "active") {
      setError("Vật tư đã ngưng, không thể xuất kho");
      return;
    }
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

      if (result && "success" in result && result.success) {
        toast.success(`Đã xuất ${quantity} ${activeItem.name}`);
        if (result.data?.warning) {
          toast.warning(result.data.warning);
        }
        onClose();
        void invalidateInventoryAfterWrite(activeItem.id);
      } else {
        setError(
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Không thể xuất kho",
        );
      }
    });
  };

  if (!isOpen) return null;

  const itemOptions = pickerItems.map(i => ({ value: i.id, label: `${i.item_code} — ${i.name}` }));

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Xuất kho"
      description={activeItem ? `${activeItem.name} (${activeItem.item_code}) — Tồn: ${activeItem.current_stock}` : "Chọn vật tư cần xuất kho"}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Đang xử lý..." : "Xác nhận xuất kho"}
          </Button>
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
              onChange={(id) => setPickedItem(pickerItems.find(i => i.id === id) || null)}
              onSearchChange={setPickerSearch}
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
          <Input
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
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Dùng cho HĐ #HD-001"
          />
        </div>

        <div className="form-grid-2col">
          <div>
            <label className="label-base">Tên khách hàng</label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="(tùy chọn)"
            />
          </div>
          <div>
            <label className="label-base">SĐT</label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(tùy chọn)"
            />
          </div>
        </div>

        <div>
          <label className="label-base">Ghi chú</label>
          <Textarea
            className="min-h-15"
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

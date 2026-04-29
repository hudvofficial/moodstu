"use client";

/**
 * 📥 StockInModal — Nhập kho vật tư
 * Uses: UnifiedModal + CurrencyInput
 * Action: stockIn() → updates current_stock + average_unit_price
 */

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ComboboxSearch } from "@/components/ui/combobox-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { revalidateInventory } from "@/lib/hooks/use-inventory";
import { stockIn } from "@/app/actions/inventory-mutations";
import { fetchInventoryPickerItems } from "@/app/actions/inventory-queries";
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
      setError("Vật tư đã ngưng, không thể nhập kho");
      return;
    }
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

      if (result && "success" in result && result.success) {
        toast.success(`Đã nhập ${quantity} ${activeItem.name} vào kho`);
        await revalidateInventory();
        onClose();
      } else {
        setError(
          result && "error" in result && typeof result.error === "string"
            ? result.error
            : "Không thể nhập kho",
        );
      }
    });
  };

  if (!isOpen) return null;

  // Item picker options
  const itemOptions = pickerItems.map(i => ({ value: i.id, label: `${i.item_code} — ${i.name}` }));

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nhập kho"
      description={activeItem ? `${activeItem.name} (${activeItem.item_code}) — Tồn: ${activeItem.current_stock}` : "Chọn vật tư cần nhập kho"}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Đang xử lý..." : "Xác nhận nhập kho"}
          </Button>
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
                const found = pickerItems.find(i => i.id === id) || null;
                setPickedItem(found);
                if (found) {
                  setUnitCost(found.purchase_price || 0);
                  setSupplier(found.supplier || "");
                }
              }}
              onSearchChange={setPickerSearch}
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
            <Input
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
          <Input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="VD: Công ty ABC"
          />
        </div>

        <div>
          <label className="label-base">Lý do nhập</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Bổ sung hàng tháng 3"
          />
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

"use client";

import { useState, useCallback } from "react";
import { Trash2, Package, Plus } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatVnd } from "@/components/finance/finance-format";
import type { SaleItem } from "@/app/actions/receipt-actions";

// ═══════════════════════════════════════════
// Sale Item Selector — For "Bán vật tư" receipt type
// Allows selecting inventory items + quantity for sale
// ═══════════════════════════════════════════

export interface InventoryOptionItem {
  id: string;
  name: string;
  item_code: string;
  current_stock: number;
  sale_price: number;
  unit: string | null;
}

interface SaleItemSelectorProps {
  items: SaleItem[];
  onChange: (items: SaleItem[]) => void;
  inventoryOptions: InventoryOptionItem[];
  onTotalChange?: (total: number) => void;
}

export function SaleItemSelector({ items, onChange, inventoryOptions, onTotalChange }: SaleItemSelectorProps) {
  const [selectedItemId, setSelectedItemId] = useState("");

  const selectOptions = inventoryOptions
    .filter((inv) => !items.some((si) => si.item_id === inv.id))
    .map((inv) => ({
      value: inv.id,
      label: `${inv.item_code} — ${inv.name} (tồn: ${inv.current_stock}${inv.unit ? ` ${inv.unit}` : ""})`,
    }));

  const recalcTotal = useCallback((list: SaleItem[]) => {
    const total = list.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
    onTotalChange?.(total);
  }, [onTotalChange]);

  const addItem = useCallback(() => {
    if (!selectedItemId) return;
    const inv = inventoryOptions.find((i) => i.id === selectedItemId);
    if (!inv) return;

    const newItems: SaleItem[] = [
      ...items,
      {
        item_id: inv.id,
        item_name: inv.name,
        quantity: 1,
        unit_cost: inv.sale_price || 0,
      },
    ];
    onChange(newItems);
    recalcTotal(newItems);
    setSelectedItemId("");
  }, [selectedItemId, items, inventoryOptions, onChange, recalcTotal]);

  const removeItem = useCallback(
    (index: number) => {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
      recalcTotal(newItems);
    },
    [items, onChange, recalcTotal],
  );

  const updateQuantity = useCallback(
    (index: number, qty: number) => {
      const inv = inventoryOptions.find((o) => o.id === items[index].item_id);
      const maxStock = inv?.current_stock || 999;
      const safeQty = Math.max(1, Math.min(qty, maxStock));
      const newItems = items.map((item, i) => (i === index ? { ...item, quantity: safeQty } : item));
      onChange(newItems);
      recalcTotal(newItems);
    },
    [items, inventoryOptions, onChange, recalcTotal],
  );

  const updateUnitCost = useCallback(
    (index: number, cost: number) => {
      const newItems = items.map((item, i) => (i === index ? { ...item, unit_cost: cost } : item));
      onChange(newItems);
      recalcTotal(newItems);
    },
    [items, onChange, recalcTotal],
  );

  return (
    <div className="card-base border-dashed p-4 space-y-3">
      <div className="flex items-center gap-2 text-body-sm font-semibold text-text-primary">
        <Package className="w-4 h-4 text-primary" />
        Vật tư bán ra
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <SimpleSelect
            value={selectedItemId}
            onChange={setSelectedItemId}
            options={selectOptions}
            placeholder="Tìm vật tư..."
          />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addItem} disabled={!selectedItemId} className="gap-1">
          <Plus className="w-3.5 h-3.5" />
          Thêm
        </Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => {
            const inv = inventoryOptions.find((o) => o.id === item.item_id);
            const lineTotal = item.quantity * item.unit_cost;
            return (
              <div key={item.item_id} className="bg-elevated rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-body-sm font-medium truncate">{item.item_name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="h-8 w-8 text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="form-grid-2col">
                  <div>
                    <label className="text-caption text-text-secondary mb-1 block">
                      SL {inv ? `(tồn: ${inv.current_stock})` : ""}
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        updateQuantity(index, digits ? Number(digits) : 1);
                      }}
                      onBlur={(e) => updateQuantity(index, parseInt(e.currentTarget.value, 10) || 1)}
                      className="w-full tabular-nums"
                    />
                  </div>
                  <CurrencyInput
                    label="Đơn giá"
                    value={item.unit_cost}
                    onChange={(v) => updateUnitCost(index, v)}
                  />
                </div>
                <div className="flex justify-end mt-2 text-body-sm font-medium text-text-primary tabular-nums min-w-24">
                  = {formatVnd(lineTotal)}
                </div>
              </div>
            );
          })}
          <div className="flex justify-between items-center pt-2 border-t border-border text-body font-bold">
            <span>Tổng cộng</span>
            <span className="tabular-nums text-success">
              {formatVnd(items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0))}
            </span>
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-text-muted">
          <Package className="w-8 h-8 opacity-30" />
          <p className="text-body-sm">Chọn vật tư ở trên để thêm vào phiếu bán.</p>
        </div>
      )}
    </div>
  );
}

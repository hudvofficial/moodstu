"use client";

import { useState, useCallback, useMemo } from "react";
import type {
  ContractItemFormData,
  ItemModalMode,
} from "@/types/contract-form";
import type { ItemType, ExportType } from "@/types/contract";

// ═══════════════════════════════════════════
// useContractItems — Items CRUD + Modal State
// V1 pattern: add/edit/remove + batch + smart type mapping
// ═══════════════════════════════════════════

// ── Service type → Item type mapping ──
const SERVICE_TYPE_TO_ITEM_TYPE: Record<string, ItemType> = {
  dich_vu: "dich_vu",
  san_pham: "san_pham",
  trang_phuc: "trang_phuc",
  makeup: "dich_vu",
  chup_anh: "dich_vu",
  quay_phim: "dich_vu",
};

// ── Auto export_type for trang_phuc ──
function getDefaultExportType(itemType: ItemType): ExportType {
  return itemType === "trang_phuc" ? "xuat_thue" : null;
}

let tempIdCounter = 0;
function generateTempId(): string {
  tempIdCounter += 1;
  return `temp-${Date.now()}-${tempIdCounter}`;
}

export function useContractItems() {
  // ── State ──
  const [items, setItems] = useState<ContractItemFormData[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalMode, setItemModalMode] = useState<ItemModalMode>("add-service");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showCreateServiceModal, setShowCreateServiceModal] = useState(false);

  // ── Derived ──
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.total_amount, 0),
    [items]
  );

  // ── Add single item ──
  const addItem = useCallback((item: Omit<ContractItemFormData, "_tempId">) => {
    const newItem: ContractItemFormData = {
      ...item,
      _tempId: generateTempId(),
      export_type: item.export_type ?? getDefaultExportType(item.type),
    };
    setItems((prev) => [...prev, newItem]);
  }, []);

  // ── Add batch items ──
  const addBatchItems = useCallback(
    (newItems: Omit<ContractItemFormData, "_tempId">[]) => {
      const mapped = newItems.map((item) => ({
        ...item,
        _tempId: generateTempId(),
        export_type: item.export_type ?? getDefaultExportType(item.type),
      }));
      setItems((prev) => [...prev, ...mapped]);
    },
    []
  );

  // ── Edit item by index ──
  const editItem = useCallback(
    (index: number, updatedItem: Partial<ContractItemFormData>) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;
          const merged = { ...item, ...updatedItem };
          // Recalc total if qty/price changed
          if (
            updatedItem.quantity !== undefined ||
            updatedItem.unit_price !== undefined ||
            updatedItem.discount_amount !== undefined
          ) {
            merged.total_amount =
              merged.quantity * merged.unit_price - merged.discount_amount;
          }
          return merged;
        })
      );
    },
    []
  );

  // ── Remove item by index ──
  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Modal openers ──
  const openAddServiceModal = useCallback(() => {
    setItemModalMode("add-service");
    setEditingItemIndex(null);
    setShowItemModal(true);
  }, []);

  const openAddAddonModal = useCallback(() => {
    setItemModalMode("add-addon");
    setEditingItemIndex(null);
    setShowItemModal(true);
  }, []);

  const openEditModal = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      setItemModalMode(item.is_addon ? "edit-addon" : "edit-service");
      setEditingItemIndex(index);
      setShowItemModal(true);
    },
    [items]
  );

  const closeItemModal = useCallback(() => {
    setShowItemModal(false);
    setEditingItemIndex(null);
  }, []);

  // ── Smart type mapper (service.service_type → item.type) ──
  const mapServiceTypeToItemType = useCallback(
    (serviceType: string): ItemType => {
      return SERVICE_TYPE_TO_ITEM_TYPE[serviceType] || "dich_vu";
    },
    []
  );

  // ── Pre-fill for edit mode ──
  const prefillItems = useCallback((editItems: ContractItemFormData[]) => {
    setItems(editItems);
  }, []);

  return {
    // State
    items,
    showItemModal,
    itemModalMode,
    editingItemIndex,
    showCreateServiceModal,
    // Derived
    subtotal,
    // Actions
    addItem,
    addBatchItems,
    editItem,
    removeItem,
    openAddServiceModal,
    openAddAddonModal,
    openEditModal,
    closeItemModal,
    setShowCreateServiceModal,
    mapServiceTypeToItemType,
    prefillItems,
  };
}

export type UseContractItemsReturn = ReturnType<typeof useContractItems>;

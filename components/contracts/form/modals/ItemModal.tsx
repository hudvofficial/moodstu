"use client";

import { useState } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { SimpleSelect } from "@/components/ui/simple-select";
import { ServiceItemForm } from "./ServiceItemForm";
import { AddonItemForm } from "./AddonItemForm";
import type { ItemModalMode, ContractItemFormData } from "@/types/contract-form";
import type { ItemType } from "@/types/contract";

// ═══════════════════════════════════════════
// ItemModal — Unified item router
// V2 stores item type as enum + is_addon; UI must expose all business types.
// ═══════════════════════════════════════════

type CatalogItemType = Exclude<ItemType, "phat_sinh">;

const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
  { value: "dich_vu", label: "Dịch vụ" },
  { value: "san_pham", label: "Sản phẩm" },
  { value: "trang_phuc", label: "Trang phục" },
  { value: "phat_sinh", label: "Phát sinh" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: ItemModalMode;
  /** Existing item data for edit modes */
  editingItem?: ContractItemFormData;
  /** Callback when item added/edited */
  onAddItem: (item: Omit<ContractItemFormData, "_tempId">) => void;
  onEditItem: (item: Partial<ContractItemFormData>) => void;
  onOpenCreateService: (itemType: CatalogItemType) => void;
}

export function ItemModal({
  isOpen,
  onClose,
  mode,
  editingItem,
  onAddItem,
  onEditItem,
  onOpenCreateService,
}: Props) {
  const isEditing = mode === "edit-service" || mode === "edit-addon";
  const title = isEditing ? "Cập nhật dịch vụ / sản phẩm" : "Thêm dịch vụ / sản phẩm";
  const contentKey = `${mode}-${editingItem?._tempId || editingItem?.id || "new"}-${isOpen ? "open" : "closed"}`;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <ItemModalContent
        key={contentKey}
        mode={mode}
        editingItem={editingItem}
        isEditing={isEditing}
        onAddItem={onAddItem}
        onEditItem={onEditItem}
        onClose={onClose}
        onOpenCreateService={onOpenCreateService}
      />
    </UnifiedModal>
  );
}

function ItemModalContent({
  mode,
  editingItem,
  isEditing,
  onAddItem,
  onEditItem,
  onClose,
  onOpenCreateService,
}: Omit<Props, "isOpen"> & { isEditing: boolean }) {
  const initialType = editingItem?.type || (mode === "add-addon" ? "phat_sinh" : "dich_vu");
  const [selectedType, setSelectedType] = useState<ItemType>(initialType);
  const isAddon = selectedType === "phat_sinh";

  return (
    <>
      <div className="px-4 pt-4">
        <SimpleSelect
          value={selectedType}
          onChange={(value) => setSelectedType(value as ItemType)}
          options={ITEM_TYPE_OPTIONS}
          label="Loại"
        />
      </div>

      {isAddon ? (
        <AddonItemForm
          isEditing={isEditing}
          editingItem={editingItem}
          onAdd={onAddItem}
          onEdit={onEditItem}
          onClose={onClose}
        />
      ) : (
        <ServiceItemForm
          itemType={selectedType as CatalogItemType}
          isEditing={isEditing}
          editingItem={editingItem}
          onAdd={onAddItem}
          onEdit={onEditItem}
          onClose={onClose}
          onOpenCreateService={onOpenCreateService}
        />
      )}
    </>
  );
}

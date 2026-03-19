"use client";

import { UnifiedModal } from "@/components/ui/unified-modal";
import { ServiceItemForm } from "./ServiceItemForm";
import { AddonItemForm } from "./AddonItemForm";
import type { ItemModalMode, ContractItemFormData } from "@/types/contract-form";

// ═══════════════════════════════════════════
// ItemModal — Mode Router
// 4 modes: add-service, add-addon, edit-service, edit-addon
// Delegates to ServiceItemForm or AddonItemForm
// ═══════════════════════════════════════════

const MODE_TITLES: Record<ItemModalMode, string> = {
  "add-service": "Thêm dịch vụ",
  "add-addon": "Thêm phụ thu",
  "edit-service": "Sửa dịch vụ",
  "edit-addon": "Sửa phụ thu",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: ItemModalMode;
  /** Existing item data for edit modes */
  editingItem?: ContractItemFormData;
  /** Callback when item added/edited */
  onAddItem: (item: Omit<ContractItemFormData, "_tempId">) => void;
  onEditItem: (item: Partial<ContractItemFormData>) => void;
  onOpenCreateService: () => void;
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
  const isService = mode === "add-service" || mode === "edit-service";
  const isEditing = mode === "edit-service" || mode === "edit-addon";

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={MODE_TITLES[mode]}
    >
      {isService ? (
        <ServiceItemForm
          isEditing={isEditing}
          editingItem={editingItem}
          onAdd={onAddItem}
          onEdit={onEditItem}
          onClose={onClose}
          onOpenCreateService={onOpenCreateService}
        />
      ) : (
        <AddonItemForm
          isEditing={isEditing}
          editingItem={editingItem}
          onAdd={onAddItem}
          onEdit={onEditItem}
          onClose={onClose}
        />
      )}
    </UnifiedModal>
  );
}

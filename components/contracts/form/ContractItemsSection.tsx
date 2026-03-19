"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { UseContractItemsReturn } from "./hooks/useContractItems";
import type { ContractItemFormData } from "@/types/contract-form";

// ═══════════════════════════════════════════
// ContractItemsSection — Items Table + Add Buttons
// Mobile: card list | Desktop: table
// ═══════════════════════════════════════════

// ── Item type badge config ──
const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  dich_vu: { label: "Dịch vụ", className: "bg-info/10 text-info" },
  san_pham: { label: "Sản phẩm", className: "bg-text-muted/10 text-text-secondary" },
  trang_phuc: { label: "Trang phục", className: "bg-accent/10 text-accent" },
  phat_sinh: { label: "Phát sinh", className: "bg-warning/10 text-warning" },
};

interface Props {
  items: UseContractItemsReturn;
  error?: string;
}

export function ContractItemsSection({ items, error }: Props) {
  // [V1 PORT] Confirm before delete
  const [deleteConfirm, setDeleteConfirm] = useState<{ index: number; name: string } | null>(null);

  const handleDeleteClick = (index: number, name: string) => {
    setDeleteConfirm({ index, name });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      items.removeItem(deleteConfirm.index);
      setDeleteConfirm(null);
    }
  };
  return (
    <section className="card-base p-6 space-y-6">
      {/* Header + action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="form-section-heading">
            3. Dịch vụ &amp; Sản phẩm
          </h3>
          {items.items.length > 0 && (
            <span className="bg-neutral-100 text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">
              {items.items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={items.openAddAddonModal}
            className="btn btn-ghost text-sm"
          >
            Phụ thu
          </button>
          <button
            type="button"
            onClick={items.openAddServiceModal}
            className="btn btn-interactive text-sm font-bold shadow-sm shadow-interactive/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm dịch vụ
          </button>
        </div>
      </div>

      {/* Items list */}
      {items.items.length === 0 ? (
        <EmptyState onAddService={items.openAddServiceModal} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card-base hidden overflow-hidden sm:block">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="bg-bg-base text-left text-caption font-semibold text-text-secondary">
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3 w-24">Loại</th>
                  <th className="px-4 py-3 w-16 text-center">SL</th>
                  <th className="px-4 py-3 w-28 text-right">Đơn giá</th>
                  <th className="px-4 py-3 w-28 text-right">Thành tiền</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {items.items.map((item, index) => (
                  <DesktopRow
                    key={item._tempId}
                    item={item}
                    onEdit={() => items.openEditModal(index)}
                    onRemove={() => handleDeleteClick(index, item.item_name)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="space-y-2 sm:hidden">
            {items.items.map((item, index) => (
              <MobileCard
                key={item._tempId}
                item={item}
                onEdit={() => items.openEditModal(index)}
                onRemove={() => handleDeleteClick(index, item.item_name)}
              />
            ))}
          </div>

          {/* Subtotal */}
          <div className="flex justify-end pt-2">
            <p className="form-section-heading">
              Tổng cộng: {formatCurrency(items.subtotal)} {CURRENCY_SYMBOL}
            </p>
          </div>
        </>
      )}

      {error && <p className="error-text">{error}</p>}

      {/* [V1 PORT] Confirm delete dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Xóa dịch vụ"
        message={`Bạn có chắc muốn xóa "${deleteConfirm?.name || ''}"?`}
        confirmLabel="Xóa"
        variant="danger"
      />
    </section>
  );
}

// ── Desktop table row ──
function DesktopRow({
  item,
  onEdit,
  onRemove,
}: {
  item: ContractItemFormData;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const badge = TYPE_BADGES[item.type] || TYPE_BADGES.dich_vu;
  return (
    <tr className="hover:bg-bg-hover/50 transition-colors">
      <td className="px-4 py-2.5">
        <p className="font-medium text-text-primary truncate max-w-[200px]">{item.item_name}</p>
        {item.notes && <p className="text-caption text-text-muted truncate">{item.notes}</p>}
      </td>
      <td className="px-3 py-2.5">
        <span className={`badge ${badge.className}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center">{item.quantity}</td>
      <td className="px-3 py-2.5 text-right text-text-secondary">
        {formatCurrency(item.unit_price)}
      </td>
      <td className="px-3 py-2.5 text-right font-medium text-text-primary">
        {formatCurrency(item.total_amount)} {CURRENCY_SYMBOL}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onEdit} className="rounded-radius-sm p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onRemove} className="rounded-radius-sm p-1.5 text-text-muted hover:bg-error/10 hover:text-error transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Mobile card ──
function MobileCard({
  item,
  onEdit,
  onRemove,
}: {
  item: ContractItemFormData;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const badge = TYPE_BADGES[item.type] || TYPE_BADGES.dich_vu;
  return (
    <div className="card-base flex items-center justify-between p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-body-sm font-medium text-text-primary truncate">{item.item_name}</p>
          <span className={`badge shrink-0 ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <p className="mt-0.5 text-caption text-text-secondary">
          {item.quantity} × {formatCurrency(item.unit_price)} = <span className="font-medium text-text-primary">{formatCurrency(item.total_amount)} {CURRENCY_SYMBOL}</span>
        </p>
      </div>
      <div className="ml-2 flex items-center gap-1">
        <button type="button" onClick={onEdit} className="rounded-radius-sm p-1.5 text-text-muted hover:bg-bg-hover transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onRemove} className="rounded-radius-sm p-1.5 text-text-muted hover:text-error transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Empty state ──
function EmptyState({ onAddService }: { onAddService: () => void }) {
  return (
    <div className="card-base flex flex-col items-center justify-center py-10">
      <p className="text-body-sm text-text-muted">Chưa có dịch vụ nào</p>
      <button
        type="button"
        onClick={onAddService}
        className="btn btn-interactive"
      >
        <Plus className="h-4 w-4" />
        Thêm dịch vụ đầu tiên
      </button>
    </div>
  );
}

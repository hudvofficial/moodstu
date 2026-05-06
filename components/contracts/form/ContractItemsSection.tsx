"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { prefetchCatalogItems } from "./modals/catalog-cache";
import type { UseContractItemsReturn } from "./hooks/useContractItems";
import type { ContractItemFormData } from "@/types/contract-form";
import { getItemTypeLabel } from "@/types/contract-constants";

// ═══════════════════════════════════════════
// ContractItemsSection — Items Table + Add Buttons
// Mobile: card list | Desktop: table
// ═══════════════════════════════════════════

// ── Item type badge config ──
const TYPE_BADGE_STYLES: Record<string, string> = {
  dich_vu: "bg-info/10 text-info",
  san_pham: "bg-text-muted/10 text-text-secondary",
  trang_phuc: "bg-accent/10 text-accent",
  phat_sinh: "bg-warning/10 text-warning",
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
  const warmServiceCatalog = () => prefetchCatalogItems("dich_vu");

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
          <Button
            type="button"
            onClick={items.openAddAddonModal}
            variant="ghost"
            className="text-sm"
          >
            Phụ thu
          </Button>
          <Button
            type="button"
            onClick={items.openAddServiceModal}
            onPointerEnter={warmServiceCatalog}
            onFocus={warmServiceCatalog}
            variant="interactive"
            className="text-sm font-bold shadow-sm shadow-interactive/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm dịch vụ / sản phẩm
          </Button>
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
              <THead>
                <tr>
                  <TH>Tên</TH>
                  <TH className="w-24">Loại</TH>
                  <TH className="w-16 text-center">SL</TH>
                  <TH className="w-28 text-right">Đơn giá</TH>
                  <TH className="w-28 text-right">Thành tiền</TH>
                  <TH className="w-20" />
                </tr>
              </THead>
              <TBody className="divide-y divide-border-light">
                {items.items.map((item, index) => (
                  <DesktopRow
                    key={item._tempId}
                    item={item}
                    onEdit={() => items.openEditModal(index)}
                    onRemove={() => handleDeleteClick(index, item.item_name)}
                  />
                ))}
              </TBody>
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
  const badgeClass = TYPE_BADGE_STYLES[item.type] || TYPE_BADGE_STYLES.dich_vu;
  return (
    <TR>
      <TD>
        <p className="font-medium text-text-primary truncate max-w-50">{item.item_name}</p>
        {item.notes && <p className="text-caption text-text-muted truncate">{item.notes}</p>}
      </TD>
      <TD>
        <span className={`badge ${badgeClass}`}>
          {getItemTypeLabel(item.type)}
        </span>
      </TD>
      <TD className="text-center">{item.quantity}</TD>
      <TD className="text-right text-text-secondary">
        {formatCurrency(item.unit_price)}
      </TD>
      <TD className="text-right font-medium text-text-primary">
        {formatCurrency(item.total_amount)} {CURRENCY_SYMBOL}
      </TD>
      <TD>
        <div className="flex items-center justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="rounded-radius-sm !p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="rounded-radius-sm !p-1.5 text-text-muted hover:bg-error/10 hover:text-error transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TD>
    </TR>
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
  const badgeClass = TYPE_BADGE_STYLES[item.type] || TYPE_BADGE_STYLES.dich_vu;
  return (
    <div className="card-base flex items-center justify-between p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-body-sm font-medium text-text-primary truncate">{item.item_name}</p>
          <span className={`badge shrink-0 ${badgeClass}`}>
            {getItemTypeLabel(item.type)}
          </span>
        </div>
        <p className="mt-0.5 text-caption text-text-secondary">
          {item.quantity} × {formatCurrency(item.unit_price)} = <span className="font-medium text-text-primary">{formatCurrency(item.total_amount)} {CURRENCY_SYMBOL}</span>
        </p>
      </div>
      <div className="ml-2 flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="rounded-radius-sm !p-1.5 text-text-muted hover:bg-bg-hover transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="rounded-radius-sm !p-1.5 text-text-muted hover:text-error transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Empty state ──
function EmptyState({ onAddService }: { onAddService: () => void }) {
  const warmServiceCatalog = () => prefetchCatalogItems("dich_vu");

  return (
    <div className="card-base flex flex-col items-center justify-center py-10">
      <p className="text-body-sm text-text-muted">Chưa có dịch vụ nào</p>
      <Button
        type="button"
        onClick={onAddService}
        onPointerEnter={warmServiceCatalog}
        onFocus={warmServiceCatalog}
        variant="interactive"
      >
        <Plus className="h-4 w-4" />
        Thêm dịch vụ / sản phẩm
      </Button>
    </div>
  );
}

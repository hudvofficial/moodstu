"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { getAvailableServices } from "@/app/actions/contract-queries";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import type { ContractItemFormData } from "@/types/contract-form";
import type { ItemType } from "@/types/contract";

// ═══════════════════════════════════════════
// ServiceItemForm — Search catalog + add/edit
// Batch add: select multiple then confirm
// ═══════════════════════════════════════════

interface ServiceResult {
  id: string;
  service_name: string;
  selling_price: number;
  service_type: string;
}

const TYPE_MAP: Record<string, ItemType> = {
  dich_vu: "dich_vu",
  san_pham: "san_pham",
  trang_phuc: "trang_phuc",
  makeup: "dich_vu",
  chup_anh: "dich_vu",
  quay_phim: "dich_vu",
};

interface Props {
  isEditing: boolean;
  editingItem?: ContractItemFormData;
  onAdd: (item: Omit<ContractItemFormData, "_tempId">) => void;
  onEdit: (item: Partial<ContractItemFormData>) => void;
  onClose: () => void;
  onOpenCreateService: () => void;
}

export function ServiceItemForm({ isEditing, editingItem, onAdd, onEdit, onClose, onOpenCreateService }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ServiceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<ServiceResult[]>([]);

  // Edit mode: single item form
  const [editQty, setEditQty] = useState(editingItem?.quantity || 1);
  const [editPrice, setEditPrice] = useState(editingItem?.unit_price || 0);
  const [editDiscount, setEditDiscount] = useState(editingItem?.discount_amount || 0);
  const [editNotes, setEditNotes] = useState(editingItem?.notes || "");

  const debouncedQuery = useDebounce(query, 300);

  // Search services
  useEffect(() => {
    let cancelled = false;
    async function search() {
      if (!debouncedQuery || debouncedQuery.length < 1) {
        // Load all services if empty
        setIsSearching(true);
        const result = await getAvailableServices();
        if (!cancelled && result.success) setResults(result.data as ServiceResult[]);
        if (!cancelled) setIsSearching(false);
        return;
      }
      setIsSearching(true);
      const result = await getAvailableServices(debouncedQuery);
      if (!cancelled && result.success) setResults(result.data as ServiceResult[]);
      if (!cancelled) setIsSearching(false);
    }
    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Toggle select service for batch add
  const toggleService = useCallback((svc: ServiceResult) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === svc.id);
      return exists ? prev.filter((s) => s.id !== svc.id) : [...prev, svc];
    });
  }, []);

  // Batch add selected services
  const handleBatchAdd = useCallback(() => {
    selected.forEach((svc) => {
      onAdd({
        service_id: svc.id,
        inventory_item_id: null,
        item_name: svc.service_name,
        quantity: 1,
        unit_price: svc.selling_price,
        original_price: svc.selling_price,
        discount_amount: 0,
        total_amount: svc.selling_price,
        type: TYPE_MAP[svc.service_type] || "dich_vu",
        export_type: svc.service_type === "trang_phuc" ? "xuat_thue" : null,
        is_addon: false,
        addon_category: null,
        notes: "",
      });
    });
    onClose();
  }, [selected, onAdd, onClose]);

  // Edit submit
  const handleEditSubmit = useCallback(() => {
    onEdit({
      quantity: editQty,
      unit_price: editPrice,
      discount_amount: editDiscount,
      total_amount: editQty * editPrice - editDiscount,
      notes: editNotes,
    });
    onClose();
  }, [editQty, editPrice, editDiscount, editNotes, onEdit, onClose]);

  // ── Edit mode UI ──
  if (isEditing && editingItem) {
    const total = editQty * editPrice - editDiscount;
    return (
      <div className="space-y-4 p-4">
        <p className="text-body-sm font-medium text-text-primary">{editingItem.item_name}</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Số lượng">
            <input type="number" min={1} value={editQty} onChange={(e) => setEditQty(Number(e.target.value) || 1)} className="input-base" />
          </Field>
          <Field label="Đơn giá">
            <input type="number" min={0} value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value) || 0)} className="input-base" />
          </Field>
          <Field label="Giảm">
            <input type="number" min={0} value={editDiscount} onChange={(e) => setEditDiscount(Number(e.target.value) || 0)} className="input-base" />
          </Field>
        </div>
        <Field label="Ghi chú">
          <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Ghi chú..." className="input-base" />
        </Field>
        <p className="form-total">Thành tiền: {formatCurrency(Math.max(0, total))} {CURRENCY_SYMBOL}</p>
        <ModalActions onCancel={onClose} onSubmit={handleEditSubmit} label="Lưu" />
      </div>
    );
  }

  // ── Add mode: search + batch select ──
  return (
    <div className="p-4">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm dịch vụ..."
          className="input-base pl-10"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="max-h-56 overflow-y-auto space-y-1">
        {isSearching && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        )}
        {!isSearching && results.map((svc) => {
          const isSelected = selected.some((s) => s.id === svc.id);
          return (
            <button
              key={svc.id}
              type="button"
              onClick={() => toggleService(svc)}
              className={`flex w-full items-center justify-between rounded-radius-sm px-3 py-2 text-left transition-colors ${
                isSelected ? "bg-interactive-light" : "hover:bg-bg-hover"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-text-primary truncate">{svc.service_name}</p>
                <p className="text-caption text-text-secondary">{formatCurrency(svc.selling_price)} {CURRENCY_SYMBOL}</p>
              </div>
              {isSelected && (
                <span className="ml-2 text-caption font-semibold text-interactive">✓</span>
              )}
            </button>
          );
        })}
        {!isSearching && results.length === 0 && (
          <p className="py-4 text-center text-body-sm text-text-muted">Không tìm thấy dịch vụ</p>
        )}
      </div>

      {/* Quick create link */}
      <button
        type="button"
        onClick={onOpenCreateService}
        className="mt-2 flex w-full items-center gap-1.5 border-t border-border-light px-3 py-2 text-caption font-medium text-interactive hover:bg-interactive-light transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Tạo dịch vụ mới
      </button>

      {/* Batch add footer */}
      {selected.length > 0 && (
        <ModalActions
          onCancel={() => setSelected([])}
          onSubmit={handleBatchAdd}
          label={`Thêm ${selected.length} dịch vụ`}
          cancelLabel="Bỏ chọn"
        />
      )}
    </div>
  );
}

// ── Shared field wrapper ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label-base">{label}</label>
      {children}
    </div>
  );
}

// ── Shared modal actions ──
function ModalActions({
  onCancel,
  onSubmit,
  label,
  cancelLabel = "Hủy",
}: {
  onCancel: () => void;
  onSubmit: () => void;
  label: string;
  cancelLabel?: string;
}) {
  return (
    <div className="form-actions mt-4">
      <button type="button" onClick={onCancel} className="btn btn-ghost">
        {cancelLabel}
      </button>
      <button type="button" onClick={onSubmit} className="btn btn-interactive">
        {label}
      </button>
    </div>
  );
}

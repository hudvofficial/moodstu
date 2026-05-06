"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Search, Plus, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchCatalogItems,
  getCachedCatalogItems,
  type CatalogResult,
} from "./catalog-cache";
import type { ContractItemFormData } from "@/types/contract-form";
import type { ExportType, ItemType } from "@/types/contract";

// ═══════════════════════════════════════════
// ServiceItemForm — Search catalog + add/edit
// Batch add: select multiple then confirm
// ═══════════════════════════════════════════

type CatalogItemType = Exclude<ItemType, "phat_sinh">;

const ITEM_COPY: Record<CatalogItemType, { search: string; empty: string; add: string; quickCreate: string }> = {
  dich_vu: {
    search: "Tìm dịch vụ...",
    empty: "Không tìm thấy dịch vụ",
    add: "dịch vụ",
    quickCreate: "Tạo dịch vụ mới",
  },
  san_pham: {
    search: "Tìm sản phẩm...",
    empty: "Không tìm thấy sản phẩm",
    add: "sản phẩm",
    quickCreate: "Tạo sản phẩm mới",
  },
  trang_phuc: {
    search: "Tìm trang phục...",
    empty: "Không có trang phục khả dụng",
    add: "trang phục",
    quickCreate: "",
  },
};

const EXPORT_OPTIONS: { value: NonNullable<ExportType>; label: string }[] = [
  { value: "xuat_ban", label: "Xuất bán" },
  { value: "xuat_thue", label: "Xuất thuê" },
];

function getDefaultExportType(itemType: CatalogItemType): ExportType {
  if (itemType === "trang_phuc") return "xuat_thue";
  if (itemType === "san_pham") return "xuat_ban";
  return null;
}

interface Props {
  itemType: CatalogItemType;
  isEditing: boolean;
  editingItem?: ContractItemFormData;
  onAdd: (item: Omit<ContractItemFormData, "_tempId">) => void;
  onEdit: (item: Partial<ContractItemFormData>) => void;
  onClose: () => void;
  onOpenCreateService: (itemType: CatalogItemType) => void;
}

export function ServiceItemForm({ itemType, isEditing, editingItem, onAdd, onEdit, onClose, onOpenCreateService }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState<CatalogResult[]>([]);
  const [exportType, setExportType] = useState<ExportType>(getDefaultExportType(itemType));

  // Edit mode: single item form
  const [editQty, setEditQty] = useState(editingItem?.quantity || 1);
  const [editPrice, setEditPrice] = useState(editingItem?.unit_price || 0);
  const [editDiscount, setEditDiscount] = useState(editingItem?.discount_amount || 0);
  const [editNotes, setEditNotes] = useState(editingItem?.notes || "");

  const debouncedQuery = useDebounce(query, 300);
  const copy = ITEM_COPY[itemType];

  useEffect(() => {
    setQuery("");
    setResults([]);
    setSelected([]);
    setSearchError("");
    setExportType(editingItem?.type === itemType ? editingItem.export_type : getDefaultExportType(itemType));
  }, [editingItem?.export_type, editingItem?.type, itemType]);

  // Search V2 catalog by selected business item type.
  useEffect(() => {
    if (isEditing) return;

    let cancelled = false;
    const cached = getCachedCatalogItems(itemType, debouncedQuery);
    if (cached) {
      setResults(cached);
      setIsSearching(false);
      setSearchError("");
    } else {
      setIsSearching(true);
    }

    async function search() {
      setSearchError("");
      try {
        const data = await fetchCatalogItems(itemType, debouncedQuery);
        if (cancelled) return;
        setResults(data);
      } catch (error) {
        if (!cancelled) {
          setResults([]);
          setSearchError(error instanceof Error ? error.message : "Loi tai danh muc");
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }
    search();
    return () => { cancelled = true; };
  }, [debouncedQuery, isEditing, itemType]);

  // Toggle select catalog item for batch add
  const toggleService = useCallback((svc: CatalogResult) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.id === svc.id && s.source === svc.source);
      return exists
        ? prev.filter((s) => !(s.id === svc.id && s.source === svc.source))
        : [...prev, svc];
    });
  }, []);

  // Batch add selected catalog items
  const handleBatchAdd = useCallback(() => {
    selected.forEach((svc) => {
      onAdd({
        service_id: svc.source === "service" ? svc.id : null,
        dress_id: svc.source === "dress" ? svc.id : null,
        item_name: svc.item_name || svc.service_name,
        quantity: 1,
        unit_price: svc.selling_price,
        original_price: svc.selling_price,
        discount_amount: 0,
        total_amount: svc.selling_price,
        type: itemType,
        export_type: exportType,
        is_addon: false,
        addon_category: null,
        notes: "",
      });
    });
    onClose();
  }, [exportType, itemType, selected, onAdd, onClose]);

  // Edit submit
  const handleEditSubmit = useCallback(() => {
    onEdit({
      type: itemType,
      export_type: exportType,
      is_addon: false,
      addon_category: null,
      quantity: editQty,
      unit_price: editPrice,
      discount_amount: editDiscount,
      total_amount: editQty * editPrice - editDiscount,
      notes: editNotes,
    });
    onClose();
  }, [editQty, editPrice, editDiscount, editNotes, exportType, itemType, onEdit, onClose]);

  // ── Edit mode UI ──
  if (isEditing && editingItem) {
    const total = editQty * editPrice - editDiscount;
    return (
      <div className="space-y-4 p-4">
        <p className="text-body-sm font-medium text-text-primary">{editingItem.item_name}</p>
        {itemType !== "dich_vu" && (
          <SimpleSelect
            value={exportType || getDefaultExportType(itemType) || "xuat_ban"}
            onChange={(value) => setExportType(value as NonNullable<ExportType>)}
            options={EXPORT_OPTIONS}
            label="Hình thức"
          />
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Số lượng">
            <Input type="number" min={1} value={editQty} onChange={(e) => setEditQty(Number(e.target.value) || 1)} />
          </Field>
          <Field label="Đơn giá">
            <CurrencyInput value={editPrice} onChange={setEditPrice} />
          </Field>
          <Field label="Giảm">
            <CurrencyInput value={editDiscount} onChange={setEditDiscount} />
          </Field>
        </div>
        <Field label="Ghi chú">
          <Input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Ghi chú..." />
        </Field>
        <p className="form-total">Thành tiền: {formatCurrency(Math.max(0, total))} {CURRENCY_SYMBOL}</p>
        <ModalActions onCancel={onClose} onSubmit={handleEditSubmit} label="Lưu" />
      </div>
    );
  }

  // ── Add mode: search + batch select ──
  return (
    <div className="p-4">
      {itemType !== "dich_vu" && (
        <div className="mb-3">
          <SimpleSelect
            value={exportType || getDefaultExportType(itemType) || "xuat_ban"}
            onChange={(value) => setExportType(value as NonNullable<ExportType>)}
            options={EXPORT_OPTIONS}
            label="Hình thức"
          />
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.search}
          className="pl-10"
          autoFocus
        />
      </div>

      {!isSearching && !searchError && results.length > 0 && (
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">
            Gợi ý có sẵn
          </span>
          {selected.length > 0 && (
            <span className="rounded-full bg-interactive-light px-2 py-0.5 text-caption font-semibold text-interactive">
              {selected.length} đã chọn
            </span>
          )}
        </div>
      )}

      {/* Results */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {isSearching && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        )}
        {!isSearching && searchError && (
          <p className="py-4 text-center text-body-sm text-error">{searchError}</p>
        )}
        {!isSearching && results.map((svc) => {
          const isSelected = selected.some((s) => s.id === svc.id && s.source === svc.source);
          const name = svc.item_name || svc.service_name;
          const metaParts = [
            svc.code,
            svc.meta && svc.meta !== svc.code ? svc.meta : null,
          ].filter(Boolean);
          return (
            <Button
              unstyled
              key={`${svc.source}-${svc.id}`}
              type="button"
              onClick={() => toggleService(svc)}
              className={`group flex w-full items-start gap-3 rounded-radius-md border px-3 py-2.5 text-left transition-all ${
                isSelected
                  ? "border-interactive/30 bg-interactive-light shadow-sm"
                  : "border-border-light bg-bg-card hover:border-border hover:bg-bg-hover"
              }`}
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-body-sm font-semibold leading-5 text-text-primary">
                  {name}
                </p>
                {metaParts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {metaParts.map((part) => (
                      <span
                        key={part}
                        className="max-w-full truncate rounded-full bg-bg-hover px-2 py-0.5 text-caption font-medium text-text-secondary"
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-start gap-2">
                <div className="text-right">
                  <p className="whitespace-nowrap text-body-sm font-bold text-text-primary">
                    {formatCurrency(svc.selling_price)}
                  </p>
                  <p className="text-caption text-text-muted">{CURRENCY_SYMBOL}</p>
                </div>
                <span
                  className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                    isSelected
                      ? "border-interactive bg-interactive text-white"
                      : "border-border bg-bg-card text-transparent group-hover:border-text-muted"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </div>
            </Button>
          );
        })}
        {!isSearching && !searchError && results.length === 0 && (
          <p className="py-4 text-center text-body-sm text-text-muted">{copy.empty}</p>
        )}
      </div>

      {/* Quick create link */}
      {itemType !== "trang_phuc" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenCreateService(itemType)}
          className="mt-2 flex w-full items-center justify-start gap-1.5 border-t border-border-light !px-3 !py-2 text-caption font-medium text-interactive hover:bg-interactive-light transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {copy.quickCreate}
        </Button>
      )}

      {/* Batch add footer */}
      {selected.length > 0 && (
        <ModalActions
          onCancel={() => setSelected([])}
          onSubmit={handleBatchAdd}
          label={`Thêm ${selected.length} ${copy.add}`}
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
      <Button type="button" variant="ghost" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="button" variant="interactive" onClick={onSubmit}>
        {label}
      </Button>
    </div>
  );
}

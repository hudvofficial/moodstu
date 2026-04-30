"use client";

import { useState } from "react";
import type { BundleItem } from "@/lib/logic/bundle-calculator";
import { useServiceSearch, type BundleSearchResult } from "./hooks/useServiceSearch";
import BuilderMode from "../builder/BuilderMode";
import { Layers, PenLine, GripVertical, Search, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ServiceBundleSectionProps {
  bundleItems: BundleItem[];
  setBundleItems: (items: BundleItem[]) => void;
  error?: string;
  onBundleChange?: () => void;
}

export default function ServiceBundleSection({
  bundleItems,
  setBundleItems,
  error,
  onBundleChange,
}: ServiceBundleSectionProps) {
  const [builderMode, setBuilderMode] = useState(false);
  const {
    searchTerm,
    searchResults,
    showResults,
    isSearching,
    hasSearched,
    handleSearchChange,
    clearSearch,
  } = useServiceSearch();

  const addBundleItem = (service: BundleSearchResult) => {
    if (bundleItems.find((i) => i.service_id === service.id)) return;

    const newItem: BundleItem = {
      id: crypto.randomUUID(),
      service_id: service.id,
      service_name: service.name,
      selling_price: service.selling_price || 0,
      category_id: service.category_id || undefined,
      quantity: 1,
      unit: service.unit,
      image_url: service.image_url || undefined,
      original_price: service.selling_price || 0,
      discount_amount: 0,
      discount_percent: 0,
      final_price: service.selling_price || 0,
    };

    setBundleItems([...bundleItems, newItem]);
    onBundleChange?.();
    clearSearch();
  };

  const removeBundleItem = (id: string) => {
    setBundleItems(bundleItems.filter((item) => item.id !== id));
  };

  const updateBundleItem = (
    id: string,
    field: string,
    value: string | number,
  ) => {
    setBundleItems(
      bundleItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  return (
    <div className="card-base rounded-soft-2xl p-4 lg:p-6 space-y-4 border-l-4 border-l-primary animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h3 className="text-label text-primary flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Thành phần gói / combo
          </h3>
          <p className="text-caption text-text-muted mt-1">
            {builderMode
              ? "Chế độ xây dựng trực quan"
              : "Chế độ nhập liệu thủ công"}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-surface p-1 rounded-lg shadow-xs">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setBuilderMode(false)}
            className={`h-8 px-3 rounded-md text-caption font-bold transition-all flex items-center gap-1 ${!builderMode ? "bg-bg-card text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
            aria-pressed={!builderMode}
          >
            <PenLine className="w-4 h-4" />
            Thủ công
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setBuilderMode(true)}
            className={`h-8 px-3 rounded-md text-caption font-bold transition-all flex items-center gap-1 ${builderMode ? "bg-bg-card text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"}`}
            aria-pressed={builderMode}
          >
            <GripVertical className="w-4 h-4" />
            Visual Builder
          </Button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {builderMode ? (
        <div className="p-0 lg:p-4 bg-background lg:rounded-soft-md lg:shadow-inner -mx-4 lg:mx-0">
          <BuilderMode
            initialItems={bundleItems}
            onChange={(items) => {
              setBundleItems(items);
              onBundleChange?.();
            }}
          />
        </div>
      ) : (
        <>
          <div className="relative mb-6">
            <Search className="w-4 h-4 absolute left-3 top-3 text-text-muted" />
            <Input
              type="text"
              placeholder="Tìm dịch vụ để thêm vào gói..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-surface font-medium"
              aria-label="Tìm dịch vụ để thêm vào gói"
            />
            {showResults && (
              <div className="absolute top-full left-0 right-0 bg-bg-card rounded-b-lg shadow-xl z-20 min-h-12 max-h-60 overflow-y-auto">
                {isSearching && (
                  <div className="px-4 py-3 text-body-sm text-text-muted flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tìm dịch vụ...
                  </div>
                )}

                {!isSearching && hasSearched && searchResults.length === 0 && (
                  <div className="px-4 py-3 text-body-sm text-text-muted">
                    Không tìm thấy dịch vụ phù hợp
                  </div>
                )}

                {!isSearching && searchResults.map((svc) => (
                  <Button
                    key={svc.id}
                    type="button"
                    variant="ghost"
                    unstyled
                    onClick={() => addBundleItem(svc)}
                    className="w-full cursor-pointer text-left px-4 py-3 hover:bg-surface flex justify-between items-center transition-colors"
                  >
                    <span className="flex flex-col">
                      <span className="text-body-sm font-bold text-text-main">
                        {svc.name}
                      </span>
                      <span className="text-caption text-text-muted">
                        {svc.service_code}
                      </span>
                    </span>
                    <span className="text-caption font-bold text-primary">
                      {formatCurrency(svc.selling_price || 0)}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {bundleItems.length === 0 && (
              <p className="text-center text-body-sm text-text-muted italic py-8 bg-surface/50 rounded-lg shadow-inner">
                Chưa có cấu phần nào trong gói. Tìm và thêm dịch vụ ở trên.
              </p>
            )}
            {bundleItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-surface p-3 rounded-lg group hover:shadow-md transition-all shadow-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-text-main truncate">
                    {item.service_name}
                  </div>
                  <div className="text-caption text-text-muted font-mono">
                    ID: {item.service_id.slice(0, 8)}... | Giá gốc: {formatCurrency(item.original_price || 0)}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-bold text-text-muted">
                      SL:
                    </span>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateBundleItem(
                          item.id,
                          "quantity",
                          Math.max(1, parseInt(e.target.value) || 1),
                        )
                      }
                      className="w-16 px-1 h-8 text-center font-bold"
                      aria-label={`Số lượng ${item.service_name}`}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBundleItem(item.id)}
                  className="p-1 h-auto text-text-muted hover:text-error hover:bg-error/10"
                  aria-label={`Xóa ${item.service_name} khỏi gói`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

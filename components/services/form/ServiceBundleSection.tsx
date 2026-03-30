"use client";

import { useState, useEffect } from "react";
import { getServices } from "@/app/actions/service-queries";
import { useDebounce } from "use-debounce";
import type { ServiceRecord } from "@/types/service";
import type { BundleItem } from "@/lib/logic/bundle-calculator";

import BuilderMode from "../builder/BuilderMode";

interface ServiceBundleSectionProps {
  bundleItems: BundleItem[];
  setBundleItems: (items: BundleItem[]) => void;
}

export default function ServiceBundleSection({
  bundleItems,
  setBundleItems,
}: ServiceBundleSectionProps) {
  const [builderMode, setBuilderMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 400);
  const [searchResults, setSearchResults] = useState<ServiceRecord[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Search services for bundle
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      return;
    }

    let cancelled = false;

    // Fetch only SINGLE items to put in a bundle
    getServices({ search: debouncedSearch, fulfillment_type: "single" })
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setSearchResults(res.data.items as ServiceRecord[]);
        }
      })
      .catch((err) => {
        console.error("Lỗi tìm kiếm dịch vụ:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // Add Item to Bundle
  const addBundleItem = (service: ServiceRecord) => {
    if (bundleItems.find((i) => i.service_id === service.id)) return;

    const newItem: BundleItem = {
      id: crypto.randomUUID(), // Local unique ID for the canvas/list
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
    setSearchTerm("");
    setShowResults(false);
  };

  // Remove Item
  const removeBundleItem = (index: number) => {
    const updated = bundleItems.filter((_, i) => i !== index);
    setBundleItems(updated);
  };

  // Update Bundle Item
  const updateBundleItem = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    const updated = [...bundleItems];
    updated[index] = { ...updated[index], [field]: value };
    setBundleItems(updated);
  };

  return (
    <div className="card-base p-4 lg:p-6 space-y-4 border-l-4 border-l-primary animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined font-bold">layers</span>
            Thành phần Gói / Combo
          </h3>
          <p className="text-caption text-text-muted mt-1">
            *{" "}
            {builderMode
              ? "Chế độ Xây dựng trực quan (Visual Builder)"
              : "Chế độ Nhập liệu thủ công (Manual Entry)"}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setBuilderMode(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${!builderMode ? "bg-bg-card text-primary shadow-sm border border-border" : "text-text-muted hover:text-text-secondary"}`}
          >
            <span className="material-symbols-outlined text-[16px]">
              edit_note
            </span>
            Thủ công
          </button>
          <button
            type="button"
            onClick={() => setBuilderMode(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${builderMode ? "bg-bg-card text-primary shadow-sm border border-border" : "text-text-muted hover:text-text-secondary"}`}
          >
            <span className="material-symbols-outlined text-[16px]">
              drag_indicator
            </span>
            Visual Builder
          </button>
        </div>
      </div>

      {builderMode ? (
        <div className="p-0 lg:p-4 lg:border border-border bg-background lg:rounded-soft-md shadow-none lg:shadow-inner -mx-4 lg:mx-0">
          <BuilderMode
            initialItems={bundleItems}
            onChange={setBundleItems}
          />
        </div>
      ) : (
        <>
          {/* Search Box */}
          <div className="relative mb-6">
            <span className="material-symbols-outlined absolute left-3 top-3 text-text-muted">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm dịch vụ để thêm vào gói..."
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                setSearchTerm(val);
                if (val.length < 2) {
                  setSearchResults([]);
                }
                setShowResults(true);
              }}
              className="input-base w-full pl-10 pr-4 py-3"
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-bg-card border border-border rounded-b-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                {searchResults.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => addBundleItem(svc)}
                    className="w-full text-left px-4 py-3 hover:bg-surface flex justify-between items-center border-b border-border last:border-0 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-main">
                        {svc.name}
                      </span>
                      <span className="text-caption text-text-muted">
                        {svc.service_code}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-primary">
                      {svc.selling_price?.toLocaleString()} VNĐ
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="space-y-3">
            {bundleItems.length === 0 && (
              <p className="text-center text-sm text-text-muted italic py-8 border-2 border-dashed border-border rounded-lg bg-surface/50">
                Chưa có cấu phần nào trong gói. Mời tìm và thêm dịch vụ ở trên.
              </p>
            )}
            {bundleItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-surface p-3 rounded-lg border border-border group hover:border-primary/30 transition-all shadow-sm"
              >
                <div className="flex-1">
                  <div className="text-sm font-bold text-text-main">
                    {item.service_name}
                  </div>
                  <div className="text-caption text-text-muted font-mono">
                    ID: {item.service_id.slice(0, 8)}... | Giá gốc: {item.original_price?.toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-caption uppercase font-bold text-text-muted">
                      SL:
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateBundleItem(
                          idx,
                          "quantity",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="input-base w-16 px-2 py-1 text-center font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeBundleItem(idx)}
                  className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-lg">
                    delete
                  </span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

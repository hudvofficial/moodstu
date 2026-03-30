"use client";

import React from "react";
import type { BundleItem } from "@/lib/logic/bundle-calculator";
import type { ServiceRecord } from "@/types/service";

// Temporary typing since ServiceRelation isn't fully typed in @/types/service yet
export interface ServiceRelation {
  id: string;
  parent_service_id: string;
  child_service_id?: string;
  child_category_id?: string;
  relation_type: string;
  is_required: boolean;
  child_service?: ServiceRecord;
  child_category?: {
    id: string;
    name: string;
  };
}

interface SmartSuggestionsProps {
  relations: ServiceRelation[];
  bundleItems: BundleItem[];
  onSelect: (service: ServiceRecord) => void;
}

export default function SmartSuggestions({
  relations,
  bundleItems,
  onSelect,
}: SmartSuggestionsProps) {
  if (!relations || relations.length === 0) return null;

  // Check if a relation is already satisfied in the bundle
  const isSatisfied = (rel: ServiceRelation) => {
    if (rel.child_service_id) {
      return bundleItems.some(
        (item) => item.service_id === rel.child_service_id
      );
    }
    if (rel.child_category_id) {
      return bundleItems.some(
        (item) => item.category_id === rel.child_category_id
      );
    }
    return false;
  };

  return (
    <div className="bg-elevated rounded-soft-md border border-border overflow-hidden shadow-sm">
      <div className="p-3 bg-primary/5 flex items-center gap-2 border-b border-border">
        <span className="material-symbols-outlined text-primary text-[18px]">
          auto_awesome
        </span>
        <span className="text-sm font-bold text-text-main">
          Gợi ý thông minh
        </span>
      </div>

      <div className="p-2 space-y-2 bg-surface">
        {relations.map((rel) => {
          const satisfied = isSatisfied(rel);
          const isRequired =
            rel.relation_type === "REQUIRED" || rel.is_required;

          // Suggestion Card
          return (
            <div
              key={rel.id}
              className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                satisfied
                  ? "bg-surface border-border opacity-60"
                  : isRequired
                  ? "bg-state-warning/10 border-state-warning/30 shadow-sm"
                  : "bg-elevated border-border hover:border-primary/50 cursor-pointer"
              }`}
              onClick={() => {
                if (!satisfied && rel.child_service) {
                  onSelect(rel.child_service);
                }
              }}
            >
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`text-tiny font-bold px-1.5 py-0.5 rounded leading-none ${
                      isRequired
                        ? "bg-state-warning text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isRequired ? "BẮT BUỘC" : "GỢI Ý"}
                  </span>
                  {rel.child_category && (
                    <span className="text-tiny bg-background text-text-secondary px-1.5 py-0.5 rounded leading-none border border-border">
                      {rel.child_category.name}
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-text-main truncate">
                  {rel.child_service?.name ||
                    `Lựa chọn từ ${rel.child_category?.name}`}
                </h4>

                {!satisfied && rel.child_service && (
                  <p className="text-xs text-primary font-bold mt-1">
                    +{(rel.child_service.selling_price || 0).toLocaleString()} ₫
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {satisfied ? (
                  <span className="material-symbols-outlined text-state-success text-[24px]">
                    check_circle
                  </span>
                ) : (
                  <button
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isRequired
                        ? "bg-state-warning text-white hover:bg-state-warning/90 shadow-sm"
                        : "bg-surface border border-border text-text-muted hover:bg-primary hover:text-white hover:border-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend / Status */}
      <div className="p-3 border-t border-border bg-background">
        <p className="text-[11px] text-text-muted leading-tight">
          {`* Các món "Bắt buộc" giúp đảm bảo vận hành đồng bộ của Gói dịch vụ.`}
        </p>
      </div>
    </div>
  );
}

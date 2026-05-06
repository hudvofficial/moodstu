"use client";

import React from "react";
import { Sparkles, CheckCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BundleItem } from "@/lib/logic/bundle-calculator";
import type { ServiceRecord } from "@/types/service";
import { formatVnd } from "@/lib/utils";

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
    <div className="bg-elevated rounded-soft-md shadow-sm overflow-hidden">
      <div className="p-3 bg-primary/5 flex items-center gap-2 border-b border-border">
        <Sparkles size={20} className="text-primary" />
        <span className="text-body-sm font-bold text-text-main">
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
              className={`p-3 rounded-lg transition-all flex items-center justify-between gap-3 ${
                satisfied
                  ? "bg-surface opacity-60"
                  : isRequired
                  ? "bg-state-warning/10 shadow-sm"
                  : "bg-elevated shadow-xs hover:shadow-md cursor-pointer"
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
                    className={`text-caption font-bold px-1.5 py-0.5 rounded leading-none ${
                      isRequired
                        ? "bg-state-warning text-white"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isRequired ? "BẮT BUỘC" : "GỢI Ý"}
                  </span>
                  {rel.child_category && (
                    <span className="text-caption bg-background text-text-secondary px-1.5 py-0.5 rounded leading-none border border-border">
                      {rel.child_category.name}
                    </span>
                  )}
                </div>

                <h4 className="text-body-sm font-semibold text-text-main truncate">
                  {rel.child_service?.name ||
                    `Lựa chọn từ ${rel.child_category?.name}`}
                </h4>

                {!satisfied && rel.child_service && (
                  <p className="text-caption text-primary font-bold mt-1">
                    +{formatVnd(rel.child_service.selling_price || 0)}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {satisfied ? (
                  <CheckCircle size={24} className="text-state-success" />
                ) : (
                  <Button
                    variant="ghost"
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors p-0 border-0 ${
                      isRequired
                        ? "bg-state-warning text-white hover:bg-state-warning/90 shadow-sm"
                        : "bg-surface shadow-xs text-text-muted hover:bg-primary hover:text-white hover:shadow-sm"
                    }`}
                  >
                    <Plus size={20} />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend / Status */}
      <div className="p-3 border-t border-border bg-background">
        <p className="text-caption text-text-muted leading-tight">
          {`* Các món "Bắt buộc" giúp đảm bảo vận hành đồng bộ của Gói dịch vụ.`}
        </p>
      </div>
    </div>
  );
}

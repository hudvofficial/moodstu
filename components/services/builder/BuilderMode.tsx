"use client";

import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ComponentSelector from "./ComponentSelector";
import BundleCanvas from "./BundleCanvas";
import SmartSuggestions from "./SmartSuggestions";
import QuoteModernView from "./QuoteModernView";
import RuleManager from "./RuleManager";

import { calculateBundlePrice } from "@/lib/logic/bundle-calculator";
import { getPriceRules } from "@/app/actions/builder-actions";
import type { BundleItem } from "@/lib/logic/bundle-calculator";
import type { ServiceRecord, PriceRule } from "@/types/service";
import type { ServiceFormData } from "@/components/services/form/hooks/useServiceForm";
import type { ServiceRelation } from "./SmartSuggestions";

interface BuilderModeProps {
  initialItems?: BundleItem[];
  onChange: (items: BundleItem[]) => void;
  parentService?: ServiceFormData;
  preFetchedRelations?: ServiceRelation[];
  preFetchedCategories?: { id: string; name: string; icon?: string | null }[];
}

export default function BuilderMode({
  initialItems = [],
  onChange,
  parentService,
  preFetchedRelations = [],
  preFetchedCategories = [],
}: BuilderModeProps) {
  const [items, setItems] = useState<BundleItem[]>(initialItems);
  const [relations, setRelations] = useState<ServiceRelation[]>(
    preFetchedRelations || []
  );
  const [showPremiumQuote, setShowPremiumQuote] = useState(false);
  const [showRuleManager, setShowRuleManager] = useState(false);
  const [rules, setRules] = useState<PriceRule[]>([]);

  // Fetch rules
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPriceRules().then((res) => setRules(res as any as PriceRule[]));
  }, []);

  // Memoize calculation to prevent redundant heavy logic
  const calculation = useMemo(
    () => calculateBundlePrice(items, rules),
    [items, rules]
  );

  // Sync relations from props with stability check
  useEffect(() => {
    if (preFetchedRelations && preFetchedRelations.length > 0) {
      setRelations((prev) => {
        const isSame =
          prev.length === preFetchedRelations.length &&
          prev.every((r, i) => r.id === preFetchedRelations[i].id);
        return isSame ? prev : preFetchedRelations;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(preFetchedRelations)]);

  // Sync items if initialItems changes externally
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems((prev) => {
        const isSame =
          prev.length === initialItems.length &&
          prev.every((item, i) => item.id === initialItems[i].id);
        if (isSame) return prev;
        
        return initialItems;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialItems)]);

  const handleAddItem = (service: ServiceRecord) => {
    const existing = items.find((i) => i.service_id === service.id);
    let newItems: BundleItem[];

    if (existing) {
      newItems = items.map((i) =>
        i.service_id === service.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      newItems = [
        ...items,
        {
          id: crypto.randomUUID(), // Local ID for UI management since we may not have a bundle_item id yet
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
        },
      ];
    }

    setItems(newItems);
    onChange(newItems);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    const newItems = items.map((i) =>
      i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
    );
    setItems(newItems);
    onChange(newItems);
  };

  const handleRemove = (id: string) => {
    const newItems = items.filter((i) => i.id !== id);
    setItems(newItems);
    onChange(newItems);
  };

  const missingRequired = relations.filter((rel) => {
    const isRequired = rel.relation_type === "REQUIRED" || rel.is_required;
    if (!isRequired) return false;
    if (rel.child_service_id)
      return !items.some((i) => i.service_id === rel.child_service_id);
    if (rel.child_category_id)
      return !items.some((i) => i.category_id === rel.child_category_id);
    return false;
  });

  const addAllRequired = () => {
    const currentItems = [...items];
    missingRequired.forEach((rel) => {
      if (rel.child_service) {
        // Check if already in bundle to avoid duplicates
        const exists = currentItems.some(
          (i) => i.service_id === rel.child_service?.id
        );
        if (!exists) {
          currentItems.push({
            id: crypto.randomUUID(),
            service_id: rel.child_service.id,
            service_name: rel.child_service.name,
            selling_price: rel.child_service.selling_price || 0,
            category_id: rel.child_service.category_id || undefined,
            quantity: 1,
            unit: rel.child_service.unit,
            image_url: rel.child_service.image_url || undefined,
            original_price: rel.child_service.selling_price || 0,
            discount_amount: 0,
            discount_percent: 0,
            final_price: rel.child_service.selling_price || 0,
          });
        }
      }
    });
    setItems(currentItems);
    onChange(currentItems);
  };

  return (
    <div className="flex flex-col gap-4">
      {missingRequired.length > 0 && (
        <div className="bg-state-warning/10 border border-state-warning/30 p-3 rounded-soft-md flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-state-warning shrink-0" />
            <div className="flex-1">
              <p className="text-caption font-bold text-state-warning">
                Thiếu {missingRequired.length} món bắt buộc!
              </p>
              <p className="text-caption text-state-warning/80">
                Gói này sẽ không hợp lệ nếu thiếu các thành phần chính.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            type="button"
            onClick={addAllRequired}
            className="text-state-warning whitespace-nowrap hover:bg-state-warning/10"
          >
            Thêm tất cả
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[650px]">
        {/* Left: Selector (7 cols) */}
        <div className="lg:col-span-7 h-full flex-col hidden lg:flex">
          <h3 className="font-bold text-text-main mb-2 text-body-sm flex items-center gap-2">
            Cách 1: Chọn món lẻ từ Danh mục
          </h3>
          <div className="flex-1 overflow-hidden">
            <ComponentSelector
              onSelect={handleAddItem}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              categories={preFetchedCategories as any}
            />
          </div>
        </div>

        {/* Right: Suggestions & Canvas (5 cols) */}
        <div className="lg:col-span-5 h-full flex flex-col gap-4 overflow-hidden">
          {relations.length > 0 && (
            <div className="shrink-0">
              <h3 className="font-bold text-text-main mb-2 text-body-sm flex items-center justify-between">
                Cách 2: Gợi ý Thông minh
              </h3>
              <SmartSuggestions
                relations={relations}
                bundleItems={items}
                onSelect={handleAddItem}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-text-main text-body-sm">Combo Của Quý Khách</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setShowRuleManager(true)}
                >
                  <Scale size={14} />
                  QUY TẮC GIÁ
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => setShowPremiumQuote(true)}
                >
                  <Sparkles size={14} />
                  XEM BÁO GIÁ
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <BundleCanvas
                items={items}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            </div>
          </div>
        </div>
      </div>

      {showPremiumQuote && (
        <QuoteModernView
          items={items}
          calculation={calculation}
          onClose={() => setShowPremiumQuote(false)}
          parentService={parentService}
        />
      )}

      {showRuleManager && <RuleManager onClose={() => setShowRuleManager(false)} />}
    </div>
  );
}

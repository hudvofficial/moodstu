"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ShoppingBag, GripVertical, Image as ImageIcon, X, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateBundlePrice } from "@/lib/logic/bundle-calculator";
import { getPriceRules } from "@/app/actions/builder-actions";
import type { BundleItem } from "@/lib/logic/bundle-calculator";
import type { PriceRule } from "@/types/service";
import Image from "next/image";

interface BundleCanvasProps {
  items: BundleItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

export default function BundleCanvas({
  items,
  onUpdateQuantity,
  onRemove,
}: BundleCanvasProps) {
  const [rules, setRules] = useState<PriceRule[]>([]);

  // Fetch rules
  useEffect(() => {
    // getPriceRules takes no arguments in V2 and unwraps the result
    getPriceRules().then((res) => setRules(res as unknown as PriceRule[]));
  }, []);

  // Recalculate whenever items or rules change
  const calculation = useMemo(
    () => calculateBundlePrice(items, rules),
    [items, rules]
  );

  const totalPrice = calculation.finalTotal;

  return (
    <div className="flex flex-col h-full bg-elevated rounded-soft-md shadow-xs overflow-hidden">
      <div className="p-3 border-b border-border bg-surface flex justify-between items-center">
        <h3 className="font-bold text-text-main flex items-center gap-2 text-body-sm">
          <ShoppingBag size={20} className="text-text-muted" />
          Gói combo đang soạn
        </h3>
        <span className="text-primary font-bold text-h3">
          {totalPrice.toLocaleString()} ₫
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-2 border-2 border-dashed border-border rounded-soft-md bg-surface/50">
            <GripVertical size={36} className="opacity-50" />
            <p className="text-body-sm font-medium">
              Chọn dịch vụ từ danh sách bên trái
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 bg-elevated p-2 rounded-lg hover:shadow-md transition-colors shadow-sm"
            >
              <div className="relative w-16 h-16 bg-surface rounded-md overflow-hidden shrink-0">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.service_name}
                    fill
                    className="object-cover"
                    unoptimized={
                      item.image_url.startsWith("data:") ||
                      item.image_url.startsWith("blob:")
                    }
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon size={20} className="text-text-muted" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between py-0.5">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-body-sm text-text-main line-clamp-2 pr-2">
                    {item.service_name}
                  </h4>
                  <Button
                    variant="ghost"
                    onClick={() => onRemove(item.id)}
                    className="text-text-muted hover:text-state-error transition-colors shrink-0 p-0 h-auto border-0"
                  >
                    <X size={20} />
                  </Button>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <div className="text-body-sm text-primary font-bold">
                    {item.selling_price.toLocaleString()} ₫
                  </div>
                  <div className="flex items-center gap-2 bg-surface rounded-lg p-1 shadow-xs">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center bg-elevated rounded shadow-sm hover:text-primary disabled:opacity-50 transition-colors p-0 border-0"
                      disabled={item.quantity <= 1}
                    >
                      -
                    </Button>
                    <span className="text-caption font-bold w-5 text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center bg-elevated rounded shadow-sm hover:text-primary transition-colors p-0 border-0"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border bg-surface space-y-3">
        <div className="flex justify-between text-body-sm text-text-secondary font-medium">
          <span>Tổng số lượng:</span>
          <span>{items.reduce((s, i) => s + i.quantity, 0)} món</span>
        </div>

        {calculation.discountAmount > 0 && (
          <>
            <div className="flex justify-between text-body-sm text-text-secondary">
              <span>Tạm tính gộp:</span>
              <span className="line-through">
                {calculation.originalTotal.toLocaleString()} ₫
              </span>
            </div>
            <div className="flex justify-between text-body-sm text-state-success font-bold">
              <span>Khuyến mãi áp dụng:</span>
              <span>-{calculation.discountAmount.toLocaleString()} ₫</span>
            </div>
            {calculation.appliedRules.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-2">
                {calculation.appliedRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 text-caption bg-state-success/10 text-state-success px-2 py-1 rounded border border-state-success/20 w-fit font-medium"
                  >
                    <BadgeCheck size={14} />
                    {rule}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

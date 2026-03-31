/* eslint-disable no-restricted-syntax */ // Exception: material-icons typography.
"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { getServices } from "@/app/actions/service-queries";
import type { ServiceCategory, ServiceRecord } from "@/types/service";
import Image from "next/image";

interface ComponentSelectorProps {
  onSelect: (service: ServiceRecord) => void;
  categories?: ServiceCategory[];
}

export default function ComponentSelector({
  onSelect,
  categories = [],
}: ComponentSelectorProps) {
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Fetch Services on Cat change
  useEffect(() => {
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await getServices({
          category: selectedCat !== "all" ? selectedCat : undefined,
          limit: 100,
        });

        if (res.success && res.data) {
          setServices(res.data.items);
        } else if (!res.success) {
          console.error("Failed to fetch services:", res.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
  }, [selectedCat]);

  return (
    <div className="flex flex-col h-full bg-surface rounded-soft-md overflow-hidden">
      {/* Category Tabs */}
      <div className="flex overflow-x-auto p-2 bg-elevated border-b border-border gap-2 scrollbar-hide">
        <Button
          variant="ghost"
          onClick={() => setSelectedCat("all")}
          className={`h-auto px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
            selectedCat === "all"
              ? "bg-primary text-white shadow-sm hover:text-white"
              : "bg-surface text-text-secondary hover:bg-surface border border-transparent hover:border-border"
          }`}
        >
          Tất cả
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant="ghost"
            onClick={() => setSelectedCat(cat.id)}
            className={`h-auto px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-all ${
              selectedCat === cat.id
                ? "bg-primary text-white shadow-sm hover:text-white"
                : "bg-surface text-text-secondary hover:bg-surface border border-transparent hover:border-border"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {cat.icon || "category"}
            </span>
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3 bg-surface">
        {loading || isPending ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Đang tải...
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => onSelect(service)}
                className="bg-elevated rounded-lg border border-border p-2 cursor-pointer hover:border-primary hover:shadow-md transition-all group"
              >
                <div className="aspect-square bg-surface rounded-md mb-2 relative overflow-hidden">
                  {service.image_url ? (
                    <Image
                      src={service.image_url}
                      alt={service.name}
                      fill
                      className="object-cover"
                      unoptimized={
                        service.image_url.startsWith("data:") ||
                        service.image_url.startsWith("blob:")
                      }
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-muted">
                      <span className="material-symbols-outlined text-3xl">
                        image
                      </span>
                    </div>
                  )}
                  {/* Add Button Overlay */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="bg-elevated text-primary rounded-full p-2 shadow-sm material-symbols-outlined">
                      add
                    </span>
                  </div>
                </div>
                <h4 className="font-semibold text-xs text-text-main truncate">
                  {service.name}
                </h4>
                <p className="text-caption text-text-muted mb-1 truncate">
                  {service.service_code}
                </p>
                <p className="text-xs text-primary font-bold">
                  {(service.selling_price || 0).toLocaleString()} ₫
                </p>
              </div>
            ))}
            {services.length === 0 && !loading && (
              <div className="col-span-full text-center text-text-muted text-xs py-4">
                Không tìm thấy dịch vụ
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

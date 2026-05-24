"use client";

import { Phone } from "lucide-react";
import { formatCurrency, formatPhone } from "@/lib/utils";
import type { VendorCostItem } from "@/types/finance-operations";

interface VendorCostMobileListProps {
  items: VendorCostItem[];
}

export function VendorCostMobileList({ items }: VendorCostMobileListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
        <p className="text-body-sm text-text-muted">
          Không có chi phí thợ ngoài trong tháng này
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      {items.map((item) => (
        <div
          key={item.vendor_id}
          className="rounded-xl border border-border bg-bg-card p-4 shadow-xs"
        >
          {/* Header: Name + Cost */}
          <div className="mb-2 flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-body font-semibold text-text-primary">
                {item.vendor_name}
              </h4>
              {item.vendor_phone && (
                <a
                  href={`tel:${item.vendor_phone}`}
                  className="mt-0.5 inline-flex items-center gap-1 text-tiny text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" />
                  {formatPhone(item.vendor_phone)}
                </a>
              )}
            </div>
            <div className="text-right">
              <p className="text-body-sm font-bold text-primary">
                {formatCurrency(item.total_cost)}
              </p>
              <p className="text-tiny text-text-muted">{item.job_count} jobs</p>
            </div>
          </div>

          {/* Service Type */}
          {item.service_type && (
            <div className="mb-2">
              <span className="inline-block rounded-full bg-elevated px-3 py-1 text-tiny text-text-secondary">
                {item.service_type}
              </span>
            </div>
          )}

          {/* Contracts */}
          {item.contracts.length > 0 && (
            <div className="flex flex-wrap gap-1 border-t border-border pt-2">
              {item.contracts.slice(0, 5).map((code) => (
                <span
                  key={code}
                  className="inline-block rounded bg-primary/10 px-2 py-0.5 text-tiny text-primary"
                >
                  {code}
                </span>
              ))}
              {item.contracts.length > 5 && (
                <span className="inline-block px-2 py-0.5 text-tiny text-text-muted">
                  +{item.contracts.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

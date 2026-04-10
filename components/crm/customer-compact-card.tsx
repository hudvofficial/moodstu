"use client";

import { ChevronRight, CalendarPlus, Building2 } from "lucide-react";
import type { Customer } from "@/types/crm";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { SOURCE_MAP } from "@/types/crm";

interface Props {
  customer: Customer;
  onClick: (customer: Customer) => void;
}

export default function CustomerCompactCard({ customer, onClick }: Props) {
  const sourceInfo = customer.source ? (SOURCE_MAP[customer.source] || { label: customer.source }) : null;

  return (
    <div
      onClick={() => onClick(customer)}
      className="card-base p-4 hover-lift cursor-pointer transition-all w-full"
    >
      {/* Row 1: Avatar + Name + Code + LTV */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
          {getInitials(customer.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-body font-semibold text-text-main truncate">
                {customer.full_name}
              </span>
              <span className="px-1.5 py-0.5 text-tiny font-bold tracking-wider rounded bg-bg-muted text-text-muted uppercase shrink-0">
                {customer.customer_code}
              </span>
            </div>
            <span className="text-body font-bold text-primary shrink-0">
              {(customer.ltv || 0) > 0 ? formatCurrency(customer.ltv || 0) : "—"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-caption mt-0.5">
            <span className="text-text-secondary truncate">
              {customer.phone || "Trống SĐT"}
            </span>
            {customer.email && (
              <>
                <span className="text-text-muted shrink-0">•</span>
                <span className="text-text-muted truncate max-w-[160px]">
                  {customer.email}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Wedding date + Source + Created */}
      <div className="flex items-center justify-between gap-3 mt-2 pl-[52px]">
        <div className="flex items-center gap-3 min-w-0 text-caption">
          {customer.wedding_date ? (
            <span className="flex items-center gap-1 text-success font-medium shrink-0">
              <CalendarPlus className="w-3.5 h-3.5" />
              {formatDate(customer.wedding_date)}
            </span>
          ) : (
            <span className="text-text-muted">Chưa rõ ngày cưới</span>
          )}
          {sourceInfo && (
            <>
              <span className="text-text-muted shrink-0">•</span>
              <span className="flex items-center gap-1 text-text-secondary shrink-0">
                <Building2 className="w-3 h-3 text-text-muted" />
                {sourceInfo.label}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-caption text-text-muted">
            {formatDate(customer.created_at)}
          </span>
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </div>
      </div>
    </div>
  );
}

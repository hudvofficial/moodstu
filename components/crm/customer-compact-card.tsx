"use client";

import { Building2, CalendarPlus, ChevronRight } from "lucide-react";
import type { Customer } from "@/types/crm";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CrmRecordCard } from "@/components/crm/crm-record-card";
import { SOURCE_MAP } from "@/types/crm";

interface Props {
  customer: Customer;
  onClick: (customer: Customer) => void;
}

export default function CustomerCompactCard({ customer, onClick }: Props) {
  const sourceInfo = customer.source
    ? (SOURCE_MAP[customer.source] || { label: customer.source })
    : null;

  return (
    <CrmRecordCard
      onClick={() => onClick(customer)}
      avatar={getInitials(customer.full_name)}
      title={
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-body font-semibold text-text-main">
            {customer.full_name}
          </span>
          <Badge
            variant="neutral"
            className="shrink-0 px-1.5 py-0 text-tiny font-bold uppercase tracking-wider"
          >
            {customer.customer_code}
          </Badge>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-1.5 text-caption">
          <span className="truncate text-text-secondary">
            {customer.phone || "Trống SĐT"}
          </span>
          {customer.email ? (
            <>
              <span className="shrink-0 text-text-muted">•</span>
              <span className="max-w-[160px] truncate text-text-muted">
                {customer.email}
              </span>
            </>
          ) : null}
        </div>
      }
      headerRight={
        <span className="shrink-0 text-body font-bold text-primary">
          {(customer.ltv || 0) > 0 ? formatCurrency(customer.ltv || 0) : "—"}
        </span>
      }
      bottom={
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 text-caption">
            {customer.wedding_date ? (
              <span className="flex shrink-0 items-center gap-1 font-medium text-success">
                <CalendarPlus className="h-3.5 w-3.5" />
                {formatDate(customer.wedding_date)}
              </span>
            ) : (
              <span className="text-text-muted">Chưa rõ ngày cưới</span>
            )}
            {sourceInfo ? (
              <>
                <span className="shrink-0 text-text-muted">•</span>
                <span className="flex shrink-0 items-center gap-1 text-text-secondary">
                  <Building2 className="h-3 w-3 text-text-muted" />
                  {sourceInfo.label}
                </span>
              </>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-caption text-text-muted">
              {formatDate(customer.created_at)}
            </span>
            <ChevronRight className="h-4 w-4 text-text-muted" />
          </div>
        </div>
      }
    />
  );
}

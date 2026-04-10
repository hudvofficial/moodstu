"use client";

import { Building2, Phone, Mail, CalendarPlus, User } from "lucide-react";
import type { Customer } from "@/types/crm";
import { formatDate } from "@/lib/utils";
import { SOURCE_MAP } from "@/types/crm";
import { Button } from "@/components/ui/button";

// ═══════════════════════════════════════════
// CustomerCard — Mobile card (lg:hidden)
// Phase 01: Gold Standard Optimization
// ═══════════════════════════════════════════

interface Props {
  customer: Customer;
  onClick: (customer: Customer) => void;
}

export default function CustomerCard({ customer, onClick }: Props) {
  return (
    <div 
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(customer); }}
      onClick={() => onClick(customer)}
      className="card-base p-4 hover-lift space-y-2.5 cursor-pointer"
    >
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-main truncate">
            {customer.full_name}
          </p>
          <div className="mt-1">
            <span className="inline-block px-2 py-0.5 text-xs font-bold tracking-wider rounded-md bg-bg-muted text-text-muted uppercase">
              {customer.customer_code}
            </span>
          </div>
        </div>
      </div>

      {/* ── DATA GRID ── */}
      <div className="grid grid-cols-1 gap-2 text-sm text-text-secondary mt-1">
        {customer.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-text-muted shrink-0" />
            <span className="truncate hover:text-primary transition-colors">
              {customer.phone}
            </span>
          </div>
        )}
        
        {customer.wedding_date && (
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-text-muted shrink-0" />
            <span className="truncate">Cưới: {formatDate(customer.wedding_date)}</span>
          </div>
        )}

        {customer.email && (
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-text-muted shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}

        {(customer.bride_name || customer.groom_name) && (
          <div className="flex items-center gap-2 text-primary font-medium">
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {customer.bride_name} {customer.groom_name && customer.bride_name ? '&' : ''} {customer.groom_name}
            </span>
          </div>
        )}

        {customer.source && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-text-muted shrink-0" />
            <span className="truncate">{SOURCE_MAP[customer.source]?.label || customer.source}</span>
          </div>
        )}
      </div>

      {customer.tags && customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 w-full overflow-hidden max-h-[22px] sm:max-h-full line-clamp-1">
          {customer.tags.map((tag) => (
            <span key={tag} className="inline-flex px-1.5 py-0.5 text-xs font-medium bg-bg-muted text-text-secondary rounded shadow-xs whitespace-nowrap">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── BOTTOM ACTIONS ── */}
      <div 
        className="flex items-center justify-end gap-3 pt-3 mt-3 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <Button size="sm" variant="outline" onClick={() => onClick(customer)}>
          Hồ sơ Khách Hàng
        </Button>
      </div>
    </div>
  );
}

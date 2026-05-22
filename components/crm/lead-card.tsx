"use client";

import { Phone, CalendarClock, Building2, Ticket, Trash2 } from "lucide-react";
import type { CrmLead } from "@/types/crm";
import { LEAD_STATUS_MAP, POTENTIAL_MAP, SOURCE_MAP } from "@/types/crm";
import { formatCurrency, formatPhone, formatDate } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskFlagsBadge } from "./risk-flags-badge";
import StatusSelect from "@/components/ui/status-select";
import { SwipeableCard, type SwipeAction } from "@/components/ui/swipeable-card";
import { toast } from "sonner";

// ═══════════════════════════════════════════
// LeadCard — Mobile card (lg:hidden)
// Phase 01: Gold Standard Optimization
// ═══════════════════════════════════════════

interface Props {
  lead: CrmLead;
  onClick?: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

const getStatusVariant = (status: string): BadgeVariant => {
  const map: Record<string, BadgeVariant> = {
    moi: "info",
    da_lien_he: "primary",
    hen_gap: "warning",
    da_bao_gia: "accent",
    da_chot: "success",
    huy: "error",
  };
  return map[status] || "neutral";
};

const getPotentialVariant = (p: string): BadgeVariant => {
  return p === "hot" ? "error" : p === "warm" ? "warning" : "neutral";
};

// Generate options for StatusSelect dynamically from PIPELINE configurations
const LEAD_STATUS_OPTIONS = Object.entries(LEAD_STATUS_MAP).map(([value, info]) => ({
  value,
  label: info.label,
  color: info.color
}));

export default function LeadCard({ lead, onClick, onStatusChange }: Props) {
  const statusInfo = LEAD_STATUS_MAP[lead.status] || { label: lead.status };
  const potentialInfo = lead.potential ? (POTENTIAL_MAP[lead.potential] || { label: lead.potential }) : null;
  const sourceInfo = lead.source ? (SOURCE_MAP[lead.source] || { label: lead.source }) : null;

  const handleClick = () => {
    if (onClick) {
      onClick(lead.id);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(lead.id, newStatus);
    }
  };

  const swipeRightActions: SwipeAction[] = [
    {
      id: "call",
      label: "Gọi điện",
      icon: <Phone className="w-5 h-5" />,
      className: "bg-success text-inverse",
      onClick: () => {
        if (lead.phone) {
          window.open(`tel:${lead.phone}`, "_self");
        } else {
          toast.error("Khách hàng chưa có số điện thoại");
        }
      }
    },
    {
      id: "cancel",
      label: "Huỷ deal",
      icon: <Trash2 className="w-5 h-5" />,
      className: "bg-error text-inverse",
      onClick: () => {
        handleStatusUpdate("huy");
      }
    }
  ];

  return (
    <SwipeableCard rightActions={swipeRightActions}>
      <div
        onClick={handleClick}
        className="card-base p-4 hover-lift space-y-2.5 cursor-pointer rounded-xl bg-bg-card"
      >
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-main truncate">
            {lead.contact_name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {potentialInfo && (
              <Badge variant={getPotentialVariant(lead.potential!)} solid className="text-xs px-1.5 py-0">
                {potentialInfo.label}
              </Badge>
            )}
            <RiskFlagsBadge lead={lead} />
          </div>
        </div>
        <Badge variant={getStatusVariant(lead.status)} dot>
          {statusInfo.label}
        </Badge>
      </div>

      {/* ── DATA GRID ── */}
      <div className="grid grid-cols-1 gap-2 text-sm text-text-secondary mt-1">
        {lead.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-text-muted shrink-0" />
            <a
              href={`tel:${lead.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary transition-colors truncate"
            >
              {formatPhone(lead.phone)}
            </a>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-text-muted shrink-0" />
          <span className="truncate">
            {lead.deal_value > 0 ? formatCurrency(lead.deal_value) : "Chưa có dự toán"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-text-muted shrink-0" />
          <span className="truncate">Tạo: {formatDate(lead.created_at)}</span>
        </div>

        {sourceInfo && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-text-muted shrink-0" />
            <span className="truncate">{sourceInfo.label}</span>
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTIONS ── */}
      <div 
        className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-border"
        onClick={(e) => e.stopPropagation()} 
      >
        <div onClick={(e) => e.stopPropagation()}>
          <StatusSelect
            current={lead.status}
            options={LEAD_STATUS_OPTIONS}
            variant="compact"
            onUpdate={handleStatusUpdate}
          />
        </div>
        <Button size="sm" variant="outline" onClick={handleClick}>
          Chi tiết
        </Button>
      </div>
      </div>
    </SwipeableCard>
  );
}

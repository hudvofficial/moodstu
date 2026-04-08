"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Phone } from "lucide-react";
import type { CrmLead } from "@/types/crm";
import { LEAD_STATUS_MAP, POTENTIAL_MAP, SOURCE_MAP, getScoreLevel } from "@/types/crm";
import { formatCurrency, formatPhone, formatDate, getInitials } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

// ═══════════════════════════════════════════
// LeadCard — Mobile card (lg:hidden)
// Phase 02: strictly adheres to SSOT component tokens
// ═══════════════════════════════════════════

interface Props {
  lead: CrmLead;
  onClick?: (id: string) => void;
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

export default function LeadCard({ lead, onClick }: Props) {
  const router = useRouter();
  
  const statusInfo = LEAD_STATUS_MAP[lead.status] || { label: lead.status };
  const potentialInfo = lead.potential ? (POTENTIAL_MAP[lead.potential] || { label: lead.potential }) : null;
  const sourceInfo = lead.source ? (SOURCE_MAP[lead.source] || { label: lead.source }) : null;
  const scoreInfo = getScoreLevel(lead.score || 0);

  const handleClick = () => {
    if (onClick) {
      onClick(lead.id);
    } else {
      router.push(`/crm/leads/${lead.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="card-interactive flex flex-col gap-3"
    >
      {/* Top Row: Info + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center size-10 shrink-0 rounded-full bg-primary/10 text-primary text-sm font-bold">
            {getInitials(lead.contact_name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-text truncate">
              {lead.contact_name}
            </span>
            <span className="text-xs text-text-muted truncate">
              Tạo: {formatDate(lead.created_at)}
            </span>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
              >
                <Phone className="w-3 h-3" />
                {formatPhone(lead.phone)}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Badge variant={getStatusVariant(lead.status)} dot>
            {statusInfo.label}
          </Badge>
          {potentialInfo && (
            <Badge variant={getPotentialVariant(lead.potential!)} solid className="text-xs px-1.5 py-0">
              {potentialInfo.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Needs & Metrics row */}
      {lead.needs && (
        <div className="text-xs text-text-secondary bg-bg-base/50 p-2 rounded-lg line-clamp-2">
          {lead.needs}
        </div>
      )}

      {/* Bottom Row: Score, Deal Value, Source */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <div className="flex items-center gap-2">
          {sourceInfo && (
            <span className="text-xs text-text-secondary bg-bg-base px-1.5 py-0.5 rounded">
              {sourceInfo.label}
            </span>
          )}
          {lead.score > 0 && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${scoreInfo.color}`}>
              {lead.score} điểm
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {lead.deal_value > 0 ? (
            <span className="text-sm font-semibold text-text">
              {formatCurrency(lead.deal_value)}
            </span>
          ) : (
            <span className="text-sm text-text-muted">—</span>
          )}
          <ChevronRight className="w-4 h-4 text-text-muted ml-1" />
        </div>
      </div>
    </div>
  );
}

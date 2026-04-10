"use client";

import { ChevronRight } from "lucide-react";
import type { CrmLead } from "@/types/crm";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { LEAD_STATUS_MAP, SOURCE_MAP, POTENTIAL_MAP, getScoreLevel } from "@/types/crm";

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

export default function LeadCompactCard({ lead, onClick }: Props) {
  const statusInfo = LEAD_STATUS_MAP[lead.status] || { label: lead.status };
  const potentialInfo = lead.potential ? (POTENTIAL_MAP[lead.potential] || { label: lead.potential }) : null;
  const sourceInfo = lead.source ? (SOURCE_MAP[lead.source] || { label: lead.source }) : null;
  const scoreInfo = getScoreLevel(lead.score || 0);

  return (
    <div
      onClick={() => onClick && onClick(lead.id)}
      className="card-base p-4 hover-lift cursor-pointer transition-all w-full"
    >
      {/* Row 1: Avatar + Name + Status/Value */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
          {getInitials(lead.contact_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-body font-semibold text-text-main truncate">
              {lead.contact_name}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {lead.potential ? (
                <Badge variant={getPotentialVariant(lead.potential)} solid className="px-1.5 py-0 text-tiny">
                  {potentialInfo?.label}
                </Badge>
              ) : null}
              <Badge variant={getStatusVariant(lead.status)} dot>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-caption mt-0.5">
            <span className="text-text-secondary truncate">
              {lead.phone || "Chưa có SĐT"}
            </span>
            <span className="text-text-muted shrink-0">•</span>
            <span className="text-text-muted shrink-0">
              {formatDate(lead.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Tags + Needs + Value */}
      <div className="flex items-center justify-between gap-3 mt-2 pl-[52px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {sourceInfo ? (
            <Badge variant="neutral" className="font-normal text-tiny px-1.5 py-0 shrink-0">
              {sourceInfo.label}
            </Badge>
          ) : null}
          {lead.score > 0 ? (
            <span className={`inline-flex items-center px-1.5 py-0 rounded text-tiny font-medium shrink-0 ${scoreInfo.color}`}>
              {lead.score}pt
            </span>
          ) : null}
          <span className="text-caption text-text-secondary truncate" title={lead.needs || ""}>
            {lead.needs || "Chưa rõ nhu cầu"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead.deal_value > 0 ? (
            <span className="text-sm font-semibold text-text-main">
              {formatCurrency(lead.deal_value)}
            </span>
          ) : null}
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </div>
      </div>
    </div>
  );
}

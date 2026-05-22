"use client";

import { ChevronRight } from "lucide-react";
import type { CrmLead } from "@/types/crm";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CrmRecordCard } from "@/components/crm/crm-record-card";
import { RiskFlagsBadge } from "./risk-flags-badge";
import {
  LEAD_STATUS_MAP,
  POTENTIAL_MAP,
  SOURCE_MAP,
  getScoreLevel,
} from "@/types/crm";

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

const getPotentialVariant = (potential: string): BadgeVariant => {
  return potential === "hot"
    ? "error"
    : potential === "warm"
      ? "warning"
      : "neutral";
};

export default function LeadCompactCard({ lead, onClick }: Props) {
  const statusInfo = LEAD_STATUS_MAP[lead.status] || { label: lead.status };
  const potentialInfo = lead.potential
    ? (POTENTIAL_MAP[lead.potential] || { label: lead.potential })
    : null;
  const sourceInfo = lead.source
    ? (SOURCE_MAP[lead.source] || { label: lead.source })
    : null;
  const scoreInfo = getScoreLevel(lead.score || 0);

  return (
    <CrmRecordCard
      onClick={onClick ? () => onClick(lead.id) : undefined}
      avatar={getInitials(lead.contact_name)}
      title={
        <span className="block truncate text-body font-semibold text-text-main">
          {lead.contact_name}
        </span>
      }
      subtitle={
        <div className="flex items-center gap-1.5 text-caption">
          <span className="truncate text-text-secondary">
            {lead.phone || "Chưa có SĐT"}
          </span>
          <span className="shrink-0 text-text-muted">•</span>
          <span className="shrink-0 text-text-muted">
            {formatDate(lead.created_at)}
          </span>
        </div>
      }
      headerRight={
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {lead.potential ? (
              <Badge
                variant={getPotentialVariant(lead.potential)}
                solid
                className="px-1.5 py-0 text-tiny"
              >
                {potentialInfo?.label}
              </Badge>
            ) : null}
            <Badge variant={getStatusVariant(lead.status)} dot>
              {statusInfo.label}
            </Badge>
          </div>
          <RiskFlagsBadge lead={lead} />
        </div>
      }
      bottom={
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {sourceInfo ? (
              <Badge
                variant="neutral"
                className="shrink-0 px-1.5 py-0 text-tiny font-normal"
              >
                {sourceInfo.label}
              </Badge>
            ) : null}
            {lead.score > 0 ? (
              <span
                className={`inline-flex shrink-0 items-center rounded px-1.5 py-0 text-tiny font-medium ${scoreInfo.color}`}
              >
                {lead.score}pt
              </span>
            ) : null}
            <span
              className="truncate text-caption text-text-secondary"
              title={lead.needs || ""}
            >
              {lead.needs || "Chưa rõ nhu cầu"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lead.deal_value > 0 ? (
              <span className="text-body-sm font-semibold text-text-main">
                {formatCurrency(lead.deal_value)}
              </span>
            ) : null}
            <ChevronRight className="h-4 w-4 text-text-muted" />
          </div>
        </div>
      }
    />
  );
}

"use client";

import { ChevronRight } from "lucide-react";
import type { CrmLead } from "@/types/crm";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { LEAD_STATUS_MAP, SOURCE_MAP, POTENTIAL_MAP, getScoreLevel } from "@/types/crm";

// ═══════════════════════════════════════════
// LeadTable — Desktop table (hidden lg:block)
// Phase 02: strictly adheres to SSOT component tokens
// ═══════════════════════════════════════════

interface Props {
  leads: CrmLead[];
  onRowClick?: (leadId: string) => void;
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

export default function LeadTable({ leads, onRowClick }: Props) {
  return (
    <TableWrapper>
      <THead>
        <TR>
          <TH className="w-[25%]">Khách hàng</TH>
          <TH className="w-[10%]">Liên hệ</TH>
          <TH className="w-[10%]">Nguồn</TH>
          <TH className="w-[15%]">Nhu cầu</TH>
          <TH className="w-[8%]">Score</TH>
          <TH className="w-[12%]">Deal Value</TH>
          <TH className="w-[10%]">Trạng thái</TH>
          <TH className="w-[8%]">Tiềm năng</TH>
          <TH className="w-auto" />
        </TR>
      </THead>
      <TBody>
        {leads.map((lead) => {
          const statusInfo = LEAD_STATUS_MAP[lead.status] || { label: lead.status };
          const potentialInfo = lead.potential ? (POTENTIAL_MAP[lead.potential] || { label: lead.potential }) : null;
          const sourceInfo = lead.source ? (SOURCE_MAP[lead.source] || { label: lead.source }) : null;
          const scoreInfo = getScoreLevel(lead.score || 0);

          return (
            <TR
              key={lead.id}
              onClick={() => onRowClick && onRowClick(lead.id)}
            >
              <TD>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-9 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(lead.contact_name)}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium text-text truncate">
                      {lead.contact_name}
                    </span>
                    <span className="text-xs text-text-muted mt-0.5 truncate">
                      Tạo: {formatDate(lead.created_at)}
                    </span>
                  </div>
                </div>
              </TD>
              <TD>
                {lead.phone ? (
                  <span className="text-sm text-text-secondary">{lead.phone}</span>
                ) : (
                  <span className="text-sm text-text-muted">—</span>
                )}
              </TD>
              <TD>
                {sourceInfo ? (
                  <Badge variant="neutral" className="font-normal text-xs">{sourceInfo.label}</Badge>
                ) : (
                  <span className="text-sm text-text-muted">—</span>
                )}
              </TD>
              <TD>
                <span className="text-sm text-text-secondary line-clamp-2 max-w-[200px]" title={lead.needs || ""}>
                  {lead.needs || "—"}
                </span>
              </TD>
              <TD>
                {lead.score > 0 ? (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${scoreInfo.color}`}>
                    {lead.score}
                  </span>
                ) : (
                  <span className="text-sm text-text-muted">—</span>
                )}
              </TD>
              <TD className="text-sm font-medium text-text">
                {lead.deal_value > 0 ? formatCurrency(lead.deal_value) : "—"}
              </TD>
              <TD>
                <Badge variant={getStatusVariant(lead.status)} dot>
                  {statusInfo.label}
                </Badge>
              </TD>
              <TD>
                {lead.potential ? (
                  <Badge variant={getPotentialVariant(lead.potential)} solid>
                    {potentialInfo?.label}
                  </Badge>
                ) : (
                  <span className="text-sm text-text-muted">—</span>
                )}
              </TD>
              <TD className="px-2 text-right">
                <ChevronRight className="w-5 h-5 text-text-muted inline-block" />
              </TD>
            </TR>
          );
        })}
      </TBody>
    </TableWrapper>
  );
}

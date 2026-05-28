"use client";

import { AlertCircle } from "lucide-react";
import type { CrmLead } from "@/types/crm";

export function getRiskFlags(lead: CrmLead) {
  const flags: string[] = [];
  
  // Bỏ qua nếu đã chốt hoặc đã huỷ
  if (lead.status === "da_chot" || lead.status === "huy") {
    return flags;
  }

  // No next step
  if (!lead.next_contact_date) {
    flags.push("No next step");
  }

  // Stale deal (> 14 days no update)
  const lastUpdate = new Date(lead.updated_at || lead.created_at).getTime();
  const now = new Date().getTime();
  const daysSince = (now - lastUpdate) / (1000 * 60 * 60 * 24);
  if (daysSince > 14) {
    flags.push("Stale deal");
  }

  return flags;
}

export function RiskFlagsBadge({ lead }: { lead: CrmLead }) {
  const flags = getRiskFlags(lead);
  
  if (flags.length === 0) return null;

  return (
    <div className="flex gap-1 shrink-0" title={flags.join(", ")}>
      {flags.map(flag => (
        <div key={flag} className="flex h-fit py-0.5 px-1.5 shrink-0 items-center justify-center rounded-full bg-error/10 border border-error/20 gap-1 text-micro font-medium text-error">
          <AlertCircle className="w-3 h-3" />
          <span>{flag}</span>
        </div>
      ))}
    </div>
  );
}

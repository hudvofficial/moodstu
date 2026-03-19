import { FileText, Calendar, Tag } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Contract, Customer } from "@/types/contract";
import {
  CONTRACT_STATUS_MAP,
  getServiceLabel,
} from "@/types/contract-constants";
import { Badge } from "@/components/ui/badge";

// ═══════════════════════════════════════════
// SummaryCard — Contract headline info
// Phase 04b: Mã HĐ, KH, DV, ngày, status badge
// V1 Ref: details/SummaryCard.tsx (port logic, V2 styling)
// ═══════════════════════════════════════════

interface Props {
  contract: Contract;
  customer: Customer | null;
  embedded?: boolean;
}

export default function SummaryCard({ contract, customer, embedded }: Props) {
  const statusInfo = CONTRACT_STATUS_MAP[contract.status];

  return (
    <div className={embedded ? "" : "px-4 pt-2 pb-3 max-lg:pt-0"}>
      {/* ══════════ MOBILE COMPACT ══════════ Stitch lines 59-71 */}
      <div className="lg:hidden">
        {/* 2 pills: status + service type */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={statusInfo.variant} dot>
            {statusInfo.label}
          </Badge>
          <Badge variant="neutral">
            {getServiceLabel(contract.service_type)}
          </Badge>
        </div>
        {/* Customer name — text-xl bold */}
        <h1 className="text-h2 text-text-primary leading-tight">
          {customer?.full_name || contract.contract_code}
        </h1>
      </div>

      {/* ══════════ DESKTOP ORIGINAL ══════════ */}
      <div className="max-lg:hidden">
        {/* Row 1: Code + Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-primary shrink-0" />
              <span className="text-label">Hợp đồng</span>
            </div>
            <h1 className="text-h2 truncate">{contract.contract_code}</h1>
          </div>

          {/* Status Badge */}
          <Badge variant={statusInfo.variant} dot>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Row 2: Info grid */}
        <div className="grid grid-cols-4 gap-4">
          {/* Khách hàng */}
          <InfoItem
            label="Khách hàng"
            value={customer?.full_name || "—"}
            bold
          />

          {/* Gói dịch vụ */}
          <InfoItem
            label="Gói dịch vụ"
            value={getServiceLabel(contract.service_type)}
            icon={<Tag size={13} className="text-accent" />}
            accent
          />

          {/* Ngày ký */}
          <InfoItem
            label="Ngày ký"
            value={
              contract.contract_date
                ? formatDate(contract.contract_date)
                : "Chưa xác định"
            }
            icon={<Calendar size={13} className="text-text-muted" />}
          />

          {/* Ngày làm */}
          <InfoItem
            label="Ngày làm việc"
            value={
              contract.work_date
                ? formatDate(contract.work_date)
                : "Chưa xác định"
            }
            icon={<Calendar size={13} className="text-text-muted" />}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Helper: Info item ────────────────────────

function InfoItem({
  label,
  value,
  icon,
  bold,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-caption mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <p
          className={`text-body-sm truncate ${
            bold
              ? "font-bold text-text-primary"
              : accent
                ? "font-semibold text-primary"
                : "text-text-primary"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

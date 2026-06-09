"use client";

import { ChevronRight, FilterX } from "lucide-react";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/ux-states";
import { TierSwitch } from "@/components/ui/tier-switch";
import { formatDate, getInitials } from "@/lib/utils";
import type { Customer } from "@/types/crm";
import { SOURCE_MAP, TAG_PRESETS } from "@/types/crm";
import CustomerCard from "@/components/crm/customer-card";

interface CustomersTableProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onHover?: (id: string) => void;
}

// ─── HELPERS ─────────────────────────────────────

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "---";
  return formatDate(dateStr);
}

function getSourceInfo(source: string | null) {
  if (!source) return { label: "Chưa rõ", color: "text-text-muted", bg: "bg-bg-muted" };
  return SOURCE_MAP[source] || { label: source, color: "text-text-secondary", bg: "bg-bg-subtle" };
}

function getTagStyle(tagLabel: string) {
  const preset = TAG_PRESETS.find((p) => p.label === tagLabel);
  return preset ? preset.color : "bg-bg-muted text-text-secondary border-border";
}

// ─── DESKTOP TABLE ───────────────────────────────

function DesktopTable({ customers, onView, onHover }: CustomersTableProps) {
  return (
    <div>
      <TableWrapper>
        <THead>
          <tr>
            <TH>Mã KH</TH>
            <TH>Khách hàng</TH>
            <TH>Ngày tạo</TH>
            <TH>Phân loại/Tags</TH>
            <TH>Nguồn</TH>
            <TH className="text-right">Thao tác</TH>
          </tr>
        </THead>
        <TBody>
          {customers.map((c) => {
            const src = getSourceInfo(c.source);

            return (
              <TR
                key={c.id}
                onClick={() => onView(c)}
                onMouseEnter={() => onHover?.(c.id)}
              >
                <TD>
                  <span className="font-semibold text-text-main">
                    {c.customer_code}
                  </span>
                </TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary shrink-0">
                      {getInitials(c.full_name)}
                    </div>
                    <div>
                      <div className="font-medium text-text-main group-hover:underline underline-offset-4 decoration-primary/30">
                        {c.full_name}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {c.phone || "Chưa có SĐT"}
                      </div>
                    </div>
                  </div>
                </TD>
                <TD className="text-text-secondary">
                  {fmtDate(c.created_at)}
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {c.tags && c.tags.length > 0 ? (
                      c.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-tiny px-1.5 py-0.5 rounded-md border ${getTagStyle(tag)}`}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </div>
                </TD>
                <TD>
                  {c.source ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md ${src.bg} ${src.color}`}
                      style={{ backgroundColor: src.bg?.startsWith('#') ? src.bg : undefined, color: src.color?.startsWith('#') ? src.color : undefined }}
                    >
                      {src.label}
                    </span>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </TD>
                <TD className="text-right">
                  <div className="h-8 w-8 inline-flex items-center justify-center rounded-md shadow-xs bg-bg-card text-text-secondary group-hover:bg-primary group-hover:text-white group-hover:shadow-sm transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </TableWrapper>
    </div>
  );
}

// ─── MOBILE CARD LIST ────────────────────────────

function MobileCardList({ customers, onView }: CustomersTableProps) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      {customers.map((c) => (
        <CustomerCard
          key={c.id}
          customer={c}
          onClick={onView}
        />
      ))}
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────

export function CustomersTable(props: CustomersTableProps) {
  if (props.customers.length === 0) {
    return (
      <EmptyState
        icon={FilterX}
        title="Không có dữ liệu"
        description="Không tìm thấy khách hàng nào phù hợp."
      />
    );
  }
  return (
    <TierSwitch
      phone={<MobileCardList {...props} />}
      desktop={<DesktopTable {...props} />}
    />
  );
}

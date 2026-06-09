"use client";

import { memo, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, FileText, Pencil } from "lucide-react";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import type { ServiceRecord } from "@/types/service";
import { SERVICE_TYPE_LABELS, SERVICE_UNIT_LABELS } from "@/types/service-constants";
import type { ServiceType, ServiceUnit } from "@/types/service-constants";
import { parseContentStructure } from "@/lib/utils/service-utils";
import { formatVnd } from "@/lib/utils";

interface Props {
  services: ServiceRecord[];
  onQuote: (service: ServiceRecord) => void;
  onEdit: (id: string) => void;
  onPrefetch?: (id: string) => void;
}

function ServiceTableInner({ services, onQuote, onEdit, onPrefetch }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);



  return (
    <div>
      <TableWrapper>
        <THead>
          <tr>
            <TH className="w-10" />
            <TH>Tên dịch vụ</TH>
            <TH>Danh mục</TH>
            <TH className="text-right">Giá bán</TH>
            <TH className="w-24 text-center">Thao tác</TH>
          </tr>
        </THead>
        <TBody>
          {services.map((service) => {
            const isExpanded = expandedId === service.id;
            const sections = isExpanded ? parseContentStructure(service.description) : [];
            const unitLabel = SERVICE_UNIT_LABELS[service.unit as ServiceUnit] || service.unit;
            const typeLabel = SERVICE_TYPE_LABELS[service.service_type as ServiceType] || service.service_type;

            return (
              <ServiceTableRow
                key={service.id}
                service={service}
                isExpanded={isExpanded}
                sections={sections}
                unitLabel={unitLabel}
                typeLabel={typeLabel}

                onToggle={() => toggleExpand(service.id)}
                onQuote={() => onQuote(service)}
                onEdit={() => onEdit(service.id)}
                onPrefetch={() => onPrefetch?.(service.id)}
              />
            );
          })}
        </TBody>
      </TableWrapper>
    </div>
  );
}

// ── Memoized Row Component ───────────────────────

interface RowProps {
  service: ServiceRecord;
  isExpanded: boolean;
  sections: { title: string; items: string[] }[];
  unitLabel: string;
  typeLabel: string;

  onToggle: () => void;
  onQuote: () => void;
  onEdit: () => void;
  onPrefetch?: () => void;
}

const ServiceTableRow = memo(function ServiceTableRow({
  service,
  isExpanded,
  sections,
  unitLabel,
  typeLabel,
  onToggle,
  onQuote,
  onEdit,
  onPrefetch,
}: RowProps) {
  return (
    <>
      <TR onClick={onToggle} onMouseEnter={onPrefetch}>
        <TD className="w-10 text-center">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </TD>
        <TD>
          <div className="flex flex-col">
            <span className="font-medium text-text-main">{service.name}</span>
            <span className="text-caption text-text-muted">
              {typeLabel} · {unitLabel} · {service.service_code}
            </span>
          </div>
        </TD>
        <TD>
          <span className="text-sm text-text-secondary">
            {service.category?.name || "—"}
          </span>
        </TD>
        <TD className="text-right">
          <span className="font-semibold text-text-main">
            {formatVnd(Number(service.selling_price))}
          </span>
        </TD>
        <TD className="w-24 text-center">
          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* eslint-disable-next-line react/forbid-elements */}
            <button
              onClick={(e) => { e.stopPropagation(); onQuote(); }}
              className="btn-icon"
              title="Báo giá"
            >
              <FileText className="w-4 h-4" />
            </button>
            {/* eslint-disable-next-line react/forbid-elements */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              onMouseEnter={onPrefetch}
              onFocus={onPrefetch}
              className="btn-icon"
              title="Chỉnh sửa"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </TD>
      </TR>

      {/* Expanded content */}
      {isExpanded && sections.length > 0 && (
        <tr>
          <td colSpan={5} className="px-4 py-4 bg-bg-base/60">
            <div className="grid grid-cols-3 gap-6 pl-10">
              {sections.map((section, idx) => (
                <div key={idx}>
                  <h4 className="text-label text-primary mb-2">{section.title}</h4>
                  <ul className="space-y-1">
                    {section.items.map((item, j) => (
                      <li key={j} className="text-caption text-text-secondary flex items-start gap-1.5">
                        <span className="text-text-muted mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

export default memo(ServiceTableInner);

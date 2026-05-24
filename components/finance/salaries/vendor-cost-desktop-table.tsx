"use client";

import { formatCurrency, formatPhone } from "@/lib/utils";
import type { VendorCostItem } from "@/types/finance-operations";

interface VendorCostDesktopTableProps {
  items: VendorCostItem[];
}

export function VendorCostDesktopTable({ items }: VendorCostDesktopTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
        <p className="text-body text-text-muted">
          Không có chi phí thợ ngoài trong tháng này
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-xs">
      <table className="w-full">
        <thead className="border-b border-border bg-elevated">
          <tr>
            <th className="px-4 py-3 text-left text-caption font-semibold text-text-secondary uppercase tracking-wide">
              Thợ ngoài
            </th>
            <th className="px-4 py-3 text-left text-caption font-semibold text-text-secondary uppercase tracking-wide">
              Loại dịch vụ
            </th>
            <th className="px-4 py-3 text-center text-caption font-semibold text-text-secondary uppercase tracking-wide">
              Số job
            </th>
            <th className="px-4 py-3 text-right text-caption font-semibold text-text-secondary uppercase tracking-wide">
              Tổng chi phí
            </th>
            <th className="px-4 py-3 text-left text-caption font-semibold text-text-secondary uppercase tracking-wide">
              Hợp đồng
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.vendor_id}
              className={`border-b border-border last:border-0 hover:bg-hover/30 transition-colors ${
                index % 2 === 0 ? "" : "bg-elevated/30"
              }`}
            >
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="font-semibold text-text-primary">
                    {item.vendor_name}
                  </span>
                  {item.vendor_phone && (
                    <span className="text-tiny text-text-muted">
                      {formatPhone(item.vendor_phone)}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-body-sm text-text-secondary">
                {item.service_type || "—"}
              </td>
              <td className="px-4 py-3 text-center text-body-sm font-medium text-text-primary">
                {item.job_count}
              </td>
              <td className="px-4 py-3 text-right text-body font-semibold text-primary">
                {formatCurrency(item.total_cost)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {item.contracts.slice(0, 3).map((code) => (
                    <span
                      key={code}
                      className="inline-block rounded bg-primary/10 px-2 py-0.5 text-tiny text-primary"
                    >
                      {code}
                    </span>
                  ))}
                  {item.contracts.length > 3 && (
                    <span className="inline-block px-2 py-0.5 text-tiny text-text-muted">
                      +{item.contracts.length - 3}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

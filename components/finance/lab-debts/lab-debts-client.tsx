"use client";

import { useEffect } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { fetchLabDebts } from "@/app/actions/finance-operations-queries";
import { formatVnd } from "@/components/finance/finance-format";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, useSWR } from "@/lib/swr";
import type { ActionResult, LabDebtItem } from "@/types/finance-operations";

interface LabDebtsClientProps {
  initialData: LabDebtItem[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function LabDebtsClient({ initialData }: LabDebtsClientProps) {
  const { data, error, isLoading } = useSWR(cacheKeys.labDebts(), () => requireData(fetchLabDebts()), { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được công nợ lab.");
  }, [error]);

  const items = data || initialData;

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="icon-box bg-info/10">
          <FlaskConical className="w-4 h-4 text-info" />
        </div>
        <div>
          <h1 className="text-h1">Công nợ lab</h1>
          <p className="text-body-sm text-text-secondary">Tổng hợp đơn in chưa thanh toán theo từng lab.</p>
        </div>
      </div>

      <section className="entrance entrance-1">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Lab</TH>
                <TH className="text-right">Số đơn</TH>
                <TH className="text-right">Tổng đơn</TH>
                <TH className="text-right">Đã trả</TH>
                <TH className="text-right">Còn nợ</TH>
              </TR>
            </THead>
            <TBody>
              {items.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="py-7 text-center text-text-muted">
                    Không có công nợ lab.
                  </TD>
                </TR>
              ) : (
                items.map((item) => (
                  <TR key={item.lab_id}>
                    <TD className="font-semibold text-text-primary">{item.lab_name}</TD>
                    <TD className="text-right tabular-nums">{item.order_count}</TD>
                    <TD className="text-right tabular-nums">{formatVnd(item.total_orders)}</TD>
                    <TD className="text-right tabular-nums">{formatVnd(item.total_paid)}</TD>
                    <TD className="text-right tabular-nums font-bold text-error">{formatVnd(item.remaining)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </TableWrapper>
        )}
      </section>
    </>
  );
}

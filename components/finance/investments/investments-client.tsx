"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Edit, Landmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInvestment } from "@/app/actions/investment-actions";
import { fetchInvestments } from "@/app/actions/finance-operations-queries";
import { formatFinanceDate, formatVnd, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { InvestmentFormModal } from "@/components/finance/investments/investment-form-modal";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, InvestmentItem } from "@/types/finance-operations";

interface InvestmentsClientProps {
  initialData: InvestmentItem[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function InvestmentsClient({ initialData }: InvestmentsClientProps) {
  const [editing, setEditing] = useState<InvestmentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const key = cacheKeys.financeInvestments();
  const { data, error, isLoading } = useSWR(key, () => requireData(fetchInvestments()), { fallbackData: initialData });

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được tài sản.");
  }, [error]);

  const items = data || initialData;
  const summary = useMemo(
    () => items.reduce((acc, item) => ({ purchase: acc.purchase + item.purchase_price, book: acc.book + item.book_value }), { purchase: 0, book: 0 }),
    [items],
  );

  const refresh = () => void mutate(key);

  const remove = async (item: InvestmentItem) => {
    if (!window.confirm(`Xóa tài sản ${item.name}?`)) return;
    setBusyId(item.id);
    const result = await deleteInvestment(item.id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa tài sản.");
    refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-primary/10">
            <Landmark className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-h1">Tài sản đầu tư</h1>
            <p className="text-body-sm text-text-secondary">Theo dõi giá trị còn lại, khấu hao và lịch bảo trì.</p>
          </div>
        </div>
        <Button type="button" onClick={handleOpenCreate} className="btn-cta gap-2">
          <Plus className="w-4 h-4" />
          Thêm tài sản
        </Button>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 entrance entrance-1">
        <div className="stats-card">
          <div className="text-caption text-text-muted">Tổng giá mua</div>
          <div className="text-h2 tabular-nums">{formatVnd(summary.purchase)}</div>
        </div>
        <div className="stats-card">
          <div className="text-caption text-text-muted">Giá trị sổ sách</div>
          <div className="text-h2 tabular-nums text-success">{formatVnd(summary.book)}</div>
        </div>
      </section>

      <section className="entrance entrance-2">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Tài sản</TH>
                <TH>Ngày mua</TH>
                <TH className="text-right">Giá mua</TH>
                <TH className="text-right">Giá trị còn lại</TH>
                <TH>Bảo trì</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <div className="font-semibold text-text-primary">{item.name}</div>
                    <div className="text-caption text-text-muted">{item.category} · {item.location || "Chưa có vị trí"}</div>
                  </TD>
                  <TD>{formatFinanceDate(item.purchase_date)}</TD>
                  <TD className="text-right tabular-nums">{formatVnd(item.purchase_price)}</TD>
                  <TD className="text-right tabular-nums font-bold">{formatVnd(item.book_value)}</TD>
                  <TD>
                    <span className={item.maintenance_due ? "badge badge-warning" : `badge badge-${financeStatusVariant(item.status)}`}>
                      {item.maintenance_due ? "Đến hạn" : financeStatusLabel(item.status)}
                    </span>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(item); setIsModalOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} disabled={busyId === item.id} className="text-error">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
              {items.length === 0 && (
                <TR>
                  <TD colSpan={6} className="py-7 text-center text-text-muted">
                    Chưa có tài sản đầu tư.
                  </TD>
                </TR>
              )}
            </TBody>
          </TableWrapper>
        )}
      </section>

      {isModalOpen && (
        <InvestmentFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSaved={refresh} item={editing} />
      )}
    </>
  );
}

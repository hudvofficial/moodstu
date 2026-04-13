"use client";

import { useEffect, useState } from "react";
import { Edit, Plus, Repeat, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { generateMonthlyFixedCosts } from "@/app/actions/expense-actions";
import { deleteFixedCost } from "@/app/actions/fixed-cost-actions";
import { fetchFixedCosts } from "@/app/actions/finance-operations-queries";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { FixedCostFormModal } from "@/components/finance/fixed-costs/fixed-cost-form-modal";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, FixedCostItem } from "@/types/finance-operations";

interface FixedCostsClientProps {
  initialData: FixedCostItem[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function FixedCostsClient({ initialData }: FixedCostsClientProps) {
  const [editing, setEditing] = useState<FixedCostItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = cacheKeys.financeFixedCosts();
  const { data, error, isLoading } = useSWR(key, () => requireData(fetchFixedCosts()), { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được chi phí cố định.");
  }, [error]);

  const items = data || initialData;
  const now = new Date();

  const refresh = () => void mutate(key);

  const openCreate = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const runGenerate = async () => {
    setBusy(true);
    const result = await generateMonthlyFixedCosts(now.getMonth() + 1, now.getFullYear());
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Đã tạo ${result.data.created} phiếu chi cố định.`);
    void mutate(cacheKeys.financeExpenses(1, now.getMonth() + 1, now.getFullYear(), "all"));
  };

  const remove = async (item: FixedCostItem) => {
    if (!window.confirm(`Xóa ${item.cost_name}?`)) return;
    setBusy(true);
    const result = await deleteFixedCost(item.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa chi phí cố định.");
    refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-primary/10">
            <Repeat className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-h1">Chi phí cố định</h1>
            <p className="text-body-sm text-text-secondary">Danh sách khoản chi lặp và sinh phiếu chi theo tháng.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row">
          <Button type="button" variant="interactive" onClick={runGenerate} disabled={busy} className="gap-2">
            <Wand2 className="w-4 h-4" />
            Sinh tháng này
          </Button>
          <Button type="button" onClick={openCreate} className="btn-cta gap-2">
            <Plus className="w-4 h-4" />
            Thêm chi phí
          </Button>
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
                <TH>Tên</TH>
                <TH>Loại</TH>
                <TH className="text-right">Tháng</TH>
                <TH>Hiệu lực</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <div className="font-semibold text-text-primary">{item.cost_name}</div>
                    <div className="text-caption text-text-muted">{item.cost_code}</div>
                  </TD>
                  <TD><span className="tag-badge">{item.cost_type || "Khác"}</span></TD>
                  <TD className="text-right tabular-nums font-bold">{formatVnd(item.monthly_amount || 0)}</TD>
                  <TD>{formatFinanceDate(item.start_date)} - {formatFinanceDate(item.end_date)}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(item); setIsModalOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} disabled={busy} className="text-error">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
              {items.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-7 text-center text-text-muted">
                    Chưa có chi phí cố định.
                  </TD>
                </TR>
              )}
            </TBody>
          </TableWrapper>
        )}
      </section>

      {isModalOpen && (
        <FixedCostFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={refresh} item={editing} />
      )}
    </>
  );
}

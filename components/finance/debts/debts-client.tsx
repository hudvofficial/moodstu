"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, HandCoins, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDebt, updateDebt } from "@/app/actions/debt-actions";
import { fetchDebts } from "@/app/actions/finance-operations-queries";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { DebtFormModal } from "@/components/finance/debts/debt-form-modal";
import { GhostScanWidget } from "@/components/finance/integrity/ghost-scan-widget";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, DebtListItem, IntegrityReportItem } from "@/types/finance-operations";

interface DebtsClientProps {
  initialData: DebtListItem[];
  initialIntegrity: IntegrityReportItem[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function debtBadge(item: DebtListItem) {
  if (item.status === "da_thanh_toan") return { className: "badge badge-success", label: "Đã thanh toán" };
  if (item.days_overdue > 0) return { className: "badge badge-error", label: `Quá hạn ${item.days_overdue} ngày` };
  return { className: "badge badge-warning", label: "Đang nợ" };
}

export function DebtsClient({ initialData, initialIntegrity }: DebtsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const key = cacheKeys.debts();
  const { data, error, isLoading } = useSWR(key, async () => { const r = await requireData(fetchDebts()); return r.items; }, { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được công nợ.");
  }, [error]);

  const debts = data || initialData;
  const summary = useMemo(() => {
    return debts.reduce(
      (acc, item) => {
        if (item.type.toLowerCase().includes("thu")) acc.receivable += item.remaining;
        else acc.payable += item.remaining;
        if (item.days_overdue > 0) acc.overdue += item.remaining;
        return acc;
      },
      { receivable: 0, payable: 0, overdue: 0 },
    );
  }, [debts]);

  const refresh = () => {
    void mutate(key);
    void mutate(cacheKeys.financeDashboard(new Date().getMonth() + 1, new Date().getFullYear()));
  };

  const markPaid = async (item: DebtListItem) => {
    setBusyId(item.id);
    const result = await updateDebt(item.id, { status: "da_thanh_toan" }, item.updated_at || undefined);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã đánh dấu thanh toán.");
    refresh();
  };

  const remove = async (item: DebtListItem) => {
    if (!window.confirm(`Xóa công nợ ${item.entity_name}?`)) return;
    setBusyId(item.id);
    const result = await deleteDebt(item.id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa công nợ.");
    refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-warning/10">
            <HandCoins className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h1 className="text-h1">Công nợ khách hàng</h1>
            <p className="text-body-sm text-text-secondary">Theo dõi phải thu, phải trả và khoản quá hạn.</p>
          </div>
        </div>
        <Button type="button" onClick={() => setIsModalOpen(true)} className="btn-cta gap-2">
          <Plus className="w-4 h-4" />
          Thêm công nợ
        </Button>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 entrance entrance-1">
        <div className="stats-card">
          <div className="text-caption text-text-muted">Phải thu</div>
          <div className="text-h2 tabular-nums text-success">{formatVnd(summary.receivable)}</div>
        </div>
        <div className="stats-card">
          <div className="text-caption text-text-muted">Phải trả</div>
          <div className="text-h2 tabular-nums text-error">{formatVnd(summary.payable)}</div>
        </div>
        <div className="stats-card">
          <div className="text-caption text-text-muted">Quá hạn</div>
          <div className="text-h2 tabular-nums text-warning">{formatVnd(summary.overdue)}</div>
        </div>
      </section>

      <section className="detail-grid entrance entrance-2">
        <div className="detail-main space-y-3">
          {isLoading && !data ? (
            <SkeletonCard />
          ) : debts.length === 0 ? (
            <div className="card-base p-5 text-center text-text-muted">Chưa có công nợ.</div>
          ) : (
            debts.map((item) => {
              const badge = debtBadge(item);
              return (
                <article key={item.id} className={item.days_overdue > 0 ? "card-interactive overdue-indicator p-4" : "card-interactive p-4"}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-h3">{item.entity_name}</h2>
                        <span className={badge.className}>{badge.label}</span>
                        <span className="tag-badge">{item.type}</span>
                      </div>
                      <p className="text-body-sm text-text-secondary">
                        Hạn: {formatFinanceDate(item.due_date)} · Nhóm: {item.entity_type}
                      </p>
                    </div>
                    <div className="text-left lg:text-right">
                      <div className="tabular-nums font-bold text-h3">{formatVnd(item.remaining)}</div>
                      <div className="text-caption text-text-muted">Gốc {formatVnd(item.amount)}</div>
                    </div>
                    <div className="flex gap-2">
                      {item.status !== "da_thanh_toan" && (
                        <Button type="button" variant="interactive" size="sm" onClick={() => markPaid(item)} disabled={busyId === item.id}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} disabled={busyId === item.id} className="text-error">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
        <div className="detail-sidebar">
          <GhostScanWidget initialData={initialIntegrity} />
        </div>
      </section>

      <DebtFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={refresh} />
    </>
  );
}

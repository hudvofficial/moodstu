"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { BookLock, Plus } from "lucide-react";
import { toast } from "sonner";
import { listCloses } from "@/app/actions/finance-close-actions";
import { formatFinanceDate, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { CloseCreateModal } from "@/components/finance/closes/close-create-modal";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, CloseListItem } from "@/types/finance-operations";

interface ClosesClientProps {
  initialYear: number;
  initialData: CloseListItem[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function ClosesClient({ initialYear, initialData }: ClosesClientProps) {
  const [year, setYear] = useState(initialYear);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const key = cacheKeys.financeCloses(year);
  const { yearOptions } = useFinanceFilters(initialYear);
  const handleYearChange = useCallback((value: string) => setYear(Number(value)), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const { data, error, isLoading } = useSWR(key, () => requireData(listCloses(year)), { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được kỳ chốt sổ.");
  }, [error]);

  const closes = data || initialData;
  const refresh = () => void mutate(key);
  const now = new Date();

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-primary/10">
            <BookLock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-h1">Chốt sổ</h1>
            <p className="text-body-sm text-text-secondary">Workflow 8 bước cho mỗi kỳ tài chính.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row">
          <SimpleSelect value={String(year)} onChange={handleYearChange} options={yearOptions} />
          <Button type="button" onClick={openModal} className="btn-cta gap-2">
            <Plus className="w-4 h-4" />
            Tạo kỳ chốt
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
                <TH>Kỳ</TH>
                <TH>Trạng thái</TH>
                <TH>Khóa bởi</TH>
                <TH>Cập nhật</TH>
                <TH>Chi tiết</TH>
              </TR>
            </THead>
            <TBody>
              {closes.map((item) => (
                <TR key={item.id}>
                  <TD className="font-semibold text-text-primary">{item.period}</TD>
                  <TD>
                    <span className={`badge badge-${financeStatusVariant(item.status)}`}>
                      {financeStatusLabel(item.status)}
                    </span>
                  </TD>
                  <TD>{item.locked_user_name || "-"}</TD>
                  <TD>{formatFinanceDate(item.updated_at || item.created_at)}</TD>
                  <TD>
                    <Link className="link-base" href={`/finance/closes/${item.id}`}>
                      Mở kỳ
                    </Link>
                  </TD>
                </TR>
              ))}
              {closes.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-7 text-center text-text-muted">
                    Chưa có kỳ chốt sổ trong năm này.
                  </TD>
                </TR>
              )}
            </TBody>
          </TableWrapper>
        )}
      </section>

      <CloseCreateModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSaved={refresh}
        initialMonth={now.getMonth() + 1}
        initialYear={now.getFullYear()}
      />
    </>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ReceiptText } from "lucide-react";
import { fetchLedger } from "@/app/actions/finance-dashboard-queries";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { LedgerDesktopTable } from "@/components/finance/cashflow/ledger-desktop-table";
import { LedgerMobileList } from "@/components/finance/cashflow/ledger-mobile-list";
import { Pagination } from "@/components/ui/pagination";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { cacheKeys, useSWR } from "@/lib/swr";
import type { LedgerItem, PaginatedResult } from "@/types/finance-dashboard";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };
type LedgerType = "all" | "in" | "out";

interface LedgerClientProps {
  initialMonth: number;
  initialYear: number;
  initialLedger: PaginatedResult<LedgerItem>;
}

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "in", label: "Thu" },
  { value: "out", label: "Chi" },
];

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function LedgerClient({ initialMonth, initialYear, initialLedger }: LedgerClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [type, setType] = useState<LedgerType>("all");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);
  const handleMonthChange = useCallback((value: string) => {
    setMonth(Number(value));
    setPage(1);
  }, []);
  const handleYearChange = useCallback((value: string) => {
    setYear(Number(value));
    setPage(1);
  }, []);
  const handleTypeChange = useCallback((value: string) => {
    setType(value as LedgerType);
    setPage(1);
  }, []);
  const key = cacheKeys.financeLedger(page, month, year, type);

  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(fetchLedger({ page, pageSize, month, year, type })),
    { fallbackData: initialLedger }
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được sổ cái thu chi.");
  }, [error]);

  const ledger = data || initialLedger;
  const totalPages = Math.max(1, Math.ceil(ledger.total / ledger.pageSize));



  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-primary/10">
            <ReceiptText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-h1">Sổ cái thu chi</h1>
            <p className="text-body-sm text-text-secondary">Dòng tiền từ phiếu thu, thanh toán hợp đồng và phiếu chi.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 lg:min-w-[460px]">
          <SimpleSelect value={String(month)} onChange={handleMonthChange} options={monthOptions} />
          <SimpleSelect value={String(year)} onChange={handleYearChange} options={yearOptions} />
          <SimpleSelect value={type} onChange={handleTypeChange} options={TYPE_OPTIONS} />
        </div>
      </div>

      <section className="entrance entrance-1">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <>
            <LedgerDesktopTable items={ledger.items} />
            <LedgerMobileList items={ledger.items} />
          </>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <p className="text-center text-caption text-text-muted">
        Hiển thị {ledger.items.length} / {ledger.total} giao dịch
      </p>
    </>
  );
}

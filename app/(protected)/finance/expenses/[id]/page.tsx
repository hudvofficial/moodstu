import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getExpenseDetail } from "@/app/actions/finance-operations-queries";
import { formatVnd, financeStatusVariant, financeStatusLabel } from "@/components/finance/finance-format";
import { readMoney } from "@/lib/finance-utils";
import { PrintActions } from "./print-actions";
import { notFound } from "next/navigation";
import { getStudioInfo } from "@/app/actions/settings-queries";

export default async function ExpenseDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  const [expenseRes, studioRes] = await Promise.all([
    getExpenseDetail(params.id),
    getStudioInfo()
  ]);

  if (!expenseRes.success || !expenseRes.data) {
    notFound();
  }

  const expense = expenseRes.data;
  const studioInfo = studioRes.success ? studioRes.data : null;

  // Format Data
  const expenseDate = new Date(expense.expense_date);
  const formattedDate = `Ngày ${format(expenseDate, "dd")} tháng ${format(expenseDate, "MM")} năm ${format(expenseDate, "yyyy")}`;

  const statusColorMap: Record<string, string> = {
    error: "border-error text-error",
    success: "border-success text-success",
    warning: "border-warning text-warning",
    default: "border-border text-text-secondary"
  };

  const pseudoStatus = expense.approved_by ? "approved" : "pending";
  const statusVariant = financeStatusVariant(pseudoStatus);
  const statusColor = statusColorMap[statusVariant] || statusColorMap.default;
  const statusLabel = financeStatusLabel(pseudoStatus);

  const refCode = `EXP-${expense.id.slice(0, 8).toUpperCase()}`;
  const expenseCode = expense.contract_code
    ? `PC-${expense.contract_code}`
    : `PC-${format(expenseDate, "yyMM")}-${expense.id.slice(0, 3).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-surface-base flex flex-col pt-4 lg:pt-6">
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 grow">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-4 print:hidden">
          <Link
            href="/finance/expenses"
            className="flex items-center gap-1 text-label text-text-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Về danh sách
          </Link>
          <PrintActions />
        </div>

        {/* Desktop Breadcrumbs */}
        <div className="hidden lg:flex justify-between items-center mb-6 print:hidden">
          <div className="flex items-center gap-2 text-label text-text-secondary">
            <Link href="/finance" className="hover:text-primary transition-colors">
              Tài chính
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/finance/expenses" className="hover:text-primary transition-colors">
              Phiếu chi
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
              {expenseCode}
            </span>
          </div>
          <PrintActions />
        </div>

        {/* Digital Document Card (A5 Landscape) */}
        <div className="card-elevated p-6 lg:p-10 relative overflow-hidden transition-all print:shadow-none print:border-none print:p-0 print:m-0 print:w-full bg-surface-base print:bg-white print:text-black mb-8">
          <style>{`
            @media print {
              @page { size: A5 landscape; margin: 0; }
              body { background: white; margin: 0; padding: 10mm; }
              main { padding: 0 !important; margin: 0 !important; }
            }
          `}</style>

          {/* Stamp */}
          <div className="absolute top-6 right-6 md:top-10 md:right-10 z-0 pointer-events-none select-none">
            <div
              className={`border-2 px-5 py-2 rounded font-bold text-sm md:text-base transform -rotate-12 opacity-70 ${statusColor}`}
            >
              {statusLabel}
            </div>
          </div>

          {/* Branding & Header */}
          <div className="relative z-10 flex justify-between items-start border-b border-border pb-4 mb-6 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-12 h-12 bg-surface border border-border rounded flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <Image
                  src={studioInfo?.logo_url || "/logo.png"}
                  alt={studioInfo?.name || "Mood Studio"}
                  fill
                  className="object-contain p-1.5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-text-primary print:text-black leading-tight truncate">
                  {studioInfo?.name || "Mood Studio"}
                </h2>
                <div className="text-xs text-text-secondary print:text-gray-900 mt-0.5 w-full">
                  {studioInfo?.address && <p className="truncate">{studioInfo.address}</p>}
                  {studioInfo?.hotline && <p className="truncate">Hotline: {studioInfo.hotline}</p>}
                </div>
              </div>
            </div>
            <div className="hidden md:block text-right text-xs text-text-secondary print:text-gray-900 min-w-fit">
              <p className="font-bold text-text-primary print:text-black">Mẫu số 02-TT</p>
              <p className="italic">Phiếu chi hệ thống</p>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center mb-6 relative z-10">
            <h1 className="text-xl lg:text-3xl font-bold text-text-primary uppercase tracking-tight">
              Phiếu Chi
            </h1>
            <p className="text-text-secondary italic text-xs lg:text-sm mt-1">
              {formattedDate}
            </p>
            <div className="mt-3 inline-block bg-surface-muted px-4 py-1.5 rounded-full border border-border">
              <p className="text-xs text-text-secondary">
                Số phiếu: <span className="text-text-primary font-bold">{expenseCode}</span>
              </p>
            </div>
          </div>

          {/* Content Fields */}
          <div className="space-y-4 text-sm relative z-10">
            {/* Người nhận */}
            <div className="grid grid-cols-12 gap-2 pb-3 border-b border-dashed border-border px-2">
              <div className="col-span-12 md:col-span-3 text-text-secondary text-xs font-medium pt-0.5">
                Người nhận tiền
              </div>
              <div className="col-span-12 md:col-span-9 font-bold text-text-primary">
                {expense.recipient || "Không xác định"}
              </div>
            </div>

            {/* Nội dung */}
            <div className="grid grid-cols-12 gap-2 pb-3 border-b border-dashed border-border px-2">
              <div className="col-span-12 md:col-span-3 text-text-secondary text-xs font-medium pt-0.5">
                Lý do chi
              </div>
              <div className="col-span-12 md:col-span-9 text-text-primary">
                {expense.category_name || "Chi khác"}
                {expense.description && (
                  <span className="block text-text-secondary text-xs mt-0.5">
                    {expense.description}
                  </span>
                )}
                {expense.contract_code && (
                  <span className="block text-text-secondary text-xs mt-0.5 italic">
                    Theo HĐ: <strong>{expense.contract_code}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Số tiền */}
            <div className="grid grid-cols-12 gap-2 pb-3 border-b border-dashed border-border px-2">
              <div className="col-span-12 md:col-span-3 text-text-secondary text-xs font-medium pt-0.5">
                Số tiền
              </div>
              <div className="col-span-12 md:col-span-9">
                <span className="font-bold text-lg text-error leading-none">
                  {formatVnd(expense.amount)}
                </span>
                <span className="block text-text-secondary italic text-xs mt-1">
                  (Bằng chữ: <span className="font-medium text-text-primary">{readMoney(expense.amount)}</span>)
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-8 grid grid-cols-4 gap-2 text-center pt-2 relative z-10">
            <div className="flex flex-col items-center">
              <p className="font-bold text-text-primary text-xs md:text-sm mb-0.5">Ban giám đốc</p>
              <p className="text-xs text-text-secondary italic mb-2">(Ký, họ tên)</p>
              <div className="h-16 w-full flex items-center justify-center opacity-80">
                {expense.approved_by && (
                  <div className="border border-success text-success px-2 py-0.5 rounded font-bold text-xs transform -rotate-12">
                    ĐÃ DUYỆT
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="font-bold text-text-primary text-xs md:text-sm mb-0.5">Kế toán</p>
              <p className="text-xs text-text-secondary italic mb-2">(Ký, họ tên)</p>
              <div className="h-16 w-full flex items-center justify-center text-text-muted">
                {/* Chờ ký */}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="font-bold text-text-primary text-xs md:text-sm mb-0.5">Thủ quỹ</p>
              <p className="text-xs text-text-secondary italic mb-2">(Ký, đóng dấu)</p>
              <div className="h-16 w-full flex items-center justify-center">
                <div className="border-2 border-error text-error px-2 py-0.5 rounded font-bold text-xs transform rotate-6">
                  ĐÃ CHI
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="font-bold text-text-primary text-xs md:text-sm mb-0.5">Người nhận</p>
              <p className="text-xs text-text-secondary italic mb-2">(Ký, họ tên)</p>
              <div className="h-16 w-full flex items-center justify-center max-w-full overflow-hidden">
                <span className="font-serif italic text-sm md:text-base transform -rotate-2 truncate px-1">{expense.recipient || "K/H"}</span>
              </div>
            </div>
          </div>

          {/* Footer Meta */}
          <div className="mt-8 lg:mt-12 text-center pt-4 border-t border-dashed border-border opacity-50 flex flex-col gap-1">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-widest">
              Mood Studio V2 ERP
            </p>
            <p className="text-xs text-text-secondary font-mono">
              ID: {expense.id.split("-")[0]} • Ref: {refCode} • Created: {expense.created_at ? format(new Date(expense.created_at), "dd/MM/yyyy HH:mm") : "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

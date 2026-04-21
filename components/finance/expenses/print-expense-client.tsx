"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Printer, X } from "lucide-react";
import { formatVnd, financeStatusVariant, financeStatusLabel } from "@/components/finance/finance-format";
import { readMoney } from "@/lib/finance-utils";
import { Button } from "@/components/ui/button";

export interface ExpensePrintData {
  id: string;
  expense_date: string;
  contract_code?: string | null;
  amount: number;
  recipient: string | null;
  category_name: string | null;
  description: string | null;
  approved_by: string | null;
  created_at: string | null;
}

function formatOptionalDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : format(date, "dd/MM/yyyy HH:mm");
}

interface PrintExpenseClientProps {
  expense: ExpensePrintData;
  studioInfo: {
    name: string;
    logo_url: string | null;
    address: string | null;
    hotline: string | null;
  } | null;
}

function expenseCode(expense: ExpensePrintData) {
  const date = new Date(expense.expense_date);
  const datePart = Number.isNaN(date.getTime()) ? "0000" : format(date, "yyMM");
  return expense.contract_code
    ? `PC-${expense.contract_code}`
    : `PC-${datePart}-${expense.id.slice(0, 3).toUpperCase()}`;
}

function ExpenseTemplate({ expense, studioInfo, copyLabel }: { expense: ExpensePrintData; studioInfo: PrintExpenseClientProps["studioInfo"]; copyLabel?: string }) {
  const date = new Date(expense.expense_date);
  const formattedDate = Number.isNaN(date.getTime())
    ? expense.expense_date
    : `Ngày ${format(date, "dd")} tháng ${format(date, "MM")} năm ${format(date, "yyyy")}`;

  const code = expenseCode(expense);
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

  return (
    <section className="print-sheet relative h-full flex flex-col p-6 sm:p-8 bg-white">
      {copyLabel && (
        <div className="absolute top-6 right-6 text-xs text-text-muted italic border border-border px-2 py-0.5 rounded-sm">
          {copyLabel}
        </div>
      )}

      {/* Stamp */}
      <div className="absolute top-6 right-1/4 z-0 pointer-events-none select-none">
        <div
          className={`border-2 px-5 py-2 rounded font-bold text-sm transform -rotate-12 opacity-40 ${statusColor}`}
        >
          {statusLabel}
        </div>
      </div>

      <header className="flex justify-between items-start gap-4 border-b border-border pb-4">
        <div>
          <p className="text-h3">{studioInfo?.name || "Mood Studio"}</p>
          <div className="text-caption text-text-secondary mt-1 space-y-0.5">
            <p>{studioInfo?.address || "Địa chỉ studio"}</p>
            <p>Hotline: {studioInfo?.hotline || "-"}</p>
          </div>
        </div>
        <div className="text-right text-caption text-text-secondary shrink-0 pt-8 sm:pt-0">
          <p className="font-semibold text-text-primary">Mẫu số 02-TT</p>
          <p>Phiếu chi hệ thống</p>
          <p>ID: {expense.id.slice(0, 8)}</p>
        </div>
      </header>

      <div className="text-center py-6 relative z-10">
        <h1 className="text-h1 uppercase">Phiếu chi</h1>
        <p className="text-body-sm text-text-secondary italic mt-1">{formattedDate}</p>
        <p className="text-label text-primary mt-3">Số phiếu: {code}</p>
      </div>

      <div className="space-y-3 text-body-sm relative z-10">
        <div className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-2">
          <span className="col-span-4 text-text-secondary">Người nhận tiền</span>
          <span className="col-span-8 font-semibold">{expense.recipient || "Không xác định"}</span>
        </div>
        <div className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-2">
          <span className="col-span-4 text-text-secondary">Nội dung chi</span>
          <span className="col-span-8">
            {expense.category_name || "Chi khác"}
            {expense.description ? <span className="block text-caption text-text-muted mt-0.5">{expense.description}</span> : null}
            {expense.contract_code ? <span className="block text-caption text-text-muted italic mt-0.5">Theo HĐ: {expense.contract_code}</span> : null}
          </span>
        </div>
        <div className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-2 bg-error/5 px-2 rounded-sm items-center">
          <span className="col-span-4 text-text-secondary">Số tiền</span>
          <span className="col-span-8">
            <span className="block text-amount text-error tabular-nums">{formatVnd(expense.amount)}</span>
            <span className="block text-caption text-text-secondary italic">Bằng chữ: {readMoney(expense.amount)}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-x-2 text-center mt-10 pt-6 border-t border-border relative z-10">
        <div className="flex flex-col items-center">
          <p className="text-label text-xs sm:text-sm">Ban giám đốc</p>
          <p className="text-caption text-text-muted italic mt-0.5">(Ký, họ tên)</p>
          <div className="h-16 w-full flex items-center justify-center opacity-80">
            {expense.approved_by && (
              <div className="border border-success text-success px-2 py-0.5 rounded font-semibold text-caption transform -rotate-12">
                ĐÃ DUYỆT
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-label text-xs sm:text-sm">Kế toán</p>
          <p className="text-caption text-text-muted italic mt-0.5">(Ký, họ tên)</p>
          <div className="h-16 w-full flex items-center justify-center" />
        </div>
        <div className="flex flex-col items-center">
          <p className="text-label text-xs sm:text-sm">Thủ quỹ</p>
          <p className="text-caption text-text-muted italic mt-0.5">(Ký, họ tên)</p>
          <div className="h-16 w-full flex items-center justify-center">
            <div className="border border-error text-error px-2 py-0.5 rounded font-semibold text-caption transform rotate-6">
              ĐÃ CHI
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-label text-xs sm:text-sm">Người nhận</p>
          <p className="text-caption text-text-muted italic mt-0.5">(Ký, họ tên)</p>
          <div className="h-16 w-full flex items-center justify-center">
            <span className="text-caption italic text-text-muted truncate max-w-full px-1">{expense.recipient || "K/H"}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-border flex justify-between items-center text-xs text-text-muted font-bold opacity-60">
        <span>moodwedding.com</span>
        <span className="font-mono">Created: {formatOptionalDateTime(expense.created_at)}</span>
        <span>Bản in hệ thống Mood Studio ERP</span>
      </div>
    </section>
  );
}

export function PrintExpenseClient({ expense, studioInfo }: PrintExpenseClientProps) {
  const [printMode, setPrintMode] = useState<"A5" | "A4">("A4");

  return (
    <div className="min-h-screen bg-surface-muted text-text-primary flex flex-col font-sans">
      <style>{`
        @media print {
          @page { size: ${printMode === "A4" ? "A4 landscape" : "A5 landscape"}; margin: ${printMode === "A4" ? "0" : "10mm"}; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
          .print-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>

      {/* Sticky Topbar */}
      <div className="print:hidden sticky top-0 z-40 bg-surface-base border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/finance/expenses/${expense.id}`} className="btn btn-secondary px-3 py-1.5 text-xs gap-2 shrink-0">
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Link>

          <div className="flex-1 flex justify-center">
            <div className="flex bg-surface-muted p-1 rounded-md border border-border">
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-3 text-xs w-full sm:w-auto font-medium rounded-sm transition-colors ${printMode === "A5" ? "bg-surface-base shadow-sm text-primary" : "text-text-secondary hover:text-text-primary hover:bg-transparent"}`}
                onClick={() => setPrintMode("A5")}
              >
                In 1 bản (Khổ A5/K80)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-3 text-xs w-full sm:w-auto font-medium rounded-sm transition-colors ${printMode === "A4" ? "bg-surface-base shadow-sm text-primary" : "text-text-secondary hover:text-text-primary hover:bg-transparent"}`}
                onClick={() => setPrintMode("A4")}
              >
                In 2 bản (Khổ A4)
              </Button>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="secondary" size="sm" onClick={() => window.close()} className="gap-2 hidden sm:flex">
              <X className="w-4 h-4" />
              Đóng
            </Button>
            <Button type="button" size="sm" onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" />
              {printMode === "A4" ? "In A4" : "In A5"}
            </Button>
          </div>
        </div>
      </div>

      {/* Print Preview Area */}
      <main className="flex-1 w-full overflow-x-auto p-4 sm:p-8 flex items-start justify-center print:p-0 print:overflow-visible">
        {printMode === "A4" ? (
          <div className="print-element relative flex shadow-2xl bg-white shrink-0" style={{ width: "297mm", height: "210mm" }}>
            <div className="absolute top-6 bottom-6 left-1/2 w-0 border-l border-dashed border-border-strong z-10" />
            <div className="w-1/2 h-full print:border-r print:border-border">
              <ExpenseTemplate expense={expense} studioInfo={studioInfo} copyLabel="Liên 1: Lưu" />
            </div>
            <div className="w-1/2 h-full">
              <ExpenseTemplate expense={expense} studioInfo={studioInfo} copyLabel="Liên 2: Giao khách" />
            </div>
          </div>
        ) : (
          <div className="print-element shadow-2xl bg-white shrink-0 mx-auto" style={{ width: "210mm", minHeight: "148mm" }}>
            <ExpenseTemplate expense={expense} studioInfo={studioInfo} />
          </div>
        )}
      </main>
    </div>
  );
}

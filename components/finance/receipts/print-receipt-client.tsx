"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Printer, X } from "lucide-react";
import { financeMethodLabel, financeReceiptTypeLabel, formatVnd } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { readMoney } from "@/lib/finance-utils";
import type { StudioInfo } from "@/types/settings";

export interface ReceiptPrintData {
  id: string;
  source_table?: string | null;
  source_id?: string | null;
  receipt_code?: string | null;
  receipt_date: string;
  receipt_type: string;
  payment_type: string;
  contract_code: string | null;
  customer_name: string | null;
  receipt_amount: number;
  category_name: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  creator?: { full_name?: string | null } | null;
}

interface PrintReceiptClientProps {
  receipt: ReceiptPrintData;
  studioInfo: StudioInfo | null;
}

function receiptCode(receipt: ReceiptPrintData) {
  if (receipt.receipt_code) return receipt.receipt_code;
  const date = new Date(receipt.receipt_date);
  const datePart = Number.isNaN(date.getTime()) ? "0000" : format(date, "yyMM");
  return receipt.contract_code
    ? `PT-${receipt.contract_code}`
    : `PT-${datePart}-${receipt.id.slice(0, 6).toUpperCase()}`;
}

function receiptRawId(receipt: ReceiptPrintData) {
  return receipt.source_id || receipt.id.replace(/^payment:/, "");
}

function ReceiptTemplate({ receipt, studioInfo, copyLabel }: { receipt: ReceiptPrintData; studioInfo: StudioInfo | null; copyLabel?: string }) {
  const date = new Date(receipt.receipt_date);
  const formattedDate = Number.isNaN(date.getTime())
    ? receipt.receipt_date
    : `Ngày ${format(date, "dd")} tháng ${format(date, "MM")} năm ${format(date, "yyyy")}`;
  const code = receiptCode(receipt);
  const rawId = receiptRawId(receipt);

  return (
    <section className="print-sheet relative h-full flex flex-col p-6 sm:p-8 bg-white">
      {copyLabel && (
        <div className="absolute top-6 right-6 text-xs text-text-muted italic border border-border px-2 py-0.5 rounded-sm">
          {copyLabel}
        </div>
      )}
      <header className="flex justify-between items-start gap-4 border-b border-border pb-4">
        <div>
          <p className="text-h3">{studioInfo?.name || "Mood Studio"}</p>
          <div className="text-caption text-text-secondary mt-1 space-y-0.5">
            <p>{studioInfo?.address || "Địa chỉ studio"}</p>
            <p>Hotline: {studioInfo?.hotline || "-"}</p>
          </div>
        </div>
        <div className="text-right text-caption text-text-secondary shrink-0 pt-8 sm:pt-0">
          <p className="font-semibold text-text-primary">Mẫu số 01-TT</p>
          <p>Phiếu thu hệ thống</p>
          <p>ID: {rawId.slice(0, 8)}</p>
        </div>
      </header>

      <div className="text-center py-6">
        <h1 className="text-h1 uppercase">Phiếu thu</h1>
        <p className="text-body-sm text-text-secondary italic mt-1">{formattedDate}</p>
        <p className="text-label text-primary mt-3">Số phiếu: {code}</p>
      </div>

      <div className="space-y-3 text-body-sm">
        <div className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-2">
          <span className="col-span-4 text-text-secondary">Người nộp tiền</span>
          <span className="col-span-8 font-semibold">{receipt.customer_name || "Khách vãng lai"}</span>
        </div>
        <div className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-2">
          <span className="col-span-4 text-text-secondary">Nội dung thu</span>
          <span className="col-span-8">
            {receipt.category_name || financeReceiptTypeLabel(receipt.receipt_type)}
            {receipt.contract_code ? <span className="block text-caption text-text-muted mt-0.5">Hợp đồng: {receipt.contract_code}</span> : null}
          </span>
        </div>
        <div className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-2">
          <span className="col-span-4 text-text-secondary">Số tiền</span>
          <span className="col-span-8">
            <span className="block text-amount text-success tabular-nums">{formatVnd(receipt.receipt_amount)}</span>
            <span className="block text-caption text-text-secondary italic">Bằng chữ: {readMoney(receipt.receipt_amount)}</span>
          </span>
        </div>
        <div className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-2">
          <span className="col-span-4 text-text-secondary">Phương thức</span>
          <span className="col-span-8">{financeMethodLabel(receipt.payment_type)}</span>
        </div>
        {receipt.notes ? (
          <div className="grid grid-cols-12 gap-3 border-b border-dashed border-border pb-2">
            <span className="col-span-4 text-text-secondary">Ghi chú</span>
            <span className="col-span-8">{receipt.notes}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-x-2 text-center mt-10 pt-6 border-t border-border">
        <div>
          <p className="text-label text-xs sm:text-sm">Người nộp</p>
          <p className="text-xs text-text-muted italic mt-0.5">(Ký, họ tên)</p>
          <div className="h-16" />
        </div>
        <div>
          <p className="text-label text-xs sm:text-sm">Người lập</p>
          <p className="text-xs text-text-muted italic mt-0.5">(Ký, họ tên)</p>
          <div className="h-16" />
          <p className="text-xs line-clamp-1">{receipt.creator?.full_name || ""}</p>
        </div>
        <div>
          <p className="text-label text-xs sm:text-sm">Kế toán</p>
          <p className="text-xs text-text-muted italic mt-0.5">(Ký, họ tên)</p>
          <div className="h-16" />
        </div>
        <div>
          <p className="text-label text-xs sm:text-sm">Thủ quỹ</p>
          <p className="text-xs text-text-muted italic mt-0.5">(Ký, họ tên)</p>
          <div className="h-16" />
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-border flex justify-between items-center text-xs text-text-muted font-bold opacity-60">
        <span>moodwedding.com</span>
        <span>id: {rawId.slice(0, 8)}</span>
        <span>Bản in hệ thống Mood Studio ERP</span>
      </div>
    </section>
  );
}

export function PrintReceiptClient({ receipt, studioInfo }: PrintReceiptClientProps) {
  const [printMode, setPrintMode] = useState<"A5" | "A4">("A4");

  return (
    <div className="min-h-screen bg-surface-muted text-text-primary flex flex-col font-sans">
      <style>{`
        @media print {
          @page { size: ${printMode === "A4" ? "A4 landscape" : "A5 portrait"}; margin: ${printMode === "A4" ? "0" : "10mm"}; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
          .print-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: none !important; }
        }
      `}</style>

      {/* Sticky Topbar */}
      <div className="print:hidden sticky top-0 z-40 bg-surface-base border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link href={`/finance/receipts/${receipt.id}`} className="btn btn-secondary px-3 py-1.5 text-xs gap-2 shrink-0">
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
               <ReceiptTemplate receipt={receipt} studioInfo={studioInfo} copyLabel="Liên 1: Lưu" />
            </div>
            <div className="w-1/2 h-full">
               <ReceiptTemplate receipt={receipt} studioInfo={studioInfo} copyLabel="Liên 2: Giao khách" />
            </div>
          </div>
        ) : (
          <div className="print-element shadow-2xl bg-white shrink-0 mx-auto" style={{ width: "148mm", minHeight: "210mm" }}>
             <ReceiptTemplate receipt={receipt} studioInfo={studioInfo} />
          </div>
        )}
      </main>
    </div>
  );
}

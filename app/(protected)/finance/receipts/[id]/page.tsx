import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getReceiptDetail } from "@/app/actions/finance-operations-queries";
import { formatVnd, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { readMoney } from "@/lib/finance-utils";
import { PrintActions } from "./print-actions";

import { notFound } from "next/navigation";
import { getStudioInfo } from "@/app/actions/settings-queries";

export const metadata = { title: "Chi tiết phiếu thu" };

export default async function ReceiptDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  const [receiptRes, studioRes] = await Promise.all([
    getReceiptDetail(params.id),
    getStudioInfo()
  ]);

  if (!receiptRes.success || !receiptRes.data) {
    notFound();
  }

  const receipt = receiptRes.data;
  const studioInfo = studioRes.success ? studioRes.data : null;

  // Format Data
  const receiptDate = new Date(receipt.receipt_date);
  const formattedDate = `Ngày ${format(receiptDate, "dd")} tháng ${format(receiptDate, "MM")} năm ${format(receiptDate, "yyyy")}`;
  const statusColorMap: Record<string, string> = {
    danger: "border-error text-error",
    success: "border-success text-success",
    warning: "border-warning text-warning",
    default: "border-border text-text-secondary"
  };

  const statusVariant = financeStatusVariant(receipt.status);
  const statusColor = statusColorMap[statusVariant] || statusColorMap.default;

  const refCode = `REC-${receipt.id.slice(0, 8).toUpperCase()}`;
  const receiptCode = receipt.contract_code
    ? `PT-${receipt.contract_code}`
    : `PT-${format(receiptDate, "yyMM")}-${receipt.id.slice(0, 3).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-surface-base flex flex-col pt-4 lg:pt-6">
      <div className="w-full max-w-4xl mx-auto px-4 lg:px-6 grow">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-4 print:hidden">
          <Link
            href="/finance/receipts"
            className="flex items-center gap-1 text-label text-text-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Về hạng mục thu
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
            <Link href="/finance/receipts" className="hover:text-primary transition-colors">
              Phiếu thu
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
              {receiptCode}
            </span>
          </div>
          <PrintActions />
        </div>

        {/* Digital Document Card (A5 Landscape) */}
        <div className="card-elevated p-6 lg:p-10 relative overflow-hidden transition-all print:shadow-none print:border-none print:p-0 print:m-0 print:w-full bg-surface-base print:bg-white print:text-black">
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
              {financeStatusLabel(receipt.status)}
            </div>
          </div>

          {/* Branding & Header */}
          <div className="relative z-10 flex justify-between items-start border-b border-border pb-4 mb-6 gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 bg-surface border border-border rounded flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <Image
                  src={studioInfo?.logo_url || "/logo.png"}
                  alt={studioInfo?.name || "Mood Studio"}
                  fill
                  className="object-contain p-1.5"
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary print:text-black leading-tight">
                  {studioInfo?.name || "Mood Studio"}
                </h2>
                <div className="text-xs text-text-secondary print:text-gray-900 mt-0.5 max-w-xs md:max-w-md line-clamp-2">
                  <p>{studioInfo?.address || "123 Nguyễn Văn Linh, Quận 7, TP.HCM"}</p>
                  <p>Hotline: {studioInfo?.hotline || "0909 123 456"}</p>
                </div>
              </div>
            </div>
            <div className="hidden md:block text-right text-xs text-text-secondary print:text-gray-900 min-w-fit">
              <p className="font-bold text-text-primary print:text-black">Mẫu số 01-tt</p>
              <p className="italic">(TT số 200/2014/TT-BTC)</p>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center mb-6 relative z-10">
            <h1 className="text-xl lg:text-3xl font-bold text-text-primary uppercase tracking-tight">
              Phiếu Thu
            </h1>
            <p className="text-text-secondary italic text-xs lg:text-sm mt-1">
              {formattedDate}
            </p>
            <div className="mt-3 inline-block bg-surface-muted px-4 py-1.5 rounded-full border border-border">
              <p className="text-xs text-text-secondary">
                Số phiếu: <span className="text-text-primary font-bold">{receiptCode}</span>
              </p>
            </div>
          </div>

          {/* Content Fields */}
          <div className="space-y-4 text-sm relative z-10">
            {/* Người nộp */}
            <div className="grid grid-cols-12 gap-2 pb-3 border-b border-dashed border-border px-2">
              <div className="col-span-12 md:col-span-3 text-text-secondary text-xs font-medium pt-0.5">
                Người nộp tiền
              </div>
              <div className="col-span-12 md:col-span-9 font-bold text-text-primary">
                {receipt.customer_name || "Khách hàng vãng lai"}
              </div>
            </div>

            {/* Nội dung */}
            <div className="grid grid-cols-12 gap-2 pb-3 border-b border-dashed border-border px-2">
              <div className="col-span-12 md:col-span-3 text-text-secondary text-xs font-medium pt-0.5">
                Nội dung thu
              </div>
              <div className="col-span-12 md:col-span-9 text-text-primary">
                {receipt.category_name || "Thu khác"}
                {receipt.contract_code && (
                  <span className="block text-text-secondary text-xs mt-0.5 italic">
                    Theo HD: <strong>{receipt.contract_code}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Số tiền */}
            <div className="grid grid-cols-12 gap-2 pb-3 border-b border-dashed border-border px-2 bg-success/5 rounded items-center">
              <div className="col-span-12 md:col-span-3 text-text-secondary text-xs font-medium pt-0.5">
                Số tiền
              </div>
              <div className="col-span-12 md:col-span-9">
                <div className="text-xl font-bold text-success">
                  {formatVnd(receipt.receipt_amount)}
                </div>
                <div className="text-text-secondary italic text-xs mt-1">
                  (Bằng chữ: <span className="font-medium text-text-primary">{readMoney(receipt.receipt_amount)}</span>)
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            {receipt.notes && (
              <div className="grid grid-cols-12 gap-2 pb-3 border-b border-dashed border-border px-2">
                <div className="col-span-12 md:col-span-3 text-text-secondary text-xs font-medium pt-0.5">
                  Ghi chú
                </div>
                <div className="col-span-12 md:col-span-9 text-text-secondary italic">
                  {receipt.notes}
                </div>
              </div>
            )}
          </div>

          {/* Signatures */}
          <div className="mt-8 lg:mt-12 grid grid-cols-3 gap-4 text-center border-t border-border pt-6">
            <div className="flex flex-col items-center">
              <p className="font-bold text-text-primary text-xs mb-1">
                Người nộp tiền
              </p>
              <p className="text-xs text-text-secondary italic mb-4">
                (Ký, họ tên)
              </p>
              <div className="h-12 w-full flex items-center justify-center opacity-80">
                <span className="font-serif italic text-lg transform -rotate-6">
                  {receipt.customer_name || "K/H"}
                </span>
              </div>
              <p className="text-xs font-bold text-text-primary mt-1">
                {receipt.customer_name || ""}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <p className="font-bold text-text-primary text-xs mb-1">
                Kế toán trưởng
              </p>
              <p className="text-xs text-text-secondary italic mb-4">
                (Ký, họ tên)
              </p>
              <div className="h-12 w-full flex items-center justify-center text-text-muted">
                <span className="text-xs italic">Chưa ký</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="font-bold text-text-primary text-xs mb-1">
                Thủ quỹ
              </p>
              <p className="text-xs text-text-secondary italic mb-4">
                (Ký, họ tên, đóng dấu)
              </p>
              <div className="h-12 w-full flex items-center justify-center">
                <div className="border-2 border-success text-success px-3 py-1 rounded font-bold text-xs transform -rotate-12">
                  ĐÃ THU
                </div>
              </div>
              <p className="text-xs font-medium text-text-primary mt-1">
                Nhân viên
              </p>
            </div>
          </div>

          {/* Footer Meta */}
          <div className="mt-8 lg:mt-12 text-center pt-4 border-t border-dashed border-border opacity-50 flex flex-col gap-1">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-widest">
              Mood Studio V2 ERP
            </p>
            <p className="text-xs text-text-secondary font-mono">
              ID: {receipt.id.split("-")[0]} • Ref: {refCode} • Created: {format(new Date(receipt.created_at), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState, useCallback, useEffect } from "react";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Contract, ContractItem, PaymentPlan, StudioInfo } from "@/types/contract";
import type { Customer } from "@/types/crm";
import ContractTemplate from "./contract-template";

// ═══════════════════════════════════════════
// Print Contract Client — wrapper with controls
// Phase 02D: V1 PrintContractClient → V2
// Mode: "print" (default) or "export" (PDF download)
// ═══════════════════════════════════════════

interface Props {
  contract: Contract;
  customer: Customer;
  items: ContractItem[];
  paymentPlans: PaymentPlan[];
  studio: StudioInfo;
}

export default function PrintContractClient({
  contract,
  customer,
  items,
  paymentPlans,
  studio,
}: Props) {
  const searchParams = useSearchParams();
  const isExportMode = searchParams.get("isExportMode") === "true";
  const templateRef = useRef<HTMLDivElement>(null);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Preload html2pdf.js
  useEffect(() => {
    import("html2pdf.js").then(() => setIsPdfReady(true));
  }, []);

  // Auto-download in export mode
  useEffect(() => {
    if (isExportMode && isPdfReady) {
      const timer = setTimeout(() => handleDownload(), 1000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExportMode, isPdfReady]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!templateRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [5, 5, 5, 5] as [number, number, number, number],
        filename: `HOP-DONG-${contract.contract_code}.pdf`,
        image: { type: "jpeg" as const, quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a5", orientation: "portrait" as const },
        pagebreak: { mode: ["avoid-all"] },
      };

      await html2pdf().set(opt).from(templateRef.current).save();
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [contract.contract_code, isGenerating]);

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* ── Control Bar (hide on print) ── */}
      <div className="print:hidden sticky top-0 z-50 bg-white shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-14">
          <Link
            href={`/contracts/${contract.id}`}
            className="btn-outline"
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-outline"
            >
              <Printer size={16} />
              <span>In ngay</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!isPdfReady || isGenerating}
              className="btn-primary disabled:opacity-50"
            >
              <Download size={16} />
              <span>{isGenerating ? "Đang tạo..." : "Tải PDF (A5)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Template Preview ── */}
      <div className="max-w-4xl mx-auto py-8 px-4 print:p-0 print:max-w-none">
        <div
          ref={templateRef}
          className="bg-white shadow-lg mx-auto print:shadow-none"
          style={{ width: "148mm" }}
        >
          <ContractTemplate
            contract={contract}
            customer={customer}
            items={items}
            paymentPlans={paymentPlans}
            studio={studio}
          />
        </div>
      </div>

      {/* ── Print CSS ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}

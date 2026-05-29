"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Printer, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Contract, ContractItem, PaymentPlan, StudioInfo } from "@/types/contract";
import type { Customer } from "@/types/crm";
import ContractTemplate from "./contract-template";
import { Button } from "@/components/ui/button";

const DEFAULT_LOGO_URL = "/logo.png";
const PRINT_LOGO_TINT = "#2E5C46";

interface Props {
  contract: Contract;
  customer: Customer;
  items: ContractItem[];
  paymentPlans: PaymentPlan[];
  studio: StudioInfo;
  isExportMode?: boolean;
}

export default function PrintContractClient({
  contract,
  customer,
  items,
  paymentPlans,
  studio,
  isExportMode = false,
}: Props) {
  const templateRef = useRef<HTMLDivElement>(null);
  const autoDownloadStartedRef = useRef(false);
  const [logoUrl, setLogoUrl] = useState(studio.logo_url || DEFAULT_LOGO_URL);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const sourceLogo = studio.logo_url || DEFAULT_LOGO_URL;
    setLogoUrl(sourceLogo);

    if (!studio.logo_url) return;

    let isCancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = studio.logo_url;

    img.onload = () => {
      if (isCancelled) return;

      try {
        const canvas = document.createElement("canvas");
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx || width <= 0 || height <= 0) return;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = PRINT_LOGO_TINT;
        ctx.fillRect(0, 0, width, height);

        setLogoUrl(canvas.toDataURL("image/png"));
      } catch {
        setLogoUrl(sourceLogo);
      }
    };

    img.onerror = () => {
      if (!isCancelled) setLogoUrl(sourceLogo);
    };

    return () => {
      isCancelled = true;
    };
  }, [studio.logo_url]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!templateRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: 0,
        filename: `HOP-DONG-${contract.contract_code}.pdf`,
        image: { type: "jpeg" as const, quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollY: 0,
          scrollX: 0,
          windowWidth: 559,
          windowHeight: 750,
        },
        jsPDF: {
          unit: "mm",
          format: "a5",
          orientation: "portrait" as const,
          compress: true,
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(templateRef.current).save();
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [contract.contract_code, isGenerating]);

  useEffect(() => {
    if (!isExportMode || autoDownloadStartedRef.current) return;

    autoDownloadStartedRef.current = true;
    const timer = setTimeout(() => {
      void handleDownload();
    }, 1000);
    return () => clearTimeout(timer);
  }, [handleDownload, isExportMode]);

  const templateProps = { contract, customer, items, paymentPlans, studio, logoUrl };

  return (
    <div className="contract-print-page min-h-screen bg-neutral-100">
      <div className="contract-print-controls sticky top-0 z-50 bg-white shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-14">
          <Link href={`/contracts/${contract.id}`} className="btn btn-outline">
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </Link>

          <div className="hidden md:block text-caption text-text-muted">
            {isExportMode ? "Xuất file PDF (A5 - 1 bản)" : "In hợp đồng (A4 ngang - 2 bản)"}
          </div>

          <div className="flex items-center gap-2">
            {isExportMode ? (
              <Button
                unstyled
                onClick={handleDownload}
                disabled={isGenerating}
                className="btn btn-primary disabled:opacity-50"
              >
                <Download size={16} />
                <span>{isGenerating ? "Đang tạo..." : "Tải PDF (A5)"}</span>
              </Button>
            ) : (
              <Button unstyled onClick={handlePrint} className="btn btn-primary">
                <Printer size={16} />
                <span>In ngay</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="contract-preview-wrap max-w-none mx-auto py-8 px-4 overflow-x-auto">
        <div
          id="contract-print-area"
          ref={templateRef}
          className="contract-print-area bg-white shadow-2xl mx-auto"
          style={{
            width: isExportMode ? "148mm" : "297mm",
            height: isExportMode ? "195mm" : "210mm",
            display: "flex",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {isExportMode ? (
            <div className="contract-print-copy" style={{ width: "100%", height: "100%" }}>
              <ContractTemplate {...templateProps} templateId="print-template-export" />
            </div>
          ) : (
            <>
              <div
                className="contract-cut-line"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "4mm",
                  bottom: "4mm",
                  left: "50%",
                  borderLeft: "1px dashed var(--color-border)",
                  zIndex: 1,
                }}
              />
              <div
                className="contract-print-copy"
                style={{
                  width: "50%",
                  height: "100%",
                  borderRight: "1px solid var(--color-border)",
                  overflow: "hidden",
                }}
              >
                <ContractTemplate {...templateProps} templateId="print-template-copy-1" />
              </div>
              <div
                className="contract-print-copy"
                style={{ width: "50%", height: "100%", overflow: "hidden" }}
              >
                <ContractTemplate {...templateProps} templateId="print-template-copy-2" />
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: ${isExportMode ? "A5 portrait" : "A4 landscape"};
            margin: 0;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .contract-print-controls {
            display: none !important;
          }

          .contract-print-page {
            min-height: auto !important;
            background: #ffffff !important;
          }

          .contract-preview-wrap {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            overflow: visible !important;
          }

          .contract-print-area {
            box-shadow: none !important;
            margin: 0 !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

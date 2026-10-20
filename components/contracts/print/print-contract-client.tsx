"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Printer, Download, ArrowLeft, Share2, ImageDown } from "lucide-react";
import Link from "next/link";
import type { Contract, ContractEvent, ContractItem, PaymentPlan, StudioInfo } from "@/types/contract";
import type { Customer } from "@/types/crm";
import ContractTemplate from "./contract-template";
import { Button } from "@/components/ui/button";
import {
  deliverFile,
  IMAGE_MIME,
  isCoarsePointer,
  PDF_MIME,
  PDF_SCALE,
  renderContractExports,
  shouldDeliverAfterPrepare,
} from "@/lib/contracts/pdf-export";

type ExportKind = "pdf" | "image";
type ContractExports = { pdf: Blob; image: Blob };

// Bề rộng thật của tờ in (96dpi): A5 148mm, A4 ngang 297mm. Trên điện thoại thu nhỏ bản xem trước cho vừa khung (không đổi PDF).
const MM_TO_PX = 96 / 25.4;

const DEFAULT_LOGO_URL = "/logo.png";
const PRINT_LOGO_TINT = "#2E5C46";

interface Props {
  contract: Contract;
  customer: Customer;
  items: ContractItem[];
  paymentPlans: PaymentPlan[];
  events: ContractEvent[];
  studio: StudioInfo;
  isExportMode?: boolean;
}

export default function PrintContractClient({
  contract,
  customer,
  items,
  paymentPlans,
  events,
  studio,
  isExportMode = false,
}: Props) {
  const templateRef = useRef<HTMLDivElement>(null);
  const autoDownloadStartedRef = useRef(false);
  const [logoUrl, setLogoUrl] = useState(studio.logo_url || DEFAULT_LOGO_URL);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [deliverNote, setDeliverNote] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [isTouch, setIsTouch] = useState(false);
  const exportsRef = useRef<ContractExports | null>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const pdfFilename = `HOP-DONG-${contract.contract_code}.pdf`;
  const imageFilename = `HOP-DONG-${contract.contract_code}.jpg`;
  const sheetWidthPx = (isExportMode ? 148 : 297) * MM_TO_PX;

  useEffect(() => {
    const sourceLogo = studio.logo_url || DEFAULT_LOGO_URL;
    // Resets the logo before re-tinting it via the async canvas pipeline below;
    // part of an image-processing effect, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Dựng MỘT lần ra cả PDF lẫn ảnh JPG (chưa tải). Điện thoại: bấm nút sau đó mới chia sẻ/lưu (cần thao tác chạm).
  const prepareExports = useCallback(async (): Promise<ContractExports | null> => {
    if (exportsRef.current) return exportsRef.current;
    if (!templateRef.current) return null;
    setIsGenerating(true);
    setPdfError(null);
    try {
      const result = await renderContractExports(templateRef.current, {
        filename: pdfFilename,
        scale: PDF_SCALE,
      });
      exportsRef.current = result;
      setPdfReady(true);
      return result;
    } catch (err) {
      console.error("PDF generation error:", err);
      setPdfError(err instanceof Error && err.message ? err.message : "Không rõ nguyên nhân");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [pdfFilename]);

  const handleDeliver = useCallback(async (kind: ExportKind) => {
    if (isGenerating) return;
    const touch = isCoarsePointer();
    const hadBlobBeforeTap = Boolean(exportsRef.current);
    const files = await prepareExports();
    if (!files) return;
    if (!shouldDeliverAfterPrepare({ touch, hadBlobBeforeTap })) {
      setDeliverNote("File đã sẵn sàng — bấm \"Lưu PDF\" hoặc \"Lưu ảnh\" để lưu hoặc gửi.");
      return;
    }
    const isImage = kind === "image";
    try {
      const result = await deliverFile(isImage ? files.image : files.pdf, isImage ? imageFilename : pdfFilename, {
        mimeType: isImage ? IMAGE_MIME : PDF_MIME,
        preferShare: touch,
      });
      setDeliverNote(
        result === "shared"
          ? "Đã mở bảng chia sẻ/lưu file"
          : result === "downloaded"
            ? (isImage ? "Đã tải ảnh hợp đồng" : "Đã tải file PDF")
            : null,
      );
    } catch (err) {
      console.error("PDF deliver error:", err);
      setPdfError(err instanceof Error && err.message ? err.message : "Không tải được file");
    }
  }, [isGenerating, prepareExports, pdfFilename, imageFilename]);

  const handleDownload = useCallback(() => handleDeliver("pdf"), [handleDeliver]);
  const handleDownloadImage = useCallback(() => handleDeliver("image"), [handleDeliver]);

  // Xuất file: máy tính tự tải PDF như cũ; điện thoại chỉ dựng sẵn (PDF + ảnh) rồi chờ người dùng bấm (trình duyệt di động chặn tải ngầm).
  useEffect(() => {
    if (!isExportMode) return;

    const timer = setTimeout(() => {
      // Đánh dấu "đã bắt đầu" ngay lúc chạy (không phải lúc đặt hẹn): StrictMode dev gắn-gỡ-gắn effect sẽ huỷ hẹn lần đầu,
      // nếu đánh dấu sớm thì lần gắn lại bị bỏ qua và PDF không bao giờ được dựng.
      if (autoDownloadStartedRef.current) return;
      autoDownloadStartedRef.current = true;
      if (isCoarsePointer()) void prepareExports();
      else void handleDownload();
    }, 1000);
    return () => clearTimeout(timer);
  }, [handleDownload, prepareExports, isExportMode]);

  // Thu nhỏ bản xem trước cho vừa chiều ngang màn hình (chỉ giao diện; PDF dựng từ bản gốc nên không đổi).
  useEffect(() => {
    const wrap = previewWrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const available = wrap.clientWidth - 32; // trừ padding ngang 16px × 2
      setPreviewScale(available > 0 ? Math.min(1, available / sheetWidthPx) : 1);
      setIsTouch(isCoarsePointer());
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [sheetWidthPx]);

  const templateProps = { contract, customer, items, paymentPlans, events, studio, logoUrl };

  return (
    <div className="contract-print-page min-h-screen bg-neutral-100">
      <div className="contract-print-controls sticky top-0 z-50 bg-white shadow-sm border-b border-border">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 h-14">
          <Link href={`/contracts/${contract.id}`} className="btn btn-outline" aria-label="Quay lại">
            <ArrowLeft size={16} />
            <span className={isExportMode ? "max-sm:hidden" : undefined}>Quay lại</span>
          </Link>

          <div className="hidden md:block text-caption text-text-muted">
            {isExportMode ? "Xuất file PDF / ảnh (A5 - 1 bản)" : "In hợp đồng (A4 ngang - 2 bản)"}
          </div>

          <div className="flex items-center gap-2">
            {isExportMode ? (
              <>
                <Button
                  unstyled
                  onClick={handleDownloadImage}
                  disabled={isGenerating}
                  className="btn btn-outline disabled:opacity-50"
                >
                  {isTouch && pdfReady ? <Share2 size={16} /> : <ImageDown size={16} />}
                  <span>{isTouch ? "Lưu ảnh" : "Tải ảnh (JPG)"}</span>
                </Button>
                <Button
                  unstyled
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {isTouch && pdfReady ? <Share2 size={16} /> : <Download size={16} />}
                  <span>{isGenerating ? "Đang tạo..." : isTouch ? "Lưu PDF" : "Tải PDF (A5)"}</span>
                </Button>
              </>
            ) : (
              <Button unstyled onClick={handlePrint} className="btn btn-primary">
                <Printer size={16} />
                <span>In ngay</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {isExportMode && (pdfError || deliverNote || isGenerating) && (
        <div className="contract-print-controls max-w-4xl mx-auto px-4 pt-3 text-caption" role="status" aria-live="polite">
          {pdfError ? (
            <div className="flex items-center justify-between gap-3 rounded-md bg-danger/10 p-3 text-danger">
              <span>Không tạo được file: {pdfError}</span>
              <Button unstyled onClick={handleDownload} className="btn btn-outline shrink-0">Thử lại</Button>
            </div>
          ) : isGenerating ? (
            <p className="text-text-secondary">Đang dựng file PDF và ảnh, vài giây nữa là xong…</p>
          ) : (
            <p className="text-text-secondary">{deliverNote}</p>
          )}
        </div>
      )}

      <div ref={previewWrapRef} className="contract-preview-wrap max-w-none mx-auto py-8 px-4 overflow-x-auto">
        <div className="contract-zoom mx-auto" style={{ zoom: previewScale, width: "fit-content" }}>
        <div
          id="contract-print-area"
          ref={templateRef}
          className="contract-print-area bg-white shadow-2xl mx-auto"
          style={{
            width: isExportMode ? "148mm" : "297mm",
            minHeight: "210mm",
            height: isExportMode ? "auto" : "210mm",
            display: "flex",
            position: "relative",
            overflow: isExportMode ? "visible" : "hidden",
          }}
        >
          {isExportMode ? (
            <div className="contract-print-copy" style={{ width: "100%", minHeight: "210mm" }}>
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

          .contract-zoom {
            zoom: 1 !important;
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

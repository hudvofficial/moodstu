/**
 * printDressLabel — Popup Window Print for QR labels
 * Pattern: V1 QRCodeLabel.tsx (popup window → document.write → auto print)
 * Improvement: V2 uses canvas.toDataURL() instead of window.opener SVG copy
 */

import type { DressItem } from "@/types/dress";

// ─── XSS Protection (ported from V1) ────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Build label HTML ───────────────────────────────────────

function buildLabelHtml(dress: DressItem, qrDataUrl?: string): string {
  const code = escapeHtml(dress.item_code || "");

  const qrBlock = qrDataUrl
    ? `<img src="${qrDataUrl}" class="qr" alt="QR" />`
    : "";

  return `<div class="label">${qrBlock}<span class="code">${code}</span></div>`;
}

// ─── Shared print page template ─────────────────────────────

function buildPrintPage(bodyHtml: string, title: string, isBatch: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${isBatch ? "A4 portrait" : "40mm 25mm"}; margin: ${isBatch ? "8mm" : "2mm"}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      ${isBatch ? "display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-start; padding: 4px;" : "display: flex; justify-content: center; align-items: center; min-height: 100%;"}
    }
    .label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px dashed #bbb;
      padding: 4px 8px 4px 4px;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
      ${isBatch ? "width: calc(20% - 4px);" : ""}
    }
    .qr { width: 48px; height: 48px; flex-shrink: 0; display: block; }
    .code {
      font-size: 11px;
      font-weight: 800;
      color: #3D2B1F;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;
}

// ─── PUBLIC API ──────────────────────────────────────────────

/**
 * Print a single dress QR label via popup window
 * @param dress - The dress item to print
 * @param qrDataUrl - Optional base64 data URL of the QR code image
 */
export function printDressLabel(dress: DressItem, qrDataUrl?: string): void {
  const labelHtml = buildLabelHtml(dress, qrDataUrl);
  const pageHtml = buildPrintPage(labelHtml, `In Nhãn - ${dress.item_code || dress.name}`, false);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(pageHtml);
  printWindow.document.close();
}

/**
 * Print multiple dress QR labels via popup window (batch mode)
 * @param dresses - Array of dress items to print
 * @param qrDataUrls - Optional map of item_code → base64 data URL
 */
export function printDressLabelBatch(
  dresses: DressItem[],
  qrDataUrls?: Map<string, string>,
): void {
  const labelsHtml = dresses
    .filter((d) => d.item_code)
    .map((d) => buildLabelHtml(d, qrDataUrls?.get(d.item_code || "")))
    .join("\n");

  const pageHtml = buildPrintPage(labelsHtml, `In nhãn QR (${dresses.length} trang phục)`, true);

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(pageHtml);
  printWindow.document.close();
}

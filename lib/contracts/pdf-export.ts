/**
 * Xuất hợp đồng ra PDF và ẢNH (JPG) — tách khỏi component để dùng lại và test được.
 *
 * Vì sao không `html2pdf().save()` như trước (đo/đọc code 20/10/2026):
 * - `save()` tự tạo thẻ <a download> rồi click ngay SAU khi dựng xong (vài giây) → không còn nằm trong thao tác chạm của người dùng:
 *   iOS Safari / PWA / webview Zalo-Messenger chặn hoặc không tải được; lỗi bị nuốt (chỉ console.error) nên người dùng thấy "không xuất được".
 * - Trên điện thoại cách ổn định là: dựng PDF thành Blob TRƯỚC, rồi để nút bấm (một thao tác chạm) gọi Web Share → "Lưu vào Tệp / gửi Zalo".
 */

export type PdfDeliverResult = "shared" | "downloaded" | "cancelled";

export const PDF_MIME = "application/pdf";
export const IMAGE_MIME = "image/jpeg";

/** A5 dọc ở 96dpi ≈ 559px rộng. scale 2 ≈ 192dpi — đủ rõ chữ nhỏ 7–8pt của điều khoản (hợp đồng khách ký nên không hạ độ phân giải). */
export const PDF_SCALE = 2;
export const PDF_JPEG_QUALITY = 0.92;

/**
 * Sau khi dựng PDF xong có nên đưa file cho người dùng ngay không?
 * Cảm ứng: chỉ khi PDF đã có sẵn TRƯỚC lúc bấm (lần bấm này còn trong thao tác chạm → Web Share mới được phép trên iOS).
 * Nếu phải chờ dựng vài giây trong lúc bấm thì thao tác chạm đã hết hiệu lực → chỉ dựng, để người dùng bấm lần nữa.
 * Máy tính: luôn đưa file (tải xuống không cần thao tác chạm).
 */
export function shouldDeliverAfterPrepare(opts: { touch: boolean; hadBlobBeforeTap: boolean }): boolean {
  return !opts.touch || opts.hadBlobBeforeTap;
}

/** Thiết bị cảm ứng chính (điện thoại/máy tính bảng) — nơi nên dùng Web Share thay vì tải ngầm. */
export function isCoarsePointer(win: Pick<Window, "matchMedia"> | undefined = typeof window === "undefined" ? undefined : window): boolean {
  try {
    return Boolean(win?.matchMedia?.("(pointer: coarse)").matches);
  } catch {
    return false;
  }
}

type ShareNavigator = Pick<Navigator, "canShare" | "share">;

/**
 * Đưa file (PDF hoặc ảnh) tới người dùng.
 * - `preferShare` (cảm ứng): Web Share với file → bảng chia sẻ gốc của máy (ảnh: có "Lưu hình ảnh" vào Ảnh trên iPhone).
 *   Người dùng bấm huỷ → "cancelled". Share lỗi khác (không hỗ trợ file…) → rơi xuống tải thường.
 * - Còn lại: tải bằng thẻ <a download>.
 * Phải được gọi từ thao tác chạm khi `preferShare` (iOS yêu cầu); Blob đã dựng sẵn nên không phải chờ.
 */
export async function deliverFile(
  blob: Blob,
  filename: string,
  options: { mimeType: string; preferShare: boolean; nav?: ShareNavigator; doc?: Document },
): Promise<PdfDeliverResult> {
  const nav = options.nav ?? (typeof navigator === "undefined" ? undefined : navigator);
  const doc = options.doc ?? (typeof document === "undefined" ? undefined : document);

  if (options.preferShare && nav?.share && nav.canShare) {
    const file = new File([blob], filename, { type: options.mimeType });
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: filename });
        return "shared";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
        // không chia sẻ được → tải thường bên dưới
      }
    }
  }

  if (!doc) throw new Error("Không có môi trường trình duyệt để tải file");
  const url = URL.createObjectURL(blob);
  const link = doc.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}

/** Đưa PDF tới người dùng — giữ API cũ, dùng chung `deliverFile`. */
export function deliverPdf(
  blob: Blob,
  filename: string,
  options: { preferShare: boolean; nav?: ShareNavigator; doc?: Document } = { preferShare: false },
): Promise<PdfDeliverResult> {
  return deliverFile(blob, filename, { ...options, mimeType: PDF_MIME });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Không tạo được ảnh từ hợp đồng"))),
      IMAGE_MIME,
      PDF_JPEG_QUALITY,
    );
  });
}

/**
 * Dựng hợp đồng MỘT lần ra cả PDF A5 lẫn ảnh JPG (không tải).
 * html2pdf dựng canvas ở `toCanvas()`; `toPdf()` thấy canvas có sẵn thì dùng lại → không dựng hai lần.
 * Ảnh là cả hợp đồng trong một tấm, cùng độ phân giải với PDF.
 */
export async function renderContractExports(
  element: HTMLElement,
  options: { filename: string; scale: number },
): Promise<{ pdf: Blob; image: Blob }> {
  const html2pdf = (await import("html2pdf.js")).default;
  const opt = {
    margin: 0,
    filename: options.filename,
    image: { type: "jpeg" as const, quality: PDF_JPEG_QUALITY },
    html2canvas: {
      scale: options.scale,
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
  // Một chuỗi dựng: toCanvas() → toPdf() (dùng lại canvas). Hai nhánh đọc kết quả cùng chia sẻ `prop` của worker.
  const worker = html2pdf().set(opt).from(element).toCanvas().toPdf();
  const canvas = (await worker.get("canvas")) as HTMLCanvasElement | null;
  if (!canvas) throw new Error("Không dựng được hợp đồng thành ảnh");
  const [pdf, image] = await Promise.all([worker.outputPdf("blob") as Promise<Blob>, canvasToJpegBlob(canvas)]);
  return { pdf, image };
}

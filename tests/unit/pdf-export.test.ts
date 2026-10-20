import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { deliverFile, deliverPdf, IMAGE_MIME, isCoarsePointer, PDF_SCALE, shouldDeliverAfterPrepare } from "@/lib/contracts/pdf-export";

const blob = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });

function fakeDoc() {
  const link = { href: "", download: "", rel: "", click: jest.fn(), remove: jest.fn() };
  const doc = {
    createElement: jest.fn(() => link),
    body: { appendChild: jest.fn() },
  };
  return { doc: doc as unknown as Document, link, createElement: doc.createElement };
}

function fakeNav(opts: { canShare: boolean; share?: () => Promise<void> }) {
  return {
    canShare: jest.fn(() => opts.canShare),
    share: jest.fn(opts.share ?? (async () => undefined)),
  } as unknown as Pick<Navigator, "canShare" | "share">;
}

describe("deliverPdf", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("cảm ứng + hỗ trợ chia sẻ file: mở bảng chia sẻ, không tải ngầm", async () => {
    const { doc, createElement } = fakeDoc();
    const nav = fakeNav({ canShare: true });
    await expect(deliverPdf(blob, "HOP-DONG-1.pdf", { preferShare: true, nav, doc })).resolves.toBe("shared");
    expect(nav.share).toHaveBeenCalledTimes(1);
    const shared = (nav.share as jest.Mock).mock.calls[0][0] as { files: File[] };
    expect(shared.files[0].name).toBe("HOP-DONG-1.pdf");
    expect(shared.files[0].type).toBe("application/pdf");
    expect(createElement).not.toHaveBeenCalled();
  });

  it("người dùng đóng bảng chia sẻ (AbortError): cancelled, không tải thêm", async () => {
    const { doc, createElement } = fakeDoc();
    const nav = fakeNav({ canShare: true, share: async () => { throw new DOMException("x", "AbortError"); } });
    await expect(deliverPdf(blob, "a.pdf", { preferShare: true, nav, doc })).resolves.toBe("cancelled");
    expect(createElement).not.toHaveBeenCalled();
  });

  it("chia sẻ lỗi khác: rơi xuống tải thường", async () => {
    const { doc, link } = fakeDoc();
    const nav = fakeNav({ canShare: true, share: async () => { throw new DOMException("x", "NotAllowedError"); } });
    await expect(deliverPdf(blob, "a.pdf", { preferShare: true, nav, doc })).resolves.toBe("downloaded");
    expect(link.download).toBe("a.pdf");
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it("trình duyệt không chia sẻ được file (canShare=false): tải thường", async () => {
    const { doc, link } = fakeDoc();
    const nav = fakeNav({ canShare: false });
    await expect(deliverPdf(blob, "a.pdf", { preferShare: true, nav, doc })).resolves.toBe("downloaded");
    expect(nav.share).not.toHaveBeenCalled();
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it("máy tính (preferShare=false): luôn tải thường, không đụng share", async () => {
    const { doc, link } = fakeDoc();
    const nav = fakeNav({ canShare: true });
    await expect(deliverPdf(blob, "a.pdf", { preferShare: false, nav, doc })).resolves.toBe("downloaded");
    expect(nav.canShare).not.toHaveBeenCalled();
    expect(nav.share).not.toHaveBeenCalled();
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it("không có document và không chia sẻ được: báo lỗi rõ ràng", async () => {
    await expect(deliverPdf(blob, "a.pdf", { preferShare: false, nav: undefined, doc: undefined })).rejects.toThrow();
  });
});

describe("deliverFile — ảnh hợp đồng (JPG)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const image = new Blob(["jpeg-bytes"], { type: "image/jpeg" });

  it("cảm ứng: chia sẻ file ảnh đúng tên + loại image/jpeg (iPhone: có \"Lưu hình ảnh\")", async () => {
    const { doc, createElement } = fakeDoc();
    const nav = fakeNav({ canShare: true });
    await expect(deliverFile(image, "HOP-DONG-1.jpg", { mimeType: IMAGE_MIME, preferShare: true, nav, doc })).resolves.toBe("shared");
    const shared = (nav.share as jest.Mock).mock.calls[0][0] as { files: File[] };
    expect(shared.files[0].name).toBe("HOP-DONG-1.jpg");
    expect(shared.files[0].type).toBe("image/jpeg");
    expect(createElement).not.toHaveBeenCalled();
  });

  it("máy tính: tải file .jpg bằng thẻ <a download>", async () => {
    const { doc, link } = fakeDoc();
    const nav = fakeNav({ canShare: true });
    await expect(deliverFile(image, "HOP-DONG-1.jpg", { mimeType: IMAGE_MIME, preferShare: false, nav, doc })).resolves.toBe("downloaded");
    expect(link.download).toBe("HOP-DONG-1.jpg");
    expect(nav.share).not.toHaveBeenCalled();
  });

  it("deliverPdf vẫn gửi đúng loại application/pdf (dùng chung deliverFile)", async () => {
    const { doc } = fakeDoc();
    const nav = fakeNav({ canShare: true });
    await deliverPdf(blob, "a.pdf", { preferShare: true, nav, doc });
    const shared = (nav.share as jest.Mock).mock.calls[0][0] as { files: File[] };
    expect(shared.files[0].type).toBe("application/pdf");
  });
});

describe("shouldDeliverAfterPrepare", () => {
  it("cảm ứng: PDF phải có sẵn trước lúc bấm mới đưa file (thao tác chạm còn hiệu lực)", () => {
    expect(shouldDeliverAfterPrepare({ touch: true, hadBlobBeforeTap: true })).toBe(true);
  });

  it("cảm ứng: phải chờ dựng trong lúc bấm (bấm sớm / thử lại sau lỗi) → chỉ dựng, không chia sẻ", () => {
    expect(shouldDeliverAfterPrepare({ touch: true, hadBlobBeforeTap: false })).toBe(false);
  });

  it("máy tính: luôn đưa file sau khi dựng", () => {
    expect(shouldDeliverAfterPrepare({ touch: false, hadBlobBeforeTap: false })).toBe(true);
    expect(shouldDeliverAfterPrepare({ touch: false, hadBlobBeforeTap: true })).toBe(true);
  });
});

describe("isCoarsePointer / PDF_SCALE", () => {
  it("độ phân giải PDF không bị hạ trên điện thoại (hợp đồng khách ký, chữ nhỏ)", () => {
    expect(PDF_SCALE).toBe(2);
  });

  it("nhận diện thiết bị cảm ứng, an toàn khi thiếu matchMedia", () => {
    expect(isCoarsePointer({ matchMedia: () => ({ matches: true }) } as unknown as Window)).toBe(true);
    expect(isCoarsePointer({ matchMedia: () => ({ matches: false }) } as unknown as Window)).toBe(false);
    expect(isCoarsePointer({} as unknown as Window)).toBe(false);
    expect(isCoarsePointer({ matchMedia: () => { throw new Error("x"); } } as unknown as Window)).toBe(false);
  });
});

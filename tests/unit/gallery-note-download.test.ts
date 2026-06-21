/**
 * @fileoverview Unit tests: Gallery Note save + iOS Download fallback
 *
 * § 1 — updateClientNote() server action — Supabase mock
 *         - save success / save empty (clear) / note >500 chars truncate
 *         - invalid UUID / access denied / DB error
 *         - admin path (withAuth)
 * § 2 — navigator.share + window.open fallback
 * § 3 — iOS device detection logic (mirror từ image-viewer + selection-summary)
 * § 4 — Note char counter / MAX_NOTE_LENGTH constraint
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { MAX_NOTE_LENGTH } from "@/types/gallery";

// ─── Module mocks ──────────────────────────────────────────────────────────────

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/supabase/server", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/app/actions/gallery-core", () => ({
  requirePublicGalleryImageAccess: jest.fn(),
  updateGalleryImageSelection: jest.fn(),
  fetchGalleryImageCount: jest.fn(),
}));

jest.mock("@/lib/auth_utils", () => ({
  requireContractAccess: jest.fn(),
  withAuth: jest.fn(),
}));

// ─── Imports (sau khi mocks đã đăng ký) ───────────────────────────────────────

import { updateClientNote } from "@/app/actions/gallery-selection-actions";
import { createAdminClient } from "@/lib/supabase/server";
import { requirePublicGalleryImageAccess } from "@/app/actions/gallery-core";
import { withAuth } from "@/lib/auth_utils";

// ─── Test fixtures ─────────────────────────────────────────────────────────────

/** UUID hợp lệ để dùng trong test */
const VALID_UUID = "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5";
const ACCESS_URL = "gallery-test-access-url";
const ACCESS_TOKEN = "mock-gallery-access-token";

type DbResult =
  | { data: null; error: null }
  | { data: null; error: { message: string } };

/**
 * Build mock Supabase client hỗ trợ chain:
 *   supabase.from("gallery_images").update({...}).eq("id", uuid)
 */
function buildSupabaseMock(result: DbResult = { data: null, error: null }) {
  const eq = jest.fn().mockResolvedValue(result);
  const update = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ update });
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: { from } as any,
    mocks: { from, update, eq },
  };
}

// ═══════════════════════════════════════════
// § 1  updateClientNote()
// ═══════════════════════════════════════════

describe("updateClientNote()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Public token path (accessUrl + accessToken) ────────────────────────────

  describe("public token path (accessUrl + accessToken)", () => {
    it("lưu note thành công → success: true + update được gọi đúng", async () => {
      const { client, mocks } = buildSupabaseMock();
      (createAdminClient as jest.Mock).mockResolvedValue(client);
      (requirePublicGalleryImageAccess as jest.Mock).mockResolvedValue({
        gallery: { id: "gal-1" },
        image: { id: VALID_UUID },
      });

      const result = await updateClientNote(
        VALID_UUID,
        "Ảnh rất đẹp!",
        ACCESS_URL,
        ACCESS_TOKEN,
      );

      expect(result.success).toBe(true);
      expect(mocks.from).toHaveBeenCalledWith("gallery_images");
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ client_note: "Ảnh rất đẹp!" }),
      );
      expect(mocks.eq).toHaveBeenCalledWith("id", VALID_UUID);
    });

    it("lưu note rỗng ('') → client_note = null (xóa note)", async () => {
      const { client, mocks } = buildSupabaseMock();
      (createAdminClient as jest.Mock).mockResolvedValue(client);
      (requirePublicGalleryImageAccess as jest.Mock).mockResolvedValue({
        gallery: { id: "gal-1" },
        image: { id: VALID_UUID },
      });

      const result = await updateClientNote(VALID_UUID, "", ACCESS_URL, ACCESS_TOKEN);

      expect(result.success).toBe(true);
      // Rỗng → sanitizedNote = null
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ client_note: null }),
      );
    });

    it("note dài hơn MAX_NOTE_LENGTH → tự động truncate về 500, vẫn success", async () => {
      const tooLong = "X".repeat(MAX_NOTE_LENGTH + 100); // 600 chars
      const { client, mocks } = buildSupabaseMock();
      (createAdminClient as jest.Mock).mockResolvedValue(client);
      (requirePublicGalleryImageAccess as jest.Mock).mockResolvedValue({
        gallery: { id: "gal-1" },
        image: { id: VALID_UUID },
      });

      const result = await updateClientNote(VALID_UUID, tooLong, ACCESS_URL, ACCESS_TOKEN);

      expect(result.success).toBe(true);
      const calls = mocks.update.mock.calls as [{ client_note: string }][];
      const payload = calls[0]?.[0];
      expect(payload?.client_note).toHaveLength(MAX_NOTE_LENGTH);
      expect(payload?.client_note).toBe("X".repeat(MAX_NOTE_LENGTH));
    });

    it("note đúng MAX_NOTE_LENGTH (500 chars) → KHÔNG bị truncate", async () => {
      const exactNote = "Y".repeat(MAX_NOTE_LENGTH);
      const { client, mocks } = buildSupabaseMock();
      (createAdminClient as jest.Mock).mockResolvedValue(client);
      (requirePublicGalleryImageAccess as jest.Mock).mockResolvedValue({
        gallery: { id: "gal-1" },
        image: { id: VALID_UUID },
      });

      await updateClientNote(VALID_UUID, exactNote, ACCESS_URL, ACCESS_TOKEN);

      const calls = mocks.update.mock.calls as [{ client_note: string }][];
      const payload = calls[0]?.[0];
      expect(payload?.client_note).toHaveLength(MAX_NOTE_LENGTH);
    });

    it("imageId không hợp lệ (không phải UUID) → success: false, error kèm thông báo", async () => {
      const result = await updateClientNote(
        "not-a-valid-uuid",
        "note text",
        ACCESS_URL,
        ACCESS_TOKEN,
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/ID anh khong hop le/i);
      }
    });

    it("imageId rỗng ('') → success: false", async () => {
      const result = await updateClientNote("", "note text", ACCESS_URL, ACCESS_TOKEN);
      expect(result.success).toBe(false);
    });

    it("requirePublicGalleryImageAccess throw (token hết hạn) → success: false", async () => {
      (createAdminClient as jest.Mock).mockResolvedValue(buildSupabaseMock().client);
      (requirePublicGalleryImageAccess as jest.Mock).mockRejectedValue(
        new Error("Phien truy cap gallery khong hop le hoac da het han."),
      );

      const result = await updateClientNote(VALID_UUID, "note", ACCESS_URL, "expired-token");

      expect(result.success).toBe(false);
    });

    it("Supabase update lỗi → success: false", async () => {
      const { client } = buildSupabaseMock({
        data: null,
        error: { message: "DB connection refused" },
      });
      (createAdminClient as jest.Mock).mockResolvedValue(client);
      (requirePublicGalleryImageAccess as jest.Mock).mockResolvedValue({
        gallery: { id: "gal-1" },
        image: { id: VALID_UUID },
      });

      const result = await updateClientNote(VALID_UUID, "note", ACCESS_URL, ACCESS_TOKEN);

      expect(result.success).toBe(false);
    });
  });

  // ── Admin path (withAuth) ──────────────────────────────────────────────────

  describe("admin path (không có accessUrl / accessToken)", () => {
    it("gọi withAuth và lưu note thành công", async () => {
      const { client, mocks } = buildSupabaseMock();
      (withAuth as jest.Mock).mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (cb: (s: any, u: string) => Promise<null>) => {
          const data = await cb(client, "admin-user-1");
          return { success: true as const, data };
        },
      );

      const result = await updateClientNote(VALID_UUID, "Admin ghi chú");

      expect(result.success).toBe(true);
      expect(withAuth).toHaveBeenCalledTimes(1);
      expect(mocks.from).toHaveBeenCalledWith("gallery_images");
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ client_note: "Admin ghi chú" }),
      );
    });

    it("withAuth trả về failure → propagate lỗi nguyên vẹn", async () => {
      (withAuth as jest.Mock).mockResolvedValue({
        success: false as const,
        error: "Khong co quyen truy cap.",
      });

      const result = await updateClientNote(VALID_UUID, "some note");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Khong co quyen truy cap");
      }
    });
  });
});

// ═══════════════════════════════════════════
// § 2  navigator.share + window.open fallback
// ═══════════════════════════════════════════

/**
 * Mirrors iOS download strategy (navigator.share API + window.open fallback).
 * Đây là pure function mô phỏng logic SẼ được implement trong image-viewer.
 *
 * Logic:
 *  1. Nếu navigator.share available → dùng share API
 *  2. Nếu share throw hoặc undefined → fallback window.open
 */

type ShareData = { title?: string; url?: string; text?: string };
type ShareFn = (data: ShareData) => Promise<void>;
type WindowOpenFn = (url: string, target: string, features: string) => Window | null;

async function tryShareOrFallback(
  directUrl: string,
  fileName: string,
  shareFn: ShareFn | undefined,
  windowOpenFn: WindowOpenFn,
): Promise<"shared" | "fallback"> {
  if (typeof shareFn === "function") {
    try {
      await shareFn({ title: fileName, url: directUrl });
      return "shared";
    } catch {
      // AbortError hoặc thiết bị không hỗ trợ → fallback
    }
  }
  windowOpenFn(directUrl, "_blank", "noopener,noreferrer");
  return "fallback";
}

describe("navigator.share + window.open fallback", () => {
  it("dùng navigator.share khi API sẵn sàng → window.open KHÔNG được gọi", async () => {
    const mockShare = jest.fn<ShareFn>().mockResolvedValue(undefined);
    const mockOpen = jest.fn<WindowOpenFn>().mockReturnValue(null);

    const result = await tryShareOrFallback(
      "https://cdn.example.com/wedding.jpg",
      "wedding.jpg",
      mockShare,
      mockOpen,
    );

    expect(result).toBe("shared");
    expect(mockShare).toHaveBeenCalledWith({
      title: "wedding.jpg",
      url: "https://cdn.example.com/wedding.jpg",
    });
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("fallback window.open khi navigator.share = undefined (iOS Safari <15, desktop)", async () => {
    const mockOpen = jest.fn<WindowOpenFn>().mockReturnValue(null);

    const result = await tryShareOrFallback(
      "https://cdn.example.com/wedding.jpg",
      "wedding.jpg",
      undefined,
      mockOpen,
    );

    expect(result).toBe("fallback");
    expect(mockOpen).toHaveBeenCalledWith(
      "https://cdn.example.com/wedding.jpg",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("fallback window.open khi user huỷ share (AbortError)", async () => {
    const mockShare = jest
      .fn<ShareFn>()
      .mockRejectedValue(new Error("AbortError: Share cancelled by user"));
    const mockOpen = jest.fn<WindowOpenFn>().mockReturnValue(null);

    const result = await tryShareOrFallback(
      "https://cdn.example.com/wedding.jpg",
      "wedding.jpg",
      mockShare,
      mockOpen,
    );

    expect(result).toBe("fallback");
    expect(mockShare).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it("window.open luôn dùng đúng flags noopener,noreferrer (bảo mật)", async () => {
    const mockOpen = jest.fn<WindowOpenFn>().mockReturnValue(null);

    await tryShareOrFallback(
      "https://cdn.example.com/p.jpg",
      "p.jpg",
      undefined,
      mockOpen,
    );

    const calls = mockOpen.mock.calls as [string, string, string][];
    const [, target, features] = calls[0]!;
    expect(target).toBe("_blank");
    expect(features).toBe("noopener,noreferrer");
  });

  it("navigator.share được gọi với đúng URL, không bị mutate", async () => {
    const originalUrl = "https://lh3.googleusercontent.com/photo.jpg";
    const mockShare = jest.fn<ShareFn>().mockResolvedValue(undefined);
    const mockOpen = jest.fn<WindowOpenFn>().mockReturnValue(null);

    await tryShareOrFallback(originalUrl, "photo.jpg", mockShare, mockOpen);

    const calls = mockShare.mock.calls as [ShareData][];
    expect(calls[0]?.[0]?.url).toBe(originalUrl);
  });
});

// ═══════════════════════════════════════════
// § 3  iOS device detection
// ═══════════════════════════════════════════

/**
 * Mirror chính xác logic trong image-viewer.tsx (line 126) và selection-summary.tsx (line 98):
 *   const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
 *              || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
 *
 * Tách thành pure function để unit-testable (không cần jsdom/navigator global).
 */
function detectIOS(ua: string, platform: string, maxTouchPoints: number): boolean {
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

describe("iOS device detection (detectIOS)", () => {
  // ── True positives ────────────────────────────────────────────────────────

  it("nhận diện iPhone UA", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
    expect(detectIOS(ua, "iPhone", 5)).toBe(true);
  });

  it("nhận diện iPad UA", () => {
    const ua =
      "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15";
    expect(detectIOS(ua, "iPad", 5)).toBe(true);
  });

  it("nhận diện iPod touch UA", () => {
    const ua =
      "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15";
    expect(detectIOS(ua, "iPhone", 5)).toBe(true);
  });

  it("nhận diện iPad Pro desktop mode (platform=MacIntel + maxTouchPoints=5)", () => {
    // iPad Pro với Request Desktop Site → UA giả Mac, nhưng maxTouchPoints > 1
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
    expect(detectIOS(ua, "MacIntel", 5)).toBe(true);
  });

  it("nhận diện iPad Pro (maxTouchPoints = 2 là đủ)", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
    expect(detectIOS(ua, "MacIntel", 2)).toBe(true);
  });

  // ── True negatives ────────────────────────────────────────────────────────

  it("KHÔNG nhận diện Mac desktop thật (maxTouchPoints = 0)", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
    expect(detectIOS(ua, "MacIntel", 0)).toBe(false);
  });

  it("KHÔNG nhận diện Mac desktop thật (maxTouchPoints = 1 = Magic Trackpad)", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
    expect(detectIOS(ua, "MacIntel", 1)).toBe(false); // threshold là > 1
  });

  it("KHÔNG nhận diện Android Chrome", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0";
    expect(detectIOS(ua, "Linux armv8l", 5)).toBe(false);
  });

  it("KHÔNG nhận diện Windows desktop", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/114.0";
    expect(detectIOS(ua, "Win32", 0)).toBe(false);
  });
});

// ═══════════════════════════════════════════
// § 4  Note char counter + MAX_NOTE_LENGTH
// ═══════════════════════════════════════════

describe("Note char counter (MAX_NOTE_LENGTH = 500)", () => {
  it("hằng số MAX_NOTE_LENGTH = 500 (đúng với DB constraint)", () => {
    expect(MAX_NOTE_LENGTH).toBe(500);
  });

  describe("format counter '<current>/<max>'", () => {
    const fmt = (n: number): string => `${n}/${MAX_NOTE_LENGTH}`;

    it("0 chars → '0/500'", () => expect(fmt(0)).toBe("0/500"));
    it("1 char → '1/500'", () => expect(fmt(1)).toBe("1/500"));
    it("499 chars → '499/500'", () => expect(fmt(499)).toBe("499/500"));
    it("500 chars (at limit) → '500/500'", () => expect(fmt(500)).toBe("500/500"));
    it("501 chars (over limit) → '501/500'", () => expect(fmt(501)).toBe("501/500"));
  });

  describe("server-side sanitization logic (note.trim().slice(0, MAX_NOTE_LENGTH))", () => {
    it("note đúng 500 chars KHÔNG bị cắt", () => {
      const note = "A".repeat(MAX_NOTE_LENGTH);
      const sanitized = note.trim().slice(0, MAX_NOTE_LENGTH);
      expect(sanitized).toHaveLength(MAX_NOTE_LENGTH);
      expect(sanitized).toBe(note);
    });

    it("note 501 chars bị truncate về 500", () => {
      const note = "B".repeat(MAX_NOTE_LENGTH + 1);
      const sanitized = note.trim().slice(0, MAX_NOTE_LENGTH);
      expect(sanitized).toHaveLength(MAX_NOTE_LENGTH);
      expect(sanitized).not.toBe(note);
    });

    it("note rỗng '' → sanitizedNote = null (server logic)", () => {
      const note = "";
      const sanitized = note ? note.trim().slice(0, MAX_NOTE_LENGTH) : null;
      expect(sanitized).toBeNull();
    });

    it("[BUG RISK] note chỉ khoảng trắng '   ' → hành vi hiện tại lưu '' thay vì null", () => {
      // FIX GỢI Ý: đổi điều kiện thành `note.trim() ? note.trim().slice(0, MAX) : null`
      const note = "   ";
      const currentBehavior = note ? note.trim().slice(0, MAX_NOTE_LENGTH) : null;
      expect(currentBehavior).toBe(""); // Hành vi hiện tại: lưu empty string

      const fixedBehavior = note.trim() ? note.trim().slice(0, MAX_NOTE_LENGTH) : null;
      expect(fixedBehavior).toBeNull(); // Nên lưu null để xóa note
    });
  });

  describe("client-side validation logic", () => {
    it("isAtLimit: true khi length >= MAX_NOTE_LENGTH → đổi màu counter thành đỏ", () => {
      const isAtLimit = (len: number): boolean => len >= MAX_NOTE_LENGTH;
      expect(isAtLimit(498)).toBe(false);
      expect(isAtLimit(499)).toBe(false);
      expect(isAtLimit(500)).toBe(true);
      expect(isAtLimit(501)).toBe(true);
    });

    it("isOverLimit: true khi length > MAX_NOTE_LENGTH → disable nút Save", () => {
      const isOverLimit = (len: number): boolean => len > MAX_NOTE_LENGTH;
      expect(isOverLimit(499)).toBe(false);
      expect(isOverLimit(500)).toBe(false); // đúng giới hạn vẫn OK
      expect(isOverLimit(501)).toBe(true);  // 1 ký tự vượt → disable
    });

    it("note Unicode (tiếng Việt) đếm đúng theo ký tự JS (code unit)", () => {
      // "Ảnh đẹp lắm! " thực tế = 13 JS chars (ký tự có dấu = 1 code unit trong UTF-16)
      // 13 * 40 = 520 > 500 — đủ để vượt giới hạn
      const vnNote = "Ảnh đẹp lắm! ".repeat(40); // 520 chars
      expect(vnNote.length).toBeGreaterThan(MAX_NOTE_LENGTH);
      const truncated = vnNote.trim().slice(0, MAX_NOTE_LENGTH);
      expect(truncated.length).toBe(MAX_NOTE_LENGTH);
    });
  });
});

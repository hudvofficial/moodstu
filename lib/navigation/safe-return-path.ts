/**
 * Đường dẫn "quay về" an toàn — NGUỒN DUY NHẤT cho middleware, trang đăng nhập và cookie trang cuối (ADR-021).
 *
 * Kiểm theo ORIGIN, không theo tiền tố chuỗi: trình duyệt bỏ ký tự tab/xuống dòng trong URL (`/\t/evil.com` → `//evil.com`)
 * và giải mã %-sequence khi phân tích, nên chỉ so tiền tố là có thể bị vượt rào (open-redirect).
 */

export const RETURN_PATH_MAX_LENGTH = 512;

// Trang không bao giờ được làm đích "quay về": trang công khai/đăng nhập (tránh vòng lặp), API, tài nguyên.
const EXCLUDED_PREFIXES = [
  "/login",
  "/auth",
  "/api",
  "/_next",
  "/offline",
  "/account-disabled",
  "/forgot-password",
  "/reset-password",
];

// Trang in/xuất PDF: mở lại là tự dựng PDF — không dùng làm trang quay về.
const PRINT_SEGMENT = /\/print(?:\/|$)/;

// Ký tự điều khiển + khoảng trắng (gồm tab, xuống dòng, khoảng trắng thường).
const CONTROL_OR_SPACE = /[\u0000- \u007f]/;

export function toSafeReturnPath(raw: string | null | undefined, appOrigin: string): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > RETURN_PATH_MAX_LENGTH) return null;
  if (CONTROL_OR_SPACE.test(raw)) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;

  let origin: string;
  let parsed: URL;
  try {
    origin = new URL(appOrigin).origin;
    parsed = new URL(raw, origin);
  } catch {
    return null;
  }
  if (parsed.origin !== origin) return null;

  const { pathname, search } = parsed;
  if (EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;
  if (PRINT_SEGMENT.test(pathname)) return null;

  const result = `${pathname}${search}`;
  return result.length <= RETURN_PATH_MAX_LENGTH ? result : null;
}

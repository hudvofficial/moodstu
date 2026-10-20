import { toSafeReturnPath } from "./safe-return-path";

/**
 * Quyết định chuyển hướng của middleware xác thực — hàm thuần, test được mọi nhánh (ADR-021).
 *
 * Trước đây: mọi lần đi qua /login, đích luôn là /dashboard và trang đang mở bị bỏ →
 * iPhone (app cài màn hình chính) "tự nhảy về dashboard" khi iOS mở lại app (start_url = /login?source=pwa)
 * hoặc khi refresh token lỗi thoáng qua làm middleware tưởng chưa đăng nhập.
 */

export const LAST_PATH_COOKIE = "mood_last_path";
export const LAST_PATH_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 giờ: mở lại app hôm sau thì về dashboard như cũ
export const DEFAULT_AFTER_LOGIN_PATH = "/dashboard";

export interface AuthRedirectInput {
  isAuthenticated: boolean;
  isPublicRoute: boolean;
  isLoginRoute: boolean;
  method: string;
  pathname: string;
  search: string;
  nextParam: string | null;
  sourceParam: string | null;
  lastPathCookie: string | null;
  appOrigin: string;
}

/** Trả đường dẫn (+ query) cần chuyển tới, hoặc null nếu cho request đi tiếp. */
export function decideAuthRedirect(input: AuthRedirectInput): string | null {
  if (!input.isAuthenticated && !input.isPublicRoute) {
    // Chỉ giữ trang gốc cho request GET (tài liệu / RSC). POST (server action) không có "trang" để quay về.
    const back = input.method.toUpperCase() === "GET"
      ? toSafeReturnPath(`${input.pathname}${input.search}`, input.appOrigin)
      : null;
    return back ? `/login?next=${encodeURIComponent(back)}` : "/login";
  }

  if (input.isAuthenticated && input.isLoginRoute) {
    return (
      toSafeReturnPath(input.nextParam, input.appOrigin) ??
      (input.sourceParam === "pwa" ? toSafeReturnPath(input.lastPathCookie, input.appOrigin) : null) ??
      DEFAULT_AFTER_LOGIN_PATH
    );
  }

  return null;
}

/** Lỗi kiểu mạng/máy chủ tạm thời → đáng gọi lại getClaims() một lần trước khi kết luận "chưa đăng nhập". */
export function isRetryableAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: unknown; status?: unknown; message?: unknown };
  if (candidate.name === "AuthRetryableFetchError") return true;
  if (typeof candidate.status === "number" && (candidate.status === 0 || candidate.status >= 500)) return true;
  return typeof candidate.message === "string" &&
    /fetch failed|network|timed? ?out|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(candidate.message);
}

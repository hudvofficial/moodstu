import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_AFTER_LOGIN_PATH,
  decideAuthRedirect,
  isRetryableAuthError,
  type AuthRedirectInput,
} from "@/lib/navigation/auth-redirect";

const ORIGIN = "https://mood.example.vn";

function input(overrides: Partial<AuthRedirectInput>): AuthRedirectInput {
  return {
    isAuthenticated: true,
    isPublicRoute: false,
    isLoginRoute: false,
    method: "GET",
    pathname: "/contracts/abc",
    search: "",
    nextParam: null,
    sourceParam: null,
    lastPathCookie: null,
    appOrigin: ORIGIN,
    ...overrides,
  };
}

describe("decideAuthRedirect — chưa đăng nhập vào trang cần đăng nhập", () => {
  it("GET: chuyển /login kèm next = trang đang mở (cả query)", () => {
    expect(decideAuthRedirect(input({ isAuthenticated: false, search: "?tab=events" })))
      .toBe(`/login?next=${encodeURIComponent("/contracts/abc?tab=events")}`);
  });

  it("POST (server action): /login trần", () => {
    expect(decideAuthRedirect(input({ isAuthenticated: false, method: "POST" }))).toBe("/login");
  });

  it("trang in/xuất PDF: /login trần (không quay về trang tự dựng PDF)", () => {
    expect(decideAuthRedirect(input({ isAuthenticated: false, pathname: "/contracts/abc/print", search: "?isExportMode=true" })))
      .toBe("/login");
  });

  it("trang công khai: không chuyển", () => {
    expect(decideAuthRedirect(input({ isAuthenticated: false, isPublicRoute: true, pathname: "/gallery/x" }))).toBeNull();
  });
});

describe("decideAuthRedirect — đã đăng nhập mà vào /login", () => {
  const login = { isLoginRoute: true, isPublicRoute: true, pathname: "/login" };

  it("có next an toàn → về next (cơ chế C2: lỗi xác thực thoáng qua)", () => {
    expect(decideAuthRedirect(input({ ...login, nextParam: "/contracts/abc?tab=events" }))).toBe("/contracts/abc?tab=events");
  });

  it("next độc (open-redirect) → dashboard", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\t/evil.com", "/login", "javascript:alert(1)"]) {
      expect(decideAuthRedirect(input({ ...login, nextParam: bad }))).toBe(DEFAULT_AFTER_LOGIN_PATH);
    }
  });

  it("mở lại app cài màn hình chính (source=pwa) → trang cuối từ cookie (cơ chế C1)", () => {
    expect(decideAuthRedirect(input({ ...login, sourceParam: "pwa", lastPathCookie: "/contracts/abc" }))).toBe("/contracts/abc");
  });

  it("source=pwa nhưng cookie hết hạn/không có/độc → dashboard", () => {
    expect(decideAuthRedirect(input({ ...login, sourceParam: "pwa", lastPathCookie: null }))).toBe(DEFAULT_AFTER_LOGIN_PATH);
    expect(decideAuthRedirect(input({ ...login, sourceParam: "pwa", lastPathCookie: "//evil.com" }))).toBe(DEFAULT_AFTER_LOGIN_PATH);
  });

  it("không phải PWA thì không dùng cookie trang cuối (đăng nhập thường vẫn về dashboard)", () => {
    expect(decideAuthRedirect(input({ ...login, sourceParam: null, lastPathCookie: "/contracts/abc" }))).toBe(DEFAULT_AFTER_LOGIN_PATH);
  });

  it("next ưu tiên hơn cookie trang cuối", () => {
    expect(decideAuthRedirect(input({ ...login, nextParam: "/finance", sourceParam: "pwa", lastPathCookie: "/contracts/abc" }))).toBe("/finance");
  });
});

describe("decideAuthRedirect — các trường hợp cho đi tiếp", () => {
  it("đã đăng nhập vào trang thường: không chuyển", () => {
    expect(decideAuthRedirect(input({}))).toBeNull();
  });

  it("chưa đăng nhập vào /login: không chuyển (hiện form đăng nhập)", () => {
    expect(decideAuthRedirect(input({ isAuthenticated: false, isLoginRoute: true, isPublicRoute: true, pathname: "/login" }))).toBeNull();
  });
});

describe("isRetryableAuthError", () => {
  it("lỗi mạng/máy chủ tạm thời → thử lại", () => {
    expect(isRetryableAuthError({ name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" })).toBe(true);
    expect(isRetryableAuthError({ status: 503, message: "Service Unavailable" })).toBe(true);
    expect(isRetryableAuthError({ status: 0 })).toBe(true);
    expect(isRetryableAuthError(new TypeError("fetch failed"))).toBe(true);
    expect(isRetryableAuthError({ message: "connect ETIMEDOUT 1.2.3.4:443" })).toBe(true);
  });

  it("lỗi xác thực thật / không có lỗi → không thử lại", () => {
    expect(isRetryableAuthError(null)).toBe(false);
    expect(isRetryableAuthError(undefined)).toBe(false);
    expect(isRetryableAuthError({ name: "AuthApiError", status: 400, message: "Invalid Refresh Token: Refresh Token Not Found" })).toBe(false);
    expect(isRetryableAuthError({ name: "AuthSessionMissingError", status: 400, message: "Auth session missing!" })).toBe(false);
    expect(isRetryableAuthError({ name: "AuthInvalidJwtError", status: 400, message: "Invalid JWT signature" })).toBe(false);
  });
});

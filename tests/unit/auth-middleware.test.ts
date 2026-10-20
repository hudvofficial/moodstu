/**
 * Middleware xác thực (lib/supabase/middleware.ts) — ADR-021.
 * Supabase client được giả lập: kiểm hành vi chuyển hướng + việc mang cookie phiên vừa refresh xuống trình duyệt.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };
type CookieMethods = { getAll: () => unknown; setAll: (cookies: CookieToSet[]) => void };
type ClaimsResult = { data: { claims: Record<string, unknown> } | null; error: unknown };

const getClaimsImpl = jest.fn<(cookies: CookieMethods) => Promise<ClaimsResult>>();

jest.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: CookieMethods }) => ({
    auth: { getClaims: () => getClaimsImpl(options.cookies) },
  }),
}));

import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ORIGIN = "https://mood.example.vn";
const signedIn: ClaimsResult = { data: { claims: { sub: "user-1", email: "a@b.vn" } }, error: null };
const signedOut: ClaimsResult = { data: null, error: { name: "AuthSessionMissingError", status: 400, message: "Auth session missing!" } };
const networkError: ClaimsResult = { data: null, error: { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" } };

function request(path: string, init?: { method?: string; cookie?: string }) {
  return new NextRequest(new URL(path, ORIGIN), {
    method: init?.method ?? "GET",
    headers: init?.cookie ? { cookie: init.cookie } : undefined,
  });
}

function location(res: Response) {
  const raw = res.headers.get("location");
  if (!raw) return null;
  const url = new URL(raw);
  return `${url.pathname}${url.search}`;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  getClaimsImpl.mockReset();
});

describe("cookie phiên vừa refresh phải tới được trình duyệt", () => {
  it("getClaims refresh (setAll) rồi trả claims → response mang Set-Cookie mới + request đi xuống mang cookie mới", async () => {
    getClaimsImpl.mockImplementation(async (cookies) => {
      cookies.setAll([{ name: "sb-test-auth-token", value: "NEW_SESSION", options: { path: "/" } }]);
      return signedIn;
    });

    const res = await updateSession(request("/contracts/abc", { cookie: "sb-test-auth-token=OLD_SESSION" }));

    expect(location(res)).toBeNull();
    expect(res.headers.get("set-cookie") ?? "").toContain("sb-test-auth-token=NEW_SESSION");
    expect(res.headers.get("x-middleware-request-cookie") ?? "").toContain("sb-test-auth-token=NEW_SESSION");
  });
});

describe("không refresh thì không đụng cookie", () => {
  it("getClaims không gọi setAll → không có Set-Cookie, cookie đi xuống không bị viết lại", async () => {
    getClaimsImpl.mockResolvedValue(signedIn);

    const res = await updateSession(request("/contracts/abc", { cookie: "sb-test-auth-token=CURRENT; mood_last_path=%2Fcontracts" }));

    expect(location(res)).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("x-middleware-request-cookie")).toBe("sb-test-auth-token=CURRENT; mood_last_path=%2Fcontracts");
  });
});

describe("chuyển hướng giữ trang đang mở", () => {
  it("chưa đăng nhập, GET trang cần đăng nhập → /login?next=<trang + query>", async () => {
    getClaimsImpl.mockResolvedValue(signedOut);
    const res = await updateSession(request("/contracts/abc?tab=events"));
    expect(res.status).toBe(307);
    expect(location(res)).toBe(`/login?next=${encodeURIComponent("/contracts/abc?tab=events")}`);
  });

  it("chưa đăng nhập, POST (server action) → /login trần", async () => {
    getClaimsImpl.mockResolvedValue(signedOut);
    const res = await updateSession(request("/contracts/abc", { method: "POST" }));
    expect(location(res)).toBe("/login");
  });

  it("đã đăng nhập vào /login?next=… → về next", async () => {
    getClaimsImpl.mockResolvedValue(signedIn);
    const res = await updateSession(request(`/login?next=${encodeURIComponent("/contracts/abc?tab=events")}`));
    expect(location(res)).toBe("/contracts/abc?tab=events");
  });

  it("mở lại app cài màn hình chính (/login?source=pwa) có cookie trang cuối → về trang cuối", async () => {
    getClaimsImpl.mockResolvedValue(signedIn);
    const res = await updateSession(request("/login?source=pwa", { cookie: `mood_last_path=${encodeURIComponent("/contracts/abc")}` }));
    expect(location(res)).toBe("/contracts/abc");
  });

  it("/login?source=pwa không có cookie → /dashboard như cũ", async () => {
    getClaimsImpl.mockResolvedValue(signedIn);
    const res = await updateSession(request("/login?source=pwa"));
    expect(location(res)).toBe("/dashboard");
  });

  it("next độc (open-redirect) → /dashboard, không rời domain", async () => {
    getClaimsImpl.mockResolvedValue(signedIn);
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com"]) {
      const res = await updateSession(request(`/login?next=${encodeURIComponent(bad)}`));
      expect(location(res)).toBe("/dashboard");
      expect(new URL(res.headers.get("location") as string).origin).toBe(ORIGIN);
    }
  });
});

describe("lỗi xác thực thoáng qua", () => {
  it("lỗi mạng lần đầu, lần 2 thành công → không chuyển hướng, gọi getClaims 2 lần", async () => {
    getClaimsImpl.mockResolvedValueOnce(networkError).mockResolvedValueOnce(signedIn);
    const res = await updateSession(request("/contracts/abc"));
    expect(location(res)).toBeNull();
    expect(getClaimsImpl).toHaveBeenCalledTimes(2);
  });

  it("getClaims ném lỗi mạng lần đầu → vẫn thử lại", async () => {
    getClaimsImpl.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(signedIn);
    const res = await updateSession(request("/contracts/abc"));
    expect(location(res)).toBeNull();
    expect(getClaimsImpl).toHaveBeenCalledTimes(2);
  });

  it("lỗi mạng cả 2 lần → /login kèm next (đăng nhập lại/refresh xong sẽ quay về đúng trang)", async () => {
    getClaimsImpl.mockResolvedValue(networkError);
    const res = await updateSession(request("/contracts/abc"));
    expect(location(res)).toBe(`/login?next=${encodeURIComponent("/contracts/abc")}`);
    expect(getClaimsImpl).toHaveBeenCalledTimes(2);
  });

  it("lỗi xác thực thật (phiên không có) → không thử lại", async () => {
    getClaimsImpl.mockResolvedValue(signedOut);
    await updateSession(request("/contracts/abc"));
    expect(getClaimsImpl).toHaveBeenCalledTimes(1);
  });
});

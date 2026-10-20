"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toSafeReturnPath } from "@/lib/navigation/safe-return-path";
import { LAST_PATH_COOKIE, LAST_PATH_MAX_AGE_SECONDS } from "@/lib/navigation/auth-redirect";

/**
 * Ghi trang đang mở vào cookie `mood_last_path` (ADR-021).
 * iOS hay đóng app cài màn hình chính khi chạy nền; mở lại = vào start_url `/login?source=pwa` →
 * middleware đọc cookie này để đưa người dùng về đúng trang thay vì /dashboard.
 * Đường dẫn đi qua `toSafeReturnPath` nên không bao giờ lưu trang công khai hay trang in/xuất PDF.
 */
export function LastPathCookie() {
  const pathname = usePathname();

  useEffect(() => {
    const safe = toSafeReturnPath(`${pathname}${window.location.search}`, window.location.origin);
    if (!safe) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      `${LAST_PATH_COOKIE}=${encodeURIComponent(safe)}; Path=/; Max-Age=${LAST_PATH_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  }, [pathname]);

  return null;
}

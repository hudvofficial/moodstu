"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// T-20260825: watchdog cho bug tự điều hướng nhầm về route cha trong /finance/*
// (đã trace kỹ — xem agent/HANDOFFS/T-20260825-finance-nav-redirect-bug.spec.md).
// Next.js/Vercel đôi khi trộn response giữa 2 request Server Action đồng thời,
// khiến trình duyệt tự nhảy lên route cha mà không có thao tác thật nào của
// người dùng. Không sửa được gốc (nằm 1 phần ngoài code ứng dụng, đã thử 2
// hướng ngăn nguyên nhân — rút staleTimes, chuyển FinanceRealtimeRefresh sang
// AppShell — đo không cải thiện rõ so với baseline, xem
// agent/HANDOFFS/T-20260825-finance-nav-redirect-bug.spec.md mục 6). Hướng này
// không cố ngăn nguyên nhân — chỉ phát hiện đúng dấu hiệu và tự sửa lại URL
// trước khi người dùng kịp nhận ra.
const USER_INTENT_WINDOW_MS = 800;
const MAX_AUTO_CORRECTIONS = 2; // tránh vòng lặp nếu bản thân lần sửa cũng bị trộn response

export function FinanceNavGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathRef = useRef<string | null>(null);
  const lastUserIntentAtRef = useRef(0);
  const correctionCountRef = useRef(0);

  // Bất kỳ thao tác thật nào của người dùng (click, phím, back/forward) đều
  // được coi là "có ý định điều hướng" trong USER_INTENT_WINDOW_MS tiếp theo.
  useEffect(() => {
    const markIntent = () => {
      lastUserIntentAtRef.current = Date.now();
    };
    document.addEventListener("click", markIntent, true);
    document.addEventListener("keydown", markIntent, true);
    window.addEventListener("popstate", markIntent, true);
    return () => {
      document.removeEventListener("click", markIntent, true);
      document.removeEventListener("keydown", markIntent, true);
      window.removeEventListener("popstate", markIntent, true);
    };
  }, []);

  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;
    if (!prevPath || prevPath === pathname) return;

    // Chỉ quan tâm trường hợp nhảy LÊN route cha (vd /finance/debts -> /finance).
    const jumpedToAncestor = prevPath.startsWith(`${pathname}/`);
    if (!jumpedToAncestor) return;

    const hadRecentUserIntent = Date.now() - lastUserIntentAtRef.current < USER_INTENT_WINDOW_MS;
    if (hadRecentUserIntent) return;

    if (correctionCountRef.current >= MAX_AUTO_CORRECTIONS) return;
    correctionCountRef.current += 1;

    // Không có thao tác thật nào đứng trước — khớp đúng dấu hiệu bug đã trace.
    // Tự sửa lại URL, không toast — người dùng không nên nhận ra sự cố.
    router.replace(prevPath);
  }, [pathname, router]);

  return null;
}

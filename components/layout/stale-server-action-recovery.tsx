"use client";

import { useEffect } from "react";
import { toast as sonnerToast } from "sonner";
import {
  guardStaleServerActionToasts,
  recoverFromStaleServerAction,
} from "@/lib/client/stale-server-action-recovery";

// Deploy skew: client cũ gọi server action đã đổi ID sau deploy → Next ném
// "Server Action … was not found on the server". Component toast thẳng từ
// `sonner` không đi qua `lib/toast-manager` nên listener bên dưới không thấy
// (lỗi đã bị catch). Patch một lần tại module scope để mọi toast lỗi đều reload.
guardStaleServerActionToasts(sonnerToast as unknown as Record<string, unknown>);

export function StaleServerActionRecovery() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!recoverFromStaleServerAction(event.reason)) return;
      event.preventDefault();
    };

    const onError = (event: ErrorEvent) => {
      if (!recoverFromStaleServerAction(event.error || event.message)) return;
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";
import { recoverFromStaleServerAction } from "@/lib/client/stale-server-action-recovery";

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

"use client";

import { useEffect } from "react";

const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
const RELOAD_KEY = `mood-studio-sw-reloaded:${BUILD_VERSION}`;

export function ServiceWorkerUpdateReload() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const handleControllerChange = () => {
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}

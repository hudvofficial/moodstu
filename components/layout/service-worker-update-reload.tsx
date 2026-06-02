"use client";

import { useEffect } from "react";

const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
const RELOAD_KEY = `mood-studio-sw-reloaded:${BUILD_VERSION}`;

/**
 * Keeps the installed PWA from getting frozen on a stale build.
 *
 * The problem this solves: iOS standalone PWAs do NOT automatically poll for
 * service-worker updates. Once the SW is installed it keeps serving the cached
 * build forever, so every new deploy is invisible on the device — the user runs
 * an old version indefinitely (this is exactly what happened: login looked fixed
 * because the cached build had the login fix, but later app-shell fixes never
 * arrived). The only reliable fix is to call registration.update() ourselves.
 *
 * Strategy:
 *  - On mount AND whenever the app regains focus/visibility, call
 *    registration.update() to actively fetch a newer SW from the network.
 *  - next-pwa is configured with skipWaiting + clientsClaim, so a newly
 *    installed SW activates immediately and fires `controllerchange`.
 *  - On controllerchange we reload exactly once per build version (guarded by
 *    sessionStorage) so the page swaps to the fresh assets without a loop.
 */
export function ServiceWorkerUpdateReload() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const reloadOnce = () => {
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    };

    const checkForUpdate = () => {
      // Force a network round-trip for /sw.js. iOS won't do this on its own.
      registration?.update().catch(() => {});
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) return;
        registration = reg;
        checkForUpdate(); // check the moment the app loads

        // If a waiting worker is already sitting there from a previous visit,
        // it should activate (skipWaiting handles this), but nudge a reload in
        // case controllerchange already fired before this listener attached.
        if (reg.waiting && navigator.serviceWorker.controller) {
          reloadOnce();
        }
      })
      .catch(() => {});

    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnce);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);

  return null;
}

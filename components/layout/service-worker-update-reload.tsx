"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Unique per deploy (NEXT_PUBLIC_BUILD_DATE is stamped once per build in
// next.config.ts). The old key used package.json version, which often stays
// the same across consecutive deploys — the guard then swallowed the reload
// for every deploy after the first one in a tab session, leaving that tab
// frozen on stale assets.
const BUILD_ID =
  process.env.NEXT_PUBLIC_BUILD_DATE || process.env.NEXT_PUBLIC_APP_VERSION || "dev";
const RELOAD_KEY = `mood-studio-sw-reloaded:${BUILD_ID}`;

function reloadOncePerBuild() {
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");
  window.location.reload();
}

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
 *  - On controllerchange we do NOT reload immediately — that yanked the page
 *    out from under the user ~5-8s after landing (SW install/precache time).
 *    Instead we mark the reload as pending and apply it at the next
 *    non-jarring moment: the next client-side navigation (the user already
 *    expects a loading beat) or when the tab goes hidden (they never see it).
 *  - Guarded once per BUILD_ID per tab session so it can never loop, while
 *    still reloading once for EVERY new deploy.
 */
export function ServiceWorkerUpdateReload() {
  const pathname = usePathname();
  const pendingReloadRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const markPendingReload = () => {
      pendingReloadRef.current = true;
      // Already in the background → swap silently right now.
      if (document.visibilityState === "hidden") reloadOncePerBuild();
    };

    const checkForUpdate = () => {
      // Force a network round-trip for /sw.js. iOS won't do this on its own.
      registration?.update().catch(() => {});
    };

    navigator.serviceWorker.addEventListener("controllerchange", markPendingReload);

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (!reg) return;
        registration = reg;
        checkForUpdate(); // check the moment the app loads

        // If a waiting worker is already sitting there from a previous visit,
        // it should activate (skipWaiting handles this), but mark a pending
        // reload in case controllerchange already fired before this listener
        // attached.
        if (reg.waiting && navigator.serviceWorker.controller) {
          markPendingReload();
        }
      })
      .catch(() => {});

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      } else if (pendingReloadRef.current) {
        reloadOncePerBuild();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", checkForUpdate);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", markPendingReload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);

  // Apply a pending reload on the next route change. pendingReloadRef is only
  // ever set in production by the SW listeners above, so this is a no-op in dev.
  useEffect(() => {
    if (pendingReloadRef.current) reloadOncePerBuild();
  }, [pathname]);

  return null;
}

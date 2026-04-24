"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getInternalHref(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;

  const current = new URL(window.location.href);
  const onlyHashChanged =
    url.pathname === current.pathname &&
    url.search === current.search &&
    url.hash !== current.hash;
  if (onlyHashChanged) return null;

  const sameLocation =
    url.pathname === current.pathname &&
    url.search === current.search &&
    url.hash === current.hash;
  if (sameLocation) return null;

  return `${url.pathname}${url.search}`;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = React.useState(false);
  const [settling, setSettling] = React.useState(false);
  const startedRef = React.useRef<string | null>(null);
  const startRouteKeyRef = React.useRef<string | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  const routeKey = `${pathname}?${searchParams.toString()}`;
  const currentRouteKeyRef = React.useRef(routeKey);

  React.useEffect(() => {
    currentRouteKeyRef.current = routeKey;
  }, [routeKey]);

  React.useEffect(() => {
    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const start = (href: string, fromRouteKey: string) => {
      startedRef.current = href;
      startRouteKeyRef.current = fromRouteKey;
      setSettling(false);
      setActive(true);
      clearTimer();
      timeoutRef.current = window.setTimeout(() => {
        startedRef.current = null;
        startRouteKeyRef.current = null;
        setActive(false);
        setSettling(false);
      }, 9000);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const href = getInternalHref(event.target);
      if (href) {
        const fromRouteKey = currentRouteKeyRef.current;
        window.setTimeout(() => start(href, fromRouteKey), 0);
      }
    };

    document.addEventListener("click", onClick, { capture: true });

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      clearTimer();
    };
  }, []);

  React.useEffect(() => {
    if (!active || !startedRef.current) return;
    if (routeKey === startRouteKeyRef.current) return;

    setSettling(true);
    const doneTimer = window.setTimeout(() => {
      startedRef.current = null;
      startRouteKeyRef.current = null;
      setActive(false);
      setSettling(false);
    }, 180);

    return () => window.clearTimeout(doneTimer);
  }, [active, routeKey]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px] overflow-hidden bg-transparent print:hidden">
      <div
        className="h-full rounded-r-full bg-primary shadow-md transition-all duration-300 ease-out"
        style={{ width: settling ? "100%" : "72%" }}
      />
    </div>
  );
}

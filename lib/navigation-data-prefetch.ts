"use client";

export function prewarmRouteData(href: string) {
  // Disabled: Triggering Server Actions on client hover causes network saturation.
  void href;
  return;
}

/** Dev-only trace of prefetch triggers (source = sidebar-hover | bottom-nav-intent | navigation-warmup). */
export function debugPrefetch(source: string, href: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.debug(`[prefetch:${source}]`, href);
}

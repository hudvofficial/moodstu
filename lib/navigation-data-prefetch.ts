"use client";

export function prewarmRouteData(href: string) {
  // Disabled: Triggering Server Actions on client hover causes network saturation.
  void href;
  return;
}

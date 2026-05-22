"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
};

const ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === "1";

function reportMetric(payload: Record<string, unknown>) {
  if (!ENABLED) return;

  if (process.env.NODE_ENV === "development") {
    console.info("[web-vitals]", payload);
    return;
  }

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/monitoring/web-vitals", body);
    return;
  }

  void fetch("/api/monitoring/web-vitals", {
    method: "POST",
    body,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  });
}

export function WebVitalsReporter() {
  const pathname = usePathname();

  useReportWebVitals((metric) => {
    const nav = navigator as NavigatorWithConnection;

    reportMetric({
      id: metric.id,
      name: metric.name,
      label: metric.label,
      value: Math.round(metric.value),
      rating: metric.rating,
      route: pathname,
      navigationType: metric.navigationType,
      connection: nav.connection?.effectiveType,
      saveData: nav.connection?.saveData,
      timestamp: Date.now(),
    });
  });

  return <span className="sr-only" aria-hidden="true" />;
}


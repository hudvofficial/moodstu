/**
 * Performance Monitoring for Dashboard
 * Tracks Core Web Vitals and dashboard-specific metrics
 */

export interface DashboardPerformanceMetrics {
  ttfb: number; // Time to First Byte
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  tti: number; // Time to Interactive
  cacheHit: boolean;
  loadTime: number;
}

let performanceData: Partial<DashboardPerformanceMetrics> = {};

/**
 * Track dashboard load performance
 */
export function trackDashboardLoad(metrics: Partial<DashboardPerformanceMetrics>) {
  performanceData = { ...performanceData, ...metrics };

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[perf] Dashboard metrics:", metrics);
  }

  // Send to analytics in production
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "dashboard_load", {
      ...metrics,
      score: calculatePerformanceScore(metrics),
    });
  }

  // Warn on slow loads
  if (metrics.lcp && metrics.lcp > 1000) {
    console.warn("[perf] Slow dashboard load detected:", metrics.lcp, "ms");
  }
}

/**
 * Calculate performance score (0-10)
 */
function calculatePerformanceScore(metrics: Partial<DashboardPerformanceMetrics>): number {
  let score = 10;

  // TTFB penalty
  if (metrics.ttfb) {
    if (metrics.ttfb > 200) score -= 0.5;
    if (metrics.ttfb > 300) score -= 0.5;
  }

  // FCP penalty
  if (metrics.fcp) {
    if (metrics.fcp > 400) score -= 0.5;
    if (metrics.fcp > 600) score -= 0.5;
  }

  // LCP penalty (most important)
  if (metrics.lcp) {
    if (metrics.lcp > 600) score -= 1;
    if (metrics.lcp > 900) score -= 1;
    if (metrics.lcp > 1200) score -= 1;
  }

  // CLS penalty
  if (metrics.cls) {
    if (metrics.cls > 0.01) score -= 0.5;
    if (metrics.cls > 0.05) score -= 0.5;
  }

  // Cache hit bonus
  if (metrics.cacheHit) score += 0.5;

  return Math.max(0, Math.min(10, score));
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): Partial<DashboardPerformanceMetrics> {
  return performanceData;
}

/**
 * Measure dashboard section load time
 */
export function measureSectionLoad(section: string, startTime: number) {
  const endTime = performance.now();
  const duration = endTime - startTime;

  if (process.env.NODE_ENV === "development") {
    console.log(`[perf] ${section} loaded in ${Math.round(duration)}ms`);
  }

  return duration;
}

/**
 * Get Web Vitals from Performance Observer
 */
export function observeWebVitals(callback: (metrics: Partial<DashboardPerformanceMetrics>) => void) {
  if (typeof window === "undefined") return;

  const metrics: Partial<DashboardPerformanceMetrics> = {};

  // TTFB
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  if (navigation) {
    metrics.ttfb = navigation.responseStart - navigation.requestStart;
  }

  // FCP
  const paintEntries = performance.getEntriesByType("paint");
  const fcpEntry = paintEntries.find((entry) => entry.name === "first-contentful-paint");
  if (fcpEntry) {
    metrics.fcp = fcpEntry.startTime;
  }

  // LCP
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime?: number };
        metrics.lcp = lastEntry.startTime || lastEntry.renderTime || 0;
        callback(metrics);
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (e) {
      // PerformanceObserver not supported
    }
  }

  return metrics;
}

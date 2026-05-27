"use client";

import { type ReactNode } from "react";
import { useInView } from "react-intersection-observer";

/**
 * LazyLoad - Intersection Observer wrapper for lazy loading heavy components
 *
 * Benefits:
 * - Reduces initial bundle size
 * - Improves TTI (Time to Interactive)
 * - Only loads components when visible
 *
 * Usage:
 * ```tsx
 * <LazyLoad fallback={<Skeleton />}>
 *   <HeavyChart />
 * </LazyLoad>
 * ```
 */

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Load once or every time component enters viewport */
  triggerOnce?: boolean;
  /** Percentage of component that must be visible (0-1) */
  threshold?: number;
  /** Load component before it enters viewport (in pixels) */
  rootMargin?: string;
  /** Optional className for wrapper */
  className?: string;
}

export function LazyLoad({
  children,
  fallback = null,
  triggerOnce = true,
  threshold = 0.1,
  rootMargin = "200px",  // Load 200px before entering viewport
  className,
}: LazyLoadProps) {
  const { ref, inView } = useInView({
    triggerOnce,
    threshold,
    rootMargin,
  });

  return (
    <div ref={ref} className={className}>
      {inView ? children : fallback}
    </div>
  );
}

/**
 * LazySection - Semantic wrapper for page sections
 *
 * Usage:
 * ```tsx
 * <LazySection title="Revenue Chart" loading={<ChartSkeleton />}>
 *   <RevenueChart />
 * </LazySection>
 * ```
 */

interface LazySectionProps {
  children: ReactNode;
  loading?: ReactNode;
  title?: string;
  className?: string;
}

export function LazySection({
  children,
  loading,
  title,
  className,
}: LazySectionProps) {
  return (
    <LazyLoad
      fallback={loading}
      triggerOnce={true}
      threshold={0.1}
      rootMargin="200px"
      className={className}
    >
      {title && <h2 className="sr-only">{title}</h2>}
      {children}
    </LazyLoad>
  );
}

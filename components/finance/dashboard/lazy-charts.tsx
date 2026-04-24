"use client";

import dynamic from "next/dynamic";
import { SkeletonCard } from "@/components/ui/skeleton";

export const LazyAgingBarsChart = dynamic(
  () => import("./aging-bars-chart").then((mod) => mod.AgingBarsChart),
  { ssr: false, loading: () => <SkeletonCard className="h-[350px]" /> },
);

export const LazyExpenseDonutChart = dynamic(
  () => import("./expense-donut-chart").then((mod) => mod.ExpenseDonutChart),
  { ssr: false, loading: () => <SkeletonCard className="h-[350px]" /> },
);

export const LazyForecastChart = dynamic(
  () => import("./forecast-chart").then((mod) => mod.ForecastChart),
  { ssr: false, loading: () => <SkeletonCard className="h-[350px]" /> },
);

export const LazyRevenueBarChart = dynamic(
  () => import("./revenue-bar-chart").then((mod) => mod.RevenueBarChart),
  { ssr: false, loading: () => <SkeletonCard className="h-80" /> },
);

export const LazyServiceDonutChart = dynamic(
  () => import("./service-donut-chart").then((mod) => mod.ServiceDonutChart),
  { ssr: false, loading: () => <SkeletonCard className="h-80" /> },
);

"use client";

import { Loader2 } from "lucide-react";

interface PullIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  progress: number;
}

const THRESHOLD = 80;

export function PullIndicator({ pullDistance, isRefreshing, progress }: PullIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const isReady = pullDistance >= THRESHOLD;

  return (
    <div
      className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-20"
      style={{
        top: 0,
        height: Math.max(pullDistance, isRefreshing ? THRESHOLD : 0),
        transition: isRefreshing ? "height 0.2s ease-out" : "none",
      }}
    >
      <div
        className="flex items-center justify-center rounded-full bg-bg-card shadow-md size-10"
        style={{
          opacity: Math.min(progress * 1.5, 1),
          transform: `scale(${0.6 + progress * 0.4}) rotate(${progress * 180}deg)`,
          transition: isRefreshing ? "transform 0.2s ease-out" : "none",
        }}
      >
        <Loader2
          className={`w-5 h-5 text-primary ${isRefreshing ? "animate-spin" : ""}`}
          style={{
            opacity: isReady || isRefreshing ? 1 : 0.5,
          }}
        />
      </div>
      {isReady && !isRefreshing && (
        <span className="absolute bottom-2 text-micro text-text-muted font-medium">
          Thả để làm mới
        </span>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ResponsiveContainer as RechartsResponsiveContainer } from "recharts";

interface SafeResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  children: ReactNode;
}

export function SafeResponsiveContainer({
  width = "100%",
  height = "100%",
  children,
}: SafeResponsiveContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let frameId = 0;
    const observer = new ResizeObserver(([entry]) => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setIsReady(entry.contentRect.width > 0 && entry.contentRect.height > 0);
      });
    });
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width, height, minWidth: 0 }}>
      {isReady ? (
        <RechartsResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsResponsiveContainer>
      ) : null}
    </div>
  );
}

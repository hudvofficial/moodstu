"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Defer setState to avoid synchronous call within effect body
    const frameId = window.requestAnimationFrame(() => {
      setIsMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div style={{ width, height }}>
      {isMounted && (
        <RechartsResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsResponsiveContainer>
      )}
    </div>
  );
}

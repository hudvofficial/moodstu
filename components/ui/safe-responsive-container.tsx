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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);

    return () => {
      setIsMounted(false);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width, height }}>
      {isMounted && (
        <RechartsResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsResponsiveContainer>
      )}
    </div>
  );
}

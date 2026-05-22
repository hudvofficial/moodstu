"use client";

import { useNetworkQuality } from "@/hooks/use-network-quality";
import { WifiOff, Signal } from "lucide-react";

export function SlowNetworkIndicator() {
  const { quality, isSlowNetwork, isOnline, saveData } = useNetworkQuality();

  if (!isSlowNetwork && isOnline) return null;

  if (!isOnline) {
    return (
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive text-white rounded-full shadow-lg text-caption font-medium">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Mất kết nối mạng</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-warning text-warning-foreground rounded-full shadow-lg text-caption font-medium">
        <Signal className="w-3.5 h-3.5" />
        <span>
          {saveData ? "Chế độ tiết kiệm dữ liệu" : `Mạng chậm (${quality.toUpperCase()})`}
        </span>
      </div>
    </div>
  );
}

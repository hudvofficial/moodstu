"use client";

import { useState, useEffect, useCallback } from "react";

export type NetworkQuality = "offline" | "slow-2g" | "2g" | "3g" | "4g" | "unknown";

interface NetworkQualityState {
  quality: NetworkQuality;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  isSlowNetwork: boolean;
  isOnline: boolean;
}

interface NetworkInformation extends EventTarget {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener(type: "change", listener: () => void): void;
  removeEventListener(type: "change", listener: () => void): void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

function getConnection(): NetworkInformation | undefined {
  if (typeof navigator === "undefined") return undefined;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection;
}

function getNetworkState(): NetworkQualityState {
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  if (!isOnline) {
    return {
      quality: "offline",
      effectiveType: "offline",
      downlink: 0,
      rtt: 0,
      saveData: false,
      isSlowNetwork: true,
      isOnline: false,
    };
  }

  const connection = getConnection();

  if (!connection) {
    return {
      quality: "unknown",
      effectiveType: "unknown",
      downlink: 10,
      rtt: 50,
      saveData: false,
      isSlowNetwork: false,
      isOnline: true,
    };
  }

  const effectiveType = connection.effectiveType;
  const isSlowNetwork = effectiveType === "slow-2g" || effectiveType === "2g" || connection.saveData;

  return {
    quality: effectiveType as NetworkQuality,
    effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
    isSlowNetwork,
    isOnline: true,
  };
}

export function useNetworkQuality(): NetworkQualityState {
  const [state, setState] = useState<NetworkQualityState>(() => getNetworkState());

  const updateState = useCallback(() => {
    setState(getNetworkState());
  }, []);

  useEffect(() => {
    const connection = getConnection();

    window.addEventListener("online", updateState);
    window.addEventListener("offline", updateState);
    connection?.addEventListener("change", updateState);

    return () => {
      window.removeEventListener("online", updateState);
      window.removeEventListener("offline", updateState);
      connection?.removeEventListener("change", updateState);
    };
  }, [updateState]);

  return state;
}

export function useIsSlowNetwork(): boolean {
  const { isSlowNetwork } = useNetworkQuality();
  return isSlowNetwork;
}

"use client";

import { createContext, useContext, type ReactNode } from "react";

const MobileNavigationContext = createContext<() => void>(() => {});

export function MobileNavigationProvider({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  return <MobileNavigationContext.Provider value={onOpen}>{children}</MobileNavigationContext.Provider>;
}

export function useOpenMobileNavigation() {
  return useContext(MobileNavigationContext);
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// ═══════════════════════════════════════════
// HeaderSlotsContext — lets child pages override header content
// Usage: contract detail sets Back+Code+Menu, gallery sets Back+Title+Sort
// ═══════════════════════════════════════════

interface HeaderSlots {
  leftSlot?: ReactNode;
  titleOverride?: string;
  subtitleOverride?: string;
  rightSlot?: ReactNode;
  hideSearch?: boolean;
  hideHeader?: boolean;
}

interface HeaderSlotsContextValue {
  slots: HeaderSlots;
  setSlots: (slots: HeaderSlots) => void;
}

const HeaderSlotsContext = createContext<HeaderSlotsContextValue>({
  slots: {},
  setSlots: () => {},
});

export function HeaderSlotsProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<HeaderSlots>({});
  return (
    <HeaderSlotsContext.Provider value={{ slots, setSlots }}>
      {children}
    </HeaderSlotsContext.Provider>
  );
}

/** Read current header slots (used by header.tsx) */
export function useHeaderSlotsContext(): HeaderSlots {
  return useContext(HeaderSlotsContext).slots;
}

/** Get setter to update header slots (used by page components) */
export function useSetHeaderSlots() {
  return useContext(HeaderSlotsContext).setSlots;
}

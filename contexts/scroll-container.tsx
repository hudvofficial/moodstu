"use client";

import { createContext, useContext, type RefObject } from "react";

/**
 * ScrollContainerContext — provides a ref to the main scroll container.
 *
 * AppShell creates a ref → attaches to <main id="main-scroll"> → provides via this context.
 * Any child component can consume it to listen for scroll events on the correct element
 * (since window.scrollY is always 0 due to root overflow-hidden).
 */

const ScrollContainerContext = createContext<RefObject<HTMLElement | null>>({
  current: null,
});

export const ScrollContainerProvider = ScrollContainerContext.Provider;

export function useScrollContainer() {
  return useContext(ScrollContainerContext);
}

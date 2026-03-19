"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * ModalPortal — Zero-overhead portal vào document.body
 * - typeof document check → SSR safe
 * - Không useState/useEffect → không extra render cycle
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

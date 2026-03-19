"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TableWrapperProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

/**
 * Wrapper cho bảng biểu, hỗ trợ responsive mượt mà
 * và styling chuẩn SaaS.
 */
export function TableWrapper({
  children,
  className,
  containerClassName
}: TableWrapperProps) {
  return (
    <div className={cn(
      "w-full bg-bg-card rounded-2xl overflow-hidden shadow-sm",
      containerClassName
    )}>
      <div className="overflow-x-auto scrollbar-hide">
        <table className={cn("w-full border-collapse text-left", className)}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function THead({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <thead className={cn("bg-bg-base/50", className)}>
      {children}
    </thead>
  );
}

export function TBody({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <tbody className={cn("", className)}>
      {children}
    </tbody>
  );
}

export function TH({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <th className={cn(
      "px-6 py-4 text-tiny font-bold text-text-muted uppercase tracking-[0.15em] whitespace-nowrap",
      className
    )}>
      {children}
    </th>
  );
}

export function TD({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <td className={cn(
      "px-6 py-5 text-sm font-semibold text-text-secondary whitespace-nowrap transition-colors",
      className
    )}>
      {children}
    </td>
  );
}

export function TR({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  return (
    <tr 
      onClick={onClick}
      className={cn(
        "group transition-colors hover:bg-bg-hover/50",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
}

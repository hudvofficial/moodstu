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
      "card-base overflow-x-auto",
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
    <thead className={cn("sticky top-0 z-10 text-xs uppercase tracking-wider text-text-secondary bg-bg-sidebar", className)}>
      {children}
    </thead>
  );
}

export function TBody({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <tbody className={cn("text-sm [&>tr:nth-child(even)]:bg-bg-base/40", className)}>
      {children}
    </tbody>
  );
}

export function TH({ children, className }: { children?: React.ReactNode, className?: string }) {
  return (
    <th className={cn(
      "px-4 py-3 font-medium whitespace-nowrap",
      className
    )}>
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 whitespace-nowrap transition-colors",
        className
      )}
    >
      {children}
    </td>
  );
}

export function TR({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  return (
    <tr 
      onClick={onClick}
      className={cn(
        "group transition-colors hover:bg-bg-hover h-14",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
}

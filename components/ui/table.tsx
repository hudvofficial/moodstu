"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TableWrapperProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  footer?: React.ReactNode;
}

/**
 * Wrapper cho bảng biểu, hỗ trợ responsive mượt mà
 * và styling chuẩn SaaS.
 */
export function TableWrapper({
  children,
  className,
  containerClassName,
  scrollRef,
  footer,
}: TableWrapperProps) {
  return (
    <div className={cn(
      "card-base overflow-hidden lg:flex lg:flex-col lg:flex-1 lg:min-h-0",
      containerClassName
    )}>
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide lg:overflow-y-auto lg:flex-1 lg:min-h-0">
        <table className={cn("w-full border-collapse text-left", className)}>
          {children}
        </table>
      </div>
      {footer}
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
      "px-4 2xl:px-5 py-3 2xl:py-4 font-medium 2xl:font-semibold whitespace-nowrap",
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
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
}) {
  return (
    <td
      colSpan={colSpan}
      onClick={onClick}
      className={cn(
        "px-4 2xl:px-5 whitespace-nowrap transition-colors",
        className
      )}
    >
      {children}
    </td>
  );
}

export function TR({
  children,
  className,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { children: React.ReactNode }) {
  return (
    <tr
      onClick={onClick}
      {...props}
      className={cn(
        "group transition-colors hover:bg-bg-hover h-12 2xl:h-14",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
}

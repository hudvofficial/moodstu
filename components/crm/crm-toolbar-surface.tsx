import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CrmToolbarSurfaceProps {
  children: ReactNode;
  className?: string;
}

export function CrmToolbarSurface({
  children,
  className,
}: CrmToolbarSurfaceProps) {
  return (
    <div
      className={cn(
        "card-base flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

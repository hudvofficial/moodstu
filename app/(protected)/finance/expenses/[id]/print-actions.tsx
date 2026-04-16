"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintActions() {
  return (
    <Button
      onClick={() => window.print()}
      variant="secondary"
      className="gap-2 print:hidden"
    >
      <Printer className="w-4 h-4" />
      <span className="hidden sm:inline">In phiếu chi</span>
      <span className="sm:hidden">In</span>
    </Button>
  );
}

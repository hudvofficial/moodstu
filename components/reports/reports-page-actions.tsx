"use client";

import { BookOpen, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReportsPageActionsProps {
  isExporting: boolean;
  mobile?: boolean;
  onExport: () => void;
  onOpenLedger: () => void;
}

export function ReportsPageActions({
  isExporting,
  mobile = false,
  onExport,
  onOpenLedger,
}: ReportsPageActionsProps) {
  return (
    <div className={mobile ? "grid grid-cols-2 gap-2" : "flex items-center gap-2"}>
      <Button type="button" variant="secondary" onClick={onExport} disabled={isExporting} className="gap-2">
        <FileSpreadsheet className="h-4 w-4" />
        {isExporting ? "Đang xuất..." : "Xuất Excel"}
      </Button>
      <Button type="button" variant="primary" onClick={onOpenLedger} className="gap-2">
        <BookOpen className="h-4 w-4" />
        Mở sổ cái
      </Button>
    </div>
  );
}

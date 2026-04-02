"use client";

import { Button } from "@/components/ui/button";

export default function PrintingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <h2 className="text-h2">Khong the tai trang printing</h2>
      <p className="text-body text-text-secondary text-center max-w-md">
        {error.message || "Da co loi khong mong muon. Vui long thu lai."}
      </p>
      <Button onClick={() => reset()}>
        Thu lai
      </Button>
    </div>
  );
}

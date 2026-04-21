"use client";

import { Button } from "@/components/ui/button";

export default function MoodieError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 p-6 text-center">
      <div aria-hidden className="text-4xl">🤖</div>
      <h2 className="text-h2">Moodie đang gặp sự cố</h2>
      <p className="w-full max-w-xl text-body text-text-secondary">
        {error.message || "Không thể tải module Moodie lúc này. Vui lòng thử lại."}
      </p>
      <Button type="button" onClick={() => reset()}>
        Thử lại
      </Button>
    </div>
  );
}

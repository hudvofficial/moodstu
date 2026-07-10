"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2 } from "lucide-react";

const THINKING_TEXTS = [
  "Đang truy vấn dữ liệu...",
  "Đang phân tích thông tin...",
  "Đang tổng hợp kết quả...",
];

export function MoodieThinkingState({ statusLabel }: { statusLabel?: string | null }) {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTextIndex((currentIndex) => (currentIndex + 1) % THINKING_TEXTS.length);
    }, 2200);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <article className="flex w-full justify-start animate-fade-in-up">
      <div className="flex min-w-0 w-full max-w-[760px] gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-3.5 w-3.5" />
        </div>

        <div className="inline-flex min-h-8 max-w-full items-center gap-2 py-1 text-xs text-text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="truncate">{statusLabel || THINKING_TEXTS[textIndex]}</span>
        </div>
      </div>
    </article>
  );
}

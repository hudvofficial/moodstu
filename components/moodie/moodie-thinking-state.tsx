"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2 } from "lucide-react";

const THINKING_TEXTS = [
  "Đang truy vấn dữ liệu...",
  "Đang phân tích thông tin...",
  "Đang tổng hợp kết quả...",
];

export function MoodieThinkingState() {
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTextIndex((currentIndex) => (currentIndex + 1) % THINKING_TEXTS.length);
    }, 2200);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <article className="flex w-full justify-start animate-fade-in-up">
      <div className="flex min-w-0 w-full max-w-4xl gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-text-inverse shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl">
          <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>

        <div className="min-w-60 max-w-full rounded-2xl rounded-tl-sm border border-border bg-white px-5 py-4 shadow-xs">
          <div className="space-y-2">
            <div className="h-3 w-52 animate-pulse rounded-full bg-bg-hover" />
            <div
              className="h-3 w-36 animate-pulse rounded-full bg-bg-hover"
              style={{ animationDelay: "120ms" }}
            />
            <div
              className="h-3 w-24 animate-pulse rounded-full bg-bg-hover"
              style={{ animationDelay: "240ms" }}
            />
          </div>

          <div className="mt-4 inline-flex max-w-full items-center gap-2 text-caption text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="truncate">{THINKING_TEXTS[textIndex]}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

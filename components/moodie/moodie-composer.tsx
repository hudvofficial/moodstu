"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MoodieCapability } from "@/types/moodie";

interface MoodieComposerProps {
  suggestionChips?: string[];
  disabled?: boolean;
  loading?: boolean;
  hasMessages?: boolean;
  capabilities?: MoodieCapability[];
  onSend: (content: string) => Promise<void> | void;
  onSuggestionClick?: (content: string) => void;
}

export function MoodieComposer({
  disabled,
  loading,
  onSend,
  suggestionChips = [],
  onSuggestionClick,
}: MoodieComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function resizeTextarea() {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }

  async function handleSubmit() {
    const content = value.trim();
    if (!content || disabled || loading) return;

    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    await onSend(content);
  }

  return (
    <div className="relative z-10 shrink-0 border-t border-border/70 bg-white/95 backdrop-blur-sm">
      <div className="px-4 pb-4 pt-3 lg:px-6">
        {suggestionChips.length > 0 ? (
          <div className="mx-auto mb-2 flex w-full max-w-4xl gap-1.5 overflow-x-auto pb-1">
            {suggestionChips.slice(0, 4).map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 rounded-full border border-border bg-white px-2.5 text-[12px] font-medium text-text-secondary hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                onClick={() => onSuggestionClick?.(suggestion)}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {suggestion}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="mx-auto flex w-full max-w-4xl items-end gap-2">
          <div className="flex-1 rounded-2xl border border-border bg-white shadow-xs">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                resizeTextarea();
              }}
              placeholder="Hỏi Moodie bất cứ điều gì..."
              rows={1}
              unstyled
              className="block w-full max-h-28 min-h-11 resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-[15px] leading-5 shadow-none focus-visible:ring-0"
              disabled={disabled || loading}
              onKeyDown={async (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  await handleSubmit();
                }
              }}
            />
          </div>

          <Button
            type="button"
            onClick={() => {
              handleSubmit().catch(() => {});
            }}
            className="h-11 w-11 shrink-0 rounded-xl px-0 shadow-xs"
            disabled={disabled || loading || value.trim().length === 0}
            aria-label="Gửi tin nhắn cho Moodie"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowUp className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

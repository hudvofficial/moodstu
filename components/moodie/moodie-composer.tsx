"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MoodieCapability } from "@/types/moodie";

interface MoodieComposerProps {
  disabled?: boolean;
  loading?: boolean;
  hasMessages?: boolean;
  capabilities?: MoodieCapability[];
  onSend: (content: string) => Promise<void> | void;
}

export function MoodieComposer({
  disabled,
  loading,
  onSend,
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
      <div className="px-4 pt-4 pb-5 lg:px-6 lg:pt-4 lg:pb-6">
        <div className="mx-auto flex w-full max-w-5xl items-end gap-3">
          <div className="flex-1 rounded-3xl border border-border bg-white shadow-xs">
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
              className="block w-full max-h-32 min-h-14 resize-none overflow-y-auto border-0 bg-transparent px-5 py-4 text-body shadow-none focus-visible:ring-0"
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
            className="h-12 w-12 shrink-0 rounded-2xl px-0 shadow-xs"
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

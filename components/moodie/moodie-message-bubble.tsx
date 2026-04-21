import { Bot, User2 } from "lucide-react";
import { MoodieWidgetRenderer } from "@/components/moodie/moodie-widget-renderer";
import { Button } from "@/components/ui/button";
import type { MoodieMessage } from "@/types/moodie";

interface MoodieMessageBubbleProps {
  message: MoodieMessage;
  pending?: boolean;
  onQuickPrompt?: (prompt: string) => void;
}

type ParsedListItem = {
  text: string;
  label?: string;
  value?: string;
};

type ParsedMessageBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: ParsedListItem[] };

function parseMessageBlocks(content: string): ParsedMessageBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: ParsedMessageBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine) {
      index += 1;
      continue;
    }

    const listMatch = trimmedLine.match(/^([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const items: ParsedListItem[] = [];
      const ordered = /^\d+\./.test(trimmedLine);

      while (index < lines.length) {
        const nextTrimmedLine = lines[index].trim();
        const nextListMatch = nextTrimmedLine.match(/^([-*]|\d+\.)\s+(.+)$/);
        if (!nextListMatch) break;

        const itemText = nextListMatch[2].trim();
        const labelMatch = itemText.match(/^([^:]+):\s*(.+)$/);

        items.push(
          labelMatch
            ? {
                text: itemText,
                label: labelMatch[1].trim(),
                value: labelMatch[2].trim(),
              }
            : { text: itemText },
        );

        index += 1;
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const nextLine = lines[index];
      const nextTrimmedLine = nextLine.trim();
      if (!nextTrimmedLine) break;
      if (/^([-*]|\d+\.)\s+(.+)$/.test(nextTrimmedLine)) break;
      paragraphLines.push(nextTrimmedLine);
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paragraphLines.join(" "),
      });
      continue;
    }

    index += 1;
  }

  return blocks;
}

function renderAssistantContent(content: string) {
  const blocks = parseMessageBlocks(content);

  if (blocks.length === 0) {
    return <div className="break-words whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "paragraph") {
          return (
            <p
              key={`paragraph-${blockIndex}`}
              className="break-words text-body leading-7 text-text-primary"
            >
              {block.text}
            </p>
          );
        }

        if (block.items.every((item) => item.label && item.value)) {
          return (
            <div key={`list-${blockIndex}`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {block.items.map((item, itemIndex) => (
                <div
                  key={`metric-${itemIndex}`}
                  className={`rounded-xl border border-border/70 bg-bg-hover/70 px-3 py-2 ${
                    block.items.length % 2 === 1 && itemIndex === block.items.length - 1
                      ? "sm:col-span-2"
                      : ""
                  }`}
                >
                  <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                    {item.label}
                  </p>
                  <p className="mt-1 break-words text-body font-semibold text-text-primary">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          );
        }

        const ListTag = block.ordered ? "ol" : "ul";

        return (
          <ListTag
            key={`list-${blockIndex}`}
            className={`space-y-2 pl-5 text-body leading-7 text-text-primary ${
              block.ordered ? "list-decimal" : "list-disc"
            }`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`} className="pl-1 break-words marker:text-primary">
                {item.text}
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}

export function MoodieMessageBubble({
  message,
  pending,
  onQuickPrompt,
}: MoodieMessageBubbleProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`flex w-full ${isAssistant ? "justify-start" : "justify-end"} animate-fade-in-up`}
    >
      <div
        className={`flex min-w-0 gap-3 ${
          isAssistant
            ? "w-full max-w-4xl flex-row"
            : "max-w-[85%] flex-row-reverse lg:max-w-[75%]"
        }`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-text-inverse shadow-sm sm:h-10 sm:w-10 sm:rounded-2xl">
          {isAssistant ? (
            <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <User2 className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </div>

        <div className={`min-w-0 max-w-full space-y-3 ${isAssistant ? "flex-1" : ""}`}>
          <div
            className={`max-w-full rounded-2xl px-4 py-3 text-left text-body leading-7 sm:px-5 sm:py-4 ${
              isAssistant
                ? "w-full border border-border bg-white text-text-primary shadow-xs rounded-tl-sm"
                : "bg-primary text-text-inverse shadow-sm rounded-tr-sm"
            }`}
          >
            {isAssistant ? (
              renderAssistantContent(message.content)
            ) : (
              <div className="break-words whitespace-pre-wrap">{message.content}</div>
            )}

            {pending ? (
              <p
                className={`mt-2 text-caption ${
                  isAssistant ? "text-text-muted" : "text-white/80"
                }`}
              >
                Đang gửi...
              </p>
            ) : null}
          </div>

          {isAssistant &&
          message.metadata?.widgets &&
          message.metadata.widgets.length > 0 ? (
            <MoodieWidgetRenderer widgets={message.metadata.widgets} />
          ) : null}

          {isAssistant &&
          message.metadata?.sources &&
          message.metadata.sources.length > 0 ? (
            <div className="flex flex-wrap gap-2 pl-1">
              {message.metadata.sources.map((source) => (
                <span
                  key={`${source.label}-${source.value || ""}`}
                  className="max-w-full break-words rounded-full bg-bg-hover px-3 py-1 text-caption text-text-secondary"
                >
                  <strong className="text-text-main">{source.label}</strong>
                  {source.value ? `: ${source.value}` : ""}
                </span>
              ))}
            </div>
          ) : null}

          {isAssistant &&
          message.metadata?.follow_ups &&
          message.metadata.follow_ups.length > 0 &&
          onQuickPrompt ? (
            <div className="flex flex-wrap gap-2 pl-1">
              {message.metadata.follow_ups.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPrompt(prompt)}
                  unstyled
                  className="max-w-full rounded-xl border border-border px-3 py-1.5 text-left text-caption font-medium whitespace-normal text-text-secondary transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

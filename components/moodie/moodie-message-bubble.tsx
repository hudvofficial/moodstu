import { Bot, Sparkles } from "lucide-react";
import { MoodieDebugPanel } from "@/components/moodie/moodie-debug-panel";
import { MoodieActionPreviews } from "@/components/moodie/moodie-action-previews";
import { MoodieWidgetRenderer } from "@/components/moodie/moodie-widget-renderer";
import { MoodieMessageParts } from "@/components/moodie/moodie-message-parts";
import { normalizeMoodieDisplayText } from "@/lib/moodie/ux-helpers";
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
  | { type: "heading"; text: string }
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

    const headingMatch = trimmedLine.match(/^\*\*(.+?)(?:\*\*)?$/);
    if (headingMatch) {
      blocks.push({ type: "heading", text: headingMatch[1].trim() });
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

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\x60[^\x60]+\x60)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("\x60") && part.endsWith("\x60")) {
      return <code key={index} className="rounded bg-bg-subtle px-1 py-0.5 font-mono text-sm text-primary">{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

function renderAssistantContent(content: string) {
  const blocks = parseMessageBlocks(content);

  if (blocks.length === 0) {
    return <div className="break-words whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="space-y-2.5">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return <h3 key={"heading-" + blockIndex} className="pt-1 text-sm font-semibold text-text-primary">{block.text}</h3>;
        }

        if (block.type === "paragraph") {
          return (
            <p
              key={`paragraph-${blockIndex}`}
              className="break-words text-sm leading-6 text-text-primary"
            >
              {renderInlineMarkdown(block.text)}
            </p>
          );
        }

        if (block.items.every((item) => item.label && item.value)) {
          return (
            <div key={`list-${blockIndex}`} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {block.items.map((item, itemIndex) => (
                <div
                  key={`metric-${itemIndex}`}
                  className={`rounded-lg bg-bg-subtle px-3 py-2 ${
                    block.items.length % 2 === 1 && itemIndex === block.items.length - 1
                      ? "sm:col-span-2"
                      : ""
                  }`}
                >
                  <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                    {item.label}
                  </p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-text-primary">
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
            className={`space-y-1.5 pl-5 text-sm leading-6 text-text-primary ${
              block.ordered ? "list-decimal" : "list-disc"
            }`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`} className="pl-1 break-words marker:text-primary">
                {renderInlineMarkdown(item.text)}
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
        className={`flex min-w-0 gap-2.5 ${
          isAssistant
            ? "w-full max-w-[760px] flex-row"
            : "max-w-[82%] flex-row-reverse lg:max-w-[58%]"
        }`}
      >
        {isAssistant ? (
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-3.5 w-3.5" />
          </div>
        ) : null}

        <div className={`min-w-0 max-w-full space-y-2 ${isAssistant ? "w-full" : ""}`}>
          <div
            className={`max-w-full text-left text-sm leading-6 ${
              isAssistant
                ? "w-full py-1 text-text-primary"
                : "rounded-2xl rounded-tr-sm border border-primary/10 bg-primary/[0.08] px-3.5 py-2 text-text-primary"
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
                  isAssistant ? "text-text-muted" : "text-primary/70"
                }`}
              >
                Đang gửi...
              </p>
            ) : null}
          </div>

          {isAssistant && message.metadata?.parts && message.metadata.parts.length > 0 ? (
            <MoodieMessageParts parts={message.metadata.parts} />
          ) : isAssistant &&
          message.metadata?.widgets &&
          message.metadata.widgets.length > 0 ? (
            <MoodieWidgetRenderer widgets={message.metadata.widgets} />
          ) : null}

          {isAssistant && message.metadata?.actions && message.metadata.actions.length > 0 ? (
            <MoodieActionPreviews actions={message.metadata.actions} />
          ) : null}

          {isAssistant && message.metadata?.trace ? (
            <MoodieDebugPanel trace={message.metadata.trace} />
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
                  <strong className="text-text-main">{normalizeMoodieDisplayText(source.label)}</strong>
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
              {message.metadata.follow_ups.map((prompt) => {
                const displayPrompt = normalizeMoodieDisplayText(prompt);
                return (
                  <Button
                    key={prompt}
                    type="button"
                    onClick={() => onQuickPrompt(displayPrompt)}
                    unstyled
                    className="max-w-full rounded-xl border border-border px-3 py-1.5 text-left text-caption font-medium whitespace-normal text-text-secondary transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    {displayPrompt}
                  </Button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

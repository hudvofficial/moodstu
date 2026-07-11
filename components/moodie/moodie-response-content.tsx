import { AlertTriangle, Code2, Info, Quote, Table2 } from "lucide-react";
import { parseMoodieText, type MoodieTextBlock } from "@/lib/moodie/presentation";

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-text-primary">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index} className="rounded-md bg-bg-subtle px-1.5 py-0.5 font-mono text-body-sm text-primary">{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

function isMetricPair(blocks: MoodieTextBlock[], index: number) {
  const heading = blocks[index];
  const value = blocks[index + 1];
  return heading?.type === "heading" && value?.type === "paragraph" && value.text.length <= 32 && !/[.!?]$/.test(value.text);
}

interface MoodieResponseContentProps {
  content: string;
  suppressMetrics?: boolean;
  suppressTables?: boolean;
}

export function MoodieResponseContent({ content, suppressMetrics, suppressTables }: MoodieResponseContentProps) {
  const blocks = parseMoodieText(content);
  if (blocks.length === 0) return <p className="break-words whitespace-pre-wrap text-sm leading-6">{content}</p>;

  const output = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (isMetricPair(blocks, index) && block.type === "heading") {
      const metrics: Array<{ label: string; value: string }> = [];
      while (isMetricPair(blocks, index)) {
        const labelBlock = blocks[index];
        const valueBlock = blocks[index + 1];
        if (labelBlock.type !== "heading" || valueBlock.type !== "paragraph") break;
        metrics.push({ label: labelBlock.text, value: valueBlock.text });
        index += 2;
      }
      index -= 1;
      if (suppressMetrics) continue;
      output.push(
        <section key={`metrics-${index}`} className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 sm:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0 bg-bg-subtle px-3 py-3">
              <p className="truncate text-caption font-medium uppercase tracking-wide text-text-muted">{metric.label}</p>
              <p className="mt-1 break-words text-base font-semibold tabular-nums text-text-primary">{renderInline(metric.value)}</p>
            </div>
          ))}
        </section>,
      );
      continue;
    }

    if (block.type === "heading") {
      output.push(<h3 key={`heading-${index}`} className="max-w-3xl pt-2 text-body-sm font-semibold leading-6 text-text-primary first:pt-0">{block.text}</h3>);
      continue;
    }
    if (block.type === "paragraph") {
      output.push(<p key={`paragraph-${index}`} className="max-w-3xl break-words text-body-sm leading-7 text-text-primary">{renderInline(block.text)}</p>);
      continue;
    }
    if (block.type === "quote") {
      output.push(<blockquote key={`quote-${index}`} className="flex max-w-3xl gap-2.5 border-l-2 border-primary/35 py-1 pl-3 text-sm italic leading-6 text-text-secondary"><Quote className="mt-1 h-3.5 w-3.5 shrink-0 text-primary/70" /><span>{renderInline(block.text)}</span></blockquote>);
      continue;
    }
    if (block.type === "code") {
      output.push(
        <section key={`code-${index}`} className="overflow-hidden rounded-xl border border-border/70 bg-text-primary text-white">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-caption text-white/60"><Code2 className="h-3.5 w-3.5" />{block.language || "code"}</div>
          <pre className="overflow-x-auto p-3 text-xs leading-5"><code>{block.code}</code></pre>
        </section>,
      );
      continue;
    }
    if (block.type === "separator") {
      output.push(<hr key={`separator-${index}`} className="border-0 border-t border-border/60" />);
      continue;
    }
    if (block.type === "callout") {
      const Icon = block.tone === "warning" ? AlertTriangle : Info;
      output.push(
        <aside key={`callout-${index}`} className={`flex max-w-3xl gap-2.5 rounded-xl border px-3 py-2.5 ${block.tone === "warning" ? "border-warning/25 bg-warning/5" : "border-primary/15 bg-primary/5"}`}>
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${block.tone === "warning" ? "text-warning" : "text-primary"}`} />
          <p className="min-w-0 text-sm leading-6 text-text-secondary"><strong className="font-semibold text-text-primary">{block.title}:</strong> {renderInline(block.text)}</p>
        </aside>,
      );
      continue;
    }
    if (block.type === "table") {
      if (suppressTables) continue;
      output.push(
        <section key={`table-${index}`} className="overflow-hidden rounded-xl border border-border/70 bg-white">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-caption font-medium text-text-secondary"><Table2 className="h-3.5 w-3.5 text-primary" />Chi tiết</div>
          <div className="hidden max-h-[360px] overflow-auto sm:block">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-border bg-bg-subtle text-text-secondary"><tr>{block.headers.map((header) => <th key={header} className="whitespace-nowrap px-3 py-2 font-medium">{renderInline(header)}</th>)}</tr></thead>
              <tbody className="divide-y divide-border/50">{block.rows.map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-bg-subtle/60">{block.headers.map((_, cellIndex) => <td key={cellIndex} className="px-3 py-2.5 align-top leading-5 text-text-primary">{renderInline(row[cellIndex] || "—")}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div className="max-h-[420px] divide-y divide-border/60 overflow-y-auto sm:hidden">
            {block.rows.map((row, rowIndex) => (
              <dl key={rowIndex} className="space-y-2 px-3 py-3">
                {block.headers.map((header, cellIndex) => (
                  <div key={`${header}-${cellIndex}`} className="grid grid-cols-[minmax(92px,0.42fr)_1fr] gap-3">
                    <dt className="text-caption font-medium text-text-muted">{renderInline(header)}</dt>
                    <dd className="min-w-0 break-words text-right text-xs leading-5 text-text-primary">{renderInline(row[cellIndex] || "—")}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </section>,
      );
      continue;
    }

    if (block.items.every((item) => item.label && item.value)) {
      output.push(<dl key={`definitions-${index}`} className="divide-y divide-border/50 rounded-xl border border-border/70">{block.items.map((item) => <div key={item.text} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(120px,0.4fr)_1fr] sm:gap-4"><dt className="text-caption font-medium text-text-muted">{item.label}</dt><dd className="break-words text-sm text-text-primary">{renderInline(item.value || "")}</dd></div>)}</dl>);
      continue;
    }

    const List = block.ordered ? "ol" : "ul";
    output.push(<List key={`list-${index}`} className={`space-y-1.5 pl-5 text-body-sm leading-7 text-text-primary ${block.ordered ? "list-decimal" : "list-disc"}`}>{block.items.map((item, itemIndex) => <li key={itemIndex} className="pl-1 marker:text-primary">{renderInline(item.text)}</li>)}</List>);
  }

  return <div className="space-y-3.5">{output}</div>;
}
